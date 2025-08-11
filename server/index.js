import express from 'express';
import fs from 'node:fs/promises';
import { spawn, exec as cpExec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'path';
import { fileURLToPath } from 'url';
import Arweave from 'arweave';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory log storage
let deploymentLogs = [];

// Track current deployment process for cancellation
let currentDeploymentProcess = null;
let deploymentCancelled = false;

// Helper function to fix port mappings in Docker Compose files
function fixPortMappings(composeContent) {
  let fixed = composeContent;
  
  // Fix Envoy port mapping to use ENVOY_PORT environment variable
  fixed = fixed.replace(
    /ports:\s*\n\s*-\s*["']?\d+:3000["']?/g,
    'ports:\n      - "${ENVOY_PORT:-3000}:3000"'
  );
  
  // Fix Core port mapping to use CORE_PORT environment variable  
  fixed = fixed.replace(
    /ports:\s*\n\s*-\s*["']?\d+:4000["']?/g,
    'ports:\n      - "${CORE_PORT:-4000}:4000"'
  );
  
  // Fix Observer port mapping to use OBSERVER_PORT environment variable
  fixed = fixed.replace(
    /ports:\s*\n\s*-\s*["']?\d+:5050["']?/g,
    'ports:\n      - "${OBSERVER_PORT:-5050}:5050"'
  );
  
  // Fix ClickHouse port mappings
  fixed = fixed.replace(
    /ports:\s*\n\s*-\s*["']?\d+:8123["']?/g,
    'ports:\n      - "${CLICKHOUSE_PORT_2:-8123}:8123"'
  );
  fixed = fixed.replace(
    /ports:\s*\n\s*-\s*["']?\d+:8443["']?/g,
    'ports:\n      - "${CLICKHOUSE_PORT_3:-8443}:8443"'
  );
  fixed = fixed.replace(
    /ports:\s*\n\s*-\s*["']?\d+:9000["']?/g,
    'ports:\n      - "${CLICKHOUSE_PORT:-9000}:9000"'
  );
  
  // Also handle single-line port mappings with defaults
  fixed = fixed.replace(/["']?\d+:3000["']?/g, '"${ENVOY_PORT:-3000}:3000"');
  fixed = fixed.replace(/["']?\d+:4000["']?/g, '"${CORE_PORT:-4000}:4000"');
  fixed = fixed.replace(/["']?\d+:5050["']?/g, '"${OBSERVER_PORT:-5050}:5050"');
  fixed = fixed.replace(/["']?\d+:8123["']?/g, '"${CLICKHOUSE_PORT_2:-8123}:8123"');
  fixed = fixed.replace(/["']?\d+:8443["']?/g, '"${CLICKHOUSE_PORT_3:-8443}:8443"');
  fixed = fixed.replace(/["']?\d+:9000["']?/g, '"${CLICKHOUSE_PORT:-9000}:9000"');
  
  return fixed;
}

const appendLog = (msg) => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  deploymentLogs.push(line);
  console.log(line);
};

const execPromise = promisify(cpExec);

const app = express();

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: '1mb' }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '../dist')));
app.use((_, res, next) => {
  // CORS – allow local frontend (vite default: 5173) to hit the API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_.method === 'OPTIONS') return res.sendStatus(200);


  next();
});

// POST /deploy – body: { config: DeploymentConfig }
app.post('/deploy', async (req, res) => {
  const { config } = req.body;
  if (!config) return res.status(400).json({ error: 'Missing config' });

  try {
    appendLog('Received deployment request');
    deploymentCancelled = false;
    
    // CRITICAL: Derive bundler address BEFORE building env file
    if (config.dockerConfig.enableBundler && config.dashboardConfig.BUNDLER_ARWEAVE_WALLET) {
      let bundlerAddress = config.dashboardConfig.BUNDLER_ARWEAVE_ADDRESS || '';
      
      if (config.dashboardConfig.BUNDLER_ARWEAVE_WALLET) {
        try {
          const arweave = Arweave.init({});
          const walletJwk = JSON.parse(config.dashboardConfig.BUNDLER_ARWEAVE_WALLET);
          const derivedAddress = await arweave.wallets.jwkToAddress(walletJwk);
          if (derivedAddress) {
            bundlerAddress = derivedAddress;
            appendLog(`✅ Pre-derived bundler address: ${bundlerAddress}`);
          }
        } catch (err) {
          appendLog(`⚠️ Pre-derivation failed: ${err.message}`);
        }
      }
      
      // Update config with derived address
      config.dashboardConfig.BUNDLER_ARWEAVE_ADDRESS = bundlerAddress || '';
    }
    
    // Prepare deployment directory (no cleanup - we'll update existing repo)
    const envContent = buildEnvFile(config);
    const deployDir = '/tmp/ar-io-node';
    
    appendLog(`Using deployment directory: ${deployDir}`);
    appendLog('Repository will be updated if it exists, or cloned if it does not exist');
    // Get latest tag from GitHub API
    appendLog('Fetching latest AR.IO node version...');
    const tagsResponse = await fetch('https://api.github.com/repos/ar-io/ar-io-node/tags');
    const tagsText = await tagsResponse.text();
    let latestTag = 'develop';
    try {
      const tags = JSON.parse(tagsText);
      if (Array.isArray(tags) && tags.length > 0 && tags[0].name) {
        latestTag = tags[0].name;
      }
    } catch (e) {
      appendLog(`Error parsing tags JSON: ${e.message}, falling back to 'develop'`);
    }
    appendLog(`Using tag: ${latestTag}`);
    
    // Check if repository already exists and update it, otherwise clone
    const repoExists = await fs.access(deployDir).then(() => true).catch(() => false);
    
    if (repoExists) {
      appendLog(`Repository exists, updating to latest version (${latestTag})...`);
      
      // Clean any local changes and update to latest tag
      const updateProcess = spawn('bash', ['-c', `cd "${deployDir}" && git fetch --tags && git reset --hard && git checkout ${latestTag} && git pull origin ${latestTag}`], { stdio: 'pipe' });
      
      await new Promise((resolve, reject) => {
        let output = '';
        updateProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        updateProcess.stderr.on('data', (data) => {
          output += data.toString();
        });
        updateProcess.on('close', (code) => {
          if (code === 0) {
            appendLog('Repository updated successfully');
            resolve();
          } else {
            appendLog(`Git update failed with code ${code}: ${output}`);
            appendLog('Falling back to fresh clone...');
            // If update fails, we'll fall through to clone logic
            resolve();
          }
        });
      });
    }
    
    // Clone repository if it doesn't exist or update failed
    const stillNeedsClone = !(await fs.access(deployDir).then(() => true).catch(() => false));
    if (stillNeedsClone || !repoExists) {
      appendLog(`Cloning AR.IO node repository (${latestTag})...`);
      
      const cloneProcess = spawn('git', [
        'clone',
        '--branch', latestTag,
        '--depth', '1',
        'https://github.com/ar-io/ar-io-node.git',
        deployDir
      ], { stdio: 'pipe' });
      
      await new Promise((resolve, reject) => {
        let output = '';
        cloneProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        cloneProcess.stderr.on('data', (data) => {
          output += data.toString();
        });
        cloneProcess.on('close', (code) => {
          if (code === 0) {
            appendLog('Repository cloned successfully');
            resolve();
          } else {
            appendLog(`Git clone failed with code ${code}: ${output}`);
            reject(new Error(`Git clone failed: ${output}`));
          }
        });
      });
    }
    
    // Repository cloned directly to deployment directory
    appendLog('Setting up deployment directory...');
    
    // Fetch admin dashboard files if dashboard is enabled
    if (config.dockerConfig.enableDashboard) {
      appendLog('Admin dashboard enabled - fetching dashboard files...');
      
      try {
        // Fetch .env.dashboard.example
        const envDashboardExampleUrl = 'https://raw.githubusercontent.com/Aluisyo/ar.io_admin_dashboard/main/.env.dashboard.example';
        const envDashboardResponse = await fetch(envDashboardExampleUrl);
        
        if (envDashboardResponse.ok) {
          const envDashboardContent = await envDashboardResponse.text();
          await fs.writeFile(`${deployDir}/.env.dashboard.example`, envDashboardContent, 'utf8');
          appendLog('✅ Downloaded .env.dashboard.example');
        } else {
          appendLog(`⚠️ Failed to download .env.dashboard.example: ${envDashboardResponse.status}`);
        }
        
        // Fetch docker-compose.dashboard.yml
        const dockerComposeUrl = 'https://raw.githubusercontent.com/Aluisyo/ar.io_admin_dashboard/main/docker-compose.dashboard.yml';
        const dockerComposeResponse = await fetch(dockerComposeUrl);
        
        if (dockerComposeResponse.ok) {
          const dockerComposeContent = await dockerComposeResponse.text();
          await fs.writeFile(`${deployDir}/docker-compose.dashboard.yml`, dockerComposeContent, 'utf8');
          appendLog('✅ Downloaded docker-compose.dashboard.yml');
        } else {
          appendLog(`⚠️ Failed to download docker-compose.dashboard.yml: ${dockerComposeResponse.status}`);
        }
        
        // Create .env.dashboard file with user configuration
        const dashboardEnvLines = [
          `ADMIN_USERNAME=${config.dashboardConfig.ADMIN_USERNAME}`,
          `ADMIN_PASSWORD=${config.dashboardConfig.ADMIN_PASSWORD}`,
          `NEXTAUTH_SECRET=${config.dashboardConfig.NEXTAUTH_SECRET || 'your-admin-api-key'}`,
          `NEXTAUTH_URL=${config.dashboardConfig.NEXTAUTH_URL || `http://localhost:${config.dashboardConfig.DASHBOARD_PORT}`}`,
          `AR_IO_NODE_PATH=${config.dashboardConfig.AR_IO_NODE_PATH || deployDir}`,
          `DOCKER_PROJECT=${config.dashboardConfig.DOCKER_PROJECT || 'ar-io-node'}`,
          `NEXT_PUBLIC_GRAFANA_URL=${config.dashboardConfig.NEXT_PUBLIC_GRAFANA_URL || `http://localhost:${config.dashboardConfig.GRAFANA_PORT}`}`,
          `ADMIN_API_KEY=${config.nodeConfig.ADMIN_API_KEY}`
        ];
        
        await fs.writeFile(`${deployDir}/.env.dashboard`, dashboardEnvLines.join('\n'), 'utf8');
        appendLog('✅ Created .env.dashboard with user configuration');
        
      } catch (error) {
        appendLog(`⚠️ Error fetching admin dashboard files: ${error.message}`);
      }
    }
    
    // Fix port mappings in docker-compose files
    const composeFiles = ['docker-compose.yaml'];
    
    // Fix main docker-compose.yaml
    appendLog('Fixing port mappings in docker-compose.yaml');
    let composeYaml = await fs.readFile(`${deployDir}/docker-compose.yaml`, 'utf8');
    
    composeYaml = fixPortMappings(composeYaml);
    
    await fs.writeFile(`${deployDir}/docker-compose.yaml`, composeYaml, 'utf8');
    appendLog('docker-compose.yaml updated with fixed port mappings');
    
    if (config.dockerConfig.enableAoCu) {
      appendLog('Fixing port mappings in docker-compose.ao.yaml');
      let aoYaml = await fs.readFile(`${deployDir}/docker-compose.ao.yaml`, 'utf8');
      aoYaml = fixPortMappings(aoYaml);
      await fs.writeFile(`${deployDir}/docker-compose.ao.yaml`, aoYaml, 'utf8');
      appendLog('docker-compose.ao.yaml updated with port mappings');
      composeFiles.push('docker-compose.ao.yaml');
    }
    if (config.dockerConfig.enableBundler) {
      appendLog('Fixing port mappings in docker-compose.bundler.yaml');
      let bundlerYaml = await fs.readFile(`${deployDir}/docker-compose.bundler.yaml`, 'utf8');
      bundlerYaml = fixPortMappings(bundlerYaml);
      await fs.writeFile(`${deployDir}/docker-compose.bundler.yaml`, bundlerYaml, 'utf8');
      appendLog('docker-compose.bundler.yaml updated with port mappings');
      composeFiles.push('docker-compose.bundler.yaml');
    }
    if (config.dockerConfig.enableGrafana) {
      const grafanaComposePath = `${deployDir}/docker-compose.grafana.yaml`;
      if (await fs.access(grafanaComposePath).then(() => true).catch(() => false)) {
        let grafanaCompose = await fs.readFile(grafanaComposePath, 'utf8');
        
        // Fix port mappings
        grafanaCompose = fixPortMappings(grafanaCompose);
        
        // Fix network external flag
        grafanaCompose = grafanaCompose.replace(
          /networks:\s*\n\s*ar-io-network:\s*\n\s*external:\s*true/g,
          'networks:\n  ar-io-network:'
        );
        
        // CRITICAL FIX: Remove problematic prometheus volumes section entirely
        // First remove the specific mount line
        grafanaCompose = grafanaCompose.replace(
          '      - ./prometheus.yml:/etc/prometheus/prometheus.yml',
          ''
        );
        
        // Then clean up empty volumes: sections (with any whitespace)
        grafanaCompose = grafanaCompose.replace(
          /\s*volumes:\s*\n(\s*\n)+/g,
          '\n'
        );
        
        // Also handle volumes: followed by next section
        grafanaCompose = grafanaCompose.replace(
          /\s*volumes:\s*\n(\s*)([a-zA-Z])/g,
          '\n$1$2'
        );
        
        await fs.writeFile(grafanaComposePath, grafanaCompose, 'utf8');
        appendLog('Fixed Grafana compose file: port mappings, network config, and removed problematic prometheus.yml mount');
      }
      composeFiles.push('docker-compose.grafana.yaml');
    }
    
    // Add dashboard compose file if dashboard is enabled
    if (config.dockerConfig.enableDashboard) {
      const dashboardComposePath = `${deployDir}/docker-compose.dashboard.yml`;
      if (await fs.access(dashboardComposePath).then(() => true).catch(() => false)) {
        let dashboardCompose = await fs.readFile(dashboardComposePath, 'utf8');
        
        // Fix port mappings in dashboard compose
        dashboardCompose = fixPortMappings(dashboardCompose);
        
        // Fix dashboard port mapping specifically (dashboard uses port 3001 internally)
        dashboardCompose = dashboardCompose.replace(
          /ports:\s*\n\s*-\s*["']?\d+:3001["']?/g,
          `ports:\n      - "\${DASHBOARD_PORT:-${config.dashboardConfig.DASHBOARD_PORT}}:3001"`
        );
        
        // Also handle single-line port mappings
        dashboardCompose = dashboardCompose.replace(
          /["']?\d+:3001["']?/g, 
          `"\${DASHBOARD_PORT:-${config.dashboardConfig.DASHBOARD_PORT}}:3001"`
        );
        
        await fs.writeFile(dashboardComposePath, dashboardCompose, 'utf8');
        appendLog('Fixed dashboard compose file: port mappings updated');
        composeFiles.push('docker-compose.dashboard.yml');
      } else {
        appendLog('⚠️ Dashboard compose file not found, dashboard may not be deployed');
      }
    }

    // ClickHouse files are already available in the cloned repository
    if (config.dockerConfig.enableClickhouse) {
      appendLog('ClickHouse configuration files available in cloned repository');
    }

    // Use original AR.IO repository configuration without custom overrides
    appendLog('Using original AR.IO repository docker-compose configuration');

    // .env example files are already available in the cloned repository
    appendLog('.env example files available in cloned repository');
    
    // Clean up old .env file if it exists and regenerate fresh
    try {
      await fs.unlink(`${deployDir}/.env`);
      appendLog('Removed existing .env file');
    } catch (err) {
      // File doesn't exist, which is fine
      appendLog('No existing .env file to remove');
    }
    
    // Write our fresh .env file
    await fs.writeFile(`${deployDir}/.env`, envContent, 'utf8');
    appendLog('.env file regenerated with current configuration');
    
    // CRITICAL: Write observer wallet JSON BEFORE starting containers (only observer needs JWK file)
    if (config.nodeConfig?.OBSERVER_JWK && config.nodeConfig?.OBSERVER_WALLET) {
      const walletsDir = `${deployDir}/wallets`;
      await fs.mkdir(walletsDir, { recursive: true });
      const walletFileName = `${config.nodeConfig.OBSERVER_WALLET}.json`;
      const walletFilePath = `${walletsDir}/${walletFileName}`;
      
      await fs.writeFile(walletFilePath, config.nodeConfig.OBSERVER_JWK, 'utf8');
      appendLog(`✅ Observer wallet created: ${walletFileName}`);
    }
    
    // CRITICAL: Ensure Grafana data directory exists (provisioning dirs already exist in repo)
    if (config.dockerConfig.enableGrafana) {
      await fs.mkdir(`${deployDir}/data/grafana`, { recursive: true });
      appendLog('Ensured Grafana data directory exists');
    }
    
    // CRITICAL: Ensure AR.IO core data directories exist
    const coreDataDirectories = [
      `${deployDir}/data/sqlite`,
      `${deployDir}/data/lmdb`, 
      `${deployDir}/data/chunks`,
      `${deployDir}/data/contiguous`,
      `${deployDir}/data/headers`,
      `${deployDir}/data/tmp`,
      `${deployDir}/data/reports`,
      `${deployDir}/wallets`
    ];
    
    for (const dir of coreDataDirectories) {
      await fs.mkdir(dir, { recursive: true });
    }
    appendLog('Ensured AR.IO core data directories exist');
    
    // CRITICAL: Fix Prometheus configuration for AR.IO node metrics scraping
    if (config.dockerConfig.enableGrafana) {
      const prometheusConfig = `global:
  scrape_interval: 15s # 5 minute scrape interval
  evaluation_interval: 1m # Evaluate rules every 1 minute.

scrape_configs:
  - job_name: 'prometheus' # Scrape configuration for Prometheus itself
    static_configs:
      - targets: ['prometheus:9090']

  - job_name: 'node_exporter' # Scrape server stats
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'ar-io-node' # Scrape our node
    metrics_path: '/ar-io/__gateway_metrics'
    static_configs:
      - targets: ['envoy:3000']

  - job_name: 'ao-cu' # Scrape our compute unit
    metrics_path: '/ao/cu/metrics'
    static_configs:
      - targets: ['envoy:3000']
`;
      
      // Write prometheus config to root directory (matches original AR.IO setup)
      await fs.writeFile(`${deployDir}/prometheus.yml`, prometheusConfig, 'utf8');
      appendLog('Created Prometheus configuration with AR.IO node metrics scraping');
    }
    
    // Create docker-compose.override.yaml for network configuration and conditional Grafana permissions
    let overrideYaml = `# Docker Compose override to fix network configuration
networks:
  ar-io-network:
    name: \${DOCKER_NETWORK_NAME:-ar-io-network}
    external: false
`;
    
    // Only add Grafana service override if Grafana is enabled
    if (config.dockerConfig.enableGrafana) {
      overrideYaml += `
services:
  grafana:
    user: "0:0"  # Run as root to fix /var/lib/grafana permissions
`;
    }
    
    await fs.writeFile(`${deployDir}/docker-compose.override.yaml`, overrideYaml, 'utf8');
    appendLog('Created docker-compose.override.yaml with network configuration');
    composeFiles.push('docker-compose.override.yaml');
    appendLog('Added docker-compose.override.yaml as LAST compose file for precedence');
    
    // Log essential port configuration
    if (config.dashboardConfig.ENABLE_ENVOY) {
      appendLog(`Gateway accessible at: http://localhost:${config.dashboardConfig.ENVOY_PORT}`);
    }
    appendLog(`Core API accessible at: http://localhost:${config.nodeConfig.CORE_PORT}`);
    if (config.dockerConfig.enableDashboard) {
      appendLog(`Admin Dashboard will be accessible at: http://localhost:${config.dashboardConfig.DASHBOARD_PORT}`);
    }
    // Write module-specific env files
    if (config.dockerConfig.enableAoCu) {
      const dd = config.dashboardConfig;
      const aoLines = [
        `CU_WALLET=${dd.CU_WALLET}`,
        `PROCESS_CHECKPOINT_TRUSTED_OWNERS=${dd.PROCESS_CHECKPOINT_TRUSTED_OWNERS}`,
        `GATEWAY_URL=${dd.GATEWAY_URL}`,
        `UPLOADER_URL=${dd.UPLOADER_URL}`
      ];
      if (dd.ADDITIONAL_AO_CU_ENV) dd.ADDITIONAL_AO_CU_ENV.split('\n').forEach(l => aoLines.push(l));
      await fs.writeFile(`${deployDir}/.env.ao`, aoLines.join('\n'), 'utf8');
      appendLog('.env.ao written');
    }
    if (config.dockerConfig.enableBundler) {
      const dd = config.dashboardConfig;
      
      // Derive bundler address from wallet if not provided
      let bundlerAddress = dd.BUNDLER_ARWEAVE_ADDRESS || '';
      
      // Always try to derive from wallet if wallet is provided
      if (dd.BUNDLER_ARWEAVE_WALLET) {
        try {
          const arweave = Arweave.init({});
          const walletJwk = JSON.parse(dd.BUNDLER_ARWEAVE_WALLET);
          const derivedAddress = await arweave.wallets.jwkToAddress(walletJwk);
          if (derivedAddress) {
            bundlerAddress = derivedAddress;
            appendLog(`✅ Derived bundler address from wallet: ${bundlerAddress}`);
          } else {
            appendLog(`⚠️ Wallet derivation returned empty address`);
          }
        } catch (err) {
          appendLog(`⚠️ Failed to derive bundler address from wallet: ${err.message}`);
          // Keep existing address or empty string
        }
      }
      
      // Ensure we always have a value (even if empty)
      bundlerAddress = bundlerAddress || '';
      appendLog(`📝 Final bundler address: '${bundlerAddress}'`);
      
      // Update the config with the derived address so it's available for main .env file
      config.dashboardConfig.BUNDLER_ARWEAVE_ADDRESS = bundlerAddress;
      
      if (!bundlerAddress) {
        appendLog(`⚠️ Warning: BUNDLER_ARWEAVE_ADDRESS is empty - this may cause bundler issues`);
      }
      
      const bundlerLines = [
        `BUNDLER_ARWEAVE_WALLET=${dd.BUNDLER_ARWEAVE_WALLET}`,
        `BUNDLER_ARWEAVE_ADDRESS=${bundlerAddress}`,
        `APP_NAME=${dd.APP_NAME}`,
        `ANS104_INDEX_FILTER=${dd.ANS104_INDEX_FILTER}`,
        `ANS104_UNBUNDLE_FILTER=${dd.ANS104_UNBUNDLE_FILTER}`
      ];
      ['AWS_S3_CONTIGUOUS_DATA_BUCKET','AWS_S3_CONTIGUOUS_DATA_PREFIX','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_REGION','AWS_ENDPOINT'].forEach(key => {
        if (dd[key]) bundlerLines.push(`${key}=${dd[key]}`);
      });
      await fs.writeFile(`${deployDir}/.env.bundler`, bundlerLines.join('\n'), 'utf8');
      appendLog('.env.bundler written');
    }
    
    // Tear down previous deployment if present (preserving data volumes)
    appendLog('Tearing down any existing containers');
    try {
      // Build profiles for down command
      const downProfiles = [];
      if (config.dockerConfig.enableClickhouse) {
        downProfiles.push('--profile clickhouse');
      }
      if (config.dockerConfig.enableLitestream) {
        downProfiles.push('--profile litestream');
      }
      
      const downCmd = `docker compose -p ar-io-node ${composeFiles.map(f => `-f ${f}`).join(' ')} ${downProfiles.join(' ')} down --remove-orphans`;
      await execPromise(downCmd, { cwd: deployDir });
      appendLog('Existing containers removed (data volumes preserved)');
    } catch (err) {
      appendLog(`No existing containers to remove: ${err.message}`);
    }
    
    // Selective cleanup to prevent mount conflicts without losing data
    appendLog('Performing selective Docker cleanup...');
    try {
      // Stop any containers that might be using our files
      await execPromise('docker stop $(docker ps -q --filter "name=ar-io-node") 2>/dev/null || true');
      appendLog('Stopped any running ar-io-node containers');
      
      // Remove any containers that might have cached mount points
      await execPromise('docker rm $(docker ps -aq --filter "name=ar-io-node") 2>/dev/null || true');
      appendLog('Removed any ar-io-node containers');
      
      // Only remove specific problematic volumes, not all volumes
      // This is safer than 'docker volume prune -f' which removes ALL unused volumes
      appendLog('Skipping volume cleanup to preserve data');
      
    } catch (err) {
      appendLog(`Docker cleanup warning: ${err.message}`);
    }
    // Docker Compose will handle network creation automatically

    // 2. Run docker compose up -d
    // Let Docker Compose handle service dependencies automatically
    // Redis is always required (core depends on it)
    // Observer, Envoy are controlled by their environment variables
    
    // Ensure we only use explicitly selected compose files by using --file for each
    const composeArgs = ['compose', '-p', 'ar-io-node'];
    
    composeFiles.forEach(f => {
      composeArgs.push('-f', f);
    });
    
    // Add profiles for advanced services
    const profiles = [];
    if (config.dockerConfig.enableClickhouse) {
      profiles.push('clickhouse');
      appendLog('Enabling ClickHouse profile');
    }
    if (config.dockerConfig.enableLitestream) {
      profiles.push('litestream');
      appendLog('Enabling Litestream profile');
    }
    
    // Add profile arguments
    profiles.forEach(profile => {
      composeArgs.push('--profile', profile);
    });
    
    // Debug: Log which compose files and profiles will be used
    appendLog(`Using compose files: ${composeFiles.join(', ')}`);
    if (profiles.length > 0) {
      appendLog(`Using profiles: ${profiles.join(', ')}`);
    }
    
    // Add specific services to start based on user selection
    const servicesToStart = ['core', 'redis']; // Core and Redis are always required
    
    // Add services based on user configuration
    if (config.dashboardConfig.ENABLE_ENVOY) {
      servicesToStart.push('envoy');
      appendLog('Including Envoy proxy service');
    }
    
    if (config.nodeConfig.RUN_OBSERVER) {
      servicesToStart.push('observer');
      appendLog('Including Observer service');
    }
    
    // Add autoheal only if explicitly enabled
    if (config.dockerConfig.enableAutoheal) {
      servicesToStart.push('autoheal');
      appendLog('Including Autoheal service');
    }
    
    // Add ClickHouse services if enabled (these use profiles)
    if (config.dockerConfig.enableClickhouse) {
      servicesToStart.push('clickhouse', 'clickhouse-auto-import');
      appendLog('Including ClickHouse analytics services');
    }
    
    // Add Litestream backup service if enabled (uses profile)
    if (config.dockerConfig.enableLitestream) {
      servicesToStart.push('litestream');
      appendLog('Including Litestream SQLite backup service');
    }
    
    // Add Bundler services if enabled
    if (config.dockerConfig.enableBundler) {
      servicesToStart.push('upload-service', 'fulfillment-service', 'upload-service-pg', 'localstack');
      appendLog('Including Turbo ANS-104 Bundler services');
    }
    
    // Add AO Compute Unit service if enabled
    if (config.dockerConfig.enableAoCu) {
      servicesToStart.push('ao-cu');
      appendLog('Including AO Compute Unit service');
    }
    
    // Add Grafana monitoring services if enabled
    if (config.dockerConfig.enableGrafana) {
      servicesToStart.push('prometheus', 'grafana', 'node-exporter');
      appendLog('Including Grafana monitoring services');
    }
    
    // Add Admin Dashboard service if enabled
    if (config.dockerConfig.enableDashboard) {
      servicesToStart.push('admin-dashboard');
      appendLog('Including Admin Dashboard service');
    }
    
    // Start all services at once
    appendLog(`Starting all services: ${servicesToStart.join(', ')}`);
    
    const allArgs = [...composeArgs, 'up', '-d', ...servicesToStart];
    
    const cp = spawn('docker', allArgs, {
      cwd: deployDir,
    });
    
    // Track the deployment process for cancellation
    currentDeploymentProcess = cp;
    
    const allPossibleServices = ['envoy', 'observer', 'autoheal', 'clickhouse', 'clickhouse-auto-import', 'litestream'];
    const notStarted = allPossibleServices.filter(s => !servicesToStart.includes(s));
    appendLog(`Services NOT started: ${notStarted.join(', ') || 'none'}`);
    
    // Set up process event handlers

    cp.stdout.on('data', (d) => {
      if (!deploymentCancelled) appendLog(d.toString().trim());
    });
    cp.stderr.on('data', (d) => {
      if (!deploymentCancelled) appendLog(d.toString().trim());
    });
    cp.on('close', async (code) => {
      if (deploymentCancelled) {
        appendLog('Deployment was cancelled');
      } else {
        appendLog(`docker compose exited with code ${code}`);
        
        // Post-deployment fixes for volume mount issues
        if (code === 0) {
          try {
            // Wait a moment for containers to fully start
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Fix observer wallet volume mount issue
            if (config.nodeConfig?.OBSERVER_JWK && config.nodeConfig?.OBSERVER_WALLET && config.nodeConfig?.RUN_OBSERVER) {
              const walletFileName = `${config.nodeConfig.OBSERVER_WALLET}.json`;
              const hostWalletPath = `${deployDir}/wallets/${walletFileName}`;
              
              try {
                // Verify wallet file exists on host
                await fs.access(hostWalletPath);
                
                // Copy wallet file into observer container
                await execPromise(`docker cp ${hostWalletPath} ar-io-node-observer-1:/app/wallets/${walletFileName}`, { cwd: deployDir });
                appendLog(`✅ Copied observer wallet to container: ${walletFileName}`);
                
                // Restart observer to pick up wallet file
                await execPromise(`docker compose ${composeArgs.slice(1).join(' ')} restart observer`, { cwd: deployDir });
                appendLog('✅ Restarted observer to load wallet file');
              } catch (walletErr) {
                appendLog(`⚠️ Observer wallet fix failed: ${walletErr.message}`);
              }
            }
            
            // Fix Prometheus configuration
            if (config.dockerConfig.enableGrafana) {
              try {
                await execPromise(`docker cp ${deployDir}/prometheus.yml ar-io-node-prometheus-1:/etc/prometheus/prometheus.yml`, { cwd: deployDir });
                appendLog('✅ Copied Prometheus configuration to container');
                
                await execPromise(`docker compose ${composeArgs.slice(1).join(' ')} restart prometheus`, { cwd: deployDir });
                appendLog('✅ Restarted Prometheus to reload configuration');
              } catch (prometheusErr) {
                appendLog(`⚠️ Prometheus fix failed: ${prometheusErr.message}`);
              }
              
              // Fix Grafana provisioning directories (same approach as Prometheus)
              try {
                // Copy provisioning files into Grafana container
                await execPromise(`docker cp ${deployDir}/monitoring/grafana/provisioning/datasources ar-io-node-grafana-1:/etc/grafana/provisioning/`, { cwd: deployDir });
                appendLog('✅ Copied Grafana datasources provisioning to container');
                
                await execPromise(`docker cp ${deployDir}/monitoring/grafana/provisioning/dashboards ar-io-node-grafana-1:/etc/grafana/provisioning/`, { cwd: deployDir });
                appendLog('✅ Copied Grafana dashboards provisioning to container');
                
                // Copy actual dashboard JSON files
                await execPromise(`docker cp ${deployDir}/monitoring/grafana/dashboards ar-io-node-grafana-1:/etc/grafana/`, { cwd: deployDir });
                appendLog('✅ Copied Grafana dashboard JSON files to container');
                
                // Restart Grafana to reload provisioning
                await execPromise(`docker compose ${composeArgs.slice(1).join(' ')} restart grafana`, { cwd: deployDir });
                appendLog('✅ Restarted Grafana to reload provisioning');
              } catch (grafanaErr) {
                appendLog(`⚠️ Grafana provisioning fix failed: ${grafanaErr.message}`);
              }
            }
            
            appendLog('🎉 Post-deployment fixes completed!');
          } catch (err) {
            appendLog(`⚠️ Post-deployment fix warning: ${err.message}`);
          }
        }
      }
      currentDeploymentProcess = null;
    });

    return res.json({ status: 'started' });
  } catch (err) {
    console.error('DEBUG: Deployment error caught:', err);
    appendLog(`Deployment error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// GET /health – simple health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /app-debug – debug version of the React app
app.get('/app-debug', (_, res) => {
  res.sendFile(path.join(__dirname, '../dist/index-debug.html'));
});

// GET /debug – comprehensive test page
app.get('/debug', (_, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Debug Test</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
        .success { background: #d4edda; }
        .error { background: #f8d7da; }
      </style>
    </head>
    <body>
      <h1>AR.IO Setup Wizard - Debug Test</h1>
      <div id="tests"></div>
      
      <script>
        const tests = document.getElementById('tests');
        
        function addTest(name, success, message) {
          const div = document.createElement('div');
          div.className = 'test ' + (success ? 'success' : 'error');
          div.innerHTML = '<strong>' + name + ':</strong> ' + message;
          tests.appendChild(div);
        }
        
        // Test 1: Basic JavaScript
        addTest('JavaScript', true, 'Working correctly');
        
        // Test 2: API URL construction
        const apiUrl = window.location.protocol + '//' + window.location.hostname + ':5001';
        addTest('API URL', true, 'Constructed as: ' + apiUrl);
        
        // Test 3: Health check API call
        fetch('/health')
          .then(response => response.json())
          .then(data => {
            addTest('Health API', true, 'Response: ' + JSON.stringify(data));
          })
          .catch(error => {
            addTest('Health API', false, 'Error: ' + error.message);
          });
        
        // Test 4: Check if React would work
        try {
          const testDiv = document.createElement('div');
          testDiv.id = 'root';
          addTest('DOM Manipulation', true, 'Can create elements for React');
        } catch (error) {
          addTest('DOM Manipulation', false, 'Error: ' + error.message);
        }
        
        console.log('Debug page loaded successfully');
      </script>
    </body>
    </html>
  `);
});

// GET /logs – stream or dump current logs
app.get('/logs', (_, res) => {
  res.json({ logs: deploymentLogs });
});

// GET /status – very naive container status (checks if core container is running)
app.get('/status', (_, res) => {
  const cp = spawn('docker', ['ps', '--filter', 'name=ar-io-node-core', '--format', '{{.Status}}']);
  let out = '';
  cp.stdout.on('data', (d) => (out += d.toString()));
  cp.on('close', () => {
    const running = out.trim().length > 0;
    res.json({ running, raw: out.trim() });
  });
});

// POST /cancel – cancel ongoing deployment
app.post('/cancel', (_, res) => {
  try {
    appendLog('Cancel deployment requested');
    deploymentCancelled = true;
    
    if (currentDeploymentProcess) {
      appendLog('Killing deployment process...');
      
      // Kill the Docker Compose process
      try {
        currentDeploymentProcess.kill('SIGTERM');
        appendLog('Deployment process terminated');
      } catch (killErr) {
        appendLog(`Warning: Could not kill process: ${killErr.message}`);
      }
      
      // Also try to stop the containers
      const stopProcess = spawn('docker', ['compose', '-p', 'ar-io-node', 'down'], {
        cwd: '/tmp/ar-io-node'
      });
      
      stopProcess.stdout.on('data', (d) => appendLog(`Docker down: ${d.toString().trim()}`));
      stopProcess.stderr.on('data', (d) => appendLog(`Docker down error: ${d.toString().trim()}`));
      stopProcess.on('close', (code) => {
        appendLog(`Docker compose down exited with code ${code}`);
      });
      
      res.json({ status: 'cancelled' });
    } else {
      appendLog('No deployment process running, marking as cancelled anyway');
      res.json({ status: 'no_deployment_running' });
    }
  } catch (err) {
    appendLog(`Cancel error: ${err.message}`);
    // Still return success to avoid confusing the UI
    res.json({ status: 'cancelled', warning: err.message });
  }
});

// Util: map wizard DeploymentConfig -> .env lines
function buildEnvFile({ nodeConfig, dashboardConfig, dockerConfig }) {
  const lines = [];
  const seen = new Set();
  
  // Helper function to check if a value should be included
  const shouldIncludeValue = (key, value) => {
    if (value == null || value === '') return false;
    
    // Skip default/placeholder values that shouldn't be in production .env
    const defaultValues = {
      'AWS_ACCESS_KEY_ID': 'test',
      'AWS_SECRET_ACCESS_KEY': 'test',
      'AWS_ENDPOINT': 'http://localstack:4566',
      'ADMIN_USERNAME': 'admin',
      'ADMIN_PASSWORD': '',
      'SSL_CERT_PATH': '',
      'SSL_KEY_PATH': ''
    };
    
    return defaultValues[key] !== value;
  };
  // Core node configuration (always included)
  const coreNodeConfigs = [
    'AR_IO_WALLET', 'OBSERVER_WALLET', 'ADMIN_API_KEY', 'ADMIN_API_KEY_FILE', 'GRAPHQL_HOST', 'GRAPHQL_PORT',
    'ARNS_ROOT_HOST', 'START_HEIGHT', 'STOP_HEIGHT', 'TRUSTED_ARWEAVE_URL', 'TRUSTED_NODE_URL',
    'TRUSTED_GATEWAY_URL', 'TRUSTED_ARNS_GATEWAY_URL', 'INSTANCE_ID', 'LOG_FORMAT', 'LOG_FILTER',
    'WEBHOOK_TARGET_SERVERS', 'WEBHOOK_INDEX_FILTER', 'WEBHOOK_BLOCK_FILTER',
    'SKIP_CACHE', 'FILTER_CHANGE_REPROCESS', 'SANDBOX_PROTOCOL', 'SIMULATED_REQUEST_FAILURE_RATE',
    'START_WRITERS', 'RUN_OBSERVER', 'ENABLE_MEMPOOL_WATCHER', 'MEMPOOL_POLLING_INTERVAL_MS',
    'BACKFILL_BUNDLE_RECORDS',
    'NODE_MAX_OLD_SPACE_SIZE', 'RUN_AUTOHEAL',
    // Core AR.IO node ports (from official .env.example)
    'CORE_PORT', 'ENVOY_PORT', 'OBSERVER_PORT',
    // Chain cache configuration (core node settings)
    'CHAIN_CACHE_TYPE', 'REDIS_CACHE_URL', 'REDIS_USE_TLS', 'REDIS_CACHE_TTL_SECONDS'
  ];
  
  // Service-specific configurations (from nodeConfig)
  const serviceSpecificNodeConfigs = {
    bundler: []
  };
  
  // Service-specific configurations (from dashboardConfig)
  const serviceSpecificDashboardConfigs = {
    // Envoy service-specific configs
    envoy: ['ENVOY_PORT'],
    // Redis service-specific configs (memory and flags only)
    redis: ['REDIS_MAX_MEMORY', 'EXTRA_REDIS_FLAGS'],
    // ClickHouse service-specific configs
    clickhouse: ['CLICKHOUSE_PORT', 'CLICKHOUSE_PORT_2', 'CLICKHOUSE_PORT_3', 'CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD'],
    // Litestream service-specific configs
    litestream: ['AR_IO_SQLITE_BACKUP_S3_BUCKET_NAME', 'AR_IO_SQLITE_BACKUP_S3_BUCKET_REGION', 
                'AR_IO_SQLITE_BACKUP_S3_BUCKET_ACCESS_KEY', 'AR_IO_SQLITE_BACKUP_S3_BUCKET_SECRET_KEY',
                'AR_IO_SQLITE_BACKUP_S3_BUCKET_PREFIX']
  };
  
  // Add core node configs
  coreNodeConfigs.forEach(key => {
    if (nodeConfig[key] != null && nodeConfig[key] !== '' && !seen.has(key)) {
      lines.push(`${key}=${nodeConfig[key]}`);
      seen.add(key);
    }
  });
  
  // Add service-specific node configs only when services are enabled
  if (dockerConfig.enableBundler) {
    serviceSpecificNodeConfigs.bundler.forEach(key => {
      if (nodeConfig[key] != null && nodeConfig[key] !== '' && !seen.has(key)) {
        lines.push(`${key}=${nodeConfig[key]}`);
        seen.add(key);
      }
    });
  }
  
  // Determine if any services are enabled
  const anyServiceEnabled = dockerConfig.enableBundler || dockerConfig.enableAoCu || 
                           dockerConfig.enableGrafana || dockerConfig.enableDashboard ||
                           dockerConfig.enableClickhouse || dockerConfig.enableLitestream ||
                           dockerConfig.enableAutoheal;
  
  // Add Envoy service-specific configs when Envoy is enabled
  if (dockerConfig.useEnvoy) {
    serviceSpecificDashboardConfigs.envoy.forEach(key => {
      if (dashboardConfig[key] != null && dashboardConfig[key] !== '' && !seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }
  
  // Add service-specific dashboard configs only when services are enabled
  if (anyServiceEnabled) {
    serviceSpecificDashboardConfigs.redis.forEach(key => {
      if (dashboardConfig[key] != null && dashboardConfig[key] !== '' && !seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }
  
  // Add ClickHouse configs when ClickHouse is enabled
  if (dashboardConfig.ENABLE_CLICKHOUSE) {
    serviceSpecificDashboardConfigs.clickhouse.forEach(key => {
      if (dashboardConfig[key] != null && dashboardConfig[key] !== '' && !seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }
  
  // Add Litestream configs when Litestream is enabled
  if (dashboardConfig.ENABLE_LITESTREAM) {
    serviceSpecificDashboardConfigs.litestream.forEach(key => {
      if (dashboardConfig[key] != null && dashboardConfig[key] !== '' && !seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }

  // Include additional raw env lines
  if (nodeConfig.ADDITIONAL_ENV) {
    nodeConfig.ADDITIONAL_ENV.split('\n').forEach(line => {
      if (line.trim()) lines.push(line);
    });
  }
  // Only include dashboard/service configs if services are enabled
  // Core dashboard configs (always needed if any service is enabled)
  const coreConfigs = ['CORE_PORT'];
  
  // Add core configs if any service is enabled
  if (anyServiceEnabled || dockerConfig.useEnvoy) {
    coreConfigs.forEach(key => {
      if (!seen.has(key) && shouldIncludeValue(key, nodeConfig[key])) {
        lines.push(`${key}=${nodeConfig[key]}`);
        seen.add(key);
      }
    });
    
    // Ensure ENVOY_PORT is always included if Envoy is enabled
    if (dockerConfig.useEnvoy && !seen.has('ENVOY_PORT') && shouldIncludeValue('ENVOY_PORT', dashboardConfig.ENVOY_PORT)) {
      lines.push(`ENVOY_PORT=${dashboardConfig.ENVOY_PORT}`);
      seen.add('ENVOY_PORT');
    }
    
    // Add admin credentials only if dashboard is enabled
    if (dockerConfig.enableDashboard) {
      const adminConfigs = ['ADMIN_API_KEY', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
      adminConfigs.forEach(key => {
        if (!seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
          lines.push(`${key}=${dashboardConfig[key]}`);
          seen.add(key);
        }
      });
    }
  }
  
  // Bundler-specific configs
  if (dockerConfig.enableBundler) {
    const bundlerConfigs = [
      'BUNDLER_ARWEAVE_WALLET', 'BUNDLER_ARWEAVE_ADDRESS', 'GATEWAY_URL', 'UPLOADER_URL', 'APP_NAME', 'ANS104_INDEX_FILTER', 'ANS104_UNBUNDLE_FILTER',
      'AWS_S3_CONTIGUOUS_DATA_BUCKET', 'AWS_S3_CONTIGUOUS_DATA_PREFIX', 'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_ENDPOINT', 'ALLOW_LISTED_ADDRESSES'
    ];
    bundlerConfigs.forEach(key => {
      if (!seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }
  
  // AO CU specific configs
  if (dockerConfig.enableAoCu) {
    const aoCuConfigs = ['CU_WALLET', 'PROCESS_CHECKPOINT_TRUSTED_OWNERS', 'ADDITIONAL_AO_CU_ENV'];
    aoCuConfigs.forEach(key => {
      if (!seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }
  
  // Grafana specific configs
  if (dockerConfig.enableGrafana) {
    const grafanaConfigs = ['GRAFANA_PORT'];
    grafanaConfigs.forEach(key => {
      if (!seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }
  
  // ClickHouse specific configs
  if (dockerConfig.enableClickhouse) {
    const clickhouseConfigs = ['CLICKHOUSE_PORT'];
    clickhouseConfigs.forEach(key => {
      if (!seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }
  
  // Dashboard specific configs
  if (dockerConfig.enableDashboard) {
    const dashboardOnlyConfigs = ['DASHBOARD_PORT'];
    dashboardOnlyConfigs.forEach(key => {
      if (!seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }
  
  // SSL configs (if enabled)
  if (dockerConfig.enableSsl) {
    const sslConfigs = ['ENABLE_SSL', 'SSL_CERT_PATH', 'SSL_KEY_PATH'];
    sslConfigs.forEach(key => {
      if (!seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }
  // Feature toggles (only add if not already present)

  if (dockerConfig.enableAoCu && !seen.has('ENABLE_AO_CU')) {
    lines.push('ENABLE_AO_CU=true');
    seen.add('ENABLE_AO_CU');
  }
  if (dockerConfig.enableGrafana && !seen.has('ENABLE_GRAFANA')) {
    lines.push('ENABLE_GRAFANA=true');
    seen.add('ENABLE_GRAFANA');
  }
  if (dockerConfig.enableDashboard && !seen.has('ENABLE_DASHBOARD')) {
    lines.push('ENABLE_DASHBOARD=true');
    seen.add('ENABLE_DASHBOARD');
  }
  
  // Advanced services feature toggles
  if (dockerConfig.enableClickhouse && !seen.has('ENABLE_CLICKHOUSE')) {
    lines.push('ENABLE_CLICKHOUSE=true');
    seen.add('ENABLE_CLICKHOUSE');
  }
  if (dockerConfig.enableLitestream && !seen.has('ENABLE_LITESTREAM')) {
    lines.push('ENABLE_LITESTREAM=true');
    seen.add('ENABLE_LITESTREAM');
  }
  if (dockerConfig.enableAutoheal && !seen.has('ENABLE_AUTOHEAL')) {
    lines.push('ENABLE_AUTOHEAL=true');
    seen.add('ENABLE_AUTOHEAL');
  }
  
  // Redis configuration (if any service uses Redis)
  if (anyServiceEnabled) {
    const redisConfigs = ['REDIS_MAX_MEMORY', 'EXTRA_REDIS_FLAGS'];
    redisConfigs.forEach(key => {
      if (!seen.has(key) && shouldIncludeValue(key, dashboardConfig[key])) {
        lines.push(`${key}=${dashboardConfig[key]}`);
        seen.add(key);
      }
    });
  }
  
  return lines.join('\n');
}

// Fallback route for SPA - serve index.html for any non-API routes
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/deploy') || req.path.startsWith('/logs') || 
      req.path.startsWith('/status') || req.path.startsWith('/cancel') || 
      req.path.startsWith('/health')) {
    return next();
  }
  
  // For non-API routes, serve the built frontend with error handling
  if (req.method === 'GET') {
    const indexPath = path.join(__dirname, '../dist/index.html');
    
    // Add error handling for file serving
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error Loading App</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body>
            <h1>Error Loading AR.IO Setup Wizard</h1>
            <p>There was an error loading the application.</p>
            <p>Error: ${err.message}</p>
            <p><a href="/debug">Try Debug Page</a></p>
          </body>
          </html>
        `);
      }
    });
  } else {
    next();
  }
});

const PORT = 5001;
const HTTPS_PORT = 5443;

// HTTP Server
console.log('🚀 Starting AR.IO Gateway Node Setup Wizard...');
console.log('📂 Working directory:', process.cwd());
console.log('🌐 Binding to all interfaces (0.0.0.0)...');

// Add error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server ready at http://0.0.0.0:${PORT}`);
  console.log(`📱 Access from network: http://YOUR_IP:${PORT}`);
  console.log('🔄 Waiting for requests... (Press Ctrl+C to stop)');
});


