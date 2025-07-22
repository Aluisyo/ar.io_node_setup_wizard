import React from 'react';
import { DashboardConfig, NodeConfig, ValidationError } from '../../types';

interface GatewayConfigStepProps {
  config: DashboardConfig;
  nodeConfig: NodeConfig;
  onChange: (config: DashboardConfig) => void;
  onNodeChange: (config: NodeConfig) => void;
  errors: ValidationError[];
}

export const GatewayConfigStep: React.FC<GatewayConfigStepProps> = ({
  config,
  nodeConfig,
  onChange,
  onNodeChange,
  errors,
}) => {
  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleInputChange = (field: keyof DashboardConfig, value: string | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const handleNodeInputChange = (field: keyof NodeConfig, value: string | boolean) => {
    onNodeChange({ ...nodeConfig, [field]: value });
  };

  // Sync admin API key with node config
  React.useEffect(() => {
    if (nodeConfig.ADMIN_API_KEY && nodeConfig.ADMIN_API_KEY !== config.ADMIN_API_KEY) {
      onChange({ ...config, ADMIN_API_KEY: nodeConfig.ADMIN_API_KEY });
    }
  }, [nodeConfig.ADMIN_API_KEY, config.ADMIN_API_KEY, onChange]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-black mb-2">Gateway Configuration</h1>
        <p className="text-gray-600">
          Configure your AR.IO Gateway's network access and port settings.
        </p>
      </div>

      <div className="space-y-8">
        {/* Port Configuration */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-black mb-6">Network Ports</h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Envoy Proxy Port
              </label>
              <input
                type="number"
                value={config.ENVOY_PORT}
                onChange={(e) => handleInputChange('ENVOY_PORT', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                  getError('ENVOY_PORT') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                placeholder="3000"
                min="1024"
                max="65535"
              />
              {getError('ENVOY_PORT') && (
                <p className="mt-1 text-sm text-red-600">{getError('ENVOY_PORT')}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Main gateway access port (public-facing)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                AR.IO Core Port
              </label>
              <input
                type="number"
                value={nodeConfig.CORE_PORT}
                onChange={(e) => handleNodeInputChange('CORE_PORT', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                  getError('CORE_PORT') ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                placeholder="4000"
                min="1024"
                max="65535"
              />
              {getError('CORE_PORT') && (
                <p className="mt-1 text-sm text-red-600">{getError('CORE_PORT')}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Internal AR.IO node service port
              </p>
            </div>
          </div>
        </div>

        {/* Access URLs Preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-black mb-4">Gateway Access URLs</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Gateway (via Envoy):</span>
              <code className="px-2 py-1 bg-white border border-gray-300 rounded text-sm text-black">
                http://localhost:{config.ENVOY_PORT}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Direct Node API:</span>
              <code className="px-2 py-1 bg-white border border-gray-300 rounded text-sm text-black">
                http://localhost:{nodeConfig.CORE_PORT}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">GraphQL Endpoint:</span>
              <code className="px-2 py-1 bg-white border border-gray-300 rounded text-sm text-black">
                http://localhost:{config.ENVOY_PORT}/graphql
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Admin API:</span>
              <code className="px-2 py-1 bg-white border border-gray-300 rounded text-sm text-black">
                http://localhost:{nodeConfig.CORE_PORT}/ar-io/admin
              </code>
            </div>
          </div>
        </div>

        {/* ArNS Configuration */}
        {nodeConfig.ARNS_ROOT_HOST && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-black mb-4">ArNS Configuration</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Root Host:</span>
                <code className="px-2 py-1 bg-white border border-gray-300 rounded text-sm text-black">
                  {nodeConfig.ARNS_ROOT_HOST}
                </code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">ArNS Resolution:</span>
                <code className="px-2 py-1 bg-white border border-gray-300 rounded text-sm text-black">
                  *.{nodeConfig.ARNS_ROOT_HOST}
                </code>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded">
              <p className="text-sm text-green-800">
                <strong>Note:</strong> Ensure your DNS is configured with a wildcard entry pointing to your server.
              </p>
            </div>
          </div>
        )}


          

          


  </div>
</div>
  );
};