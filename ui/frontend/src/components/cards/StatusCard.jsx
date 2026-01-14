import React from 'react';
import { themes, buttonStyles, statusIndicators } from '../../styles/themes';
import PropTypes from 'prop-types';

const StatusCard = ({
  theme = 'mce',
  title,
  icon,
  status,
  verificationStatus,
  lastVerified,
  actions = [],
  children,
  className = '',
}) => {
  const themeConfig = themes[theme];

  const getStatusStyle = (status) => {
    if (
      status?.includes('Running') ||
      status?.includes('Enabled') ||
      status?.includes('Connected')
    ) {
      return statusIndicators.success;
    }
    if (status?.includes('Error') || status?.includes('Failed')) {
      return statusIndicators.error;
    }
    if (status?.includes('Warning') || status?.includes('Pending')) {
      return statusIndicators.warning;
    }
    return statusIndicators.info;
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
            {icon && (
              <span className={`h-5 w-5 ${themeConfig.colors.text.secondary} mr-2`}>{icon}</span>
            )}
            {title}
          </h4>

          {/* Status Badges */}
          <div className="flex flex-col gap-1.5">
            {status && (
              <div
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getStatusStyle(status)} border w-fit`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80"></div>
                {status}
              </div>
            )}
            {verificationStatus && (
              <div
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getStatusStyle(verificationStatus)} border w-fit gap-2`}
              >
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80"></div>
                  {verificationStatus}
                </div>
                {lastVerified && <span className="text-gray-500">{lastVerified}</span>}
              </div>
            )}
          </div>
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
                  className={`group ${buttonStyle} ${colorClasses} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-95`}
                  disabled={action.disabled}
                >
                  <div className="flex items-center justify-center gap-2">
                    {action.icon && (
                      <span className="group-hover:scale-110 transition-transform duration-200">
                        {action.icon}
                      </span>
                    )}
                    <span>{action.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
};

StatusCard.propTypes = {
  theme: PropTypes.string,
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  status: PropTypes.string,
  verificationStatus: PropTypes.string,
  lastVerified: PropTypes.string,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      icon: PropTypes.node,
      variant: PropTypes.string,
      disabled: PropTypes.bool,
    })
  ),
  children: PropTypes.node,
  className: PropTypes.string,
};

export default StatusCard;
