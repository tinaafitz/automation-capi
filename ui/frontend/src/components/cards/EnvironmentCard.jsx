import React from 'react';
import { themes, cardStyles } from '../../styles/themes';

const EnvironmentCard = ({ 
  theme = 'mce',
  title,
  icon,
  children,
  isCollapsed = false,
  onToggle,
  className = ''
}) => {
  const themeConfig = themes[theme];
  
  return (
    <div className={`${cardStyles.base} ${themeConfig.colors.border} ${className}`}>
      {/* Header */}
      <div 
        className={`bg-gradient-to-r ${themeConfig.primary[600]} hover:${themeConfig.primary[700]} text-white ${cardStyles.header}`}
        onClick={onToggle}
        title={isCollapsed ? `Click to expand ${title}` : `Click to collapse ${title}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon || themeConfig.icon}</span>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <div className="p-2">
          {isCollapsed ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </div>
      </div>
      
      {/* Content */}
      {!isCollapsed && (
        <div className={`bg-gradient-to-br ${themeConfig.primary[50]} ${cardStyles.content}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default EnvironmentCard;