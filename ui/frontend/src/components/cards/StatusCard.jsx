import React from 'react';
import { themes, cardStyles, buttonStyles, statusIndicators } from '../../styles/themes';

const StatusCard = ({ 
  theme = 'mce',
  title,
  icon,
  status,
  lastVerified,
  actions = [],
  children,
  className = ''
}) => {
  const themeConfig = themes[theme];
  
  const getStatusStyle = (status) => {
    if (status?.includes('Running') || status?.includes('Enabled') || status?.includes('Connected')) {
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
    <div className={`bg-white rounded-lg border-2 ${themeConfig.colors.border} p-6 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex flex-col space-y-3 mb-4">
        <h4 className={`text-base font-semibold ${themeConfig.colors.text.primary} flex items-center`}>
          {icon && (
            <span className={`h-5 w-5 ${themeConfig.colors.text.secondary} mr-2`}>
              {icon}
            </span>
          )}
          {title}
        </h4>
        
        {/* Action Buttons */}
        {actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`${buttonStyles.primary} ${action.variant === 'secondary' ? themeConfig.colors.button.secondary : themeConfig.colors.button.primary} text-white`}
                disabled={action.disabled}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Information */}
      {status && (
        <div className="mb-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(status)}`}>
            {status}
          </div>
          {lastVerified && (
            <div className="mt-2 text-sm text-gray-600">
              Last Verified: {lastVerified}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  );
};

export default StatusCard;