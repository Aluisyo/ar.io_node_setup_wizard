import React from 'react';
import { DeploymentConfig } from '../../types';
import { Server, Globe, Package, Cpu, Copy, Download, FileText, BarChart2 } from 'lucide-react';

interface ReviewStepProps {
  config: DeploymentConfig;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ config }) => {
  const generateEnvFile = () => {
    const lines: string[] = [];
    const seen = new Set<string>();
    
    // Header
    lines.push(`# AR.IO .env generated on ${new Date().toISOString()}`);
    
    // Helper function to check if a value should be included
    const shouldIncludeValue = (key: string, value: any) => {
      if (value == null || value === '') return false;
      
      // Skip default/placeholder values that shouldn't be in production .env
      const defaultValues: Record<string, any> = {
        'AWS_ACCESS_KEY_ID': 'test',
        'AWS_SECRET_ACCESS_KEY': 'test',
        'AWS_ENDPOINT': 'http://localstack:4566',
        'ADMIN_USERNAME': 'admin',
        'ADMIN_PASSWORD': '',
        'SSL_CERT_PATH': '',
        'SSL_KEY_PATH': '',
        'BUNDLER_ARWEAVE_WALLET': '',
        'CU_WALLET': '',
        'OBSERVER_WALLET': ''
      };
      
      return defaultValues[key] !== value;
    };
    
    // Core node configuration (always included)
    const coreNodeConfigs = [
      'AR_IO_WALLET', 'OBSERVER_WALLET', 'ADMIN_API_KEY', 'GRAPHQL_HOST', 'GRAPHQL_PORT',
      'ARNS_ROOT_HOST', 'START_HEIGHT', 'STOP_HEIGHT', 'TRUSTED_ARWEAVE_URL', 'TRUSTED_NODE_URL',
      'TRUSTED_GATEWAY_URL', 'TRUSTED_ARNS_GATEWAY_URL', 'INSTANCE_ID', 'LOG_FORMAT', 'LOG_FILTER',
      'WEBHOOK_TARGET_SERVERS', 'WEBHOOK_INDEX_FILTER', 'WEBHOOK_BLOCK_FILTER',
      'SKIP_CACHE', 'FILTER_CHANGE_REPROCESS', 'SANDBOX_PROTOCOL', 'SIMULATED_REQUEST_FAILURE_RATE',
      'START_WRITERS', 'RUN_OBSERVER', 'ENABLE_MEMPOOL_WATCHER', 'MEMPOOL_POLLING_INTERVAL_MS',
      'NODE_MAX_OLD_SPACE_SIZE',
      // Core AR.IO node ports
      'CORE_PORT',
      // Chain cache configuration (core node settings)
      'CHAIN_CACHE_TYPE', 'REDIS_CACHE_URL', 'REDIS_USE_TLS', 'REDIS_CACHE_TTL_SECONDS'
    ];
    
    // Service-specific configurations (from nodeConfig)
    const serviceSpecificNodeConfigs: Record<string, string[]> = {
      bundler: ['BACKFILL_BUNDLE_RECORDS']
    };
    
    // Service-specific configurations (from dashboardConfig)
    const serviceSpecificDashboardConfigs: Record<string, string[]> = {
      envoy: ['ENVOY_PORT'],
      redis: ['REDIS_MAX_MEMORY', 'EXTRA_REDIS_FLAGS'],
      clickhouse: ['CLICKHOUSE_PORT', 'CLICKHOUSE_PORT_2', 'CLICKHOUSE_PORT_3', 'CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD'],
      litestream: ['AR_IO_SQLITE_BACKUP_S3_BUCKET_NAME', 'AR_IO_SQLITE_BACKUP_S3_BUCKET_REGION', 'AR_IO_SQLITE_BACKUP_S3_BUCKET_ACCESS_KEY', 'AR_IO_SQLITE_BACKUP_S3_BUCKET_SECRET_KEY', 'AR_IO_SQLITE_BACKUP_S3_BUCKET_PREFIX']
    };
    
    // Add core node configs
    coreNodeConfigs.forEach(key => {
      if (config.nodeConfig[key as keyof typeof config.nodeConfig] != null && 
          config.nodeConfig[key as keyof typeof config.nodeConfig] !== '' && 
          !seen.has(key) && 
          shouldIncludeValue(key, config.nodeConfig[key as keyof typeof config.nodeConfig])) {
        lines.push(`${key}=${config.nodeConfig[key as keyof typeof config.nodeConfig]}`);
        seen.add(key);
      }
    });
    
    // Add service-specific node configs only when services are enabled
    if (config.dashboardConfig.ENABLE_BUNDLER) {
      serviceSpecificNodeConfigs.bundler.forEach(key => {
        if (config.nodeConfig[key as keyof typeof config.nodeConfig] != null && 
            config.nodeConfig[key as keyof typeof config.nodeConfig] !== '' && 
            !seen.has(key) && 
            shouldIncludeValue(key, config.nodeConfig[key as keyof typeof config.nodeConfig])) {
          lines.push(`${key}=${config.nodeConfig[key as keyof typeof config.nodeConfig]}`);
          seen.add(key);
        }
      });
    }
    
    // Add Envoy service-specific configs when Envoy is enabled
    if (config.dashboardConfig.ENABLE_ENVOY) {
      serviceSpecificDashboardConfigs.envoy.forEach(key => {
        if (config.dashboardConfig[key as keyof typeof config.dashboardConfig] != null && 
            config.dashboardConfig[key as keyof typeof config.dashboardConfig] !== '' && 
            !seen.has(key) && 
            shouldIncludeValue(key, config.dashboardConfig[key as keyof typeof config.dashboardConfig])) {
          lines.push(`${key}=${config.dashboardConfig[key as keyof typeof config.dashboardConfig]}`);
          seen.add(key);
        }
      });
    }
    
    // Add service-specific dashboard configs only when services are enabled
    const anyServiceEnabled = config.dashboardConfig.ENABLE_BUNDLER || config.dashboardConfig.ENABLE_AO_CU || 
                             config.dashboardConfig.ENABLE_GRAFANA || config.dashboardConfig.ENABLE_DASHBOARD ||
                             config.dashboardConfig.ENABLE_CLICKHOUSE || config.dashboardConfig.ENABLE_LITESTREAM ||
                             config.dashboardConfig.ENABLE_AUTOHEAL;
    
    if (anyServiceEnabled) {
      serviceSpecificDashboardConfigs.redis.forEach(key => {
        if (config.dashboardConfig[key as keyof typeof config.dashboardConfig] != null && 
            config.dashboardConfig[key as keyof typeof config.dashboardConfig] !== '' && 
            !seen.has(key) && 
            shouldIncludeValue(key, config.dashboardConfig[key as keyof typeof config.dashboardConfig])) {
          lines.push(`${key}=${config.dashboardConfig[key as keyof typeof config.dashboardConfig]}`);
          seen.add(key);
        }
      });
    }
    
    // Add ClickHouse configs when ClickHouse is enabled
    if (config.dashboardConfig.ENABLE_CLICKHOUSE) {
      serviceSpecificDashboardConfigs.clickhouse.forEach(key => {
        if (config.dashboardConfig[key as keyof typeof config.dashboardConfig] != null && 
            config.dashboardConfig[key as keyof typeof config.dashboardConfig] !== '' && 
            !seen.has(key) && 
            shouldIncludeValue(key, config.dashboardConfig[key as keyof typeof config.dashboardConfig])) {
          lines.push(`${key}=${config.dashboardConfig[key as keyof typeof config.dashboardConfig]}`);
          seen.add(key);
        }
      });
    }
    
    // Add Litestream configs when Litestream is enabled
    if (config.dashboardConfig.ENABLE_LITESTREAM) {
      serviceSpecificDashboardConfigs.litestream.forEach(key => {
        if (config.dashboardConfig[key as keyof typeof config.dashboardConfig] != null && 
            config.dashboardConfig[key as keyof typeof config.dashboardConfig] !== '' && 
            !seen.has(key) && 
            shouldIncludeValue(key, config.dashboardConfig[key as keyof typeof config.dashboardConfig])) {
          lines.push(`${key}=${config.dashboardConfig[key as keyof typeof config.dashboardConfig]}`);
          seen.add(key);
        }
      });
    }
    
    // Bundler-specific configs
    if (config.dashboardConfig.ENABLE_BUNDLER) {
      const bundlerConfigs = [
        'BUNDLER_ARWEAVE_WALLET', 'GATEWAY_URL', 'UPLOADER_URL', 'APP_NAME', 'ANS104_INDEX_FILTER', 'ANS104_UNBUNDLE_FILTER',
        'AWS_S3_CONTIGUOUS_DATA_BUCKET', 'AWS_S3_CONTIGUOUS_DATA_PREFIX', 'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_ENDPOINT', 'ALLOW_LISTED_ADDRESSES'
      ];
      bundlerConfigs.forEach(key => {
        if (config.dashboardConfig[key as keyof typeof config.dashboardConfig] != null && 
            config.dashboardConfig[key as keyof typeof config.dashboardConfig] !== '' && 
            !seen.has(key) && 
            shouldIncludeValue(key, config.dashboardConfig[key as keyof typeof config.dashboardConfig])) {
          lines.push(`${key}=${config.dashboardConfig[key as keyof typeof config.dashboardConfig]}`);
          seen.add(key);
        }
      });
    }
    
    // AO CU specific configs
    if (config.dashboardConfig.ENABLE_AO_CU) {
      const aoCuConfigs = [
        'CU_WALLET', 'PROCESS_CHECKPOINT_TRUSTED_OWNERS', 'ADDITIONAL_AO_CU_ENV'
      ];
      aoCuConfigs.forEach(key => {
        if (config.dashboardConfig[key as keyof typeof config.dashboardConfig] != null && 
            config.dashboardConfig[key as keyof typeof config.dashboardConfig] !== '' && 
            !seen.has(key) && 
            shouldIncludeValue(key, config.dashboardConfig[key as keyof typeof config.dashboardConfig])) {
          lines.push(`${key}=${config.dashboardConfig[key as keyof typeof config.dashboardConfig]}`);
          seen.add(key);
        }
      });
    }
    
    // Grafana specific configs
    if (config.dashboardConfig.ENABLE_GRAFANA) {
      const grafanaConfigs = ['GRAFANA_PORT'];
      grafanaConfigs.forEach(key => {
        if (config.dashboardConfig[key as keyof typeof config.dashboardConfig] != null && 
            config.dashboardConfig[key as keyof typeof config.dashboardConfig] !== '' && 
            !seen.has(key) && 
            shouldIncludeValue(key, config.dashboardConfig[key as keyof typeof config.dashboardConfig])) {
          lines.push(`${key}=${config.dashboardConfig[key as keyof typeof config.dashboardConfig]}`);
          seen.add(key);
        }
      });
    }
    
    // Dashboard specific configs
    if (config.dashboardConfig.ENABLE_DASHBOARD) {
      const dashboardOnlyConfigs = ['DASHBOARD_PORT', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
      dashboardOnlyConfigs.forEach(key => {
        if (config.dashboardConfig[key as keyof typeof config.dashboardConfig] != null && 
            config.dashboardConfig[key as keyof typeof config.dashboardConfig] !== '' && 
            !seen.has(key) && 
            shouldIncludeValue(key, config.dashboardConfig[key as keyof typeof config.dashboardConfig])) {
          lines.push(`${key}=${config.dashboardConfig[key as keyof typeof config.dashboardConfig]}`);
          seen.add(key);
        }
      });
    }
    
    // SSL configs (if enabled)
    if (config.dashboardConfig.ENABLE_SSL) {
      const sslConfigs = ['ENABLE_SSL', 'SSL_CERT_PATH', 'SSL_KEY_PATH'];
      sslConfigs.forEach(key => {
        if (config.dashboardConfig[key as keyof typeof config.dashboardConfig] != null && 
            config.dashboardConfig[key as keyof typeof config.dashboardConfig] !== '' && 
            !seen.has(key) && 
            shouldIncludeValue(key, config.dashboardConfig[key as keyof typeof config.dashboardConfig])) {
          lines.push(`${key}=${config.dashboardConfig[key as keyof typeof config.dashboardConfig]}`);
          seen.add(key);
        }
      });
    }
    
    // Additional raw env lines
    if (config.nodeConfig.ADDITIONAL_ENV) {
      config.nodeConfig.ADDITIONAL_ENV.split('\n').forEach(line => {
        if (line.trim()) lines.push(line);
      });
    }
    
    return lines.join('\n');
  };

  const generateDockerCompose = () => {
    const services = [`  ar-io-core:
    image: ghcr.io/ar-io/ar-io-node:latest
    container_name: ar-io-core
    restart: ${config.dockerConfig.restartPolicy}
    ports:
      - "\${CORE_PORT}:4000"
      ${config.nodeConfig.RUN_OBSERVER && config.nodeConfig.OBSERVER_PORT ? `- "\${OBSERVER_PORT}:\${OBSERVER_PORT}"` : ''}
    env_file:
      - .env
    volumes:
      - ${config.dockerConfig.dataVolume}:/app/data
      - ./wallets:/app/wallets
    networks:
      - ${config.dockerConfig.networkName}`];

    if (config.dockerConfig.useEnvoy) {
      services.push(`
  envoy:
    image: ghcr.io/ar-io/ar-io-envoy:latest
    container_name: ar-io-envoy
    restart: ${config.dockerConfig.restartPolicy}
    ports:
      - "\${ENVOY_PORT}:3000"
    env_file:
      - .env
    depends_on:
      - ar-io-core
    networks:
      - ${config.dockerConfig.networkName}`);
    }

    if (config.dockerConfig.enableBundler) {
      services.push(`
  turbo-bundler:
    image: ghcr.io/ar-io/turbo-bundler:latest
    container_name: ar-io-bundler
    restart: ${config.dockerConfig.restartPolicy}
    env_file:
      - .env
    depends_on:
      - ar-io-core
    networks:
      - ${config.dockerConfig.networkName}`);
    }

    if (config.dockerConfig.enableAoCu) {
      services.push(`
  ao-cu:
    image: ghcr.io/permaweb/ao-cu:latest
    container_name: ar-io-ao-cu
    restart: ${config.dockerConfig.restartPolicy}
    ports:
      - "6363:6363"
    environment:
      - CU_WALLET=${config.dashboardConfig.CU_WALLET}
      - PROCESS_CHECKPOINT_TRUSTED_OWNERS=${config.dashboardConfig.PROCESS_CHECKPOINT_TRUSTED_OWNERS}
      - GATEWAY_URL=${config.dashboardConfig.GATEWAY_URL}
      - UPLOADER_URL=${config.dashboardConfig.UPLOADER_URL}
      ${config.dashboardConfig.ADDITIONAL_AO_CU_ENV ? `- ADDITIONAL_AO_CU_ENV=${config.dashboardConfig.ADDITIONAL_AO_CU_ENV}` : ''}
    volumes:
      - ./data/ao:/usr/app/tmp
    depends_on:
      - ar-io-core
    networks:
      - ${config.dockerConfig.networkName}`);
    }

    if (config.dockerConfig.enableGrafana) {
      services.push(`
  grafana:
    image: grafana/grafana:latest
    container_name: ar-io-grafana
    restart: ${config.dockerConfig.restartPolicy}
    ports:
      - "${config.dashboardConfig.GRAFANA_PORT}:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_SERVER_ROOT_URL=http://localhost:${config.dashboardConfig.GRAFANA_PORT}/grafana
      - GF_SERVER_SERVE_FROM_SUB_PATH=true
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - ${config.dockerConfig.networkName}`);
    }

    // Add Admin Dashboard service if enabled
    if (config.dockerConfig.enableDashboard) {
      services.push(`
  ar-io-dashboard:
    image: ghcr.io/ar-io/ar-io-dashboard:latest
    container_name: ar-io-dashboard
    restart: ${config.dockerConfig.restartPolicy}
    ports:
      - "${config.dashboardConfig.DASHBOARD_PORT}:3000"
    environment:
      - API_ENDPOINT=http://ar-io-core:4000
      - ADMIN_USERNAME=${config.dashboardConfig.ADMIN_USERNAME}
      - ADMIN_PASSWORD=${config.dashboardConfig.ADMIN_PASSWORD}
      - ADMIN_API_KEY=${config.dashboardConfig.ADMIN_API_KEY}
      ${config.dashboardConfig.ENABLE_SSL ? `- ENABLE_SSL=true` : ''}
      ${config.dashboardConfig.SSL_CERT_PATH ? `- SSL_CERT_PATH=${config.dashboardConfig.SSL_CERT_PATH}` : ''}
      ${config.dashboardConfig.SSL_KEY_PATH ? `- SSL_KEY_PATH=${config.dashboardConfig.SSL_KEY_PATH}` : ''}
    depends_on:
      - ar-io-core
    networks:
      - ${config.dockerConfig.networkName}`);
    }

    // Add ClickHouse service if enabled
    if (config.dockerConfig.enableClickhouse) {
      services.push(`
  clickhouse:
    profiles: ["clickhouse"]
    image: clickhouse/clickhouse-server:latest
    container_name: ar-io-clickhouse
    restart: ${config.dockerConfig.restartPolicy}
    ports:
      - "\${CLICKHOUSE_PORT}:9000"
      - "\${CLICKHOUSE_PORT_2}:8123"
      - "\${CLICKHOUSE_PORT_3}:8443"
    environment:
      - CLICKHOUSE_USER=\${CLICKHOUSE_USER}
      - CLICKHOUSE_PASSWORD=\${CLICKHOUSE_PASSWORD}
    volumes:
      - clickhouse-data:/var/lib/clickhouse
    networks:
      - ${config.dockerConfig.networkName}`);
    }

    // Add Litestream service if enabled
    if (config.dockerConfig.enableLitestream) {
      services.push(`
  litestream:
    profiles: ["litestream"]
    image: litestream/litestream:latest
    container_name: ar-io-litestream
    restart: ${config.dockerConfig.restartPolicy}
    environment:
      - AR_IO_SQLITE_BACKUP_S3_BUCKET_NAME=\${AR_IO_SQLITE_BACKUP_S3_BUCKET_NAME}
      - AR_IO_SQLITE_BACKUP_S3_BUCKET_REGION=\${AR_IO_SQLITE_BACKUP_S3_BUCKET_REGION}
      - AR_IO_SQLITE_BACKUP_S3_BUCKET_ACCESS_KEY=\${AR_IO_SQLITE_BACKUP_S3_BUCKET_ACCESS_KEY}
      - AR_IO_SQLITE_BACKUP_S3_BUCKET_SECRET_KEY=\${AR_IO_SQLITE_BACKUP_S3_BUCKET_SECRET_KEY}
      ${config.dashboardConfig.AR_IO_SQLITE_BACKUP_S3_BUCKET_PREFIX ? `- AR_IO_SQLITE_BACKUP_S3_BUCKET_PREFIX=\${AR_IO_SQLITE_BACKUP_S3_BUCKET_PREFIX}` : ''}
    volumes:
      - ${config.dockerConfig.dataVolume}:/app/data:ro
    depends_on:
      - ar-io-core
    networks:
      - ${config.dockerConfig.networkName}`);
    }

    // Add Autoheal service if enabled
    if (config.dockerConfig.enableAutoheal) {
      services.push(`
  autoheal:
    image: willfarrell/autoheal:latest
    container_name: ar-io-autoheal
    restart: ${config.dockerConfig.restartPolicy}
    environment:
      - AUTOHEAL_CONTAINER_LABEL=all
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - ${config.dockerConfig.networkName}`);
    }

    return `version: '3.8'

services:
${services.join('')}

volumes:
  ${config.dockerConfig.dataVolume}:
    driver: local${config.dockerConfig.enableGrafana ? `
  grafana-data:
    driver: local` : ''}${config.dockerConfig.enableClickhouse ? `
  clickhouse-data:
    driver: local` : ''}

networks:
  ${config.dockerConfig.networkName}:
    driver: bridge`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-black mb-2">Review Configuration</h1>
        <p className="text-gray-600">
          Review your AR.IO Gateway configuration before deployment.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Node Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Server className="w-4 h-4 text-gray-700" />
            </div>
            <h3 className="text-lg font-medium text-black">Node Configuration</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Wallet:</span>
              <span className="text-black font-mono text-xs">
                {config.nodeConfig.AR_IO_WALLET.slice(0, 15)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Observer:</span>
              <span className="text-black font-mono text-xs">
                {config.nodeConfig.OBSERVER_WALLET.slice(0, 15)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">GraphQL:</span>
              <span className="text-black">
                {config.nodeConfig.GRAPHQL_HOST}:{config.nodeConfig.GRAPHQL_PORT}
              </span>
            </div>
            {config.nodeConfig.ARNS_ROOT_HOST && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">ArNS Host:</span>
                <span className="text-black">{config.nodeConfig.ARNS_ROOT_HOST}</span>
              </div>
            )}
            {config.nodeConfig.START_HEIGHT && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Start Height:</span>
                <span className="text-black">{config.nodeConfig.START_HEIGHT}</span>
              </div>
            )}
            {config.nodeConfig.STOP_HEIGHT && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Stop Height:</span>
                <span className="text-black">{config.nodeConfig.STOP_HEIGHT}</span>
              </div>
            )}
          </div>
        </div>

        {/* Gateway Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Globe className="w-4 h-4 text-gray-700" />
            </div>
            <h3 className="text-lg font-medium text-black">Gateway Configuration</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            {config.dashboardConfig.ENABLE_ENVOY && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Envoy Port:</span>
                <span className="text-black">{config.dashboardConfig.ENVOY_PORT}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Core Port:</span>
              <span className="text-black">{config.nodeConfig.CORE_PORT}</span>
            </div>

            {config.dashboardConfig.ENABLE_DASHBOARD && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Dashboard:</span>
                <span className="text-black">Port {config.dashboardConfig.DASHBOARD_PORT}</span>
              </div>
            )}
            {config.nodeConfig.RUN_OBSERVER && config.nodeConfig.OBSERVER_PORT && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Observer:</span>
                <span className="text-black">Port {config.nodeConfig.OBSERVER_PORT}</span>
              </div>
            )}
          </div>
        </div>

        {/* Services Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Package className="w-4 h-4 text-gray-700" />
            </div>
            <h3 className="text-lg font-medium text-black">Services</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Globe className="w-3 h-3 text-gray-500 mr-2" />
                <span className="font-medium text-gray-600">Envoy Proxy:</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                config.dashboardConfig.ENABLE_ENVOY 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {config.dashboardConfig.ENABLE_ENVOY ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <BarChart2 className="w-3 h-3 text-gray-500 mr-2" />
                <span className="font-medium text-gray-600">ClickHouse:</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                config.dashboardConfig.ENABLE_CLICKHOUSE 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {config.dashboardConfig.ENABLE_CLICKHOUSE ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Package className="w-3 h-3 text-gray-500 mr-2" />
                <span className="font-medium text-gray-600">Litestream:</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                config.dashboardConfig.ENABLE_LITESTREAM 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {config.dashboardConfig.ENABLE_LITESTREAM ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Cpu className="w-3 h-3 text-gray-500 mr-2" />
                <span className="font-medium text-gray-600">Autoheal:</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                config.dashboardConfig.ENABLE_AUTOHEAL 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {config.dashboardConfig.ENABLE_AUTOHEAL ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Package className="w-3 h-3 text-gray-500 mr-2" />
                <span className="font-medium text-gray-600">Bundler:</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                config.dashboardConfig.ENABLE_BUNDLER 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {config.dashboardConfig.ENABLE_BUNDLER ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Cpu className="w-3 h-3 text-gray-500 mr-2" />
                <span className="font-medium text-gray-600">AO CU:</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                config.dashboardConfig.ENABLE_AO_CU 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {config.dashboardConfig.ENABLE_AO_CU ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <BarChart2 className="w-3 h-3 text-gray-500 mr-2" />
                <span className="font-medium text-gray-600">Grafana:</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                config.dashboardConfig.ENABLE_GRAFANA 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {config.dashboardConfig.ENABLE_GRAFANA ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Globe className="w-3 h-3 text-gray-500 mr-2" />
                <span className="font-medium text-gray-600">Dashboard:</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                config.dashboardConfig.ENABLE_DASHBOARD 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {config.dashboardConfig.ENABLE_DASHBOARD ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Access URLs */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Globe className="w-4 h-4 text-gray-700" />
            </div>
            <h3 className="text-lg font-medium text-black">Access URLs</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Gateway:</span>
              <code className="text-black bg-gray-100 px-2 py-1 rounded text-xs">
                http://localhost:{config.dashboardConfig.ENABLE_ENVOY ? config.dashboardConfig.ENVOY_PORT : config.nodeConfig.CORE_PORT}
              </code>
            </div>
            {config.dashboardConfig.ENABLE_ENVOY && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Direct Node API:</span>
                <code className="px-2 py-1 bg-white border border-gray-300 rounded text-sm text-black">
                  http://localhost:{config.nodeConfig.CORE_PORT}
                </code>
              </div>
            )}
            {config.nodeConfig.RUN_OBSERVER && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Observer:</span>
                <code className="text-black bg-gray-100 px-2 py-1 rounded text-xs">
                  http://localhost:{config.nodeConfig.OBSERVER_PORT}
                </code>
              </div>
            )}
            {config.dashboardConfig.ENABLE_DASHBOARD && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Admin Dashboard:</span>
                <code className="text-black bg-gray-100 px-2 py-1 rounded text-xs">
                  http://localhost:{config.dashboardConfig.DASHBOARD_PORT}
                </code>
              </div>
            )}
            {config.dashboardConfig.ENABLE_GRAFANA && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Grafana:</span>
                <code className="text-black bg-gray-100 px-2 py-1 rounded text-xs">
                  http://localhost:{config.dashboardConfig.GRAFANA_PORT}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Files Section */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Environment Variables File */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <FileText className="w-4 h-4 text-green-700" />
              </div>
              <h3 className="text-lg font-medium text-black">.env File</h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(generateEnvFile())}
                className="inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </button>
              <button
                onClick={() => downloadFile(generateEnvFile(), '.env')}
                className="inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            </div>
          </div>
          
          <pre className="bg-gray-50 border border-gray-200 p-4 rounded-lg overflow-x-auto text-xs text-black font-mono max-h-64">
            {generateEnvFile()}
          </pre>
        </div>

        {/* Docker Compose Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Package className="w-4 h-4 text-blue-700" />
              </div>
              <h3 className="text-lg font-medium text-black">docker-compose.yml</h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(generateDockerCompose())}
                className="inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </button>
              <button
                onClick={() => downloadFile(generateDockerCompose(), 'docker-compose.yml')}
                className="inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            </div>
          </div>
          
          <pre className="bg-gray-50 border border-gray-200 p-4 rounded-lg overflow-x-auto text-xs text-black font-mono max-h-64">
            {generateDockerCompose()}
          </pre>
        </div>
      </div>

      



      


    </div>
  );
};