import React from 'react';
import PropTypes from 'prop-types';
import { themes, cardStyles } from '../../styles/themes';

const EnvironmentCard = ({
  theme = 'mce',
  title,
  icon,
  children,
  isCollapsed = false,
  onToggle,
  className = '',
  titleActions = null,
}) => {
  const themeConfig = themes[theme];

  return (
    <div className={`${cardStyles.base} ${themeConfig.colors.border} ${className}`}>
      {/* Header */}
      <div
        className={`bg-gradient-to-r ${themeConfig.primary[600]} text-white ${cardStyles.header}`}
      >
        <div
          className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={onToggle}
          title={isCollapsed ? `Click to expand ${title}` : `Click to collapse ${title}`}
        >
          <span className="text-2xl">{icon || themeConfig.icon}</span>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>

        {/* Title Actions */}
        {titleActions && (
          <div className="flex items-center gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
            {titleActions}
          </div>
        )}

        <div className="p-2 cursor-pointer" onClick={onToggle}>
          {isCollapsed ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
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

EnvironmentCard.propTypes = {
  theme: PropTypes.string,
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  children: PropTypes.node,
  isCollapsed: PropTypes.bool,
  onToggle: PropTypes.func,
  className: PropTypes.string,
  titleActions: PropTypes.node,
};
