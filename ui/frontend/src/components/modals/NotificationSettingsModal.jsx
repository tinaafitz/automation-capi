import React, { useState, useEffect } from 'react';
import { XMarkIcon, BellIcon, CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { buildApiUrl } from '../../config/api';
import PropTypes from 'prop-types';

const NotificationSettingsModal = ({ isOpen, onClose, theme = 'mce' }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [activeTab, setActiveTab] = useState('email'); // 'slack' or 'email'

  // Theme colors
  const themeColors = theme === 'minikube' ? {
    gradient: 'from-purple-600 to-violet-600',
    hoverGradient: 'hover:from-purple-700 hover:to-violet-700'
  } : {
    gradient: 'from-cyan-600 to-blue-600',
    hoverGradient: 'hover:from-cyan-700 hover:to-blue-700'
  };

  const [settings, setSettings] = useState({
    // Slack settings
    slack_enabled: false,
    slack_webhook_url: '',
    // Email settings
    email_enabled: false,
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    to_emails: [],
    use_tls: true,
    // Common settings
    app_url: 'http://localhost:3000',
    notify_on_start: false,
    notify_on_complete: true,
    notify_on_failure: true
  });

  // Fetch current settings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setTestResult(null);
    }
  }, [isOpen]);

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert('Notification settings saved successfully!');
        onClose();
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

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(buildApiUrl('/api/notification-settings/test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.message
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Failed to test connection: ${error.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmailsChange = (emailsString) => {
    // Split by comma and trim whitespace
    const emails = emailsString.split(',').map(e => e.trim()).filter(e => e);
    handleInputChange('to_emails', emails);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`sticky top-0 bg-gradient-to-r ${themeColors.gradient} text-white p-6 rounded-t-xl flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <BellIcon className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Notification Settings</h2>
              <p className="text-cyan-100 text-sm">Configure email and Slack notifications for provisioning jobs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
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
                  <EnvelopeIcon className="h-5 w-5" />
                  Email
                </button>
                <button
                  onClick={() => setActiveTab('slack')}
                  className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
                    activeTab === 'slack'
                      ? 'border-cyan-600 text-cyan-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BellIcon className="h-5 w-5" />
                  Slack
                </button>
              </div>

              {/* Email Configuration */}
              {activeTab === 'email' && (
                <div className="space-y-6">
                  {/* Enable/Disable Email */}
                  <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-lg border border-cyan-200">
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                  </div>

                  {/* SMTP Server */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Server *
                    </label>
                    <input
                      type="text"
                      value={settings.smtp_server}
                      onChange={(e) => handleInputChange('smtp_server', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Common: smtp.gmail.com (Gmail), smtp-mail.outlook.com (Outlook), smtp.sendgrid.net (SendGrid)
                    </p>
                  </div>

                  {/* SMTP Port and TLS */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        value={settings.smtp_port}
                        onChange={(e) => handleInputChange('smtp_port', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Common: 587 (TLS), 465 (SSL)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Use TLS
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.use_tls}
                          onChange={(e) => handleInputChange('use_tls', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* SMTP Username */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Username (optional)
                    </label>
                    <input
                      type="text"
                      value={settings.smtp_username}
                      onChange={(e) => handleInputChange('smtp_username', e.target.value)}
                      placeholder="your-email@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  {/* SMTP Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Password (optional)
                    </label>
                    <input
                      type="password"
                      value={settings.smtp_password}
                      onChange={(e) => handleInputChange('smtp_password', e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      For Gmail, use an App Password instead of your regular password
                    </p>
                  </div>

                  {/* From Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Email Address *
                    </label>
                    <input
                      type="email"
                      value={settings.from_email}
                      onChange={(e) => handleInputChange('from_email', e.target.value)}
                      placeholder="noreply@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  {/* To Emails */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient Email Addresses *
                    </label>
                    <input
                      type="text"
                      value={settings.to_emails.join(', ')}
                      onChange={(e) => handleEmailsChange(e.target.value)}
                      placeholder="user1@example.com, user2@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Separate multiple email addresses with commas
                    </p>
                  </div>
                </div>
              )}

              {/* Slack Configuration */}
              {activeTab === 'slack' && (
                <div className="space-y-6">
                  {/* Enable/Disable Slack */}
                  <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-lg border border-cyan-200">
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                  </div>

                  {/* Slack Webhook URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slack Webhook URL
                    </label>
                    <input
                      type="text"
                      value={settings.slack_webhook_url}
                      onChange={(e) => handleInputChange('slack_webhook_url', e.target.value)}
                      placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Get your webhook URL from{' '}
                      <a
                        href="https://api.slack.com/messaging/webhooks"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-600 hover:underline"
                      >
                        Slack's Incoming Webhooks
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {/* App URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application URL
                </label>
                <input
                  type="text"
                  value={settings.app_url}
                  onChange={(e) => handleInputChange('app_url', e.target.value)}
                  placeholder="http://localhost:3000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This URL will be used in notification buttons and links
                </p>
              </div>

              {/* Notification Preferences */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">When to Send Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notify_on_start}
                      onChange={(e) => handleInputChange('notify_on_start', e.target.checked)}
                      className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Job Started</div>
                      <div className="text-sm text-gray-600">Send notification when provisioning job begins</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notify_on_complete}
                      onChange={(e) => handleInputChange('notify_on_complete', e.target.checked)}
                      className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Job Completed</div>
                      <div className="text-sm text-gray-600">Send notification when cluster is provisioned successfully</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notify_on_failure}
                      onChange={(e) => handleInputChange('notify_on_failure', e.target.checked)}
                      className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Job Failed</div>
                      <div className="text-sm text-gray-600">Send notification when provisioning job fails</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Test Connection */}
              {((activeTab === 'slack' && settings.slack_webhook_url) ||
                (activeTab === 'email' && settings.smtp_server)) && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Test Connection</h3>
                    <button
                      onClick={handleTest}
                      disabled={testing}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {testing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Testing...
                        </>
                      ) : (
                        <>
                          {activeTab === 'email' ? <EnvelopeIcon className="h-4 w-4" /> : <BellIcon className="h-4 w-4" />}
                          Send Test Message
                        </>
                      )}
                    </button>
                  </div>
                  {testResult && (
                    <div className={`mt-3 p-4 rounded-lg border ${
                      testResult.success
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <div className="flex items-start gap-2">
                        {testResult.success ? (
                          <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XMarkIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">{testResult.success ? 'Success!' : 'Failed'}</p>
                          <p className="text-sm">{testResult.message}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2 bg-gradient-to-r ${themeColors.gradient} text-white rounded-lg ${themeColors.hoverGradient} disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

NotificationSettingsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  theme: PropTypes.oneOf(['mce', 'minikube'])
};

export default NotificationSettingsModal;
