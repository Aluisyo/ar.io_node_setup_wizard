import React from 'react';
import { Check } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  currentStep, 
  totalSteps, 
  stepLabels 
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {stepLabels.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    isCompleted || isCurrent
                      ? 'bg-black text-white'
                      : 'bg-gray-700 text-gray-500 border border-gray-600'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
                    isCompleted || isCurrent ? 'text-black' : 'text-gray-500'
                  }`}
                >
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(' ')[0]}</span>
                </span>
              </div>
              {index < stepLabels.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 sm:mx-6 transition-colors duration-200 min-w-[20px] ${
                    isCompleted ? 'bg-indigo-600' : 'bg-gray-600'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};