import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  CommandLineIcon,
  DocumentTextIcon,
  CloudIcon,
  KeyIcon,
  ServerIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';

export function GuidedSetup() {
  const navigate = useNavigate();
  const [setupStatus, setSetupStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const checkSetupStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/guided-setup/status');
      const data = await response.json();
      setSetupStatus(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check setup status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSetupStatus();
    // Refresh every 30 seconds
    const interval = setInterval(checkSetupStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStepIcon = (step) => {
    switch (step.name) {
      case 'ROSA Staging Authentication':
        return CommandLineIcon;
      case 'Configuration Setup':
        return DocumentTextIcon;
      case 'AWS Credentials':
        return CloudIcon;
      case 'OpenShift Hub Connection':
        return ServerIcon;
      case 'Ready for Automation':
        return RocketLaunchIcon;
      default:
        return ClockIcon;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'current':
        return <ClockIcon className="h-6 w-6 text-blue-500 animate-pulse" />;
      case 'pending':
        return <div className="h-6 w-6 rounded-full border-2 border-gray-300"></div>;
      default:
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'current':
        return 'bg-blue-50 border-blue-200';
      case 'pending':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const renderStepContent = (stepNum, step) => {
    const StepIcon = getStepIcon(step);
    const data = step.data || {};

    if (stepNum === 1) {
      // ROSA Authentication Step
      if (!data.authenticated) {
        return (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">🔐 ROSA Staging Authentication Required</h4>
            <p className="text-red-700 mb-3">
              You must be logged into the ROSA staging environment to continue.
            </p>
            <div className="bg-gray-900 rounded p-3 mb-3">
              <code className="text-green-400 text-sm font-mono">
                rosa login --env staging --use-auth-code
              </code>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText('rosa login --env staging --use-auth-code')}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              📋 Copy command
            </button>
          </div>
        );
      } else {
        return (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">✅ Successfully authenticated!</h4>
            <p className="text-green-700 text-sm">
              Account: {data.user_info?.ocm_account_email || 'Unknown'}
            </p>
            <p className="text-green-700 text-sm">
              Organization: {data.user_info?.ocm_organization_name || 'Unknown'}
            </p>
          </div>
        );
      }
    }

    if (stepNum === 2) {
      // Configuration Step
      const isNewUser = data.is_new_user;
      if (isNewUser) {
        return (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">👋 Welcome! New user detected</h4>
            <p className="text-yellow-700 mb-3">
              It looks like you haven't configured your credentials yet. Let's set up your vars/user_vars.yml file.
            </p>
            <div className="space-y-2 text-sm text-yellow-700">
              <p><strong>You'll need to configure:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>OpenShift Hub connection details (OCP_HUB_*)</li>
                <li>AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)</li>
                <li>OpenShift Cluster Manager credentials (OCM_CLIENT_*)</li>
              </ul>
            </div>
            <div className="mt-3 flex space-x-3">
              <button
                onClick={() => navigator.clipboard.writeText('vars/user_vars.yml')}
                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
              >
                📋 Copy file path
              </button>
              <a
                href="https://console.redhat.com/iam/service-accounts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                🔑 Create OCM Service Account
              </a>
            </div>
          </div>
        );
      } else if (!data.configured) {
        return (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-2">⚙️ Configuration incomplete</h4>
            <p className="text-orange-700 mb-2">
              Progress: {data.total_configured || 0}/{data.total_required || 8} fields configured
            </p>
            <div className="bg-orange-100 rounded p-2 text-xs text-orange-800">
              Missing: {[...(data.empty_fields || []), ...(data.missing_fields || [])].length} required fields
            </div>
          </div>
        );
      } else {
        return (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">✅ Configuration complete!</h4>
            <p className="text-green-700 text-sm">
              All {data.total_configured}/{data.total_required} required fields are configured.
            </p>
          </div>
        );
      }
    }

    if (stepNum === 3) {
      // AWS Credentials Step
      if (!data.credentials_configured) {
        return (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">🔑 AWS Credentials needed</h4>
            <p className="text-yellow-700 mb-3">
              No AWS credentials found in your configuration.
            </p>
            <div className="bg-white rounded p-3 border border-yellow-200 text-sm">
              <p className="font-semibold text-yellow-800 mb-2">How to set up AWS credentials:</p>
              <div className="text-yellow-700 whitespace-pre-line">
                {data.setup_guide}
              </div>
            </div>
          </div>
        );
      } else if (!data.valid) {
        return (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">❌ AWS Credentials invalid</h4>
            <p className="text-red-700 mb-2">{data.message}</p>
            <p className="text-red-600 text-sm mb-3">{data.suggestion}</p>
            {data.troubleshooting && (
              <div className="bg-white rounded p-3 border border-red-200 text-sm">
                <p className="font-semibold text-red-800 mb-2">Troubleshooting:</p>
                <div className="text-red-700 whitespace-pre-line">
                  {data.troubleshooting}
                </div>
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">✅ AWS Credentials valid!</h4>
            <p className="text-green-700 text-sm">
              Account: {data.account_info?.account_id || 'Unknown'}
            </p>
            <p className="text-green-700 text-sm">
              Region: {data.aws_region}
            </p>
          </div>
        );
      }
    }

    if (stepNum === 4) {
      // OCP Connection Step
      if (!data.connected) {
        const shouldShowKindOption = ['connection_failed', 'invalid_credentials', 'timeout', 'tls_error'].includes(data.status);

        return (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">🤔 Need Help with OpenShift Hub Connection?</h4>
              <p className="text-blue-700 mb-2">Connection issue: {data.message}</p>
              <p className="text-blue-600 text-sm mb-3">{data.suggestion}</p>

              <div className="bg-white rounded p-3 border border-blue-200">
                <h5 className="font-semibold text-blue-800 mb-2">What would you like to do?</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const instructions = `To fix your OpenShift Hub connection:

1. Open vars/user_vars.yml in your project
2. Update these fields:
   - OCP_HUB_API_URL: Your OpenShift cluster API URL
   - OCP_HUB_CLUSTER_USER: Your username (usually 'kubeadmin')
   - OCP_HUB_CLUSTER_PASSWORD: Your cluster password

3. Save the file and refresh this page

Current values:
- API URL: ${data.api_url || 'Not set'}
- Username: ${data.username || 'Not set'}

Need help finding your credentials? Check your OpenShift cluster console for the login details.`;
                      navigator.clipboard.writeText(instructions);
                      alert('📋 Instructions copied to clipboard! Open vars/user_vars.yml and update your OCP_HUB_* credentials.');
                    }}
                    className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium mb-2"
                  >
                    🔧 Help me fix my OpenShift Hub credentials
                  </button>

                  {shouldShowKindOption && (
                    <button
                      onClick={() => {
                        if (window.confirm('🐳 Great choice! Using a Kind cluster is perfect for testing automation. Would you like me to guide you through the setup?')) {
                          const kindInstructions = `Setting up Kind cluster for ROSA automation testing:

1. Install Kind (if not already installed):
   # macOS:
   brew install kind

   # Linux:
   curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
   chmod +x ./kind
   sudo mv ./kind /usr/local/bin/kind

2. Create a Kind cluster:
   kind create cluster --name rosa-automation-test

3. Update your vars/user_vars.yml:
   - Set OCP_HUB_API_URL to your Kind cluster API (usually https://127.0.0.1:6443)
   - Set OCP_HUB_CLUSTER_USER to a test user
   - Set OCP_HUB_CLUSTER_PASSWORD to a test password

4. Refresh this page to test the connection

Kind Documentation: https://kind.sigs.k8s.io/docs/user/quick-start/`;
                          navigator.clipboard.writeText(kindInstructions);
                          alert('📋 Kind setup instructions copied to clipboard! This is a great option for testing.');
                        }
                      }}
                      className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      🐳 Use a local Kind cluster instead
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">✅ OpenShift Hub connected!</h4>
            <p className="text-green-700 text-sm">
              API: {data.api_url}
            </p>
            <p className="text-green-700 text-sm">
              User: {data.username}
            </p>
          </div>
        );
      }
    }

    if (stepNum === 5) {
      // Ready step - only actionable when cluster connection is resolved
      const automationEnabled = data.automation_enabled;
      const clusterConnectionReady = data.cluster_connection_ready;

      if (!clusterConnectionReady) {
        return (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">⏸️ Waiting for cluster connection...</h4>
            <p className="text-yellow-700 mb-3">
              Step 5 will be available once you complete Step 4 (OpenShift Hub Connection). You need to either:
            </p>
            <ul className="text-yellow-700 text-sm list-disc list-inside space-y-1 mb-3">
              <li>Successfully connect to your OpenShift Hub cluster, OR</li>
              <li>Set up a Kind cluster for testing</li>
            </ul>
            <p className="text-yellow-600 text-sm">
              Complete Step 4 to enable automation features.
            </p>
          </div>
        );
      }

      return (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">🎉 Ready for automation!</h4>
          <p className="text-green-700 mb-3">
            All prerequisites are met. You can now create and manage ROSA clusters with full automation.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
          >
            🚀 Start using automation
          </button>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking your setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-red-600 text-white px-3 py-2 rounded font-bold text-lg">
                Red Hat
              </div>
              <span className="text-xl font-semibold text-gray-900">ROSA CAPI/CAPA Setup Guide</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back to dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Setup Progress
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Step {setupStatus?.current_step || 1} of 5
          </p>

          {setupStatus?.all_prerequisites_met ? (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-800">🎉 Setup Complete!</h2>
              <p className="text-green-700">All prerequisites are met. You're ready to use automation.</p>
            </div>
          ) : (
            <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800">Setup in Progress</h2>
              <p className="text-blue-700">Complete the steps below to enable automation features.</p>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {setupStatus?.steps && Object.entries(setupStatus.steps).map(([stepNum, step]) => {
            const StepIcon = getStepIcon(step);
            const stepNumber = parseInt(stepNum);

            return (
              <div
                key={stepNum}
                className={`rounded-lg border-2 transition-all duration-300 ${getStatusColor(step.status)} ${
                  step.status === 'current' ? 'shadow-lg scale-[1.02]' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        step.status === 'completed' ? 'bg-green-100' :
                        step.status === 'current' ? 'bg-blue-100' :
                        'bg-gray-100'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-500" />
                        ) : (
                          <StepIcon className={`h-6 w-6 ${
                            step.status === 'current' ? 'text-blue-500' : 'text-gray-400'
                          }`} />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Step {stepNumber}: {step.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {step.required && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              Required
                            </span>
                          )}
                          {getStatusIcon(step.status)}
                        </div>
                      </div>

                      {renderStepContent(stepNumber, step)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Refresh button */}
        <div className="mt-8 text-center">
          <button
            onClick={checkSetupStatus}
            disabled={loading}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Checking...' : '🔄 Refresh Status'}
          </button>
          {lastChecked && (
            <p className="text-sm text-gray-500 mt-2">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}