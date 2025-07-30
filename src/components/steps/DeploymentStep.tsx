import React, { useState, useEffect, useRef } from 'react';
import { DeploymentConfig, DeploymentStep } from '../../types';
import { CheckCircle, XCircle, Loader, AlertCircle, X } from 'lucide-react';
import { startDeployment, fetchLogs, fetchStatus, cancelDeployment } from '../../api/deployment';

interface DeploymentStepProps {
  config: DeploymentConfig;
  onComplete: () => void;
  onBack?: () => void;
  onRestart?: () => void;
}

export const DeploymentStepComponent: React.FC<DeploymentStepProps> = ({ 
  config, 
  onComplete,
  onBack,
  onRestart
}) => {
  const [deploymentSteps] = useState<DeploymentStep[]>([
    { id: 'validation', name: 'Pre-deployment Validation', status: 'pending' },
    { id: 'docker-setup', name: 'Docker Environment Setup', status: 'pending' },
    { id: 'images', name: 'Pulling Docker Images', status: 'pending' },
    { id: 'containers', name: 'Starting Containers', status: 'pending' },
    
    { id: 'health-check', name: 'Health Check', status: 'pending' },
  ]);

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [deploymentComplete, setDeploymentComplete] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentCancelled, setDeploymentCancelled] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  const hasStartedRef = useRef(false);
  const pollingIntervalRef = useRef<number | null>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      initiate();
    }
  }, []);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll logs to bottom when new logs are added
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logLines]);

  // Simple helper to map backend logs to current step index (basic heuristics)
  const parseCurrentStep = (logs: string[]): number => {
    if (logs.some(l => l.includes('Pulling'))) return 2;
    if (logs.some(l => l.includes('Starting'))) return 3;
    if (logs.some(l => l.toLowerCase().includes('dashboard'))) return 4;
    if (logs.some(l => l.toLowerCase().includes('health'))) return 5;
    return 1;
  };

  const handleCancel = async () => {
    if (isCancelling || deploymentComplete || deploymentCancelled) return;
    
    try {
      setIsCancelling(true);
      const result = await cancelDeployment();
      
      if (result.status === 'cancelled' || result.status === 'no_deployment_running') {
        setDeploymentCancelled(true);
        setDeploymentError('Deployment cancelled by user');
      } else {
        setDeploymentError('Failed to cancel deployment');
      }
      
      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } catch (err) {
      console.error('Cancel deployment error:', err);
      // Still mark as cancelled even if the API call failed
      setDeploymentCancelled(true);
      setDeploymentError('Deployment cancelled by user');
      
      // Clear polling interval anyway
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const initiate = async () => {
    try {
      await startDeployment(config);
      const poll = setInterval(async () => {
        // Stop polling if deployment was cancelled
        if (deploymentCancelled) {
          clearInterval(poll);
          return;
        }
        
        const [logs, status] = await Promise.all([fetchLogs(), fetchStatus()]);
        if (logs) {
          setLogLines(logs);
          const idx = parseCurrentStep(logs);
          setCurrentStep(idx);
        }
        if (status?.running) {
          setDeploymentComplete(true);
          setCurrentStep(deploymentSteps.length - 1);
          clearInterval(poll);
          pollingIntervalRef.current = null;
          setTimeout(() => onComplete(), 5000);
        }
      }, 2000);
      
      pollingIntervalRef.current = poll;
      return () => clearInterval(poll);
    } catch (err) {
      setDeploymentError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getStepIcon = (step: DeploymentStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'running':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Deploying Your AR.IO Node</h2>
        <p className="text-gray-600 text-lg">
          Please wait while we set up your AR.IO Gateway Node.
        </p>
      </div>

      {/* Progress Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Deployment Progress</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {deploymentSteps.length}
            </span>
            {!deploymentComplete && !deploymentCancelled && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? (
                  <>
                    <Loader className="w-4 h-4 mr-1.5 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-1.5" />
                    Cancel
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gray-900 h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${((currentStep + (deploymentComplete ? 1 : 0)) / deploymentSteps.length) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Deployment Steps */}
      <div className="space-y-4 mb-8">
        {deploymentSteps.map((step, index) => {
          const status: DeploymentStep['status'] = deploymentError
            ? 'error'
            : deploymentComplete || index < currentStep
            ? 'completed'
            : index === currentStep
            ? 'running'
            : 'pending';
          return (
          <div 
            key={step.id} data-status={status}
            className={`bg-white border rounded-lg p-6 transition-all duration-300 ${
              status === 'running' ? 'border-blue-300 bg-blue-50' :
              status === 'completed' ? 'border-green-300 bg-green-50' :
              status === 'error' ? 'border-red-300 bg-red-50' :
              'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getStepIcon({ ...step, status })}
                <div>
                  <h4 className="font-semibold text-gray-900">{step.name}</h4>
                  {step.message && (
                    <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                  )}
                </div>
              </div>
              
              {status === 'running' && step.progress !== undefined && (
                <div className="text-right">
                  <span className="text-sm font-medium text-blue-600">{step.progress}%</span>
                  <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Error/Cancellation Message */}
      {deploymentError && (
        <div className={`rounded-lg p-6 flex items-start space-x-3 mb-8 ${
          deploymentCancelled 
            ? 'bg-orange-50 border border-orange-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {deploymentCancelled ? (
            <X className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className={`font-semibold ${
              deploymentCancelled ? 'text-orange-800' : 'text-red-800'
            }`}>
              {deploymentCancelled ? 'Deployment Cancelled' : 'Deployment Error'}
            </h4>
            <p className={`mt-1 ${
              deploymentCancelled ? 'text-orange-700' : 'text-red-700'
            }`}>
              {deploymentError}
            </p>
            {deploymentCancelled && (
              <p className="text-orange-600 text-sm mt-2">
                You can restart the deployment by going back and clicking "Deploy" again.
              </p>
            )}
            
            {/* Navigation buttons for errors/cancellation */}
            {(deploymentError || deploymentCancelled) && (
              <div className="flex space-x-3 mt-4">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                  >
                    ← Go Back
                  </button>
                )}
                {onRestart && (
                  <button
                    onClick={onRestart}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 transition-all duration-200 shadow-sm"
                  >
                    Start Over
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deployment Complete */}
      {deploymentComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Deployment Successful!
          </h3>
          <p className="text-green-700">
            Your AR.IO Node and Admin Dashboard are now running successfully.
          </p>
        </div>
      )}

      {/* Real-time Logs */}
      <div className="bg-black rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-medium">Deployment Logs</h4>
          <span className="text-xs text-green-400">Live</span>
        </div>
        <div ref={logsContainerRef} className="text-xs text-green-400 font-mono space-y-1 max-h-32 overflow-y-auto">
          {logLines.length === 0 && <div>Waiting for logs...</div>}
          {logLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
};