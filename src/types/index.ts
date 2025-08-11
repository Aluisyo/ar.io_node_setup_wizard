export interface NodeConfig {
  // Core wallet configuration
  AR_IO_WALLET: string;
  OBSERVER_WALLET: string;
  observerWalletFile?: File;
  /** Raw JSON of observer JWK */
  OBSERVER_JWK?: string;
  ADMIN_API_KEY: string;
  
  // GraphQL configuration
  GRAPHQL_HOST: string;
  GRAPHQL_PORT: string;
  
  // ArNS configuration
  ARNS_ROOT_HOST?: string;
  
  // Blockchain sync settings
  START_HEIGHT?: string;
  STOP_HEIGHT?: string;
  
  // ANS-104 Bundle processing
  ANS104_UNBUNDLE_FILTER?: string;
  ANS104_INDEX_FILTER?: string;
  
  // Webhook configuration
  WEBHOOK_TARGET_SERVERS?: string;
  WEBHOOK_INDEX_FILTER?: string;
  WEBHOOK_BLOCK_FILTER?: string;
  
  // Logging
  LOG_FILTER?: string;
  
  // Advanced settings
  TRUSTED_ARWEAVE_URL?: string;
  // Extra advanced options from .env.example
  TRUSTED_NODE_URL?: string;
  TRUSTED_GATEWAY_URL?: string;
  TRUSTED_ARNS_GATEWAY_URL?: string;
  SKIP_CACHE?: boolean;
  INSTANCE_ID?: string;
  LOG_FORMAT?: string;
  OBSERVER_PORT?: string;
  SIMULATED_REQUEST_FAILURE_RATE?: string;
  ADMIN_API_KEY_FILE?: string;
  FILTER_CHANGE_REPROCESS?: boolean;
  SANDBOX_PROTOCOL?: string;
  START_WRITERS?: boolean;
  RUN_OBSERVER?: boolean;
  ENABLE_MEMPOOL_WATCHER?: boolean;
  MEMPOOL_POLLING_INTERVAL_MS?: string;
  // Additional official AR.IO node settings
  BACKFILL_BUNDLE_RECORDS?: boolean;
  RUN_AUTOHEAL?: boolean;
  // Node.js optimization
  NODE_MAX_OLD_SPACE_SIZE?: string;
  // Core AR.IO node ports (from official .env.example)
  CORE_PORT: string;
  /** Additional raw env vars (KEY=VAL per line) */
  ADDITIONAL_ENV?: string;
}

export interface DashboardConfig {
  
  // Admin access
  ADMIN_API_KEY: string; // Shared with node config
  
  // Envoy proxy (optional)
  ENABLE_ENVOY: boolean;
  ENVOY_PORT: string;
  
  // Optional services
  ENABLE_BUNDLER: boolean;
  BUNDLER_ARWEAVE_WALLET?: string;
  ALLOW_LISTED_ADDRESSES?: string;
  /** Bundler wallet address (derived from JWK) */
  BUNDLER_ARWEAVE_ADDRESS?: string;
  /** Service name for the bundler (APP_NAME) */
  APP_NAME?: string;
  /** JSON filter for ANS-104 index - e.g., { "always": true } */
  ANS104_INDEX_FILTER?: string;
  /** JSON filter for ANS-104 unbundle - e.g., { "attributes": { "owner_address": "$BUNDLER_ARWEAVE_ADDRESS" } } */
  ANS104_UNBUNDLE_FILTER?: string;
  /** AWS S3 bucket for contiguous data between gateway and bundler */
  AWS_S3_CONTIGUOUS_DATA_BUCKET?: string;
  /** AWS S3 prefix for contiguous data */
  AWS_S3_CONTIGUOUS_DATA_PREFIX?: string;
  /** AWS Access Key ID */
  AWS_ACCESS_KEY_ID?: string;
  /** AWS Secret Access Key */
  AWS_SECRET_ACCESS_KEY?: string;
  /** AWS region */
  AWS_REGION?: string;
  /** AWS endpoint (e.g., localstack) */
  AWS_ENDPOINT?: string;
  
  ENABLE_AO_CU: boolean;
  CU_WALLET?: string;
  PROCESS_CHECKPOINT_TRUSTED_OWNERS?: string;
  /** URL for AO CU gateway endpoint */
  GATEWAY_URL?: string;
  /** URL for CU checkpoint uploader endpoint */
  UPLOADER_URL?: string;
  /** Additional raw env vars for AO CU (KEY=VAL per line) */
  ADDITIONAL_AO_CU_ENV?: string;
  
  // Monitoring
  ENABLE_GRAFANA: boolean;
  GRAFANA_PORT: string;
  
  // Admin Dashboard
  ENABLE_DASHBOARD: boolean;
  DASHBOARD_PORT: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
  AR_IO_NODE_PATH?: string;
  DOCKER_PROJECT?: string;
  NEXT_PUBLIC_GRAFANA_URL?: string;
  ENABLE_SSL?: boolean;
  SSL_CERT_PATH?: string;
  SSL_KEY_PATH?: string;
  
  // Advanced services
  ENABLE_CLICKHOUSE?: boolean;
  ENABLE_LITESTREAM?: boolean;
  ENABLE_AUTOHEAL?: boolean;
  
  // ClickHouse configuration (service-specific)
  CLICKHOUSE_PORT?: string;
  CLICKHOUSE_PORT_2?: string;
  CLICKHOUSE_PORT_3?: string;
  CLICKHOUSE_USER?: string;
  CLICKHOUSE_PASSWORD?: string;
  
  // Litestream configuration (service-specific)
  AR_IO_SQLITE_BACKUP_S3_BUCKET_NAME?: string;
  AR_IO_SQLITE_BACKUP_S3_BUCKET_REGION?: string;
  AR_IO_SQLITE_BACKUP_S3_BUCKET_ACCESS_KEY?: string;
  AR_IO_SQLITE_BACKUP_S3_BUCKET_SECRET_KEY?: string;
  AR_IO_SQLITE_BACKUP_S3_BUCKET_PREFIX?: string;
  
  // Redis configuration (service-specific)
  CHAIN_CACHE_TYPE?: string;
  REDIS_CACHE_URL?: string;
  REDIS_USE_TLS?: boolean;
  REDIS_CACHE_TTL_SECONDS?: string;
  REDIS_MAX_MEMORY?: string;
  EXTRA_REDIS_FLAGS?: string;
}

export interface DeploymentConfig {
  nodeConfig: NodeConfig;
  dashboardConfig: DashboardConfig;
  dockerConfig: {
    networkName: string;
    dataVolume: string;
    restartPolicy: string;
    useEnvoy: boolean;
    enableBundler: boolean;
    enableAoCu: boolean;
    enableGrafana: boolean;
    enableDashboard: boolean;
    enableClickhouse: boolean;
    enableLitestream: boolean;
    enableAutoheal: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface DeploymentStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
  progress?: number;
}

export type WizardStep = 'welcome' | 'node-config' | 'services-config' | 'review' | 'deployment' | 'success';

// Filter types for ANS-104 and webhooks
export interface FilterConfig {
  never?: boolean;
  always?: boolean;
  attributes?: Record<string, string>;
  tags?: Array<{ name: string; value?: string }>;
  and?: FilterConfig[];
  or?: FilterConfig[];
  not?: FilterConfig[];
};