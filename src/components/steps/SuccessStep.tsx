import React from 'react';
import { DeploymentConfig } from '../../types';
import { CheckCircle, ExternalLink, Copy, Server, Globe, ArrowRight, Eye, BarChart2, Package, Cpu } from 'lucide-react';

interface SuccessStepProps {
  config: DeploymentConfig;
  onReset?: () => void;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ config, onReset }) => {
  // Use current hostname instead of hardcoded localhost
  const currentHost = window.location.hostname;
  const protocol = window.location.protocol;
  

  // Gateway URL - use Envoy port if enabled, otherwise Core port
  const gatewayPort = config.dashboardConfig.ENABLE_ENVOY ? config.dashboardConfig.ENVOY_PORT : config.nodeConfig.CORE_PORT;
  const gatewayUrl = `${protocol}//${currentHost}:${gatewayPort}`;
  const coreUrl = `${protocol}//${currentHost}:${config.nodeConfig.CORE_PORT}`;
  const dashboardUrl = `${protocol}//${currentHost}:${config.dashboardConfig.DASHBOARD_PORT}`;
  const grafanaUrl = `${protocol}//${currentHost}:${config.dashboardConfig.GRAFANA_PORT}`;
  // Service URLs based on official AR.IO setup
  const bundlerUrl = `${protocol}//${currentHost}:5100`; // Upload service port
  const aoCuUrl = `${protocol}//${currentHost}:6363`; // AO CU port

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };



  return (
    <div className="max-w-4xl mx-auto text-center">
      {/* Success Header */}
      <div className="mb-12">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight">
          Deployment Complete!
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Your AR.IO Gateway node is now running and ready to use.
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className={`grid items-stretch ${
        // Calculate grid layout based on enabled services
        (() => {
          const hasGateway = true; // Always have gateway
          const hasCoreApi = config.dashboardConfig.ENABLE_ENVOY; // Show Core API when Envoy is enabled
          const hasDashboard = config.dashboardConfig.ENABLE_DASHBOARD;
          
          const totalCards = (hasGateway ? 1 : 0) + (hasCoreApi ? 1 : 0) + (hasDashboard ? 1 : 0);
          
          if (totalCards === 1) return 'md:grid-cols-1 max-w-md mx-auto';
          if (totalCards === 2) return 'md:grid-cols-2 max-w-4xl mx-auto';
          if (totalCards === 3) return 'md:grid-cols-3 max-w-6xl mx-auto';
          return 'md:grid-cols-2 max-w-4xl mx-auto';
        })()
      } gap-8 mb-12`}>
        {/* Node API Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-full flex flex-col justify-between min-h-[20rem]">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-6">
            <Server className="w-6 h-6 text-gray-700" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">AR.IO Gateway</h3>
          <p className="text-gray-600 mb-6 text-center">
            {config.dashboardConfig.ENABLE_ENVOY 
              ? 'Main gateway access via Envoy proxy' 
              : 'Direct access to AR.IO core service'
            }
          </p>
          
          <div className="flex items-center space-x-2 mb-6">
            <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono text-gray-900">
              {gatewayUrl}
            </code>
            <button
              onClick={() => copyToClipboard(gatewayUrl)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Copy URL"
            >
              <Copy className="w-4 h-4" />
            </button>
            <a
              href={gatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-blue-600 hover:text-blue-700 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          
          <div className="text-sm text-gray-500 space-y-1">
            <p>• Main access point for your gateway</p>
            <p>• GraphQL endpoint: <code>/graphql</code></p>
            <p>• Data serving and ArNS resolution</p>
          </div>
        </div>

        {/* Core API Card - only show when Envoy is enabled to distinguish from gateway */}
        {config.dashboardConfig.ENABLE_ENVOY && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-full flex flex-col justify-between min-h-[20rem]">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-6">
              <Cpu className="w-6 h-6 text-orange-700" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Core API</h3>
            <p className="text-gray-600 mb-6 text-center">Direct access to AR.IO core service</p>
            
            <div className="flex items-center space-x-2 mb-6">
              <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono text-gray-900">
                {coreUrl}
              </code>
              <button
                onClick={() => copyToClipboard(coreUrl)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={coreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-blue-600 hover:text-blue-700 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>• Direct API access (bypasses Envoy)</p>
              <p>• GraphQL endpoint: <code>/graphql</code></p>
              <p>• Administrative functions</p>
            </div>
          </div>
        )}

        {/* Admin Dashboard Card */}
        {config.dashboardConfig.ENABLE_DASHBOARD && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-full flex flex-col justify-between min-h-[20rem]">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-6">
              <Globe className="w-6 h-6 text-blue-700" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Admin Dashboard</h3>
            <p className="text-gray-600 mb-6 text-center">Web interface for managing your gateway</p>
            
            <div className="flex items-center space-x-2 mb-6">
              <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono text-gray-900">
                {dashboardUrl}
              </code>
              <button
                onClick={() => copyToClipboard(dashboardUrl)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-blue-600 hover:text-blue-700 transition-colors"
                title="Open Dashboard"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p><strong>Username:</strong> {config.dashboardConfig.ADMIN_USERNAME}</p>
              <p><strong>Password:</strong> [As configured]</p>
              <p>• Node monitoring and configuration</p>
            </div>
          </div>
        )}
      </div>

      {/* Additional Services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 items-stretch">


        {/* Observer */}
        {config.nodeConfig.RUN_OBSERVER && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-full flex flex-col justify-between min-h-[20rem]">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mx-auto mb-4">
              <Eye className="w-5 h-5 text-blue-700" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Observer</h4>
            <code className="text-xs text-gray-600 mb-3 block">{`${protocol}//${currentHost}:${config.nodeConfig.OBSERVER_PORT || '5050'}`}</code>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <button onClick={() => copyToClipboard(`${protocol}//${currentHost}:${config.nodeConfig.OBSERVER_PORT || '5050'}`)} className="p-2 text-gray-500 hover:text-gray-700 transition-colors" title="Copy URL"><Copy className="w-4 h-4"/></button>
              <a href={`${protocol}//${currentHost}:${config.nodeConfig.OBSERVER_PORT || '5050'}`} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:text-blue-700 transition-colors" title="Open in new tab"><ExternalLink className="w-4 h-4"/></a>
            </div>
            <p className="text-sm text-gray-500">Observer service UI (port {config.nodeConfig.OBSERVER_PORT || '5050'})</p>
          </div>
        )}

        {/* Prometheus UI */}
        {config.dashboardConfig.ENABLE_GRAFANA && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-full flex flex-col justify-between min-h-[20rem]">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg mx-auto mb-4">
              <BarChart2 className="w-5 h-5 text-gray-700" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Prometheus UI</h4>
            <code className="text-xs text-gray-600 mb-3 block">{`${protocol}//${currentHost}:9090`}</code>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <button onClick={() => copyToClipboard(`${protocol}//${currentHost}:9090`)} className="p-2 text-gray-500 hover:text-gray-700 transition-colors" title="Copy URL"><Copy className="w-4 h-4"/></button>
              <a href={`${protocol}//${currentHost}:9090`} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:text-blue-700 transition-colors" title="Open in new tab"><ExternalLink className="w-4 h-4"/></a>
            </div>
            <p className="text-sm text-gray-500">Prometheus monitoring UI (port 9090)</p>
          </div>
        )}

        {/* Grafana */}
        {config.dashboardConfig.ENABLE_GRAFANA && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-full flex flex-col justify-between min-h-[20rem]">
            <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg mx-auto mb-4">
              <Globe className="w-5 h-5 text-orange-700" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Grafana</h4>
            <code className="text-xs text-gray-600 mb-3 block">{grafanaUrl}</code>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <button onClick={() => copyToClipboard(grafanaUrl)} className="p-2 text-gray-500 hover:text-gray-700 transition-colors" title="Copy URL"><Copy className="w-4 h-4"/></button>
              <a href={grafanaUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:text-blue-700 transition-colors" title="Open in new tab"><ExternalLink className="w-4 h-4"/></a>
            </div>
            <p className="text-sm text-gray-500">Monitoring & metrics dashboard (port {config.dashboardConfig.GRAFANA_PORT})</p>
          </div>
        )}

        {/* Bundler Service */}
        {config.dashboardConfig.ENABLE_BUNDLER && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-full flex flex-col justify-between min-h-[20rem]">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg mx-auto mb-4">
              <Package className="w-5 h-5 text-green-700" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Turbo Bundler</h4>
            <code className="text-xs text-gray-600 mb-3 block">{bundlerUrl}</code>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <button onClick={() => copyToClipboard(bundlerUrl)} className="p-2 text-gray-500 hover:text-gray-700 transition-colors" title="Copy URL"><Copy className="w-4 h-4"/></button>
              <a href={bundlerUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:text-blue-700 transition-colors" title="Open in new tab"><ExternalLink className="w-4 h-4"/></a>
            </div>
            <p className="text-sm text-gray-500">ANS-104 bundling service (port 5100)</p>
          </div>
        )}

        {/* AO CU Service */}
        {config.dashboardConfig.ENABLE_AO_CU && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-full flex flex-col justify-between min-h-[20rem]">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg mx-auto mb-4">
              <Cpu className="w-5 h-5 text-purple-700" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">AO CU</h4>
            <code className="text-xs text-gray-600 mb-3 block">{aoCuUrl}</code>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <button onClick={() => copyToClipboard(aoCuUrl)} className="p-2 text-gray-500 hover:text-gray-700 transition-colors" title="Copy URL"><Copy className="w-4 h-4"/></button>
              <a href={aoCuUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:text-blue-700 transition-colors" title="Open in new tab"><ExternalLink className="w-4 h-4"/></a>
            </div>
            <p className="text-sm text-gray-500">AO Compute Unit service (port 6363)</p>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="text-center mb-12 space-x-4">
        {config.dashboardConfig.ENABLE_DASHBOARD && (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
          >
            <Globe className="w-5 h-5 mr-2" />
            Open Admin Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        )}
        
        <a
          href={gatewayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
            config.dashboardConfig.ENABLE_DASHBOARD 
              ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' 
              : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
          }`}
        >
          <Server className="w-5 h-5 mr-2" />
          Visit Gateway
          {!config.dashboardConfig.ENABLE_DASHBOARD && <ArrowRight className="w-4 h-4 ml-2" />}
        </a>

      </div>

      {/* Reset Button */}
      {onReset && (
        <div className="text-center pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-4">Want to deploy another node?</p>
          <button
            onClick={onReset}
            className="inline-flex items-center px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
          >
            Start New Deployment
          </button>
        </div>
      )}






    </div>
  );
};