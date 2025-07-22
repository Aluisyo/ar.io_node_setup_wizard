import React from 'react';
import { DashboardConfig, ValidationError } from '../../types';
import { Eye, EyeOff, Shield, ChevronDown, ChevronRight } from 'lucide-react';

interface DashboardConfigStepProps {
  config: DashboardConfig;
  onChange: (config: DashboardConfig) => void;
  errors: ValidationError[];
}

export const DashboardConfigStep: React.FC<DashboardConfigStepProps> = ({
  config,
  onChange,
  errors,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleInputChange = (field: keyof DashboardConfig, value: string | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleInputChange('ADMIN_PASSWORD', password);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Dashboard Configuration</h2>
        <p className="text-gray-600 text-lg">
          Set up your AR.IO Admin Dashboard access and security settings.
        </p>
      </div>

      <div className="space-y-8">
        {/* Dashboard Port */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Dashboard Port
          </label>
          <input
            type="number"
            value={config.DASHBOARD_PORT}
            onChange={(e) => handleInputChange('DASHBOARD_PORT', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 ${
              getError('DASHBOARD_PORT') ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            placeholder="3000"
            min="1024"
            max="65535"
          />
          {getError('DASHBOARD_PORT') && (
            <p className="mt-2 text-sm text-red-600">{getError('DASHBOARD_PORT')}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Port number for the dashboard web interface (1024-65535)
          </p>
        </div>

        {/* API Endpoint */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            API Endpoint
          </label>
          <input
            type="url"
            value={config.API_ENDPOINT}
            onChange={(e) => handleInputChange('API_ENDPOINT', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 ${
              getError('API_ENDPOINT') ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            placeholder="http://localhost:4000"
          />
          {getError('API_ENDPOINT') && (
            <p className="mt-2 text-sm text-red-600">{getError('API_ENDPOINT')}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            URL where your AR.IO Node API is accessible
          </p>
        </div>

        {/* Admin Credentials */}
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Shield className="w-4 h-4 text-gray-700" />
            </div>
            <h3 className="font-semibold text-gray-900">Admin Credentials</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Admin Username
              </label>
              <input
                type="text"
                value={config.ADMIN_USERNAME}
                onChange={(e) => handleInputChange('ADMIN_USERNAME', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 ${
                  getError('ADMIN_USERNAME') ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                placeholder="admin"
              />
              {getError('ADMIN_USERNAME') && (
                <p className="mt-2 text-sm text-red-600">{getError('ADMIN_USERNAME')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Admin Password
              </label>
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={config.ADMIN_PASSWORD}
                    onChange={(e) => handleInputChange('ADMIN_PASSWORD', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 ${
                      getError('ADMIN_PASSWORD') ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    placeholder="Enter secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 whitespace-nowrap font-medium"
                >
                  Generate
                </button>
              </div>
              {getError('ADMIN_PASSWORD') && (
                <p className="mt-2 text-sm text-red-600">{getError('ADMIN_PASSWORD')}</p>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Minimum 8 characters. Use a strong, unique password.
              </p>
            </div>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            {showAdvanced ? (
              <ChevronDown className="w-4 h-4 mr-2" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-2" />
            )}
            SSL Configuration
          </button>
        </div>

        {/* SSL Configuration */}
        {showAdvanced && (
          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg space-y-6">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="enableSSL"
                checked={config.ENABLE_SSL || false}
                onChange={(e) => handleInputChange('ENABLE_SSL', e.target.checked)}
                className="w-4 h-4 text-gray-900 bg-white border-gray-300 rounded focus:ring-gray-900 focus:ring-2"
              />
              <label htmlFor="enableSSL" className="font-medium text-gray-900">
                Enable SSL/TLS
              </label>
            </div>

            {config.ENABLE_SSL && (
              <div className="space-y-6 pl-7">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    SSL Certificate Path
                  </label>
                  <input
                    type="text"
                    value={config.SSL_CERT_PATH || ''}
                    onChange={(e) => handleInputChange('SSL_CERT_PATH', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="/path/to/certificate.pem"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    SSL Private Key Path
                  </label>
                  <input
                    type="text"
                    value={config.SSL_KEY_PATH || ''}
                    onChange={(e) => handleInputChange('SSL_KEY_PATH', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="/path/to/private.key"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};