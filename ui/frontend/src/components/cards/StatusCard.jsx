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
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 mr-4 space-y-2">
          <h4 className={`text-base font-semibold ${themeConfig.colors.text.primary} flex items-center`}>
            {icon && (
              <span className={`h-5 w-5 ${themeConfig.colors.text.secondary} mr-2`}>
                {icon}
              </span>
            )}
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
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getStatusStyle(status)} border`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80"></div>
              {status}
            </div>
          )}
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

      {/* Content */}
      {children}
    </div>
  );
};

export default StatusCard;