import React from 'react';
import PropTypes from 'prop-types';
import { themes, buttonStyles } from '../../styles/themes';

const ComponentStatusCard = ({
  theme = 'mce',
  title,
  status,
  lastVerified,
  components = [],
  actions = [],
  className = '',
  customHeaderContent,
}) => {
  const themeConfig = themes[theme];

  const getStatusStyle = (status) => {
    if (
      status?.includes('Running') ||
      status?.includes('Enabled') ||
      status?.includes('Connected')
    ) {
      return 'text-green-600 bg-green-50 border-green-200';
    }
    if (status?.includes('Error') || status?.includes('Failed')) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    if (status?.includes('Warning') || status?.includes('Pending')) {
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  return (
    <div
      className={`bg-white rounded-lg border-2 ${themeConfig.colors.border} p-6 shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 mr-4 space-y-2">
          <h4
            className={`text-base font-semibold ${themeConfig.colors.text.primary} flex items-center`}
          >
            <span className={`h-5 w-5 ${themeConfig.colors.text.secondary} mr-2`}>🔧</span>
            {title}
          </h4>

          {/* Last Verified under title */}
          {lastVerified && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">Last Verified:</span> {lastVerified}
            </div>
          )}

          {/* Status Badge under last verified */}
          {status && (
            <div
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusStyle(status)} border`}
            >
              <div className="w-2 h-2 rounded-full bg-current mr-2 opacity-80"></div>
              {status}
            </div>
          )}

          {/* CAPI/CAPA Status */}
          <div className="flex items-center text-sm">
            <span className="font-medium text-gray-600 mr-2">CAPI/CAPA:</span>
            <div className="flex items-center">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span className="text-green-600">Enabled</span>
            </div>
          </div>

          {/* Custom Header Content (for method selector, etc.) */}
          {customHeaderContent && customHeaderContent}
        </div>

        {/* Action Buttons */}
        {actions.length > 0 && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            {actions.map((action, index) => {
              const isPrimary = action.variant === 'primary' || index === 0;
              const buttonStyle = isPrimary ? buttonStyles.primary : buttonStyles.secondary;
              const colorClasses = isPrimary
                ? `${themeConfig.colors.button.primary} text-white`
                : `${themeConfig.colors.button.secondary}`;

              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`${buttonStyle} ${colorClasses} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                  disabled={action.disabled}
                >
                  {action.icon && <span className="mr-1.5 text-sm">{action.icon}</span>}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Components Status Sections */}
      <div className="space-y-4">
        {/* All CAPI Components Status */}
        <div>
          <h6
            className={`font-medium ${theme === 'minikube' ? 'text-purple-900' : 'text-cyan-900'} mb-2`}
          >
            All CAPI Components Status
          </h6>
          <div className="space-y-2">
            {components.slice(0, 4).map((component, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {component.name.toLowerCase().replace(/\s+/g, '-')}
                  </span>
                  {component.version && (
                    <span className="text-xs text-gray-500 font-mono">{component.version}</span>
                  )}
                </div>
                <span className={component.enabled ? 'text-green-600' : 'text-red-600'}>
                  {component.enabled ? '✓' : '✕'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hypershift Components Status */}
        {components.length > 4 && (
          <div>
            <h6
              className={`font-medium ${theme === 'minikube' ? 'text-purple-900' : 'text-cyan-900'} mb-2`}
            >
              Hypershift Components Status
            </h6>
            <div className="space-y-1">
              {components.slice(4).map((component, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>{component.name.toLowerCase().replace(/\s+/g, '-')}</span>
                  <span className={component.enabled ? 'text-green-600' : 'text-red-600'}>
                    {component.enabled ? '✓' : '✕'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {components.length === 0 && (
          <div className="text-center py-4 text-gray-500">No components found</div>
        )}
      </div>
    </div>
  );
};

ComponentStatusCard.propTypes = {
  theme: PropTypes.string,
  title: PropTypes.string.isRequired,
  status: PropTypes.string,
  lastVerified: PropTypes.string,
  components: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      enabled: PropTypes.bool,
      version: PropTypes.string,
    })
  ),
  actions: PropTypes.array,
  className: PropTypes.string,
  customHeaderContent: PropTypes.node,
};

export default ComponentStatusCard;
