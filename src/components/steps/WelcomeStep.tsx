import React from 'react';
import { ArrowRight, Server, Shield, Zap } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-8">
          <img src="/ariologo.png" alt="AR.IO" className="h-24 w-auto" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight">AR.IO Gateway Node Setup</h1>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Deploy your AR.IO Gateway node with our automated setup wizard. Configure, validate, and launch your node in minutes.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="text-center p-8">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-6 mx-auto">
            <Zap className="w-6 h-6 text-gray-700" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Automated</h3>
          <p className="text-gray-600 leading-relaxed">Streamlined configuration with real-time validation and Docker orchestration</p>
        </div>
        <div className="text-center p-8">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-6 mx-auto">
            <Shield className="w-6 h-6 text-gray-700" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Secure</h3>
          <p className="text-gray-600 leading-relaxed">Best practices for security, authentication, and encrypted configuration</p>
        </div>
        <div className="text-center p-8">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-6 mx-auto">
            <Server className="w-6 h-6 text-gray-700" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Production Ready</h3>
          <p className="text-gray-600 leading-relaxed">Enterprise deployment with monitoring, logging, and health checks</p>
        </div>
      </div>



      {/* CTA */}
      <div className="text-center">
        <button
          onClick={onNext}
          className="inline-flex items-center px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
        >
          Get Started
          <ArrowRight className="ml-2 w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
