import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface WizardNavigationProps {
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  isLastStep: boolean;
  nextButtonText?: string;
  isDeploymentStep?: boolean;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  isLastStep,
  nextButtonText = 'Next',
  isDeploymentStep = false,
}) => {
  if (isLastStep || isDeploymentStep) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 pt-8 border-t border-gray-200">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={`inline-flex items-center px-6 py-3 font-semibold rounded-lg transition-all duration-200 shadow-sm touch-manipulation ${
          canGoBack
            ? 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
        }`}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <button
        onClick={onNext}
        disabled={!canGoNext}
        className={`inline-flex items-center px-8 py-3 font-semibold rounded-lg transition-all duration-200 shadow-sm touch-manipulation ${
          canGoNext
            ? 'bg-gray-900 text-white hover:bg-gray-800'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {nextButtonText}
        <ArrowRight className="w-4 h-4 ml-2" />
      </button>
    </div>
  );
};