import React from 'react';
import { themes } from '../../styles/themes';

const ComponentStatusCard = ({ 
  theme = 'mce',
  title,
  components = [],
  actions = [],
  className = ''
}) => {
  const themeConfig = themes[theme];

  const getStatusIcon = (enabled) => {
    return enabled ? (
      <span className="text-green-600">✓</span>
    ) : (
      <span className="text-red-600">✕</span>
    );
  };

  const getVersionBadge = (version) => {
    if (!version) return null;
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {version}
      </span>
    );
  };

  return (
    <div className={`bg-white rounded-lg border-2 ${themeConfig.colors.border} p-6 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex flex-col space-y-3 mb-6">
        <h4 className={`text-base font-semibold ${themeConfig.colors.text.primary} flex items-center`}>
          <span className={`h-5 w-5 ${themeConfig.colors.text.secondary} mr-2`}>🔧</span>
          {title}
        </h4>
        
        {/* Action Buttons */}
        {actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                  action.variant === 'secondary' 
                    ? themeConfig.colors.button.secondary 
                    : themeConfig.colors.button.primary
                } text-white`}
                disabled={action.disabled}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Components List */}
      <div className="space-y-4">
        {components.map((component, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center space-x-3">
              {getStatusIcon(component.enabled)}
              <span className="font-medium">{component.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              {component.version && getVersionBadge(component.version)}
              {component.date && (
                <span className="text-sm text-gray-500">{component.date}</span>
              )}
            </div>
          </div>
        ))}
        
        {components.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No components found
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentStatusCard;