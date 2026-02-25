/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircleIcon, Cog6ToothIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

import JenkinsSidebar from '../components/sidebar/JenkinsSidebar';
import TaskSummarySection from '../components/sections/TaskSummarySection';
import RosaHcpClustersSection from '../components/sections/RosaHcpClustersSection';
import NotificationSettingsModal from '../components/modals/NotificationSettingsModal';
import CredentialsModal from '../components/modals/CredentialsModal';
import MCEEnvironmentSelector from '../components/MCEEnvironmentSelector';
import ActiveEnvironmentBanner from '../components/ActiveEnvironmentBanner';
import { YamlEditorModal } from '../components/YamlEditorModal';
import { RosaProvisionModal } from '../components/RosaProvisionModal';
import TestSuiteDashboard from '../components/sections/TestSuiteDashboard';
import TestSuiteSection from '../components/sections/TestSuiteSection';
import HelmChartTestDashboard from '../components/sections/HelmChartTestDashboard';
import ResourcesViewer from '../components/ResourcesViewer';
import {
  AppProvider,
  useMinikubeContext,
  useRecentOperationsContext,
  useApp,
  useAppDispatch,
} from '../store/AppContext';
import { AppActionTypes } from '../store/AppContext';
import {
  buildApiUrl,
  API_ENDPOINTS,
  validateApiResponse,
  extractSafeErrorMessage,
} from '../config/api';

/**
 * TerminalInline - Inline terminal component (not a modal)
 */
