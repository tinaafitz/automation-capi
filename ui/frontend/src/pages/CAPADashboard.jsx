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
import ResourcesViewer from '../components/ResourcesViewer';
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
  const [provisionViewMode, setProvisionViewMode] = useState('form'); // 'form' or 'yaml'
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsRefreshKey, setCredentialsRefreshKey] = useState(0);
  const [verificationResults, setVerificationResults] = useState(null);
  const [configurationResults, setConfigurationResults] = useState(null);
  const [provisionResults, setProvisionResults] = useState(null);
  const [mceLastConfigured, setMceLastConfigured] = useState(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isCheckingProvisionJob, setIsCheckingProvisionJob] = useState(false);

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

  // Check for running provision jobs when navigating to provision section
  useEffect(() => {
    if (activeSection === 'provision') {
      checkForRunningProvisionJob();
    }
  }, [activeSection]);

  // Check for running configure jobs when navigating to configure section
  useEffect(() => {
    if (activeSection === 'configure') {
      checkForRunningConfigureJob();
    }
  }, [activeSection]);

  // Check for running verify jobs when navigating to verify section
  useEffect(() => {
    if (activeSection === 'verify') {
      checkForRunningVerifyJob();
    }
  }, [activeSection]);

  // Function to check for running provision jobs and restore their output
  const checkForRunningProvisionJob = async () => {
    setIsCheckingProvisionJob(true);
    try {
      const response = await fetch(buildApiUrl('/api/jobs'));
      const data = await response.json();

      if (data.success && data.jobs) {
        // Find the most recent running provision job
        const runningProvisionJob = data.jobs.find(
          (job) =>
            job.status === 'running' &&
            job.description &&
            job.description.includes('Provision ROSA HCP')
        );

        if (runningProvisionJob) {
          console.log('📦 Found running provision job:', runningProvisionJob.id);

          // Fetch current logs
          const logsResponse = await fetch(buildApiUrl(`/api/jobs/${runningProvisionJob.id}/logs`));
          const logsData = await logsResponse.json();
          const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

          // Set provision results to show the running job
          setProvisionResults({
            success: true,
            timestamp: new Date().toISOString(),
            output: currentOutput || 'Provisioning in progress...',
          });
          setIsProvisioning(true);

          // Continue polling this job
          pollProvisionJob(runningProvisionJob.id);
        } else {
          // No running job, clear results and show form
          setProvisionResults(null);
          setProvisionViewMode('form');
        }
      }
    } catch (error) {
      console.error('Error checking for running provision jobs:', error);
      setProvisionResults(null);
      setProvisionViewMode('form');
    } finally {
      setIsCheckingProvisionJob(false);
    }
  };

  // Function to poll a provision job and update results
  const pollProvisionJob = async (jobId) => {
    const maxAttempts = 1800; // 30 minutes max
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.log('⏱️ Max polling attempts reached');
        setIsProvisioning(false);
        return;
      }

      attempts++;

      try {
        const jobResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}`));
        const jobData = await jobResponse.json();

        // Fetch logs
        const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
        const logsData = await logsResponse.json();
        const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

        // Update provision results every 5 seconds with current output
        if (attempts % 5 === 0 && currentOutput) {
          setProvisionResults({
            success: jobData.status !== 'failed',
            timestamp: new Date().toISOString(),
            output: currentOutput,
          });
        }

        if (jobData.status === 'completed') {
          console.log('✅ Provision job completed');
          setProvisionResults({
            success: true,
            timestamp: new Date().toISOString(),
            output: currentOutput || 'Provisioning completed successfully',
          });
          setIsProvisioning(false);
          return;
        } else if (jobData.status === 'failed') {
          console.log('❌ Provision job failed');
          setProvisionResults({
            success: false,
            timestamp: new Date().toISOString(),
            output: currentOutput || 'Provisioning failed',
          });
          setIsProvisioning(false);
          return;
        }

        // Continue polling if still running
        if (jobData.status === 'running') {
          setTimeout(poll, 1000); // Poll every 1 second
        }
      } catch (error) {
        console.error('Error polling provision job:', error);
        setIsProvisioning(false);
      }
    };

    poll();
  };

  // Function to check for running configure jobs and restore their output
  const checkForRunningConfigureJob = async () => {
    setIsConfiguring(true);
    try {
      const response = await fetch(buildApiUrl('/api/jobs'));
      const data = await response.json();

      if (data.success && data.jobs) {
        // Find the most recent running configure job
        const runningConfigureJob = data.jobs.find(
          (job) =>
            job.status === 'running' &&
            job.description &&
            job.description.includes('Configure MCE CAPI/CAPA')
        );

        if (runningConfigureJob) {
          console.log('⚙️ Found running configure job:', runningConfigureJob.id);

          // Fetch current logs
          const logsResponse = await fetch(buildApiUrl(`/api/jobs/${runningConfigureJob.id}/logs`));
          const logsData = await logsResponse.json();
          const currentOutput = logsData.logs ? logsData.logs.join('\\n') : '';

          // Set configuration results to show the running job
          setConfigurationResults({
            success: true,
            timestamp: new Date().toISOString(),
            output: currentOutput || 'Configuration in progress...',
          });

          // Continue polling this job
          pollConfigureJob(runningConfigureJob.id);
        } else {
          // No running job, clear results
          setConfigurationResults(null);
          setIsConfiguring(false);
        }
      }
    } catch (error) {
      console.error('Error checking for running configure jobs:', error);
      setConfigurationResults(null);
      setIsConfiguring(false);
    }
  };

  // Function to poll a configure job and update results
  const pollConfigureJob = async (jobId) => {
    const maxAttempts = 900; // 15 minutes max
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.log('⏱️ Max polling attempts reached for configure job');
        setIsConfiguring(false);
        return;
      }

      attempts++;

      try {
        const jobResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}`));
        const jobData = await jobResponse.json();

        // Fetch logs
        const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
        const logsData = await logsResponse.json();
        const currentOutput = logsData.logs ? logsData.logs.join('\\n') : '';

        // Update configuration results every 5 seconds with current output
        if (attempts % 5 === 0 && currentOutput) {
          setConfigurationResults({
            success: jobData.status !== 'failed',
            timestamp: new Date().toISOString(),
            output: currentOutput,
          });
        }

        if (jobData.status === 'completed') {
          console.log('✅ Configure job completed');
          setConfigurationResults({
            success: true,
            timestamp: new Date().toISOString(),
            output: currentOutput || 'Configuration completed successfully',
          });
          setIsConfiguring(false);
          setMceLastConfigured(new Date().toISOString());
          await refreshAllStatus();
          return;
        } else if (jobData.status === 'failed') {
          console.log('❌ Configure job failed');
          setConfigurationResults({
            success: false,
            timestamp: new Date().toISOString(),
            output: currentOutput || 'Configuration failed',
          });
          setIsConfiguring(false);
          return;
        }

        // Continue polling if still running
        if (jobData.status === 'running') {
          setTimeout(poll, 1000); // Poll every 1 second
        }
      } catch (error) {
        console.error('Error polling configure job:', error);
        setIsConfiguring(false);
      }
    };

    poll();
  };

  // Function to check for running verify jobs and restore their output
  const checkForRunningVerifyJob = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch(buildApiUrl('/api/jobs'));
      const data = await response.json();

      if (data.success && data.jobs) {
        // Find the most recent running verify job
        const runningVerifyJob = data.jobs.find(
          (job) =>
            job.status === 'running' &&
            job.description &&
            job.description.includes('MCE Environment Verification')
        );

        if (runningVerifyJob) {
          console.log('🔍 Found running verify job:', runningVerifyJob.id);

          // Fetch current logs
          const logsResponse = await fetch(buildApiUrl(`/api/jobs/${runningVerifyJob.id}/logs`));
          const logsData = await logsResponse.json();
          const currentOutput = logsData.logs ? logsData.logs.join('\\n') : '';

          // Set verification results to show the running job
          setVerificationResults({
            success: true,
            timestamp: new Date().toISOString(),
            output: currentOutput || 'Verification in progress...',
          });

          // Continue polling this job
          pollVerifyJob(runningVerifyJob.id);
        } else {
          // No running job, clear results
          setVerificationResults(null);
          setIsVerifying(false);
        }
      }
    } catch (error) {
      console.error('Error checking for running verify jobs:', error);
      setVerificationResults(null);
      setIsVerifying(false);
    }
  };

  // Function to poll a verify job and update results
  const pollVerifyJob = async (jobId) => {
    const maxAttempts = 60; // 60 seconds max for verification
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.log('⏱️ Max polling attempts reached for verify job');
        setIsVerifying(false);
        return;
      }

      attempts++;

      try {
        const jobResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}`));
        const jobData = await jobResponse.json();

        // Fetch logs
        const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
        const logsData = await logsResponse.json();
        const currentOutput = logsData.logs ? logsData.logs.join('\\n') : '';

        // Update verification results every 3 seconds with current output
        if (attempts % 3 === 0 && currentOutput) {
          setVerificationResults({
            success: jobData.status !== 'failed',
            timestamp: new Date().toISOString(),
            output: currentOutput,
          });
        }

        if (jobData.status === 'completed') {
          console.log('✅ Verify job completed');
          setVerificationResults({
            success: true,
            timestamp: new Date().toISOString(),
            output: currentOutput || 'Verification completed successfully',
          });
          setIsVerifying(false);
          setMceLastVerified(new Date().toISOString());
          await refreshAllStatus();
          setCredentialsRefreshKey(prev => prev + 1);
          return;
        } else if (jobData.status === 'failed') {
          console.log('❌ Verify job failed');
          const output = currentOutput || 'Verification failed';

          // Check if error indicates environment needs configuration (not a real failure)
          const needsConfiguration =
            output.includes('Environment not configured yet') ||
            output.includes('CAPI controller not found') ||
            output.includes('CAPA controller not found') ||
            output.includes('Ready to set up');

          if (needsConfiguration) {
            setVerificationResults({
              success: null,
              needsConfiguration: true,
              timestamp: new Date().toISOString(),
              output,
            });
          } else {
            setVerificationResults({
              success: false,
              timestamp: new Date().toISOString(),
              output,
            });
          }
          setIsVerifying(false);
          return;
        }

        // Continue polling if still running
        if (jobData.status === 'running') {
          setTimeout(poll, 1000); // Poll every 1 second
        }
      } catch (error) {
        console.error('Error polling verify job:', error);
        setIsVerifying(false);
      }
    };

    poll();
  };

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

          // Fetch logs regardless of status to show real-time output
          const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
          const logsData = await logsResponse.json();
          const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

          if (jobData.status === 'completed') {
            // Success - update with final logs
            const output = currentOutput || 'Verification completed successfully';

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
            // Force ActiveEnvironmentBanner to refresh and show verified status
            setCredentialsRefreshKey(prev => prev + 1);
            return;
          } else if (jobData.status === 'failed') {
            // Failure - but check if it's a configuration issue (not a real failure)
            const output = currentOutput || (jobData.error || jobData.message || 'Verification failed');

            // Check if error indicates environment needs configuration (not a real failure)
            const needsConfiguration =
              output.includes('Environment not configured yet') ||
              output.includes('CAPI controller not found') ||
              output.includes('CAPA controller not found') ||
              output.includes('Ready to set up');

            if (needsConfiguration) {
              // This is not a failure - environment just needs configuration
              updateRecentOperationStatus(verifyId, '🆕 Configuration Required', output);
              const configNeededResults = {
                success: null, // null indicates "needs config", not success or failure
                needsConfiguration: true,
                timestamp: new Date().toISOString(),
                output,
              };
              console.log('🆕 Setting verification results (needs configuration):', configNeededResults);
              setVerificationResults(configNeededResults);
            } else {
              // This is a real failure (credentials, network, etc.)
              updateRecentOperationStatus(verifyId, '❌ Verification failed', output);
              const failureResults = {
                success: false,
                timestamp: new Date().toISOString(),
                output,
              };
              console.log('❌ Setting verification results (failure):', failureResults);
              setVerificationResults(failureResults);
            }
            setIsVerifying(false);
            return;
          }

          // Still running - update with current logs every 3 seconds
          if (attempts % 3 === 0 && currentOutput) {
            updateRecentOperationStatus(verifyId, '🔍 Verifying...', currentOutput);
            // Also update the inline display with real-time output
            setVerificationResults({
              success: true,
              timestamp: new Date().toISOString(),
              output: currentOutput,
            });
          }

          // Wait and poll again
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
        const maxAttempts = 900; // 900 attempts = 15 minutes max wait (configuration can take a while)
        let attempts = 0;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(`📡 Polling attempt ${attempts}/${maxAttempts}`);

          const jobResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}`));
          const jobData = await jobResponse.json();
          console.log(`📋 Job status:`, jobData);

          // Fetch logs regardless of status to show real-time output
          const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
          const logsData = await logsResponse.json();
          const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

          if (jobData.status === 'completed') {
            // Success - update with final logs
            const output = currentOutput || 'Configuration completed successfully';

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
            // Failure - update with error logs
            const output = currentOutput || (jobData.error || jobData.message || 'Configuration failed');

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

          // Still running - update with current logs every 5 seconds
          if (attempts % 5 === 0 && currentOutput) {
            updateRecentOperationStatus(configureId, '🚀 Configuring...', currentOutput);
            // Also update the inline display with real-time output
            setConfigurationResults({
              success: true,
              timestamp: new Date().toISOString(),
              output: currentOutput,
            });
          }

          // Wait and poll again
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
        }

        // Timeout
        throw new Error('Configuration timed out after 15 minutes');
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
    try {
      // Step 1: Generate YAML preview
      console.log('📄 Generating YAML preview...');
      const previewResponse = await fetch(buildApiUrl('/api/provisioning/generate-yaml'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      const previewResult = await previewResponse.json();
      console.log('📄 Preview result:', previewResult);
      console.log('📄 yaml_content exists:', !!previewResult.yaml_content);
      console.log('📄 yaml_content length:', previewResult.yaml_content?.length || 0);

      if (!previewResult.success || !previewResult.yaml_content) {
        console.error('❌ Preview failed:', previewResult);
        throw new Error(previewResult.message || 'Failed to generate YAML preview');
      }

      // Step 2: Show YAML editor inline (not modal)
      setYamlEditorData({
        yaml_content: previewResult.yaml_content,
        cluster_name: config.clusterName,
        feature_type: 'rosa-hcp-provision',
        config: config, // Store config for later provisioning
      });
      setProvisionViewMode('yaml');

    } catch (error) {
      console.error('Preview generation error:', error);
      alert(`Failed to generate preview: ${extractSafeErrorMessage(error)}`);
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
        // Force ActiveEnvironmentBanner to re-fetch credentials
        setCredentialsRefreshKey(prev => prev + 1);
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
    onProvisionClick: () => {
      setProvisionResults(null); // Clear previous provision results
      setActiveSection('provision');
    },
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
              </div>
            </div>

            {/* Verification Results */}
            {(() => {
              console.log('🔍 Rendering verify section, verificationResults:', verificationResults);
              return verificationResults && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {verificationResults.success === true ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : verificationResults.needsConfiguration ? (
                      <span className="text-xl">🆕</span>
                    ) : (
                      <span className="text-xl">❌</span>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {verificationResults.success === true
                        ? 'Verification Passed'
                        : verificationResults.needsConfiguration
                          ? 'Configuration Required'
                          : 'Verification Failed'}
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
            {/* Title with Back Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-blue-900">
                {provisionViewMode === 'yaml' ? 'Review & Edit Provisioning YAML' : 'Provision ROSA HCP Cluster'}
              </h2>
              {provisionViewMode === 'yaml' && (
                <button
                  onClick={() => setProvisionViewMode('form')}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  ← Back to Form
                </button>
              )}
            </div>

            {/* Loading indicator while checking for running jobs */}
            {isCheckingProvisionJob ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
                  <p className="mt-4 text-gray-600">Checking for running provision jobs...</p>
                </div>
              </div>
            ) : (
              /* Toggle between Form and YAML Editor - Only show if no provision results */
              !provisionResults && (
                provisionViewMode === 'form' ? (
                  /* Provision Form - Inline */
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <RosaProvisionModal
                      isOpen={true}
                      inline={true}
                      onClose={() => {}} // No close action needed for inline form
                      onSubmit={handleProvisionSubmit}
                      mceInfo={mceInfo}
                    />
                  </div>
                ) : (
                /* YAML Editor - Inline */
                <YamlEditorModal
                  isOpen={true}
                  inline={true}
                  onClose={() => setProvisionViewMode('form')}
                  yamlData={yamlEditorData}
                  readOnly={false}
                  onProvision={async (editedYaml) => {
                  // Get the original config from yamlEditorData
                  const config = yamlEditorData?.config;
                  if (!config) {
                    alert('Configuration data not found');
                    return;
                  }

                  const provisionId = `provision-rosa-${Date.now()}`;

                  try {
                    setIsProvisioning(true);

                    // Immediately show "Starting..." state to avoid blank form flash
                    setProvisionResults({
                      success: true,
                      timestamp: new Date().toISOString(),
                      output: `🚀 Starting provisioning for ${config.clusterName}...\n\nInitializing ROSA HCP cluster provisioning...\nCluster: ${config.clusterName}\nVersion: ${config.openShiftVersion}\nRegion: ${config.awsRegion}\n\nConnecting to backend...`,
                    });

                    addToRecent({
                      id: provisionId,
                      title: `🚀 Provision ROSA HCP: ${config.clusterName}`,
                      color: 'bg-green-600',
                      status: '🚀 Starting provisioning...',
                      environment: 'mce',
                      playbook: 'playbooks/create_rosa_hcp_cluster.yml',
                      output: `Initializing ROSA HCP cluster provisioning...\\nCluster: ${config.clusterName}\\nVersion: ${config.openShiftVersion}\\nRegion: ${config.awsRegion}`,
                    });

                    const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_PLAYBOOK), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        playbook: 'playbooks/create_rosa_hcp_cluster.yml',
                        description: `Provision ROSA HCP: ${config.clusterName}`,
                        extra_vars: config,
                        yaml_override: editedYaml,
                      }),
                    });

                    const result = await response.json();
                    console.log('📊 Provision API response:', result);

                    if (!result.success || !result.job_id) {
                      throw new Error(result.message || 'Failed to start provisioning');
                    }

                    const jobId = result.job_id;
                    console.log(`🔍 Polling job status for job_id: ${jobId}`);

                    // Close YAML editor immediately
                    setProvisionViewMode('form');

                    // Poll for job completion
                    const pollJobStatus = async () => {
                      const maxAttempts = 1800; // 1800 attempts = 30 minutes max (provisioning can take a while)
                      let attempts = 0;

                      while (attempts < maxAttempts) {
                        attempts++;
                        console.log(`📡 Polling attempt ${attempts}/${maxAttempts}`);

                        const jobResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}`));
                        const jobData = await jobResponse.json();
                        console.log(`📋 Job status:`, jobData);

                        // Fetch logs regardless of status to show real-time output
                        const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
                        const logsData = await logsResponse.json();
                        const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

                        if (jobData.status === 'completed') {
                          // Success - update with final logs
                          const output = currentOutput || 'Provisioning completed successfully';

                          updateRecentOperationStatus(provisionId, '✅ ROSA HCP cluster provisioned successfully!', output);
                          const successResults = {
                            success: true,
                            timestamp: new Date().toISOString(),
                            output,
                          };
                          console.log('✅ Setting provision results (success):', successResults);
                          setProvisionResults(successResults);
                          setIsProvisioning(false);
                          await refreshAllStatus();
                          return;
                        } else if (jobData.status === 'failed') {
                          // Failure - update with error logs
                          const output = currentOutput || (jobData.error || jobData.message || 'Provisioning failed');

                          updateRecentOperationStatus(provisionId, '❌ Provisioning failed', output);
                          const failureResults = {
                            success: false,
                            timestamp: new Date().toISOString(),
                            output,
                          };
                          console.log('❌ Setting provision results (failure):', failureResults);
                          setProvisionResults(failureResults);
                          setIsProvisioning(false);
                          return;
                        }

                        // Still running - update with current logs every 5 seconds
                        if (attempts % 5 === 0 && currentOutput) {
                          updateRecentOperationStatus(provisionId, '🚀 Provisioning...', currentOutput);
                          // Also update the inline display
                          setProvisionResults({
                            success: true,
                            timestamp: new Date().toISOString(),
                            output: currentOutput,
                          });
                        }

                        // Wait and poll again
                        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
                      }

                      // Timeout
                      throw new Error('Provisioning timed out after 30 minutes');
                    };

                    await pollJobStatus();

                  } catch (error) {
                    console.error('Provisioning error:', error);
                    const errorMsg = extractSafeErrorMessage(error);
                    updateRecentOperationStatus(provisionId, '❌ Provisioning error', errorMsg);
                    setProvisionResults({
                      success: false,
                      timestamp: new Date().toISOString(),
                      output: errorMsg,
                    });
                    // Close YAML editor and show error output
                    setProvisionViewMode('form');
                  } finally {
                    setIsProvisioning(false);
                  }
                }}
              />
            )
              )
            )}

            {/* Provision Results Display - Inline Playbook Output */}
            {provisionResults && (
              <div className={`mt-6 rounded-lg border-2 p-6 ${provisionResults.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <div className="flex items-center gap-3 mb-4">
                  {provisionResults.success ? (
                    <span className="text-2xl">✅</span>
                  ) : (
                    <span className="text-xl">❌</span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {provisionResults.success ? 'Provisioning Started' : 'Provisioning Failed'}
                  </h3>
                </div>

                {/* Output Display */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Playbook Output:</h4>
                    <button
                      onClick={() => handleCopyOutput(provisionResults.output || 'No output available')}
                      className="px-3 py-1 text-white rounded text-xs font-medium transition-colors"
                      style={{ backgroundColor: '#2684FF' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0065FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2684FF')}
                    >
                      {copySuccess || '📋 Copy'}
                    </button>
                  </div>
                  <div className="bg-gray-900 text-gray-100 rounded p-4 max-h-96 overflow-y-auto font-mono text-sm">
                    <pre className="whitespace-pre-wrap">
                      {provisionResults.output || 'No output available'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'rosa-hcp-clusters':
        return <RosaHcpClustersSection />;

      case 'resources':
        return (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-blue-900">Provision Resources</h2>

            <p className="text-gray-600 mb-4">View and manage CAPI/CAPA Kubernetes resources.</p>

            <ResourcesViewer theme="mce" />
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
                  // Force ActiveEnvironmentBanner to re-fetch credentials
                  setCredentialsRefreshKey(prev => prev + 1);
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
            onSelectTestSuite={async (testSuite) => {
              console.log('Selected test suite:', testSuite);

              // Map test suite to playbook
              const playbookMap = {
                'ImageType Testing Suite': 'test_imagetype.yaml',
                'Audit Log Forwarding': 'test-rosa-log-forwarding.yml',
                // Add other test suites here
              };

              const playbookFile = playbookMap[testSuite.name];

              if (!playbookFile) {
                alert(`Test suite "${testSuite.name}" execution not yet implemented.\n\nAvailable: ImageType Testing Suite, Audit Log Forwarding`);
                return;
              }

              // Confirm execution
              const confirm = window.confirm(
                `Run ${testSuite.name}?\n\n` +
                `This will:\n` +
                testSuite.components.map(c => `• ${c}`).join('\n') +
                `\n\nPlaybook: ${playbookFile}\n\n` +
                `Continue?`
              );

              if (!confirm) return;

              // Execute the test playbook
              try {
                const testId = `test-suite-${Date.now()}`;

                addToRecent({
                  id: testId,
                  title: `🧪 ${testSuite.name}`,
                  color: 'bg-blue-600',
                  status: '🚀 Starting test...',
                  environment: 'mce',
                  playbook: playbookFile,
                  output: `Starting ${testSuite.name}...\n\nComponents to test:\n${testSuite.components.map(c => `  • ${c}`).join('\n')}`,
                });

                const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_PLAYBOOK), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    playbook: playbookFile,
                    description: testSuite.name,
                    extra_vars: {},
                  }),
                });

                if (!response.ok) {
                  throw new Error(`Failed to start test: ${response.statusText}`);
                }

                const result = await response.json();

                if (!result.success || !result.job_id) {
                  throw new Error(result.error || result.message || 'Failed to start test');
                }

                const jobId = result.job_id;
                console.log(`🧪 Test started with job_id: ${jobId}`);

                // Poll for job completion with real-time output updates
                const pollTestJob = async () => {
                  const maxAttempts = 3600; // 1 hour max (tests can take 45-60 min)
                  let attempts = 0;

                  while (attempts < maxAttempts) {
                    attempts++;

                    const jobResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}`));
                    const jobData = await jobResponse.json();

                    // Fetch logs for real-time output
                    const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
                    const logsData = await logsResponse.json();
                    const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

                    if (jobData.status === 'completed') {
                      const output = currentOutput || 'Test completed successfully';
                      updateRecentOperationStatus(testId, `✅ ${testSuite.name} completed!`, output);
                      alert(`✅ ${testSuite.name} completed successfully!\n\nCheck Task Summary for full details.`);
                      return;
                    } else if (jobData.status === 'failed') {
                      const output = currentOutput || (jobData.error || jobData.message || 'Test failed');
                      updateRecentOperationStatus(testId, `❌ ${testSuite.name} failed`, output);
                      alert(`❌ ${testSuite.name} failed.\n\nCheck Task Summary for error details.`);
                      return;
                    }

                    // Still running - update with current logs every 5 seconds
                    if (attempts % 5 === 0 && currentOutput) {
                      updateRecentOperationStatus(testId, `⏳ ${testSuite.name} running...`, currentOutput);
                    }

                    // Wait and poll again
                    await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every 1 second
                  }

                  throw new Error('Test timed out after 1 hour');
                };

                // Start polling in background
                pollTestJob().catch(error => {
                  console.error('Test polling error:', error);
                  updateRecentOperationStatus(testId, '❌ Test error', extractSafeErrorMessage(error));
                });

                // Show immediate feedback
                updateRecentOperationStatus(
                  testId,
                  '⏳ Test running...',
                  `Test suite started successfully!\nJob ID: ${jobId}\n\nMonitoring progress...`
                );
              } catch (error) {
                console.error('Test execution error:', error);
                alert(`❌ Failed to start test:\n\n${error.message}\n\nYou can run manually:\nansible-playbook ${playbookFile}`);
              }
            }}
          />
        );

      case 'test-automation':
        return <TestSuiteSection />;

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
          <ActiveEnvironmentBanner
            key={credentialsRefreshKey}
            verificationTimestamp={mceLastVerified}
          />

          {/* Main Content */}
          {renderMainContent()}
        </div>
      </div>

      {/* Modals */}
      <YamlEditorModal
        isOpen={showYamlEditorModal}
        onClose={() => setShowYamlEditorModal(false)}
        yamlData={yamlEditorData}
        readOnly={false}
        onProvision={async (editedYaml) => {
          // Close the modal first
          setShowYamlEditorModal(false);

          // Get the original config from yamlEditorData
          const config = yamlEditorData?.config;
          if (!config) {
            alert('Configuration data not found');
            return;
          }

          const provisionId = `provision-rosa-${Date.now()}`;

          try {
            setIsProvisioning(true);

            // Immediately show "Starting..." state to avoid blank form flash
            setProvisionResults({
              success: true,
              timestamp: new Date().toISOString(),
              output: `🚀 Starting provisioning for ${config.clusterName}...\n\nInitializing ROSA HCP cluster provisioning...\nCluster: ${config.clusterName}\nVersion: ${config.openShiftVersion}\nRegion: ${config.awsRegion}\n\nConnecting to backend...`,
            });

            addToRecent({
              id: provisionId,
              title: `🚀 Provision ROSA HCP: ${config.clusterName}`,
              color: 'bg-green-600',
              status: '🚀 Starting provisioning...',
              environment: 'mce',
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
                yaml_override: editedYaml, // Use edited YAML if user modified it
              }),
            });

            const result = await response.json();
            console.log('📊 Provision API response:', result);

            if (!result.success || !result.job_id) {
              throw new Error(result.message || 'Failed to start provisioning');
            }

            const jobId = result.job_id;
            console.log(`🔍 Polling job status for job_id: ${jobId}`);

            // Poll for job completion
            const pollJobStatus = async () => {
              const maxAttempts = 1800; // 1800 attempts = 30 minutes max
              let attempts = 0;

              while (attempts < maxAttempts) {
                attempts++;
                console.log(`📡 Polling attempt ${attempts}/${maxAttempts}`);

                const jobResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}`));
                const jobData = await jobResponse.json();
                console.log(`📋 Job status:`, jobData);

                // Fetch logs regardless of status to show real-time output
                const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
                const logsData = await logsResponse.json();
                const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

                if (jobData.status === 'completed') {
                  // Success - update with final logs
                  const output = currentOutput || 'Provisioning completed successfully';

                  updateRecentOperationStatus(provisionId, '✅ ROSA HCP cluster provisioned successfully!', output);
                  const successResults = {
                    success: true,
                    timestamp: new Date().toISOString(),
                    output,
                  };
                  console.log('✅ Setting provision results (success):', successResults);
                  setProvisionResults(successResults);
                  setIsProvisioning(false);
                  await refreshAllStatus();
                  return;
                } else if (jobData.status === 'failed') {
                  // Failure - update with error logs
                  const output = currentOutput || (jobData.error || jobData.message || 'Provisioning failed');

                  updateRecentOperationStatus(provisionId, '❌ Provisioning failed', output);
                  const failureResults = {
                    success: false,
                    timestamp: new Date().toISOString(),
                    output,
                  };
                  console.log('❌ Setting provision results (failure):', failureResults);
                  setProvisionResults(failureResults);
                  setIsProvisioning(false);
                  return;
                }

                // Still running - update with current logs every 5 seconds
                if (attempts % 5 === 0 && currentOutput) {
                  updateRecentOperationStatus(provisionId, '🚀 Provisioning...', currentOutput);
                  // Also update the inline display
                  setProvisionResults({
                    success: true,
                    timestamp: new Date().toISOString(),
                    output: currentOutput,
                  });
                }

                // Wait and poll again
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
              }

              // Timeout
              throw new Error('Provisioning timed out after 30 minutes');
            };

            await pollJobStatus();

          } catch (error) {
            console.error('Provisioning error:', error);
            const errorMsg = extractSafeErrorMessage(error);
            updateRecentOperationStatus(provisionId, '❌ Provisioning error', errorMsg);
            setProvisionResults({
              success: false,
              timestamp: new Date().toISOString(),
              output: errorMsg,
            });
          } finally {
            setIsProvisioning(false);
          }
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
          // Force ActiveEnvironmentBanner to re-fetch credentials
          setCredentialsRefreshKey(prev => prev + 1);
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
