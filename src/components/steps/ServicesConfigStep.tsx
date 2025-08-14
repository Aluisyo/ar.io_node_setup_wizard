import React from 'react';
import { DashboardConfig, NodeConfig, ValidationError } from '../../types';
import { FileUpload } from '../FileUpload';
import { ANS104FilterBuilder } from '../ANS104FilterBuilder';
import { AlertCircle, Package, Cpu, Globe, BarChart2, Eye, EyeOff, Copy, Check } from 'lucide-react';

// Dynamic Arweave loading to completely avoid SubtleCrypto on module load
const getArweave = async () => {
  try {
    const Arweave = (await import('arweave')).default;
    return Arweave.init({});
  } catch (error) {
    return null;
  }
};

interface ServicesConfigStepProps {
  config: DashboardConfig;
  onChange: (config: DashboardConfig) => void;
  nodeConfig: NodeConfig;
  onNodeChange: (config: NodeConfig) => void;
  errors: ValidationError[];
}

export const ServicesConfigStep: React.FC<ServicesConfigStepProps> = ({
  config,
  onChange,
  nodeConfig,
  onNodeChange,
  errors,
}) => {
  const [bundlerWalletFile, setBundlerWalletFile] = React.useState<File>();
  const [cuWalletFile, setCuWalletFile] = React.useState<File>();
  const [showPassword, setShowPassword] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleInputChange = (field: keyof DashboardConfig, value: string | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for HTTP contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };



  const handleBundlerWalletSelect = (file: File) => {
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
          }
        } catch (cryptoError) {
          // SubtleCrypto not available - skip address derivation
          address = '';
        }
        
        setBundlerWalletFile(file);
        onChange({ 
          ...config, 
          BUNDLER_ARWEAVE_WALLET: JSON.stringify(walletData),
          BUNDLER_ARWEAVE_ADDRESS: address
        });
      } catch (error) {
        // Invalid wallet file - silently ignore
      }
    };
    reader.readAsText(file);
  };

  const handleCuWalletSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const walletData = JSON.parse(e.target?.result as string);
        setCuWalletFile(file);
        onChange({ 
          ...config, 
          CU_WALLET: JSON.stringify(walletData) 
        });
      } catch (error) {
        // Invalid wallet file - silently ignore
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-black mb-2">Optional Extensions</h1>
        <p className="text-gray-600">
          Configure additional AR.IO extensions to extend your gateway's capabilities.
        </p>
      </div>

      <div className="space-y-8">


        {/* Turbo Bundler Extension */}
        <div className="border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="enableBundler"
                checked={config.ENABLE_BUNDLER}
                onChange={(e) => handleInputChange('ENABLE_BUNDLER', e.target.checked)}
                className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
              />
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-gray-600" />
                <label htmlFor="enableBundler" className="text-lg font-medium text-black">
                  Turbo ANS-104 Bundler
                </label>
              </div>
            </div>
            <p className="text-gray-600 ml-7">
              Accept data items and bundle them into single transactions before submitting to the network.
              APIs will be available at <code>/bundler/</code> path.
            </p>
          </div>

          {config.ENABLE_BUNDLER && (
            <div className="p-6 space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-orange-800">
                    <strong>Important:</strong> The bundler requires your AR.IO node's indexes to be synced 
                    up to Arweave's current block height minus 18 blocks before starting.
                  </div>
                </div>
              </div>

              <div>
                <FileUpload
                  label="Bundler Wallet (JWK)"
                  description="Wallet used for uploading bundles to Arweave"
                  onFileSelect={handleBundlerWalletSelect}
                  selectedFile={bundlerWalletFile}
                  onFileRemove={() => {
                    setBundlerWalletFile(undefined);
                    onChange({ ...config, BUNDLER_ARWEAVE_WALLET: '' });
                  }}
                  accept=".json"
                  error={getError('BUNDLER_ARWEAVE_WALLET')}
                />
                {window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
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

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Allow Listed Addresses (Optional)
                </label>
                <textarea
                  value={config.ALLOW_LISTED_ADDRESSES || ''}
                  onChange={(e) => handleInputChange('ALLOW_LISTED_ADDRESSES', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  rows={3}
                  placeholder="addr1,addr2,addr3 (comma-separated normalized wallet addresses)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Comma-separated list of wallet addresses allowed to upload data items.
                  Leave empty to allow all addresses.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              {/* Bundler Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">Bundler Wallet Address</label>
                <input
                  type="text"
                  value={config.BUNDLER_ARWEAVE_ADDRESS || ''}
                  onChange={(e) => handleInputChange('BUNDLER_ARWEAVE_ADDRESS', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="arweave address"
                />
              </div>

              {/* Bundler Service Name */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">App Name</label>
                <input
                  type="text"
                  value={config.APP_NAME || ''}
                  onChange={(e) => handleInputChange('APP_NAME', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="ar.io bundler service"
                />
              </div>

              {/* ANS-104 Filters with Visual Builder */}
              <div className="space-y-6">
                <ANS104FilterBuilder
                  value={config.ANS104_INDEX_FILTER || ''}
                  onChange={(value) => handleInputChange('ANS104_INDEX_FILTER', value)}
                  label="ANS-104 Index Filter"
                  description="JSON filter determining which data items within bundles to index for querying in the bundler. Supports tag matching (exact, startsWith), attribute filtering, logical operators, hash partitioning for distributed processing, and nested bundle detection. Use visual mode for basic filters or code mode for advanced configurations."
                  placeholder='{"always": true}'
                />
                
                <ANS104FilterBuilder
                  value={config.ANS104_UNBUNDLE_FILTER || ''}
                  onChange={(value) => handleInputChange('ANS104_UNBUNDLE_FILTER', value)}
                  label="ANS-104 Unbundle Filter"
                  description="JSON filter determining which transactions and data items to unbundle in the bundler. Supports tag filters, attribute filters, logical operators (and/or/not), hash partitioning, and nested bundle detection. Use visual mode for simple filters or code mode for complex JSON filters."
                  placeholder='{"attributes": {"owner_address": "$BUNDLER_ARWEAVE_ADDRESS"}}'
                />
              </div>

              {/* AWS S3 Settings */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">S3 Bucket</label>
                <input
                  type="text"
                  value={config.AWS_S3_CONTIGUOUS_DATA_BUCKET || ''}
                  onChange={(e) => handleInputChange('AWS_S3_CONTIGUOUS_DATA_BUCKET', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="ar.io"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">S3 Prefix</label>
                <input
                  type="text"
                  value={config.AWS_S3_CONTIGUOUS_DATA_PREFIX || ''}
                  onChange={(e) => handleInputChange('AWS_S3_CONTIGUOUS_DATA_PREFIX', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="data"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">AWS Access Key ID</label>
                <input
                  type="text"
                  value={config.AWS_ACCESS_KEY_ID || ''}
                  onChange={(e) => handleInputChange('AWS_ACCESS_KEY_ID', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="test"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">AWS Secret Access Key</label>
                <input
                  type="password"
                  value={config.AWS_SECRET_ACCESS_KEY || ''}
                  onChange={(e) => handleInputChange('AWS_SECRET_ACCESS_KEY', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="test"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">AWS Region</label>
                <input
                  type="text"
                  value={config.AWS_REGION || ''}
                  onChange={(e) => handleInputChange('AWS_REGION', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="us-east-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">AWS Endpoint</label>
                <input
                  type="text"
                  value={config.AWS_ENDPOINT || ''}
                  onChange={(e) => handleInputChange('AWS_ENDPOINT', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="http://localstack:4566"
                />
              </div>

              {/* Redis Cache Configuration */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-black mb-3">Redis Cache Configuration</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Cache Type</label>
                    <select
                      value={config.CHAIN_CACHE_TYPE || 'redis'}
                      onChange={(e) => handleInputChange('CHAIN_CACHE_TYPE', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="redis">Redis</option>
                      <option value="memory">Memory</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Redis Cache URL</label>
                    <input
                      type="text"
                      value={config.REDIS_CACHE_URL || ''}
                      onChange={(e) => handleInputChange('REDIS_CACHE_URL', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="redis://redis:6379"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="redisTls"
                      checked={config.REDIS_USE_TLS || false}
                      onChange={(e) => handleInputChange('REDIS_USE_TLS', e.target.checked)}
                      className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
                    />
                    <label htmlFor="redisTls" className="text-sm font-medium text-black">
                      Use TLS for Redis connection
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Cache TTL (seconds)</label>
                    <input
                      type="text"
                      value={config.REDIS_CACHE_TTL_SECONDS || ''}
                      onChange={(e) => handleInputChange('REDIS_CACHE_TTL_SECONDS', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="3600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Redis Max Memory</label>
                    <input
                      type="text"
                      value={config.REDIS_MAX_MEMORY || ''}
                      onChange={(e) => handleInputChange('REDIS_MAX_MEMORY', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="256mb"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Extra Redis Flags</label>
                    <input
                      type="text"
                      value={config.EXTRA_REDIS_FLAGS || ''}
                      onChange={(e) => handleInputChange('EXTRA_REDIS_FLAGS', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder='--save "" --appendonly no'
                    />
                  </div>
                </div>
              </div>

              <h4 className="font-medium text-black mb-2">Bundler Access</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• API endpoint: <code>http://localhost:3000/bundler/tx</code></li>
                  <li>• API docs: <code>http://localhost:3000/bundler/api-docs/</code></li>
                  <li>• Data items are instantly served from your gateway</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* AO Compute Unit Service */}
        <div className="border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="enableAoCu"
                checked={config.ENABLE_AO_CU}
                onChange={(e) => handleInputChange('ENABLE_AO_CU', e.target.checked)}
                className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
              />
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-gray-600" />
                <label htmlFor="enableAoCu" className="text-lg font-medium text-black">
                  AO Compute Unit (CU)
                </label>
              </div>
            </div>
            <p className="text-gray-600 ml-7">
              Interact with AO Processes via "Dry Runs" without side effects or gas payments.
            </p>
          </div>

          {config.ENABLE_AO_CU && (
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <strong>Indexing Requirements:</strong> AO CU requires indexing most of Arweave's recent history.
                    Consider filtering for <code>Bundler-App-Name: AO</code> from block height 1378000 forward.
                  </div>
                </div>
              </div>

              <div>
                <FileUpload
                  label="CU Wallet (JWK)"
                  description="Wallet used for uploading CU checkpoints to Arweave"
                  onFileSelect={handleCuWalletSelect}
                  selectedFile={cuWalletFile}
                  onFileRemove={() => {
                    setCuWalletFile(undefined);
                    onChange({ ...config, CU_WALLET: '' });
                  }}
                  accept=".json"
                  error={getError('CU_WALLET')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Process Checkpoint Trusted Owners
                </label>
                <textarea
                  value={config.PROCESS_CHECKPOINT_TRUSTED_OWNERS || ''}
                  onChange={(e) => handleInputChange('PROCESS_CHECKPOINT_TRUSTED_OWNERS', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  rows={3}
                  placeholder="addr1,addr2,addr3 (comma-separated normalized wallet addresses)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Comma-separated list of CU checkpoint uploader wallet addresses (normalized).
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              {/* AO CU Gateway URL */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Gateway URL
                </label>
                <input
                  type="text"
                  value={config.GATEWAY_URL || ''}
                  onChange={(e) => handleInputChange('GATEWAY_URL', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="http://envoy:3000"
                />
              </div>

              {/* AO CU Uploader URL */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Uploader URL
                </label>
                <input
                  type="text"
                  value={config.UPLOADER_URL || ''}
                  onChange={(e) => handleInputChange('UPLOADER_URL', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="http://envoy:3000/bundler"
                />
              </div>

              <h4 className="font-medium text-black mb-2">AO CU Access</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Internal: <code>http://ao-cu:6363</code></li>
                  <li>• Via Gateway: <code>http://localhost:3000/ao/cu</code></li>
                  <li>• Direct Host: <code>http://localhost:6363</code></li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Grafana Monitoring Service */}
        <div className="border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="enableGrafana"
                checked={config.ENABLE_GRAFANA}
                onChange={(e) => handleInputChange('ENABLE_GRAFANA', e.target.checked)}
                className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
              />
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-gray-600" />
                <label htmlFor="enableGrafana" className="text-lg font-medium text-black">
                  Grafana Monitoring
                </label>
              </div>
            </div>
            <p className="text-gray-600 ml-7">
              Visualize metrics and monitoring dashboards for your gateway and extensions.
            </p>
          </div>

          {config.ENABLE_GRAFANA && (
            <div className="p-6 space-y-6">
              <div className="max-w-sm">
                <label className="block text-sm font-medium text-black mb-2">Grafana Port</label>
                <input
                  type="number"
                  value={config.GRAFANA_PORT}
                  onChange={(e) => handleInputChange('GRAFANA_PORT', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                    getError('GRAFANA_PORT') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  placeholder="3001"
                  min="1024"
                  max="65535"
                />
                {getError('GRAFANA_PORT') && (
                  <p className="mt-1 text-sm text-red-600">{getError('GRAFANA_PORT')}</p>
                )}
              </div>

              <div className="p-3 bg-gray-100 border border-gray-300 rounded">
                <p className="text-sm text-gray-700">
                  Grafana will be available at <code>http://localhost:{config.GRAFANA_PORT}/grafana</code>
                  <br />Default credentials: <strong>admin/admin</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Admin Dashboard Service */}
        <div className="border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="enableDashboard"
                checked={config.ENABLE_DASHBOARD}
                onChange={(e) => handleInputChange('ENABLE_DASHBOARD', e.target.checked)}
                className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
              />
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-gray-600" />
                <label htmlFor="enableDashboard" className="text-lg font-medium text-black">
                  Admin Dashboard
                </label>
              </div>
            </div>
            <p className="text-gray-600 ml-7">
              Web-based administration interface for monitoring and managing your AR.IO Gateway.
              Provides real-time metrics, configuration management, and system health monitoring.
            </p>
          </div>

          {config.ENABLE_DASHBOARD && (
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <strong>Recommended:</strong> The admin dashboard provides valuable insights into your gateway's 
                    performance, blockchain sync status, and allows for easy configuration management.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Dashboard Port
                  </label>
                  <input
                    type="number"
                    value={config.DASHBOARD_PORT}
                    onChange={(e) => handleInputChange('DASHBOARD_PORT', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                      getError('DASHBOARD_PORT') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    placeholder="3001"
                    min="1024"
                    max="65535"
                  />
                  {getError('DASHBOARD_PORT') && (
                    <p className="mt-1 text-sm text-red-600">{getError('DASHBOARD_PORT')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Admin Username
                  </label>
                  <input
                    type="text"
                    value={config.ADMIN_USERNAME}
                    onChange={(e) => handleInputChange('ADMIN_USERNAME', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                      getError('ADMIN_USERNAME') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    placeholder="admin"
                  />
                  {getError('ADMIN_USERNAME') && (
                    <p className="mt-1 text-sm text-red-600">{getError('ADMIN_USERNAME')}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Admin Password
                </label>
                <div className="relative">
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={config.ADMIN_PASSWORD}
                        onChange={(e) => handleInputChange('ADMIN_PASSWORD', e.target.value)}
                        className={`w-full px-3 py-2 pr-10 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                          getError('ADMIN_PASSWORD') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                        placeholder="Enter secure admin password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {config.ADMIN_PASSWORD && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(config.ADMIN_PASSWORD)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1"
                        title="Copy password to clipboard"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span className="text-sm">Copy</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
                        let password = '';
                        for (let i = 0; i < 16; i++) {
                          password += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        handleInputChange('ADMIN_PASSWORD', password);
                      }}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                {getError('ADMIN_PASSWORD') && (
                  <p className="mt-1 text-sm text-red-600">{getError('ADMIN_PASSWORD')}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Strong password recommended for security. Use the copy button to securely save your password.
                </p>
              </div>

              {/* Advanced Dashboard Configuration */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-black mb-3">Advanced Configuration</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">NextAuth Secret</label>
                      <input
                        type="password"
                        value={config.NEXTAUTH_SECRET || ''}
                        onChange={(e) => handleInputChange('NEXTAUTH_SECRET', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="your-secret-key"
                      />
                      <p className="mt-1 text-xs text-gray-500">Secret key for NextAuth authentication</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">NextAuth URL</label>
                      <input
                        type="url"
                        value={config.NEXTAUTH_URL || ''}
                        onChange={(e) => handleInputChange('NEXTAUTH_URL', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="http://localhost:3001"
                      />
                      <p className="mt-1 text-xs text-gray-500">Base URL for NextAuth callbacks</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">AR.IO Node Path</label>
                      <input
                        type="text"
                        value={config.AR_IO_NODE_PATH || ''}
                        onChange={(e) => handleInputChange('AR_IO_NODE_PATH', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="~/ar-io-node"
                      />
                      <p className="mt-1 text-xs text-gray-500">Path to AR.IO node directory</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Docker Project</label>
                      <input
                        type="text"
                        value={config.DOCKER_PROJECT || ''}
                        onChange={(e) => handleInputChange('DOCKER_PROJECT', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="ar-io-node"
                      />
                      <p className="mt-1 text-xs text-gray-500">Docker Compose project name</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Grafana URL</label>
                    <input
                      type="url"
                      value={config.NEXT_PUBLIC_GRAFANA_URL || ''}
                      onChange={(e) => handleInputChange('NEXT_PUBLIC_GRAFANA_URL', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="http://localhost:1024"
                    />
                    <p className="mt-1 text-xs text-gray-500">URL for Grafana dashboard integration</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-black mb-2">Dashboard Features</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Real-time node health and performance monitoring</li>
                  <li>• Blockchain synchronization status and progress</li>
                  <li>• Transaction indexing and data serving metrics</li>
                  <li>• Configuration management and updates</li>
                  <li>• Wallet and observer status monitoring</li>
                  <li>• Access: <code>http://localhost:{config.DASHBOARD_PORT}</code></li>
                </ul>
              </div>
            </div>
          )}
        </div>



        {/* Services Summary */}
        {(config.ENABLE_BUNDLER || config.ENABLE_AO_CU || config.ENABLE_GRAFANA || config.ENABLE_DASHBOARD) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-black mb-4">Enabled Extensions Summary</h3>
            <div className="space-y-2">
              {config.ENABLE_BUNDLER && (
                <div className="flex items-center">
                  <Package className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">Turbo ANS-104 Bundler - Data item bundling and upload</span>
                </div>
              )}
              {config.ENABLE_AO_CU && (
                <div className="flex items-center">
                  <Cpu className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">AO Compute Unit - Process interaction and dry runs</span>
                </div>
              )}
              {config.ENABLE_GRAFANA && (
                <div className="flex items-center">
                  <BarChart2 className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">Grafana - Metrics dashboard and monitoring</span>
                </div>
              )}
              {config.ENABLE_DASHBOARD && (
                <div className="flex items-center">
                  <Globe className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">Admin Dashboard - Web interface for gateway management</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(!config.ENABLE_BUNDLER && !config.ENABLE_AO_CU && !config.ENABLE_GRAFANA && !config.ENABLE_DASHBOARD) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">
              No optional extensions selected. You can enable these later by modifying your deployment configuration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};