const TerminalInline = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState(
    'Welcome to Minikube Terminal! Type commands or select from templates.\n'
  );
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const outputRef = useRef(null);

  // Scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Command execution
  const executeCommand = async () => {
    if (!command.trim() || executing) return;

    setExecuting(true);
    const timestamp = new Date().toLocaleTimeString();

    setOutput((prev) => `${prev}\n$ ${command}\n`);

    const newHistoryItem = {
      command: command.trim(),
      timestamp: new Date().toISOString(),
      timestampFormatted: timestamp,
    };
    setHistory((prev) => [newHistoryItem, ...prev].slice(0, 100));
    setHistoryIndex(-1);

    try {
      const response = await fetch(buildApiUrl('/api/ocp/execute-command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: command.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setOutput((prev) => `${prev}${data.output}\n`);
      } else {
        setOutput(
          (prev) => `${prev}Error: ${data.error || 'Command failed'}\n${data.output || ''}\n`
        );
      }
    } catch (err) {
      setOutput((prev) => `${prev}Error: Failed to execute command - ${err.message}\n`);
    } finally {
      setExecuting(false);
      setCommand('');
    }
  };

  // Keyboard handler for history navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setCommand(history[newIndex].command);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex].command);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };


  return (
    <div>
      <p className="text-gray-600 mb-4">Execute commands directly on your Minikube environment.</p>

      {/* Terminal - Full width */}
      <div className="flex flex-col">
          {/* Terminal Output */}
          <div
            ref={outputRef}
            className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto mb-4"
            style={{ fontFamily: 'Monaco, Courier, monospace' }}
          >
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>

          {/* Command Input */}
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-mono">
                $
              </span>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command... (↑/↓ for history)"
                disabled={executing}
                className="w-full pl-8 pr-4 py-3 border rounded focus:ring-2 focus:border-transparent font-mono text-sm disabled:bg-gray-100"
                style={{ borderColor: '#8B5CF6' }}
              />
            </div>
            <button
              onClick={executeCommand}
              disabled={executing || !command.trim()}
              className="px-6 py-3 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              style={!executing && command.trim() ? { backgroundColor: '#8B5CF6' } : {}}
              onMouseEnter={(e) => !executing && command.trim() && (e.currentTarget.style.backgroundColor = '#7C3AED')}
              onMouseLeave={(e) => !executing && command.trim() && (e.currentTarget.style.backgroundColor = '#8B5CF6')}
            >
              {executing ? 'Running...' : 'Execute'}
            </button>
            <button
              onClick={() => {
                setOutput('Terminal cleared.\n');
                setCommand('');
              }}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              title="Clear Terminal"
            >
              🗑️ Clear
            </button>
          </div>

        {/* Command History */}
        {history.length > 0 && (
          <div className="mt-4">
            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-sm text-gray-700">
                Command History ({history.length})
              </summary>
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {history.slice(0, 10).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-gray-50"
                    onClick={() => setCommand(item.command)}
                  >
                    <span className="font-mono text-xs text-gray-800 truncate">
                      {item.command}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {item.timestampFormatted}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * NotificationSettingsInline - Inline notification settings (not a modal)
 */
const NotificationSettingsInline = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [activeTab, setActiveTab] = useState('email');

  const [settings, setSettings] = useState({
    slack_enabled: false,
    slack_webhook_url: '',
    email_enabled: false,
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    to_emails: [],
    use_tls: true,
    app_url: 'http://localhost:3000',
    notify_on_start: false,
    notify_on_complete: true,
    notify_on_failure: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/notification-settings'));
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(buildApiUrl('/api/notification-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Notification settings saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save settings: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Failed to save settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmailsChange = (emailsString) => {
    const emails = emailsString.split(',').map((e) => e.trim()).filter((e) => e);
    handleInputChange('to_emails', emails);
  };

  return (
    <div>
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'email'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📧 Email
            </button>
            <button
              onClick={() => setActiveTab('slack')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'slack'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              💬 Slack
            </button>
          </div>

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              {/* Enable Email */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Enable Email Notifications</h3>
                  <p className="text-sm text-gray-600">Send notifications via email for provisioning jobs</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.email_enabled}
                    onChange={(e) => handleInputChange('email_enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>

              {/* SMTP Server */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Server *</label>
                <input
                  type="text"
                  value={settings.smtp_server}
                  onChange={(e) => handleInputChange('smtp_server', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Common: smtp.gmail.com (Gmail), smtp-mail.outlook.com (Outlook), smtp.sendgrid.net (SendGrid)
                </p>
              </div>

              {/* SMTP Port and TLS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                  <input
                    type="number"
                    value={settings.smtp_port}
                    onChange={(e) => handleInputChange('smtp_port', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Common: 587 (TLS), 465 (SSL)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Use TLS</label>
                  <label className="relative inline-flex items-center cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.use_tls}
                      onChange={(e) => handleInputChange('use_tls', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              </div>

              {/* SMTP Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username (optional)</label>
                <input
                  type="text"
                  value={settings.smtp_username}
                  onChange={(e) => handleInputChange('smtp_username', e.target.value)}
                  placeholder="tina.fitzgerald2@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* SMTP Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password (optional)</label>
                <input
                  type="password"
                  value={settings.smtp_password}
                  onChange={(e) => handleInputChange('smtp_password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
                <p className="mt-1 text-xs text-gray-500">For Gmail, use an App Password instead of your regular password</p>
              </div>

              {/* From Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Email Address *</label>
                <input
                  type="email"
                  value={settings.from_email}
                  onChange={(e) => handleInputChange('from_email', e.target.value)}
                  placeholder="tina.fitzgerald2@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* To Emails */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email Addresses *</label>
                <input
                  type="text"
                  value={settings.to_emails.join(', ')}
                  onChange={(e) => handleEmailsChange(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
                <p className="mt-1 text-xs text-gray-500">Separate multiple emails with commas</p>
              </div>
            </div>
          )}

          {/* Slack Tab */}
          {activeTab === 'slack' && (
            <div className="space-y-4">
              {/* Enable Slack */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Enable Slack Notifications</h3>
                  <p className="text-sm text-gray-600">Send notifications to Slack for provisioning jobs</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.slack_enabled}
                    onChange={(e) => handleInputChange('slack_enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              {/* Slack Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slack Webhook URL *</label>
                <input
                  type="text"
                  value={settings.slack_webhook_url}
                  onChange={(e) => handleInputChange('slack_webhook_url', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Create a webhook in your Slack workspace settings</p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 text-white rounded-lg transition-colors font-medium"
              style={!saving ? { backgroundColor: '#8B5CF6' } : { backgroundColor: '#9CA3AF' }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#7C3AED')}
              onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#8B5CF6')}
            >
              {saving ? 'Saving...' : '💾 Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * MinikubeDashboardContent - Inner component with all the dashboard logic
 */
const MinikubeDashboardContent = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const minikube = useMinikubeContext();
  const recentOps = useRecentOperationsContext();

  // UI State
  const [activeSection, setActiveSection] = useState('environments');
  const [showYamlEditorModal, setShowYamlEditorModal] = useState(false);
  const [yamlEditorData, setYamlEditorData] = useState(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showReconfigureForm, setShowReconfigureForm] = useState(false);
  const [useCustomImage, setUseCustomImage] = useState(false);
  const [customImageRepo, setCustomImageRepo] = useState('');
  const [customImageTag, setCustomImageTag] = useState('');
  const [crdLocation, setCrdLocation] = useState('');
  const [credentialMessage, setCredentialMessage] = useState('');
  const [credentialMessageType, setCredentialMessageType] = useState(''); // 'success' or 'error'
  const [minikubeInfo, setMinikubeInfo] = useState(null); // Active minikube cluster info
  const [isConfiguring, setIsConfiguring] = useState(false); // Track configuration state
  const [configurationResults, setConfigurationResults] = useState(null); // Configuration output results

  const {
    verifiedMinikubeClusterInfo,
    minikubeActiveResources,
    minikubeClusters,
    selectedMinikubeCluster,
    minikubeClusterInput,
    minikubeVerificationResult,
    minikubeLoading,
    minikubeResourcesLoading,
    verifyMinikubeCluster,
    fetchMinikubeActiveResources,
    fetchMinikubeClusters,
    setSelectedMinikubeCluster,
    setMinikubeClusterInput,
  } = minikube;

  const { addToRecent, updateRecentOperationStatus } = recentOps;

  // Minikube-specific state
  const [installMethod, setInstallMethod] = useState(() => {
    return localStorage.getItem('capiInstallMethod') || 'clusterctl';
  });
  const [componentVersions, setComponentVersions] = useState([]);
  const [componentVersionsLoading, setComponentVersionsLoading] = useState(false);
  const [expandedNamespaces, setExpandedNamespaces] = useState(new Set());

  // Copy handler for playbook output
  const [copySuccess, setCopySuccess] = useState('');

  const handleCopyOutput = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  // ============================================================================
  // Handler Functions (from original MCEEnvironment.jsx)
  // ============================================================================

  // Handle authentication/credentials
  const handleCredentials = () => {
    setShowCredentialsModal(true);
  };

  // Handle reconfiguration submission
  const handleReconfigureSubmit = () => {
    // If custom image is enabled and fields are filled, pass to handleConfigure
    if (useCustomImage && customImageRepo && customImageTag) {
      const customImageConfig = {
        repository: customImageRepo,
        tag: customImageTag,
        crdLocation: crdLocation,
      };
      handleConfigure(customImageConfig);
    } else {
      // No custom image, just run standard configuration
      handleConfigure();
    }

    // Hide the reconfigure form after submission
    setShowReconfigureForm(false);
  };

  // Handle configuration
  const handleConfigure = async (customImage = null) => {
    const configureId = `configure-capi-${Date.now()}`;

    const targetClusterName =
      verifiedMinikubeClusterInfo?.name ||
      verifiedMinikubeClusterInfo?.cluster_name ||
      selectedMinikubeCluster ||
      minikubeClusterInput;

    if (!targetClusterName) {
      alert('Please verify a Minikube cluster first');
      return;
    }

    const methodInfo = installMethod === 'clusterctl'
      ? { icon: '⚡', name: 'Cluster API' }
      : { icon: '📦', name: 'Helm Charts' };

    // Set configuring state to true
    setIsConfiguring(true);
    setConfigurationResults(null); // Clear previous results

    try {
      // Add to Recent Operations for Task Summary
      addToRecent({
        id: configureId,
        title: `⚙️ Configure Minikube CAPI/CAPA (${methodInfo.name})`,
        color: 'bg-violet-600',
        status: '🚀 Starting configuration...',
        environment: 'minikube',
        playbook: 'initialize-minikube-capi.yml',
        output: `Starting Minikube CAPI/CAPA configuration...\nCluster: ${targetClusterName}\nMethod: ${methodInfo.name}`,
      });

      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_PLAYBOOK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playbook: 'initialize-minikube-capi.yml',
          description: `Configure Minikube CAPI/CAPA (${methodInfo.name})`,
          extra_vars: {
            cluster_name: targetClusterName,
            install_method: installMethod,
            custom_capa_image: customImage,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start configuration: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.job_id) {
        console.log(`✅ Configuration job started: ${result.job_id}`);

        // Update task with job ID
        updateRecentOperationStatus(
          configureId,
          '⏳ Configuration running...',
          `Job ID: ${result.job_id}\n\nConfiguration is in progress...`
        );

        // Start polling for job completion and real-time logs
        const pollJobStatus = async () => {
          const maxAttempts = 1800; // 30 minutes max
          let attempts = 0;

          while (attempts < maxAttempts) {
            attempts++;

            try {
              const jobResponse = await fetch(buildApiUrl(`/api/jobs/${result.job_id}`));
              const jobData = await jobResponse.json();

              // Fetch logs
              const logsResponse = await fetch(buildApiUrl(`/api/jobs/${result.job_id}/logs`));
              const logsData = await logsResponse.json();
              const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

              // Update configuration results every 5 seconds with current output
              if (attempts % 5 === 0 && currentOutput) {
                setConfigurationResults({
                  success: jobData.status !== 'failed',
                  timestamp: new Date().toISOString(),
                  output: currentOutput,
                });

                // Also update Recent Operations
                updateRecentOperationStatus(configureId, '⏳ Configuration running...', currentOutput);
              }

              if (jobData.status === 'completed') {
                // Success - set final results
                const output = currentOutput || 'Configuration completed successfully';
                setConfigurationResults({
                  success: true,
                  timestamp: new Date().toISOString(),
                  output: output,
                });

                // Update Recent Operations with success
                updateRecentOperationStatus(configureId, '✅ Configuration completed successfully!', output);

                setIsConfiguring(false);

                // Refresh resources to show updated components
                fetchMinikubeActiveResources(
                  verifiedMinikubeClusterInfo?.name,
                  verifiedMinikubeClusterInfo?.namespace
                );
                return;
              } else if (jobData.status === 'failed') {
                // Failure - set error results
                const output = currentOutput || (jobData.error || jobData.message || 'Configuration failed');
                setConfigurationResults({
                  success: false,
                  timestamp: new Date().toISOString(),
                  output: output,
                });

                // Update Recent Operations with failure
                updateRecentOperationStatus(configureId, '❌ Configuration failed', output);

                setIsConfiguring(false);
                return;
              }

              // Wait and poll again
              await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
            } catch (error) {
              console.error('Error polling configuration job:', error);
              setIsConfiguring(false);
              return;
            }
          }

          // Timeout
          console.error('Configuration polling timed out after 30 minutes');
          const timeoutMsg = 'Configuration timed out after 30 minutes';
          setConfigurationResults({
            success: false,
            timestamp: new Date().toISOString(),
            output: timeoutMsg,
          });
          updateRecentOperationStatus(configureId, '❌ Configuration timed out', timeoutMsg);
          setIsConfiguring(false);
        };

        // Start polling
        pollJobStatus();
      } else {
        // No job created - set immediate results
        const output = result.message || 'Configuration completed successfully';
        setConfigurationResults({
          success: true,
          timestamp: new Date().toISOString(),
          output: output,
        });
        updateRecentOperationStatus(configureId, '✅ Configuration completed', output);
        setIsConfiguring(false);
      }
    } catch (error) {
      console.error('Configuration error:', error);
      const errorOutput = `Failed to start configuration\n\nError: ${error.message}\n\nPlease check:\n- Backend server is running\n- Minikube cluster is accessible\n- Network connectivity is available`;
      setConfigurationResults({
        success: false,
        timestamp: new Date().toISOString(),
        output: errorOutput,
      });
      updateRecentOperationStatus(configureId, `❌ Configuration failed: ${error.message}`, errorOutput);
      setIsConfiguring(false);
    }
  };

  // Handle provision submit
  const handleProvisionSubmit = async (config) => {
    const provisionId = `provision-rosa-${Date.now()}`;

    try {
      addToRecent({
        id: provisionId,
        title: `🚀 Provision ROSA HCP: ${config.clusterName}`,
        color: 'bg-green-600',
        status: '🚀 Starting provisioning...',
        environment: 'minikube',
        playbook: 'playbooks/create_rosa_hcp_cluster.yml',
        output: `Initializing ROSA HCP cluster provisioning...\nCluster: ${config.clusterName}\nVersion: ${config.openShiftVersion}\nRegion: ${config.awsRegion}`,
      });

      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_PLAYBOOK), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbook: 'playbooks/create_rosa_hcp_cluster.yml',
          description: `Provision ROSA HCP: ${config.clusterName}`,
          extra_vars: config,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start provisioning: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.job_id) {
        console.log(`✅ Provisioning job started: ${result.job_id}`);

        // Update task with job ID
        updateRecentOperationStatus(
          provisionId,
          '⏳ Provisioning running...',
          `Job ID: ${result.job_id}\n\nProvisioning is in progress...`
        );

        // Start polling for job completion
        const pollJobStatus = async () => {
          const maxAttempts = 3600; // 60 minutes max (1 second intervals)
          let attempts = 0;

          while (attempts < maxAttempts) {
            attempts++;

            try {
              const jobResponse = await fetch(buildApiUrl(`/api/jobs/${result.job_id}`));
              const jobData = await jobResponse.json();

              // Fetch logs
              const logsResponse = await fetch(buildApiUrl(`/api/jobs/${result.job_id}/logs`));
              const logsData = await logsResponse.json();
              const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

              // Update Recent Operations every 10 seconds
              if (attempts % 10 === 0 && currentOutput) {
                updateRecentOperationStatus(provisionId, '⏳ Provisioning running...', currentOutput);
              }

              if (jobData.status === 'completed') {
                const output = currentOutput || 'Provisioning completed successfully';
                updateRecentOperationStatus(provisionId, '✅ Provisioning completed successfully!', output);
                await refreshAllStatus();
                return;
              } else if (jobData.status === 'failed') {
                const output = currentOutput || (jobData.error || jobData.message || 'Provisioning failed');
                updateRecentOperationStatus(provisionId, '❌ Provisioning failed', output);
                return;
              }

              // Wait and poll again
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
              console.error('Error polling provisioning job:', error);
              return;
            }
          }

          // Timeout
          const timeoutMsg = 'Provisioning timed out after 60 minutes';
          updateRecentOperationStatus(provisionId, '❌ Provisioning timed out', timeoutMsg);
        };

        // Start polling
        pollJobStatus();
      } else {
        // No job created - set immediate results
        const output = result.message || 'Provisioning completed successfully';
        updateRecentOperationStatus(provisionId, '✅ Provisioning completed', output);
        await refreshAllStatus();
      }

    } catch (error) {
      console.error('Provisioning error:', error);
      const errorOutput = `Failed to start provisioning\n\nError: ${error.message}\n\nPlease check:\n- Backend server is running\n- Minikube cluster is accessible\n- AWS credentials are configured`;
      updateRecentOperationStatus(provisionId, `❌ Provisioning failed: ${error.message}`, errorOutput);
    }
  };

  // Handle delete
  const handleDelete = () => {
    console.log('Opening delete dialog...');
    // Navigate to delete page or open delete modal
  };

  // Handle reports
  const handleReports = () => {
    console.log('Opening reports...');
  };

  // Handle refresh
  const handleRefresh = async () => {
    await fetchMinikubeActiveResources(
      verifiedMinikubeClusterInfo?.name,
      verifiedMinikubeClusterInfo?.namespace
    );
  };

  // Toggle namespace expansion in resources
  const toggleNamespace = (namespace) => {
    setExpandedNamespaces((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(namespace)) {
        newSet.delete(namespace);
      } else {
        newSet.add(namespace);
      }
      return newSet;
    });
  };

  // Fetch component versions for Minikube
  const fetchComponentVersions = useCallback(async () => {
    const targetClusterName =
      verifiedMinikubeClusterInfo?.name ||
      verifiedMinikubeClusterInfo?.cluster_name ||
      selectedMinikubeCluster ||
      minikubeClusterInput;

    if (!targetClusterName) {
      console.log('No cluster name available for component version fetch');
      return;
    }

    setComponentVersionsLoading(true);
    try {
      const response = await fetch(
        buildApiUrl(`/api/capi/component-versions?environment=minikube&cluster_name=${targetClusterName}`)
      );

      if (response.ok) {
        const data = await response.json();
        setComponentVersions(data.components || []);
      } else {
        console.error('Failed to fetch component versions');
        setComponentVersions([]);
      }
    } catch (error) {
      console.error('Error fetching component versions:', error);
      setComponentVersions([]);
    } finally {
      setComponentVersionsLoading(false);
    }
  }, [verifiedMinikubeClusterInfo, selectedMinikubeCluster, minikubeClusterInput]);

  // Fetch component versions when cluster is verified
  useEffect(() => {
    if (verifiedMinikubeClusterInfo?.name || selectedMinikubeCluster) {
      fetchComponentVersions();
    }
  }, [verifiedMinikubeClusterInfo, selectedMinikubeCluster, fetchComponentVersions]);

  // Fetch active minikube cluster info
  useEffect(() => {
    const fetchActiveProfile = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/minikube/active-profile');
        const data = await response.json();
        if (data.success && data.profile) {
          setMinikubeInfo(data.profile);
        } else {
          setMinikubeInfo(null);
        }
      } catch (error) {
        console.error('Error fetching active minikube profile:', error);
        setMinikubeInfo(null);
      }
    };

    fetchActiveProfile();
  }, [activeSection, credentialMessage]); // Re-fetch when section changes or credentials are updated

  // Refresh all status information
  const refreshAllStatus = async () => {
    try {
      // Refresh Minikube clusters
      await fetchMinikubeClusters();

      // Refresh component versions if a cluster is verified
      if (verifiedMinikubeClusterInfo?.name || selectedMinikubeCluster) {
        await fetchComponentVersions();
      }

      // Refresh active resources if cluster is verified
      if (verifiedMinikubeClusterInfo?.name) {
        await fetchMinikubeActiveResources(
          verifiedMinikubeClusterInfo.name,
          verifiedMinikubeClusterInfo.namespace
        );
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
    }
  };

  const handleUseEnvironmentCredentials = async (credentials) => {
    try {
      // Save the credentials to the backend
      const response = await fetch(buildApiUrl('/api/credentials'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentials }),
      });

      if (response.ok) {
        // Show inline success message
        setCredentialMessage(`Environment set to ${credentials.clusterName}! You can now configure the environment.`);
        setCredentialMessageType('success');

        // Refresh API status to reflect the new credentials
        await refreshAllStatus();

        // Auto-hide message after 5 seconds
        setTimeout(() => {
          setCredentialMessage('');
          setCredentialMessageType('');
        }, 5000);
      } else {
        const error = await response.json();
        setCredentialMessage(`Failed to save credentials: ${error.message || 'Unknown error'}`);
        setCredentialMessageType('error');
      }
    } catch (error) {
      setCredentialMessage(`Failed to save credentials: ${error.message}`);
      setCredentialMessageType('error');
    }
  };

  // Sidebar navigation handlers
  const sidebarHandlers = {
    onComponentsClick: () => setActiveSection('components'),
    onConfigureClick: () => setActiveSection('configure'),
    onReconfigureClick: () => setActiveSection('reconfigure'),
    onProvisionClick: () => setActiveSection('provision'),
    onRosaHcpClustersClick: () => setActiveSection('rosa-hcp-clusters'),
    onResourcesClick: () => setActiveSection('resources'),
    onEnvironmentsClick: () => setActiveSection('environments'),
    onTestClick: () => setActiveSection('test'),
    onTestSuiteDashboardClick: () => setActiveSection('test-suite-dashboard'),
    onTestAutomationClick: () => setActiveSection('test-automation'),
    onHelmChartMatrixClick: () => setActiveSection('helm-chart-matrix'),
    onTerminalClick: () => setActiveSection('terminal'),
    onNotificationsClick: () => setActiveSection('notifications'),
    onRecentTasksClick: () => setActiveSection('recent-tasks'),
  };

  // ============================================================================
  // Main Content Sections
  // ============================================================================

  const renderMainContent = () => {
    switch (activeSection) {
      case 'configure':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-purple-900">Configure CAPI/CAPA</h2>

            {/* Configuration Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 mb-6">
                Enable and configure CAPI/CAPA components on your Minikube environment.
              </p>

              <button
                onClick={() => handleConfigure()}
                disabled={isConfiguring}
                className="px-6 py-3 text-white rounded transition-colors font-medium flex items-center gap-2"
                style={!isConfiguring ? { backgroundColor: '#8B5CF6' } : { backgroundColor: '#9CA3AF' }}
                onMouseEnter={(e) => !isConfiguring && (e.currentTarget.style.backgroundColor = '#7C3AED')}
                onMouseLeave={(e) => !isConfiguring && (e.currentTarget.style.backgroundColor = '#8B5CF6')}
              >
                {isConfiguring ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Configuring...
                  </>
                ) : (
                  <>
                    <Cog6ToothIcon className="h-5 w-5" />
                    Start Configuration
                  </>
                )}
              </button>
            </div>

            {/* Configuration Results or Loading */}
            {isConfiguring && !configurationResults && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Running Configuration...</h3>
                </div>
                <p className="text-gray-600">Please wait while the playbook executes. This may take a minute or two.</p>
              </div>
            )}

            {configurationResults && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  {configurationResults.success ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  ) : (
                    <span className="text-2xl">❌</span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {configurationResults.success ? 'Configuration Completed' : 'Configuration Failed'}
                  </h3>
                </div>

                {/* Output Display */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Playbook Output:</h4>
                    <button
                      onClick={() => handleCopyOutput(configurationResults.output || 'No output available')}
                      className="px-3 py-1 text-white rounded text-xs font-medium transition-colors"
                      style={{ backgroundColor: '#8B5CF6' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7C3AED')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8B5CF6')}
                    >
                      {copySuccess || '📋 Copy'}
                    </button>
                  </div>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto min-h-[100px]">
                    <pre className="whitespace-pre-wrap">
                      {configurationResults.output || 'No output available'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'reconfigure':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-purple-900">Set Custom CAPA Image</h2>

            {/* Reconfiguration Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 mb-6">
                Configure CAPI/CAPA with a custom CAPA controller image for testing pre-release features.
              </p>

              {/* Error message if not using clusterctl */}
              {installMethod !== 'clusterctl' && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">❌</span>
                    <div>
                      <p className="text-sm font-semibold text-red-900 mb-1">Custom CAPA Image Not Available</p>
                      <p className="text-sm text-red-800">
                        Custom CAPA image configuration is only available when using the <strong>clusterctl</strong> installation method.
                        Your current installation method is <strong>{installMethod === 'helm' ? 'Helm' : installMethod}</strong>.
                      </p>
                      <p className="text-sm text-red-700 mt-2">
                        Please reconfigure your environment using clusterctl to enable custom image support.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom CAPA Image Configuration - Only for clusterctl */}
              {installMethod === 'clusterctl' && (
                <div className="space-y-4">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomImage}
                      onChange={(e) => setUseCustomImage(e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Use Custom CAPA Image</span>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Specify a custom CAPA controller image and CRD location for testing pre-release
                        features. Updated CRDs will be applied before deployment.
                      </p>
                    </div>
                  </label>

                  {useCustomImage && (
                    <div className="space-y-3 pl-6 border-l-2 border-purple-300">
                      {/* Image Repository */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Image Repository
                        </label>
                        <input
                          type="text"
                          value={customImageRepo}
                          onChange={(e) => setCustomImageRepo(e.target.value)}
                          placeholder="quay.io/username/cluster-api-aws-controller"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Full path to the custom CAPA controller image repository
                        </p>
                      </div>

                      {/* Image Tag */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Image Tag
                        </label>
                        <input
                          type="text"
                          value={customImageTag}
                          onChange={(e) => setCustomImageTag(e.target.value)}
                          placeholder="pr-5786"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Image tag (e.g., pr-5786, latest, v2.10.0)
                        </p>
                      </div>

                      {/* CRD Location */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CRD Location (URL)
                        </label>
                        <input
                          type="text"
                          value={crdLocation}
                          onChange={(e) => setCrdLocation(e.target.value)}
                          placeholder="https://github.com/user/repo/tree/branch/api/v1beta2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          GitHub URL to v1beta2 CRDs directory (e.g.,
                          https://github.com/serngawy/cluster-api-provider-aws/tree/logforward/api/v1beta2)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Apply Changes Button - Only enabled for clusterctl */}
              <div className="mt-6">
                <button
                  onClick={handleReconfigureSubmit}
                  disabled={installMethod !== 'clusterctl'}
                  className={`px-6 py-3 text-white rounded transition-colors font-medium flex items-center gap-2 ${
                    installMethod !== 'clusterctl' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={installMethod === 'clusterctl' ? { backgroundColor: '#8B5CF6' } : { backgroundColor: '#9CA3AF' }}
                  onMouseEnter={(e) => installMethod === 'clusterctl' && (e.currentTarget.style.backgroundColor = '#7C3AED')}
                  onMouseLeave={(e) => installMethod === 'clusterctl' && (e.currentTarget.style.backgroundColor = '#8B5CF6')}
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        );

      case 'provision':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-purple-900">Provision ROSA HCP Cluster</h2>

            {/* Provision Form - Inline (not modal) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <RosaProvisionModal
                isOpen={true}
                inline={true}
                onClose={() => {}} // No close action needed for inline form
                onSubmit={handleProvisionSubmit}
                mceInfo={{ version: 'N/A' }} // Minikube environment - enable all latest features
                theme="minikube"
              />
            </div>
          </div>
        );

      case 'rosa-hcp-clusters':
        return <RosaHcpClustersSection theme="minikube" />;

      case 'resources':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-purple-900">Provision Resources</h2>

            <p className="text-gray-600 mb-4">View and manage CAPI/CAPA Kubernetes resources.</p>

            <ResourcesViewer theme="minikube" />
          </div>
        );

      case 'environments':
        return (
          <div>
            {/* Inline Credential Message */}
            {credentialMessage && (
              <div className={`mb-4 p-4 rounded-lg border ${
                credentialMessageType === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">
                    {credentialMessageType === 'success' ? '✅' : '❌'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{credentialMessage}</p>
                  </div>
                  {credentialMessageType === 'error' && (
                    <button
                      onClick={() => {
                        setCredentialMessage('');
                        setCredentialMessageType('');
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            )}

            <MCEEnvironmentSelector
              onUseCredentials={handleUseEnvironmentCredentials}
              title="Minikube Test Clusters"
              titleSingular="Minikube Test Cluster"
              theme="minikube"
              environmentType="minikube"
            />
          </div>
        );

      case 'test':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-purple-900">Test Suites</h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 mb-4">Run and manage CAPI/CAPA test suites.</p>
              <div className="text-sm text-gray-500">Test suite dashboard coming soon...</div>
            </div>
            {/* Task Summary Section removed */}
          </div>
        );

      case 'test-suite-dashboard':
        return (
          <TestSuiteDashboard
            theme="mce"
            onSelectTestSuite={(testSuite) => {
              console.log('Selected test suite:', testSuite);
              // You can add modal or navigation logic here
            }}
          />
        );

      case 'test-automation':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-purple-900">Playbooks</h2>

            <TestSuiteSection theme="minikube" />
          </div>
        );

      case 'helm-chart-matrix':
        return <HelmChartTestDashboard theme="minikube" />;

      case 'terminal':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-purple-900">Minikube Terminal</h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <TerminalInline />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-purple-900">Notification Settings</h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <NotificationSettingsInline />
            </div>
          </div>
        );

      case 'recent-tasks':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-purple-900">Task Summary</h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {recentOps.recentOperations.length === 0 ? (
                <div className="text-center py-12">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No tasks</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOps.recentOperations.map((task, index) => (
                    <div key={task.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      {/* Task Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-2 h-2 rounded-full ${task.color || 'bg-gray-400'}`}></div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{task.title}</h3>
                            <p className="text-xs text-gray-500">
                              {task.timestamp ? new Date(task.timestamp).toLocaleString() : 'No timestamp'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {(() => {
                              const status = typeof task.status === 'object' ? task.status.status : task.status;
                              if (!status) return '⏳';
                              const statusStr = String(status);
                              if (statusStr.includes('✅') || statusStr.toLowerCase().includes('success')) return '✅';
                              if (statusStr.includes('❌') || statusStr.toLowerCase().includes('fail')) return '❌';
                              if (statusStr.includes('⚠️') || statusStr.toLowerCase().includes('warn')) return '⚠️';
                              return '⏳';
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Task Details */}
                      <div className="space-y-2 text-sm">
                        {task.environment && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Environment:</span>
                            <span className="text-gray-600">{task.environment}</span>
                          </div>
                        )}
                        {task.playbook && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Playbook:</span>
                            <span className="text-gray-600 font-mono text-xs">{task.playbook}</span>
                          </div>
                        )}
                        {task.status && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-gray-700">Status:</span>
                            <span className="text-gray-600">
                              {typeof task.status === 'object' ? task.status.status : task.status}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Task Output */}
                      {task.output && (
                        <div className="mt-3">
                          <details className="bg-gray-50 rounded-lg">
                            <summary className="cursor-pointer p-3 font-medium text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                              View Output
                            </summary>
                            <div className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-medium text-gray-700">Task Output:</h4>
                                <button
                                  onClick={() => handleCopyOutput(typeof task.output === 'object' ? task.output.output : task.output)}
                                  className="px-2 py-1 text-white rounded text-xs font-medium transition-colors"
                                  style={{ backgroundColor: '#8B5CF6' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7C3AED')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8B5CF6')}
                                >
                                  {copySuccess || '📋 Copy'}
                                </button>
                              </div>
                              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs overflow-x-auto max-h-60 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">
                                  {typeof task.output === 'object' ? task.output.output : task.output}
                                </pre>
                              </div>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-purple-900 mb-4">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
            </h2>
            <p className="text-gray-600">Content for {activeSection} section coming soon...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Jenkins-style Sidebar */}
      <JenkinsSidebar
        {...sidebarHandlers}
        activeSection={activeSection}
        environment="minikube"
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Page Header with Purple Gradient */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-500 text-white px-6 py-4 shadow-md flex items-center h-[72px]">
          <div>
            <h1 className="text-2xl font-bold leading-tight">Minikube Test Environment</h1>
          </div>
        </div>

        <div className="p-6">
          {/* Active Environment Banner */}
          <ActiveEnvironmentBanner environment="minikube" />

          {/* Main Content */}
          {renderMainContent()}
        </div>
      </div>

      {/* Modals */}
      <YamlEditorModal
        isOpen={showYamlEditorModal}
        onClose={() => setShowYamlEditorModal(false)}
        yamlData={yamlEditorData}
        readOnly={true}
        onProvision={async (editedYaml) => {
          setShowYamlEditorModal(false);
        }}
      />

      <NotificationSettingsModal
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      <CredentialsModal
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        theme="mce"
        onSave={() => {
          // Refresh status after saving credentials
          refreshAllStatus();
        }}
      />
    </div>
  );
};

/**
 * MinikubeDashboard - Wrapper component with AppProvider
 */
const MinikubeDashboard = () => {
  return (
    <AppProvider>
      <MinikubeDashboardContent />
    </AppProvider>
  );
};

export default MinikubeDashboard;
