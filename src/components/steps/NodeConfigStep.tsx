import React from 'react';
import { NodeConfig, DashboardConfig, ValidationError } from '../../types';

import { FileUpload } from '../FileUpload';
import { Eye, EyeOff, ChevronDown, ChevronRight, Clipboard, Globe, BarChart2, Package } from 'lucide-react';

// Dynamic Arweave loading to completely avoid SubtleCrypto on module load
const getArweave = async () => {
  try {
    const Arweave = (await import('arweave')).default;
    return Arweave.init({});
  } catch (error) {
    console.warn('Arweave not available:', error);
    return null;
  }
};

interface NodeConfigStepProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
  dashboardConfig: DashboardConfig;
  onDashboardChange: (config: DashboardConfig) => void;
  errors: ValidationError[];
}

export const NodeConfigStep: React.FC<NodeConfigStepProps> = ({
  config,
  onChange,
  dashboardConfig,
  onDashboardChange,
  errors,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showApiKey, setShowApiKey] = React.useState(false);

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleInputChange = (field: keyof NodeConfig, value: string | boolean) => {
    onChange({ ...config, [field]: value });
  };



  const handleObserverWalletFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const walletData = JSON.parse(e.target?.result as string);
        
        let address = '';
        try {
          // Try to derive wallet address from the JWK
          const arweaveInstance = await getArweave();
          if (arweaveInstance) {
            address = await arweaveInstance.wallets.jwkToAddress(walletData as any);
          } else {
            console.warn('Arweave not available. Address derivation skipped.');
          }
        } catch (cryptoError) {
          console.warn('SubtleCrypto not available (HTTP context). Address derivation skipped.');
          // In HTTP context, we'll skip address derivation
          // User can manually enter the address if needed
          address = '';
        }
        
        onChange({
          ...config,
          observerWalletFile: file,
          OBSERVER_WALLET: address,
          OBSERVER_JWK: JSON.stringify(walletData),
        });
      } catch (error) {
        console.error('Invalid observer wallet file:', error);
      }
    };
    reader.readAsText(file);
  };

  const generateAdminKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleInputChange('ADMIN_API_KEY', key);
  };

  const copyApiKey = () => {
    if (config.ADMIN_API_KEY) {
      navigator.clipboard.writeText(config.ADMIN_API_KEY);
    }
  };

  React.useEffect(() => {
    if (config.ADMIN_API_KEY && config.ADMIN_API_KEY !== dashboardConfig.ADMIN_API_KEY) {
      onDashboardChange({ ...dashboardConfig, ADMIN_API_KEY: config.ADMIN_API_KEY });
    }
  }, [config.ADMIN_API_KEY, dashboardConfig.ADMIN_API_KEY, onDashboardChange]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-black mb-2">Node Configuration</h1>
        <p className="text-gray-600">
          Configure your AR.IO Gateway node's core settings and blockchain connection.
        </p>
      </div>

      <div className="space-y-8">
        {/* Wallet Configuration */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-black mb-6">Wallet Configuration</h3>

          
          <div className="space-y-6">
            {/* AR.IO Wallet Address */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">AR.IO Wallet Address</label>
              <input
                type="text"
                value={config.AR_IO_WALLET}
                onChange={(e) => handleInputChange('AR_IO_WALLET', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Paste your wallet address"
              />
              {getError('AR_IO_WALLET') && (
                <p className="mt-1 text-sm text-red-600">{getError('AR_IO_WALLET')}</p>
              )}
            </div>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={config.RUN_OBSERVER || false}
                onChange={(e) => handleInputChange('RUN_OBSERVER', e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Run Observer (optional)</label>
            </div>

            {config.RUN_OBSERVER && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-black mb-2">Observer Wallet Address</label>
                <input
                  type="text"
                  value={config.OBSERVER_WALLET}
                  onChange={(e) => handleInputChange('OBSERVER_WALLET', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Paste your observer wallet address"
                />
                {getError('OBSERVER_WALLET') && (
                  <p className="mt-1 text-sm text-red-600">{getError('OBSERVER_WALLET')}</p>
                )}
                <FileUpload
                  label="Observer Wallet JSON"
                  description="Upload observer wallet JWK file to copy to ./wallets/${config.OBSERVER_WALLET}.json"
                  onFileSelect={handleObserverWalletFileSelect}
                  selectedFile={config.observerWalletFile}
                  onFileRemove={() => onChange({ ...config, observerWalletFile: undefined, OBSERVER_JWK: undefined })}
                  accept=".json"
                  error={getError('OBSERVER_JWK')}
                />
                {window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          <strong>HTTP Context:</strong> Wallet address auto-derivation is not available. You can upload the wallet file and manually enter the address below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Admin API Configuration */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Admin API Key
          </label>
          <div className="flex space-x-3">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.ADMIN_API_KEY}
                onChange={(e) => handleInputChange('ADMIN_API_KEY', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                  getError('ADMIN_API_KEY') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                placeholder="Enter admin API key for protected endpoints"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={generateAdminKey}
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={copyApiKey}
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
            >
              <Clipboard className="h-4 w-4 mr-2" />
              Copy
            </button>
          </div>
          {getError('ADMIN_API_KEY') && (
            <p className="mt-1 text-sm text-red-600">{getError('ADMIN_API_KEY')}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Required for accessing admin endpoints at <code>/ar-io/admin/*</code>
          </p>
        </div>

        {/* GraphQL Configuration */}
        <div>
          <h3 className="text-lg font-medium text-black mb-4">GraphQL Proxy Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                GraphQL Host
              </label>
              <input
                type="text"
                value={config.GRAPHQL_HOST}
                onChange={(e) => handleInputChange('GRAPHQL_HOST', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                  getError('GRAPHQL_HOST') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                placeholder="arweave.net"
              />
              {getError('GRAPHQL_HOST') && (
                <p className="mt-1 text-sm text-red-600">{getError('GRAPHQL_HOST')}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                GraphQL Port
              </label>
              <input
                type="text"
                value={config.GRAPHQL_PORT}
                onChange={(e) => handleInputChange('GRAPHQL_PORT', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                  getError('GRAPHQL_PORT') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                placeholder="443"
              />
              {getError('GRAPHQL_PORT') && (
                <p className="mt-1 text-sm text-red-600">{getError('GRAPHQL_PORT')}</p>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            GraphQL queries will be proxied to this server while using your gateway to serve data
          </p>
        </div>

        {/* Gateway Configuration */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-black mb-6">Gateway Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                AR.IO Core Port
              </label>
              <input
                type="number"
                value={config.CORE_PORT}
                onChange={(e) => onChange({ ...config, CORE_PORT: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                  getError('CORE_PORT') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                placeholder="4000"
                min="1024"
                max="65535"
              />
              {getError('CORE_PORT') && <p className="mt-1 text-sm text-red-600">{getError('CORE_PORT')}</p>}
              <p className="mt-1 text-sm text-gray-500">
                Internal AR.IO node service port
              </p>
            </div>
          </div>
        </div>

        {/* Core Services Configuration */}
        <div className="border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-black mb-4">Core Services</h3>
            <p className="text-gray-600 mb-6">
              Essential AR.IO node services for production deployments.
            </p>
            
            <div className="space-y-6">
              {/* Envoy Proxy */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    id="enableEnvoy"
                    checked={dashboardConfig.ENABLE_ENVOY}
                    onChange={(e) => onDashboardChange({ ...dashboardConfig, ENABLE_ENVOY: e.target.checked })}
                    className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
                  />
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <label htmlFor="enableEnvoy" className="text-sm font-medium text-black">
                      Envoy Proxy
                    </label>
                  </div>
                  <span className="text-xs text-gray-500">- Load balancing and routing proxy</span>
                </div>
                
                {/* Envoy Configuration */}
                {dashboardConfig.ENABLE_ENVOY && (
                  <div className="ml-7 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-black mb-3">Envoy Configuration</h4>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Envoy Port</label>
                      <input
                        type="text"
                        value={dashboardConfig.ENVOY_PORT || ''}
                        onChange={(e) => onDashboardChange({ ...dashboardConfig, ENVOY_PORT: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="3000"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Port for Envoy proxy HTTP interface (default: 3000)
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* ClickHouse Analytics */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    id="enableClickhouse"
                    checked={dashboardConfig.ENABLE_CLICKHOUSE || false}
                    onChange={(e) => onDashboardChange({ ...dashboardConfig, ENABLE_CLICKHOUSE: e.target.checked })}
                    className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
                  />
                  <div className="flex items-center space-x-2">
                    <BarChart2 className="w-4 h-4 text-gray-600" />
                    <label htmlFor="enableClickhouse" className="text-sm font-medium text-black">
                      ClickHouse Analytics
                    </label>
                  </div>
                  <span className="text-xs text-gray-500">- Advanced data analytics and querying</span>
                </div>

                {/* ClickHouse Configuration */}
                {dashboardConfig.ENABLE_CLICKHOUSE && (
                  <div className="ml-7 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-black mb-3">ClickHouse Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Native Port</label>
                        <input
                          type="text"
                          value={dashboardConfig.CLICKHOUSE_PORT || ''}
                          onChange={(e) => onDashboardChange({ ...dashboardConfig, CLICKHOUSE_PORT: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="9000"
                        />
                        <p className="mt-1 text-sm text-gray-500">Native protocol port</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">HTTP Port</label>
                        <input
                          type="text"
                          value={dashboardConfig.CLICKHOUSE_PORT_2 || ''}
                          onChange={(e) => onDashboardChange({ ...dashboardConfig, CLICKHOUSE_PORT_2: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="8123"
                        />
                        <p className="mt-1 text-sm text-gray-500">HTTP interface port</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">HTTPS Port</label>
                        <input
                          type="text"
                          value={dashboardConfig.CLICKHOUSE_PORT_3 || ''}
                          onChange={(e) => onDashboardChange({ ...dashboardConfig, CLICKHOUSE_PORT_3: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="8443"
                        />
                        <p className="mt-1 text-sm text-gray-500">HTTPS interface port</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Database User</label>
                        <input
                          type="text"
                          value={dashboardConfig.CLICKHOUSE_USER || ''}
                          onChange={(e) => onDashboardChange({ ...dashboardConfig, CLICKHOUSE_USER: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="default"
                        />
                        <p className="mt-1 text-sm text-gray-500">Database username</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-black mb-2">Database Password</label>
                        <input
                          type="password"
                          value={dashboardConfig.CLICKHOUSE_PASSWORD || ''}
                          onChange={(e) => onDashboardChange({ ...dashboardConfig, CLICKHOUSE_PASSWORD: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="Enter password (optional)"
                        />
                        <p className="mt-1 text-sm text-gray-500">Database password (leave empty for no password)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Litestream Backups */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    id="enableLitestream"
                    checked={dashboardConfig.ENABLE_LITESTREAM || false}
                    onChange={(e) => onDashboardChange({ ...dashboardConfig, ENABLE_LITESTREAM: e.target.checked })}
                    className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
                  />
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-gray-600" />
                    <label htmlFor="enableLitestream" className="text-sm font-medium text-black">
                      Litestream Backups
                    </label>
                  </div>
                  <span className="text-xs text-gray-500">- Continuous SQLite database backups</span>
                </div>

                {/* Litestream Configuration */}
                {dashboardConfig.ENABLE_LITESTREAM && (
                  <div className="ml-7 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-black mb-3">Litestream S3 Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">S3 Bucket Name</label>
                        <input
                          type="text"
                          value={dashboardConfig.AR_IO_SQLITE_BACKUP_S3_BUCKET_NAME || ''}
                          onChange={(e) => onDashboardChange({ ...dashboardConfig, AR_IO_SQLITE_BACKUP_S3_BUCKET_NAME: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="my-ar-io-backups"
                        />
                        <p className="mt-1 text-sm text-gray-500">S3 bucket for SQLite backups</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">AWS Region</label>
                        <input
                          type="text"
                          value={dashboardConfig.AR_IO_SQLITE_BACKUP_S3_BUCKET_REGION || ''}
                          onChange={(e) => onDashboardChange({ ...dashboardConfig, AR_IO_SQLITE_BACKUP_S3_BUCKET_REGION: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="us-east-1"
                        />
                        <p className="mt-1 text-sm text-gray-500">AWS region for S3 bucket</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Access Key</label>
                        <input
                          type="text"
                          value={dashboardConfig.AR_IO_SQLITE_BACKUP_S3_BUCKET_ACCESS_KEY || ''}
                          onChange={(e) => onDashboardChange({ ...dashboardConfig, AR_IO_SQLITE_BACKUP_S3_BUCKET_ACCESS_KEY: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="AKIA..."
                        />
                        <p className="mt-1 text-sm text-gray-500">AWS access key ID</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Secret Key</label>
                        <input
                          type="password"
                          value={dashboardConfig.AR_IO_SQLITE_BACKUP_S3_BUCKET_SECRET_KEY || ''}
                          onChange={(e) => onDashboardChange({ ...dashboardConfig, AR_IO_SQLITE_BACKUP_S3_BUCKET_SECRET_KEY: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="Enter secret key"
                        />
                        <p className="mt-1 text-sm text-gray-500">AWS secret access key</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-black mb-2">S3 Prefix (Optional)</label>
                        <input
                          type="text"
                          value={dashboardConfig.AR_IO_SQLITE_BACKUP_S3_BUCKET_PREFIX || ''}
                          onChange={(e) => onDashboardChange({ ...dashboardConfig, AR_IO_SQLITE_BACKUP_S3_BUCKET_PREFIX: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="backups/"
                        />
                        <p className="mt-1 text-sm text-gray-500">Optional prefix for backup files in S3</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Container Autoheal */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="enableAutoheal"
                    checked={config.RUN_AUTOHEAL || false}
                    onChange={(e) => handleInputChange('RUN_AUTOHEAL', e.target.checked)}
                    className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
                  />
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <label htmlFor="enableAutoheal" className="text-sm font-medium text-black">
                      Container Autoheal
                    </label>
                  </div>
                  <span className="text-xs text-gray-500">- Automatic container health monitoring and restart</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ArNS Configuration */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            ArNS Root Host (Optional)
          </label>
          <input
            type="text"
            value={config.ARNS_ROOT_HOST || ''}
            onChange={(e) => handleInputChange('ARNS_ROOT_HOST', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
              getError('ARNS_ROOT_HOST') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
            placeholder="gateway.example.com"
          />
          {getError('ARNS_ROOT_HOST') && (
            <p className="mt-1 text-sm text-red-600">{getError('ARNS_ROOT_HOST')}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Your gateway's hostname for ArNS resolution (requires wildcard DNS setup)
          </p>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-gray-700 hover:text-black font-medium transition-colors"
          >
            {showAdvanced ? (
              <ChevronDown className="w-4 h-4 mr-2" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-2" />
            )}
            Advanced Settings
          </button>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-6 bg-gray-50 border border-gray-200 p-6 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Start Height
                </label>
                <input
                  type="number"
                  value={config.START_HEIGHT || ''}
                  onChange={(e) => handleInputChange('START_HEIGHT', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="1000000"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Block height to start syncing from (first run only)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Stop Height
                </label>
                <input
                  type="number"
                  value={config.STOP_HEIGHT || ''}
                  onChange={(e) => handleInputChange('STOP_HEIGHT', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Leave empty for continuous sync"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Block height to stop syncing at (optional)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Trusted Arweave URL
              </label>
              <input
                type="url"
                value={config.TRUSTED_ARWEAVE_URL || ''}
                onChange={(e) => handleInputChange('TRUSTED_ARWEAVE_URL', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="https://arweave.net"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                ANS-104 Unbundle Filter
              </label>
              <textarea
                value={config.ANS104_UNBUNDLE_FILTER || ''}
                onChange={(e) => handleInputChange('ANS104_UNBUNDLE_FILTER', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                rows={3}
                placeholder='{"never": true}'
              />
              <p className="mt-1 text-sm text-gray-500">
                JSON filter determining which transactions to unbundle
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                ANS-104 Index Filter
              </label>
              <textarea
                value={config.ANS104_INDEX_FILTER || ''}
                onChange={(e) => handleInputChange('ANS104_INDEX_FILTER', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                rows={3}
                placeholder='{"never": true}'
              />
              <p className="mt-1 text-sm text-gray-500">
                JSON filter determining which data items to index
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">Trusted Node URL</label>
                <input
                  type="url"
                  value={config.TRUSTED_NODE_URL || ''}
                  onChange={(e) => handleInputChange('TRUSTED_NODE_URL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="https://arweave.net"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Trusted Gateway URL</label>
                <input
                  type="url"
                  value={config.TRUSTED_GATEWAY_URL || ''}
                  onChange={(e) => handleInputChange('TRUSTED_GATEWAY_URL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="https://arweave.net"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Trusted ARNS Gateway URL</label>
                <input
                  type="url"
                  value={config.TRUSTED_ARNS_GATEWAY_URL || ''}
                  onChange={(e) => handleInputChange('TRUSTED_ARNS_GATEWAY_URL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="https://__NAME__.arweave.dev"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.SKIP_CACHE || false}
                  onChange={(e) => handleInputChange('SKIP_CACHE', e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Skip Cache</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Instance ID</label>
                <input
                  type="text"
                  value={config.INSTANCE_ID || ''}
                  onChange={(e) => handleInputChange('INSTANCE_ID', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Unique instance ID for logging"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Log Format</label>
                <input
                  type="text"
                  value={config.LOG_FORMAT || ''}
                  onChange={(e) => handleInputChange('LOG_FORMAT', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="simple or json"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Observer Port</label>
                <input
                  type="number"
                  value={config.OBSERVER_PORT || ''}
                  onChange={(e) => handleInputChange('OBSERVER_PORT', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="5050"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Simulated Request Failure Rate</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.SIMULATED_REQUEST_FAILURE_RATE || ''}
                  onChange={(e) => handleInputChange('SIMULATED_REQUEST_FAILURE_RATE', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="0.0 - 1.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Admin API Key File</label>
                <input
                  type="text"
                  value={config.ADMIN_API_KEY_FILE || ''}
                  onChange={(e) => handleInputChange('ADMIN_API_KEY_FILE', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="/path/to/admin-key.txt"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.FILTER_CHANGE_REPROCESS || false}
                  onChange={(e) => handleInputChange('FILTER_CHANGE_REPROCESS', e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Reprocess Filter Changes</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Sandbox Protocol</label>
                <input
                  type="text"
                  value={config.SANDBOX_PROTOCOL || ''}
                  onChange={(e) => handleInputChange('SANDBOX_PROTOCOL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="http or https"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.START_WRITERS || false}
                  onChange={(e) => handleInputChange('START_WRITERS', e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Start Writers</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.ENABLE_MEMPOOL_WATCHER || false}
                  onChange={(e) => handleInputChange('ENABLE_MEMPOOL_WATCHER', e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Enable Mempool Watcher</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Mempool Polling Interval (ms)</label>
                <input
                  type="number"
                  value={config.MEMPOOL_POLLING_INTERVAL_MS || ''}
                  onChange={(e) => handleInputChange('MEMPOOL_POLLING_INTERVAL_MS', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="30000"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};