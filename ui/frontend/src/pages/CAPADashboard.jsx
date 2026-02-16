/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircleIcon, Cog6ToothIcon, ClockIcon } from '@heroicons/react/24/outline';

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
import {
  AppProvider,
  useApiStatusContext,
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
    'Welcome to MCE Terminal! Type commands or select from templates.\n'
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
      <p className="text-gray-600 mb-4">Execute commands directly on your MCE environment.</p>

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
                style={{ borderColor: '#2684FF' }}
              />
            </div>
            <button
              onClick={executeCommand}
              disabled={executing || !command.trim()}
              className="px-6 py-3 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              style={!executing && command.trim() ? { backgroundColor: '#2684FF' } : {}}
              onMouseEnter={(e) => !executing && command.trim() && (e.currentTarget.style.backgroundColor = '#0065FF')}
              onMouseLeave={(e) => !executing && command.trim() && (e.currentTarget.style.backgroundColor = '#2684FF')}
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
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
                  ? 'border-cyan-600 text-cyan-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📧 Email
            </button>
            <button
              onClick={() => setActiveTab('slack')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'slack'
                  ? 'border-cyan-600 text-cyan-600'
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
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
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
              style={!saving ? { backgroundColor: '#2684FF' } : { backgroundColor: '#9CA3AF' }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#0065FF')}
              onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#2684FF')}
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
 * CAPADashboardContent - Inner component with all the dashboard logic
 */
const CAPADashboardContent = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const apiStatus = useApiStatusContext();
  const recentOps = useRecentOperationsContext();

  // UI State
  const [activeSection, setActiveSection] = useState('environments');
  const [showYamlEditorModal, setShowYamlEditorModal] = useState(false);
  const [yamlEditorData, setYamlEditorData] = useState(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [verificationResults, setVerificationResults] = useState(null);
  const [configurationResults, setConfigurationResults] = useState(null);
  const [mceLastConfigured, setMceLastConfigured] = useState(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    ocpStatus,
    mceFeatures,
    mceInfo,
    mceLastVerified,
    loading: apiLoading,
    refreshAllStatus,
    setOcpStatus,
    setMceLastVerified,
  } = apiStatus;

  const { addToRecent, updateRecentOperationStatus } = recentOps;

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

  // Handle MCE verification
  const handleMceVerification = async () => {
    const verifyId = `verify-mce-${Date.now()}`;

    // Clear previous results and set loading state
    setVerificationResults(null);
    setIsVerifying(true);

    try {
      addToRecent({
        id: verifyId,
        title: '🔍 MCE Environment Verification',
        color: 'bg-cyan-600',
        status: '🚀 Starting verification...',
        environment: 'mce',
        playbook: 'tasks/validate-capa-environment.yml',
        output: 'Initializing MCE environment verification...\nConnecting to OpenShift cluster...\nValidating MCE components...',
      });

      // Start the verification task
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_TASK), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_file: 'tasks/validate-capa-environment.yml',
          extra_vars: {},
        }),
      });

      const result = await response.json();
      console.log('📊 Verification API response:', result);

      if (!result.success || !result.job_id) {
        throw new Error(result.message || 'Failed to start verification');
      }

      const jobId = result.job_id;
      console.log(`🔍 Polling job status for job_id: ${jobId}`);

      // Poll for job completion
      const pollJobStatus = async () => {
        const maxAttempts = 60; // 60 attempts = 1 minute max wait (verification is usually quick)
        let attempts = 0;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(`📡 Polling attempt ${attempts}/${maxAttempts}`);

          const jobResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}`));
          const jobData = await jobResponse.json();
          console.log(`📋 Job status:`, jobData);

          if (jobData.status === 'completed') {
            // Success - get logs
            const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
            const logsData = await logsResponse.json();
            const output = logsData.logs ? logsData.logs.join('\n') : 'Verification completed successfully';

            updateRecentOperationStatus(verifyId, '✅ MCE environment verified successfully!', output);
            setMceLastVerified(new Date().toISOString());
            const successResults = {
              success: true,
              timestamp: new Date().toISOString(),
              output,
            };
            console.log('✅ Setting verification results (success):', successResults);
            setVerificationResults(successResults);
            setIsVerifying(false);
            await refreshAllStatus();
            return;
          } else if (jobData.status === 'failed') {
            // Failure - get error and logs
            const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
            const logsData = await logsResponse.json();
            const output = logsData.logs ? logsData.logs.join('\n') : (jobData.error || jobData.message || 'Verification failed');

            updateRecentOperationStatus(verifyId, '❌ Verification failed', output);
            const failureResults = {
              success: false,
              timestamp: new Date().toISOString(),
              output,
            };
            console.log('❌ Setting verification results (failure):', failureResults);
            setVerificationResults(failureResults);
            setIsVerifying(false);
            return;
          }

          // Still running, wait and poll again
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
        }

        // Timeout
        throw new Error('Verification timed out after 60 seconds');
      };

      await pollJobStatus();
    } catch (error) {
      console.error('Verification error:', error);
      updateRecentOperationStatus(verifyId, '❌ Verification error', extractSafeErrorMessage(error));
      setVerificationResults({
        success: false,
        timestamp: new Date().toISOString(),
        output: extractSafeErrorMessage(error),
      });
      setIsVerifying(false);
    }
  };

  // Handle authentication/credentials
  const handleCredentials = () => {
    setShowCredentialsModal(true);
  };

  // Handle configuration
  const handleConfigure = async () => {
    const configureId = `configure-mce-${Date.now()}`;

    // Clear previous results and set loading state
    setConfigurationResults(null);
    setIsConfiguring(true);

    try {
      addToRecent({
        id: configureId,
        title: '⚙️ Configure MCE CAPI/CAPA Environment',
        color: 'bg-cyan-600',
        status: '🚀 Starting configuration...',
        environment: 'mce',
        playbook: 'configure_mce_environment.yml',
        output: 'Initializing MCE CAPI/CAPA configuration...\nEnabling cluster-api components...',
      });

      // Start the configuration task
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_PLAYBOOK), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbook: 'configure_mce_environment.yml',
          description: 'Configure MCE CAPI/CAPA Environment',
          extra_vars: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API returned error:', errorData);
        throw new Error(errorData.detail || errorData.message || 'Failed to start configuration');
      }

      const result = await response.json();
      console.log('📊 Configuration API response:', result);

      if (!result.job_id) {
        console.error('❌ No job_id in response:', result);
        throw new Error(result.message || result.detail || 'Failed to start configuration');
      }

      const jobId = result.job_id;
      console.log(`🔍 Polling job status for job_id: ${jobId}`);

      // Poll for job completion
      const pollJobStatus = async () => {
        const maxAttempts = 120; // 120 attempts = 2 minutes max wait (configuration can take longer)
        let attempts = 0;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(`📡 Polling attempt ${attempts}/${maxAttempts}`);

          const jobResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}`));
          const jobData = await jobResponse.json();
          console.log(`📋 Job status:`, jobData);

          if (jobData.status === 'completed') {
            // Success - get logs
            const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
            const logsData = await logsResponse.json();
            const output = logsData.logs ? logsData.logs.join('\n') : 'Configuration completed successfully';

            updateRecentOperationStatus(configureId, '✅ Configuration completed successfully!', output);
            setMceLastConfigured(new Date().toISOString());
            const successResults = {
              success: true,
              timestamp: new Date().toISOString(),
              output,
            };
            console.log('✅ Setting configuration results (success):', successResults);
            setConfigurationResults(successResults);
            setIsConfiguring(false);
            await refreshAllStatus();
            return;
          } else if (jobData.status === 'failed') {
            // Failure - get error and logs
            const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
            const logsData = await logsResponse.json();
            const output = logsData.logs ? logsData.logs.join('\n') : (jobData.error || jobData.message || 'Configuration failed');

            updateRecentOperationStatus(configureId, '❌ Configuration failed', output);
            const failureResults = {
              success: false,
              timestamp: new Date().toISOString(),
              output,
            };
            console.log('❌ Setting configuration results (failure):', failureResults);
            setConfigurationResults(failureResults);
            setIsConfiguring(false);
            return;
          }

          // Still running, wait and poll again
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
        }

        // Timeout
        throw new Error('Configuration timed out after 2 minutes');
      };

      await pollJobStatus();
    } catch (error) {
      console.error('Configuration error:', error);
      updateRecentOperationStatus(configureId, '❌ Configuration error', extractSafeErrorMessage(error));
      setConfigurationResults({
        success: false,
        timestamp: new Date().toISOString(),
        output: extractSafeErrorMessage(error),
      });
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
        environment: 'mce',
        playbook: 'playbooks/provision_rosa_hcp.yml',
        output: `Initializing ROSA HCP cluster provisioning...\\nCluster: ${config.clusterName}\\nVersion: ${config.openShiftVersion}\\nRegion: ${config.awsRegion}`,
      });

      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_PLAYBOOK), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbook_name: 'playbooks/provision_rosa_hcp.yml',
          extra_vars: config,
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        updateRecentOperationStatus(provisionId, '✅ Provisioning completed successfully!', result.output);
        await refreshAllStatus();
      } else {
        updateRecentOperationStatus(provisionId, '❌ Provisioning failed', result.output || result.error);
      }

    } catch (error) {
      console.error('Provisioning error:', error);
      updateRecentOperationStatus(provisionId, '❌ Provisioning error', extractSafeErrorMessage(error));
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
    await refreshAllStatus();
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
        // Show success message
        alert(
          `✅ Credentials set successfully for ${credentials.clusterName}!\n\nYou can now verify or configure the environment.`
        );

        // Refresh API status to reflect the new credentials
        await refreshAllStatus();
      } else {
        const error = await response.json();
        alert(`Failed to save credentials: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Failed to save credentials: ${error.message}`);
    }
  };

  // Sidebar navigation handlers
  const sidebarHandlers = {
    onComponentsClick: () => setActiveSection('components'),
    onVerifyClick: () => setActiveSection('verify'),
    onConfigureClick: () => setActiveSection('configure'),
    onProvisionClick: () => setActiveSection('provision'),
    onRosaHcpClustersClick: () => setActiveSection('rosa-hcp-clusters'),
    onResourcesClick: () => setActiveSection('resources'),
    onEnvironmentsClick: () => setActiveSection('environments'),
    onCredentialsClick: () => setActiveSection('credentials'),
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
      case 'verify':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-blue-900">Verify Environment</h2>

            <p className="text-gray-600 mb-6">
              Run comprehensive verification checks on your MCE environment and CAPI/CAPA components.
            </p>

            <button
              onClick={handleMceVerification}
              disabled={isVerifying}
              className="px-6 py-3 text-white rounded transition-colors font-medium flex items-center gap-2"
              style={!isVerifying ? { backgroundColor: '#2684FF' } : { backgroundColor: '#9CA3AF' }}
              onMouseEnter={(e) => !isVerifying && (e.currentTarget.style.backgroundColor = '#0065FF')}
              onMouseLeave={(e) => !isVerifying && (e.currentTarget.style.backgroundColor = '#2684FF')}
            >
              {isVerifying ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  Run Verification
                </>
              )}
            </button>

            {/* Last Verification Info */}
            {mceLastVerified && (
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span>Last verified: {new Date(mceLastVerified).toLocaleString()}</span>
                  <span className="text-green-600 font-medium">✅ Passed</span>
                </div>
              </div>
            )}

            {/* CAPI/CAPA Components Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Components</h3>
                <button
                  onClick={handleRefresh}
                  disabled={apiLoading}
                  className="px-3 py-1.5 text-white rounded transition-colors text-xs flex items-center gap-1.5"
                  style={!apiLoading ? { backgroundColor: '#2684FF' } : { backgroundColor: '#9CA3AF' }}
                  onMouseEnter={(e) => !apiLoading && (e.currentTarget.style.backgroundColor = '#0065FF')}
                  onMouseLeave={(e) => !apiLoading && (e.currentTarget.style.backgroundColor = '#2684FF')}
                >
                  🔄 Refresh
                </button>
              </div>

              {/* Components Lists - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Hypershift Components List */}
                <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Hypershift</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(() => {
                    const hypershiftComponents = mceFeatures
                      .filter(component => component.name?.includes('hypershift'))
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                    return hypershiftComponents.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-sm text-gray-600">No Hypershift components configured</p>
                      </div>
                    ) : (
                      hypershiftComponents.map((component, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-1 px-2 text-xs hover:bg-gray-50"
                        >
                          <span className="truncate">{component.name}</span>
                          <span className={`ml-2 ${component.enabled ? 'text-green-600' : 'text-red-600'}`}>
                            {component.enabled ? '✓' : '✕'}
                          </span>
                        </div>
                      ))
                    );
                  })()}
                </div>
              </div>

              {/* CAPI/CAPA Components List */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">CAPI/CAPA</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(() => {
                    const capiComponents = mceFeatures
                      .filter(component =>
                        component.name === 'cluster-api' ||
                        component.name?.startsWith('cluster-api-provider-')
                      )
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                    return capiComponents.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-sm text-gray-600">No CAPI components configured</p>
                      </div>
                    ) : (
                      capiComponents.map((component, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-1 px-2 text-xs hover:bg-gray-50"
                        >
                          <span className="truncate">{component.name}</span>
                          <span className={`ml-2 ${component.enabled ? 'text-green-600' : 'text-red-600'}`}>
                            {component.enabled ? '✓' : '✕'}
                          </span>
                        </div>
                      ))
                    );
                  })()}
                </div>
              </div>
              </div>
            </div>

            {/* Verification Results */}
            {(() => {
              console.log('🔍 Rendering verify section, verificationResults:', verificationResults);
              return verificationResults && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {verificationResults.success ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <span className="text-xl">❌</span>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {verificationResults.success ? 'Verification Passed' : 'Verification Failed'}
                    </h3>
                  </div>

                  {/* Output Display - Always show if results exist */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Playbook Output:</h4>
                      <button
                        onClick={() => handleCopyOutput(verificationResults.output || 'No output available')}
                        className="px-3 py-1 text-white rounded text-xs font-medium transition-colors"
                        style={{ backgroundColor: '#2684FF' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0065FF')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2684FF')}
                      >
                        {copySuccess || '📋 Copy'}
                      </button>
                    </div>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto min-h-[100px]">
                      <pre className="whitespace-pre-wrap">
                        {verificationResults.output || 'No output available'}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );

      case 'configure':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-blue-900">Configure CAPI/CAPA</h2>

            {/* Configuration Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 mb-6">
                Enable and configure CAPI/CAPA components on your MCE environment.
              </p>

              <button
                onClick={handleConfigure}
                disabled={apiLoading}
                className="px-6 py-3 text-white rounded transition-colors font-medium flex items-center gap-2"
                style={!apiLoading ? { backgroundColor: '#2684FF' } : { backgroundColor: '#9CA3AF' }}
                onMouseEnter={(e) => !apiLoading && (e.currentTarget.style.backgroundColor = '#0065FF')}
                onMouseLeave={(e) => !apiLoading && (e.currentTarget.style.backgroundColor = '#2684FF')}
              >
                {apiLoading ? (
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

              {/* Last Configuration Info */}
              {mceLastConfigured && (
                <div className="text-sm text-gray-600 mt-4">
                  <div className="flex items-center gap-2">
                    <Cog6ToothIcon className="h-4 w-4 text-blue-600" />
                    <span>Last configured: {new Date(mceLastConfigured).toLocaleString()}</span>
                    <span className="text-green-600 font-medium">✅ Completed</span>
                  </div>
                </div>
              )}
            </div>

            {/* Configuration Results or Loading */}
            {isConfiguring && !configurationResults && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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
                      style={{ backgroundColor: '#2684FF' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0065FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2684FF')}
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

      case 'provision':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-blue-900">Provision ROSA HCP Cluster</h2>

            {/* Provision Form - Inline (not modal) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <RosaProvisionModal
                isOpen={true}
                inline={true}
                onClose={() => {}} // No close action needed for inline form
                onSubmit={handleProvisionSubmit}
                mceInfo={mceInfo}
              />
            </div>
          </div>
        );

      case 'rosa-hcp-clusters':
        return <RosaHcpClustersSection />;

      case 'resources':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-blue-900">Provision Resources</h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 mb-4">View and manage CAPI/CAPA Kubernetes resources.</p>
              <div className="text-sm text-gray-500">Resources section coming soon...</div>
            </div>
          </div>
        );

      case 'environments':
        return (
          <div>
            <MCEEnvironmentSelector onUseCredentials={handleUseEnvironmentCredentials} />
          </div>
        );

      case 'credentials':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-blue-900">Credentials</h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <CredentialsModal
                isOpen={true}
                inline={true}
                onClose={() => {}}
                theme="mce"
                onSave={() => {
                  refreshAllStatus();
                  setActiveSection('environments');
                }}
              />
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-blue-900">Test Suites</h2>

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
        return <TestSuiteSection theme="mce" />;

      case 'helm-chart-matrix':
        return <HelmChartTestDashboard theme="mce" />;

      case 'terminal':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-blue-900">MCE Terminal</h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <TerminalInline />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-blue-900">Notification Settings</h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <NotificationSettingsInline />
            </div>
          </div>
        );

      case 'recent-tasks':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-blue-900">Task Summary</h2>

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
                                  style={{ backgroundColor: '#2684FF' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0065FF')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2684FF')}
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
            <h2 className="text-2xl font-bold text-blue-900 mb-4">
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
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Page Header with Blue Gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-4 shadow-md flex items-center h-[72px]">
          <div>
            <h1 className="text-2xl font-bold leading-tight">MCE Environment</h1>
          </div>
        </div>

        <div className="p-6">
          {/* Active Environment Banner */}
          <ActiveEnvironmentBanner />

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
 * CAPADashboard - Wrapper component with AppProvider
 */
const CAPADashboard = () => {
  return (
    <AppProvider>
      <CAPADashboardContent />
    </AppProvider>
  );
};

export default CAPADashboard;
