import React from 'react';
import { useWizard } from './hooks/useWizard';
import { ProgressBar } from './components/ProgressBar';
import { WizardNavigation } from './components/WizardNavigation';
import { WelcomeStep } from './components/steps/WelcomeStep';
import { NodeConfigStep } from './components/steps/NodeConfigStep';

import { ServicesConfigStep } from './components/steps/ServicesConfigStep';
import { ReviewStep } from './components/steps/ReviewStep';
import { DeploymentStepComponent } from './components/steps/DeploymentStep';
import { SuccessStep } from './components/steps/SuccessStep';

function App() {
  const {
    currentStep,
    currentStepIndex,
    totalSteps,
    nodeConfig,
    setNodeConfig,
    dashboardConfig,
    setDashboardConfig,
    validationErrors,
    nextStep,
    prevStep,
    resetWizard,
    getDeploymentConfig,
  } = useWizard();

  const stepLabels = [
    'Welcome',
    'Node Config',
    'Extensions',
    'Review',
    'Deploy',
    'Complete'
  ];

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={nextStep} />;
      
      case 'node-config':
        return (
          <NodeConfigStep
            config={nodeConfig}
            onChange={setNodeConfig}
            dashboardConfig={dashboardConfig}
            onDashboardChange={setDashboardConfig}
            errors={validationErrors}
          />
        );
      


      case 'services-config':
        return (
          <ServicesConfigStep
            config={dashboardConfig}
            onChange={setDashboardConfig}
            nodeConfig={nodeConfig}
            onNodeChange={setNodeConfig}
            errors={validationErrors}
          />
        );
      
      case 'review':
        return <ReviewStep config={getDeploymentConfig()} />;
      
      case 'deployment':
        return (
          <DeploymentStepComponent
            config={getDeploymentConfig()}
            onComplete={nextStep}
            onBack={prevStep}
            onRestart={resetWizard}
          />
        );
      
      case 'success':
        return <SuccessStep config={getDeploymentConfig()} onReset={resetWizard} />;
      
      default:
        return <WelcomeStep onNext={nextStep} />;
    }
  };

  const getNextButtonText = () => {
    switch (currentStep) {
      case 'review':
        return 'Deploy Node & Dashboard';
      case 'services-config':
        return 'Review Configuration';
      case 'node-config':
        return 'Configure Extensions';
      default:
        return 'Continue';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img 
                src="/ariologo.png" 
                alt="AR.IO" 
                className="h-6 sm:h-8 w-auto"
              />
              <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
              <div className="text-xs sm:text-sm font-medium text-gray-900">
                <span className="hidden sm:inline">AR.IO Gateway Node Setup Wizard</span>
                <span className="sm:hidden">AR.IO Setup</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 font-mono">
              v0.0.1 Alpha
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        {currentStep !== 'welcome' && (
          <div className="mb-12">
            <ProgressBar
              currentStep={currentStepIndex}
              totalSteps={totalSteps}
              stepLabels={stepLabels}
            />
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        {currentStepIndex > 0 && (
          <div className="mt-12">
            <WizardNavigation
              canGoBack={currentStepIndex > 0}
              canGoNext={true}
              onBack={prevStep}
              onNext={nextStep}
              isLastStep={currentStep === 'success'}
              isDeploymentStep={currentStep === 'deployment'}
              nextButtonText={getNextButtonText()}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <img 
                src="/ariologo.png" 
                alt="AR.IO" 
                className="h-6 w-auto"
              />
              <span className="text-sm text-gray-600">
                AR.IO Gateway Node Setup Wizard
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-700 transition-colors">Documentation</a>
              <a href="#" className="hover:text-gray-700 transition-colors">Support</a>
              <a href="#" className="hover:text-gray-700 transition-colors">Community</a>
              <span>© {new Date().getFullYear()} Aluisyo</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;