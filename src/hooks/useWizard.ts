import { useState, useEffect } from 'react';
import { WizardStep, NodeConfig, DashboardConfig, DeploymentConfig, ValidationError } from '../types';


const getDefaultNodePath = (): string => {
  
  return '~/ar-io-node';
};

const saveToStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Failed to save to localStorage - continue silently
  }
};

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    // Failed to load from localStorage - use default
    return defaultValue;
  }
};

export const useWizard = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(() => 
    loadFromStorage('wizard-current-step', 'welcome')
  );
  const [nodeConfig, setNodeConfig] = useState<NodeConfig>(() => 
    loadFromStorage('wizard-node-config', {
      AR_IO_WALLET: '',
      OBSERVER_WALLET: '',
      OBSERVER_PORT: '5050',
      ADMIN_API_KEY: '',
      GRAPHQL_HOST: 'arweave.net',
      GRAPHQL_PORT: '443',
      // ArNS configuration
      ARNS_ROOT_HOST: '',
      START_HEIGHT: '1000000',
      STOP_HEIGHT: '',
      ANS104_UNBUNDLE_FILTER: '{"never": true}',
      ANS104_INDEX_FILTER: '{"never": true}',
      WEBHOOK_TARGET_SERVERS: '',
      WEBHOOK_INDEX_FILTER: '{"never": true}',
      WEBHOOK_BLOCK_FILTER: '{"never": true}',
      LOG_FILTER: 'ar:*',
      TRUSTED_ARWEAVE_URL: 'https://arweave.net',
      TRUSTED_NODE_URL: 'https://arweave.net',
      TRUSTED_GATEWAY_URL: 'https://arweave.net',
      TRUSTED_ARNS_GATEWAY_URL: 'https://ar-io.net',
      SKIP_CACHE: false,
      INSTANCE_ID: 'ar-io-node-1',
      LOG_FORMAT: 'simple',
      SIMULATED_REQUEST_FAILURE_RATE: '0',
      FILTER_CHANGE_REPROCESS: false,
      SANDBOX_PROTOCOL: 'https',
      START_WRITERS: true,
      RUN_OBSERVER: true,
      ENABLE_MEMPOOL_WATCHER: true,
      MEMPOOL_POLLING_INTERVAL_MS: '30000',
      BACKFILL_BUNDLE_RECORDS: false,
      RUN_AUTOHEAL: true,
      NODE_MAX_OLD_SPACE_SIZE: '8192',
      CORE_PORT: '4000',
      CHAIN_CACHE_TYPE: 'redis',
      REDIS_CACHE_URL: 'redis://redis:6379',
      REDIS_USE_TLS: false,
      REDIS_CACHE_TTL_SECONDS: '3600',
    })
  );
  
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(() => 
    loadFromStorage('wizard-dashboard-config', {
      ADMIN_API_KEY: '',
      ENABLE_ENVOY: true,
      ENVOY_PORT: '3000',
      ENABLE_BUNDLER: false,
      ENABLE_AO_CU: false,
      ENABLE_GRAFANA: false,
      GRAFANA_PORT: '1024',
      ENABLE_DASHBOARD: true,
      DASHBOARD_PORT: '3001',
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'admin',
      NEXTAUTH_SECRET: 'your-secret-key',
      NEXTAUTH_URL: 'http://localhost:3001',
      AR_IO_NODE_PATH: getDefaultNodePath(),
      DOCKER_PROJECT: 'ar-io-node',
      NEXT_PUBLIC_GRAFANA_URL: 'http://localhost:1024',
      GATEWAY_URL: 'http://envoy:3000',
      UPLOADER_URL: 'http://envoy:3000/bundler',
      APP_NAME: 'AR.IO Bundler Service',
      ANS104_INDEX_FILTER: '{"always": true}',
      ANS104_UNBUNDLE_FILTER: '{"attributes": {"owner_address": "$BUNDLER_ARWEAVE_ADDRESS"}}',
      AWS_S3_CONTIGUOUS_DATA_BUCKET: '',
      AWS_S3_CONTIGUOUS_DATA_PREFIX: 'contiguous-data/',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      AWS_REGION: 'us-east-1',
      AWS_ENDPOINT: 'http://localstack:4566',
      ALLOW_LISTED_ADDRESSES: '',
      PROCESS_CHECKPOINT_TRUSTED_OWNERS: 'fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY',
      ADDITIONAL_AO_CU_ENV: '',
      ENABLE_SSL: false,
      SSL_CERT_PATH: '',
      SSL_KEY_PATH: '',
      ENABLE_CLICKHOUSE: false,
      ENABLE_LITESTREAM: false,
      ENABLE_AUTOHEAL: false,
      CLICKHOUSE_PORT: '9000',
      CLICKHOUSE_PORT_2: '8123',
      CLICKHOUSE_PORT_3: '8443',
      CLICKHOUSE_USER: '',
      CLICKHOUSE_PASSWORD: '',
      AR_IO_SQLITE_BACKUP_S3_BUCKET_NAME: '',
      AR_IO_SQLITE_BACKUP_S3_BUCKET_REGION: '',
      AR_IO_SQLITE_BACKUP_S3_BUCKET_ACCESS_KEY: '',
      AR_IO_SQLITE_BACKUP_S3_BUCKET_SECRET_KEY: '',
      AR_IO_SQLITE_BACKUP_S3_BUCKET_PREFIX: '',
      REDIS_MAX_MEMORY: '256mb',
      EXTRA_REDIS_FLAGS: '--save "" --appendonly no',
    })
  );

  // Persist state changes to localStorage
  useEffect(() => {
    saveToStorage('wizard-current-step', currentStep);
  }, [currentStep]);

  useEffect(() => {
    saveToStorage('wizard-node-config', nodeConfig);
  }, [nodeConfig]);

  useEffect(() => {
    saveToStorage('wizard-dashboard-config', dashboardConfig);
  }, [dashboardConfig]);
  
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const steps: WizardStep[] = ['welcome', 'node-config', 'services-config', 'review', 'deployment', 'success'];
  const currentStepIndex = steps.indexOf(currentStep);

  const validateNodeConfig = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!nodeConfig.AR_IO_WALLET.trim()) {
      errors.push({ field: 'AR_IO_WALLET', message: 'AR.IO Wallet is required for network participation' });
    }
    
    // Observer wallet is required when observer service is enabled
    if (nodeConfig.RUN_OBSERVER) {
      if (!nodeConfig.OBSERVER_WALLET || !nodeConfig.OBSERVER_WALLET.trim()) {
        errors.push({ field: 'OBSERVER_WALLET', message: 'Observer Wallet is required when Observer service is enabled' });
      }
    } else if (nodeConfig.OBSERVER_WALLET && !nodeConfig.OBSERVER_WALLET.trim()) {
      // If observer is disabled but wallet is provided, validate it's not just whitespace
      errors.push({ field: 'OBSERVER_WALLET', message: 'Observer Wallet cannot be blank if supplied' });
    }
    
    if (!nodeConfig.ADMIN_API_KEY.trim()) {
      errors.push({ field: 'ADMIN_API_KEY', message: 'Admin API Key is required for protected endpoints' });
    }
    
    if (!nodeConfig.GRAPHQL_HOST.trim()) {
      errors.push({ field: 'GRAPHQL_HOST', message: 'GraphQL Host is required for blockchain queries' });
    }
    
    if (!nodeConfig.GRAPHQL_PORT.trim()) {
      errors.push({ field: 'GRAPHQL_PORT', message: 'GraphQL Port is required' });
    }

    // Validate ArNS root host format if provided
    if (nodeConfig.ARNS_ROOT_HOST && !nodeConfig.ARNS_ROOT_HOST.includes('.')) {
      errors.push({ field: 'ARNS_ROOT_HOST', message: 'ArNS Root Host must be a valid domain (e.g., gateway.example.com)' });
    }

    // Validate height values if provided
    if (nodeConfig.START_HEIGHT && isNaN(Number(nodeConfig.START_HEIGHT))) {
      errors.push({ field: 'START_HEIGHT', message: 'Start Height must be a valid number' });
    }

    if (nodeConfig.STOP_HEIGHT && isNaN(Number(nodeConfig.STOP_HEIGHT))) {
      errors.push({ field: 'STOP_HEIGHT', message: 'Stop Height must be a valid number' });
    }

    return errors;
  };

  const validateGatewayConfig = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const envoyPort = Number(dashboardConfig.ENVOY_PORT);
    const corePort = Number(nodeConfig.CORE_PORT);
    
    // Only validate Envoy port if Envoy is enabled
    if (dashboardConfig.ENABLE_ENVOY) {
      if (isNaN(envoyPort) || envoyPort < 1024 || envoyPort > 65535) {
        errors.push({ field: 'ENVOY_PORT', message: 'Envoy Port must be between 1024-65535' });
      }
      
      if (envoyPort === corePort) {
        errors.push({ field: 'ENVOY_PORT', message: 'Envoy and Core ports must be different' });
      }
    }
    
    if (isNaN(corePort) || corePort < 1024 || corePort > 65535) {
      errors.push({ field: 'CORE_PORT', message: 'Core Port must be between 1024-65535' });
    }

    return errors;
  };

  const validateServicesConfig = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (dashboardConfig.ENABLE_BUNDLER && !dashboardConfig.BUNDLER_ARWEAVE_WALLET?.trim()) {
      errors.push({ field: 'BUNDLER_ARWEAVE_WALLET', message: 'Bundler wallet is required when bundler is enabled' });
    }

    if (dashboardConfig.ENABLE_AO_CU && !dashboardConfig.CU_WALLET?.trim()) {
      errors.push({ field: 'CU_WALLET', message: 'CU wallet is required when AO Compute Unit is enabled' });
    }

    if (dashboardConfig.ENABLE_DASHBOARD && !dashboardConfig.ADMIN_PASSWORD?.trim()) {
      errors.push({ field: 'ADMIN_PASSWORD', message: 'Admin password is required when dashboard is enabled' });
    }

    if (dashboardConfig.ENABLE_DASHBOARD && !dashboardConfig.ADMIN_USERNAME?.trim()) {
      errors.push({ field: 'ADMIN_USERNAME', message: 'Admin username is required when dashboard is enabled' });
    }

    return errors;
  };

  const nextStep = () => {
    let errors: ValidationError[] = [];
    
    if (currentStep === 'node-config') {
      errors = [...validateNodeConfig(), ...validateGatewayConfig()];
    } else if (currentStep === 'services-config') {
      errors = validateServicesConfig();
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return false;
    }
    
    setValidationErrors([]);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
    return true;
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const resetWizard = () => {
    // Clear localStorage
    localStorage.removeItem('wizard-current-step');
    localStorage.removeItem('wizard-node-config');
    localStorage.removeItem('wizard-dashboard-config');
    
    // Reset state to defaults
    setCurrentStep('welcome');
    setNodeConfig({
      AR_IO_WALLET: '',
      OBSERVER_WALLET: '',
      OBSERVER_PORT: '5050',
      ADMIN_API_KEY: '',
      GRAPHQL_HOST: 'arweave.net',
      GRAPHQL_PORT: '443',
      // ArNS configuration
      ARNS_ROOT_HOST: '',
      // Blockchain sync settings
      START_HEIGHT: '1000000',
      STOP_HEIGHT: '',
      // ANS-104 Bundle processing
      ANS104_UNBUNDLE_FILTER: '{"never": true}',
      ANS104_INDEX_FILTER: '{"never": true}',
      // Webhook configuration
      WEBHOOK_TARGET_SERVERS: '',
      WEBHOOK_INDEX_FILTER: '{"never": true}',
      WEBHOOK_BLOCK_FILTER: '{"never": true}',
      // Logging
      LOG_FILTER: 'ar:*',
      // Advanced settings
      TRUSTED_ARWEAVE_URL: 'https://arweave.net',
      TRUSTED_NODE_URL: 'https://arweave.net',
      TRUSTED_GATEWAY_URL: 'https://arweave.net',
      TRUSTED_ARNS_GATEWAY_URL: 'https://ar-io.net',
      SKIP_CACHE: false,
      INSTANCE_ID: 'ar-io-node-1',
      LOG_FORMAT: 'simple',
      SIMULATED_REQUEST_FAILURE_RATE: '0',
      FILTER_CHANGE_REPROCESS: false,
      SANDBOX_PROTOCOL: 'https',
      // Additional official AR.IO node settings
      START_WRITERS: true,
      RUN_OBSERVER: true,
      ENABLE_MEMPOOL_WATCHER: true,
      MEMPOOL_POLLING_INTERVAL_MS: '30000',
      BACKFILL_BUNDLE_RECORDS: false,
      RUN_AUTOHEAL: true,
      // Node.js optimization
      NODE_MAX_OLD_SPACE_SIZE: '8192',
      // Core AR.IO node ports (from official .env.example)
      CORE_PORT: '4000',
      /** Additional raw env vars (KEY=VAL per line) */
      ADDITIONAL_ENV: '',
    });
    setDashboardConfig({
      ADMIN_API_KEY: '',
      ENABLE_ENVOY: true,
      ENVOY_PORT: '3000',
      ENABLE_BUNDLER: false,
      ENABLE_AO_CU: false,
      ENABLE_GRAFANA: false,
      GRAFANA_PORT: '1024',
      ENABLE_DASHBOARD: true,
      DASHBOARD_PORT: '3001',
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'admin',
      NEXTAUTH_SECRET: 'your-secret-key',
      NEXTAUTH_URL: 'http://localhost:3001',
      AR_IO_NODE_PATH: getDefaultNodePath(),
      DOCKER_PROJECT: 'ar-io-node',
      NEXT_PUBLIC_GRAFANA_URL: 'http://localhost:1024',
      GATEWAY_URL: 'http://envoy:3000',
      UPLOADER_URL: 'http://envoy:3000/bundler',
      // Bundler defaults
      APP_NAME: 'AR.IO Bundler Service',
      ANS104_INDEX_FILTER: '{"always": true}',
      ANS104_UNBUNDLE_FILTER: '{"attributes": {"owner_address": "$BUNDLER_ARWEAVE_ADDRESS"}}',
      AWS_S3_CONTIGUOUS_DATA_BUCKET: '',
      AWS_S3_CONTIGUOUS_DATA_PREFIX: 'contiguous-data/',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      AWS_REGION: 'us-east-1',
      AWS_ENDPOINT: 'http://localstack:4566',
      ALLOW_LISTED_ADDRESSES: '',
      // AO CU defaults
      PROCESS_CHECKPOINT_TRUSTED_OWNERS: 'fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY',
      ADDITIONAL_AO_CU_ENV: '',
      // SSL defaults
      ENABLE_SSL: false,
      SSL_CERT_PATH: '',
      SSL_KEY_PATH: '',
      // Advanced services
      ENABLE_CLICKHOUSE: false,
      ENABLE_LITESTREAM: false,
      ENABLE_AUTOHEAL: false,
      // ClickHouse configuration
      CLICKHOUSE_PORT: '9000',
      CLICKHOUSE_PORT_2: '8123',
      CLICKHOUSE_PORT_3: '8443',
      CLICKHOUSE_USER: '',
      CLICKHOUSE_PASSWORD: '',
      // Litestream configuration (defaults based on official AR.IO Node configuration)
      AR_IO_SQLITE_BACKUP_S3_BUCKET_NAME: '',
      AR_IO_SQLITE_BACKUP_S3_BUCKET_REGION: 'us-east-1',
      AR_IO_SQLITE_BACKUP_S3_BUCKET_ACCESS_KEY: '',
      AR_IO_SQLITE_BACKUP_S3_BUCKET_SECRET_KEY: '',
      AR_IO_SQLITE_BACKUP_S3_BUCKET_PREFIX: '',
      // Redis configuration
      REDIS_MAX_MEMORY: '256mb',
      EXTRA_REDIS_FLAGS: '--save "" --appendonly no',
    });
    setValidationErrors([]);
  };

  const getDeploymentConfig = (): DeploymentConfig => ({
    nodeConfig: {
      ...nodeConfig,
      ADMIN_API_KEY: nodeConfig.ADMIN_API_KEY || dashboardConfig.ADMIN_API_KEY,
    },
    dashboardConfig,
    dockerConfig: {
      networkName: 'ar-io-network',
      dataVolume: 'ar-io-data',
      restartPolicy: 'unless-stopped',
      useEnvoy: dashboardConfig.ENABLE_ENVOY,
      enableBundler: dashboardConfig.ENABLE_BUNDLER,
      enableAoCu: dashboardConfig.ENABLE_AO_CU,
      enableGrafana: dashboardConfig.ENABLE_GRAFANA,
      enableDashboard: dashboardConfig.ENABLE_DASHBOARD,
      enableClickhouse: dashboardConfig.ENABLE_CLICKHOUSE || false,
      enableLitestream: dashboardConfig.ENABLE_LITESTREAM || false,
      enableAutoheal: nodeConfig.RUN_AUTOHEAL || false,
    },
  });

  return {
    currentStep,
    currentStepIndex,
    totalSteps: steps.length,
    nodeConfig,
    setNodeConfig,
    dashboardConfig,
    setDashboardConfig,
    validationErrors,
    setValidationErrors,
    nextStep,
    prevStep,
    goToStep,
    resetWizard,
    getDeploymentConfig,
  };
};