import React from 'react';
import PropTypes from 'prop-types';
import {
  ArchiveBoxIcon,
  XMarkIcon,
  PlusIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import { useDroppable } from '@dnd-kit/core';

const FilingCabinet = ({
  hiddenSections = [],
  onRestoreSection,
  onClearAll,
  theme = 'mce',
  isExpanded,
  onToggle,
  onClose,
  isMinimized,
  onMinimize
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'filing-cabinet-dropzone',
  });

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'minikube':
        return {
          gradient: 'from-purple-600 to-violet-600',
          hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
          border: 'border-purple-300',
          bg: 'bg-purple-600',
          hoverBg: 'hover:bg-purple-700',
          lightBg: 'bg-purple-50',
          text: 'text-purple-600',
        };
      case 'mce':
      default:
        return {
          gradient: 'from-cyan-600 to-blue-600',
          hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
          border: 'border-cyan-300',
          bg: 'bg-cyan-600',
          hoverBg: 'hover:bg-cyan-700',
          lightBg: 'bg-cyan-50',
          text: 'text-cyan-600',
        };
    }
  };

  const colors = getThemeColors();

  // Section metadata for display
  const sectionMetadata = {
    'mce-configuration': { name: 'Configuration', icon: '⚙️' },
    'rosa-hcp-clusters': { name: 'ROSA HCP Clusters', icon: '☁️' },
    'mce-terminal': { name: 'Terminal', icon: '💻' },
    'task-summary': { name: 'Task Summary', icon: '📋' },
    'test-suite-dashboard': { name: 'Test Suite Dashboard', icon: '🧪' },
    'test-suite-runner': { name: 'Test Automation', icon: '🔬' },
    'task-detail': { name: 'Task Detail', icon: '📄' },
    'minikube-environment': { name: 'Minikube Environment', icon: '⚡' },
    'minikube-terminal': { name: 'Minikube Terminal', icon: '💻' },
    'helm-chart-tests': { name: 'Helm Chart Tests', icon: '📦' },
  };

  return (
    <>
      {/* Minimized Tab - Small button on right edge */}
      {isMinimized && (
        <div
          onClick={onMinimize}
          className={`rounded-l-xl overflow-hidden cursor-pointer shadow-xl border-2 ${colors.border} ${colors.lightBg} hover:shadow-2xl transition-all duration-300 hover:scale-105`}
        >
          <div className={`bg-gradient-to-br ${colors.gradient} p-2`}>
            <div className="flex flex-col items-center gap-1">
              <ArchiveBoxIcon className="h-5 w-5 text-white" />
              {hiddenSections.length > 0 && (
                <div className="bg-white/30 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                  <span className="text-white text-xs font-bold">{hiddenSections.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filing Cabinet - Right Sidebar - Always visible */}
      {!isExpanded && !isMinimized && (
        <div
          onClick={hiddenSections.length > 0 ? onToggle : undefined}
          className={`rounded-xl overflow-hidden ${hiddenSections.length > 0 ? 'cursor-pointer shadow-xl border-2' : 'shadow-md border'} transition-all duration-300 ${
            isOver
              ? `${colors.border} border-4 shadow-2xl scale-105 bg-gradient-to-br from-yellow-50 to-orange-100`
              : hiddenSections.length > 0
                ? `${colors.border} hover:shadow-2xl bg-gradient-to-br ${colors.lightBg}`
                : 'border-gray-200 bg-white hover:shadow-lg'
          }`}
        >
          {/* Drop zone wrapper - always rendered for ref */}
          <div ref={setNodeRef} className="w-full h-full">
          {/* Simple header when empty, full header when has sections */}
          {hiddenSections.length > 0 ? (
            <div className={`bg-gradient-to-br ${colors.gradient} p-3 group`}>
              <div className="flex items-center gap-2">
                <div className="bg-white/30 rounded-lg p-1.5 backdrop-blur-sm">
                  <ArchiveBoxIcon className="h-5 w-5 text-white drop-shadow-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white drop-shadow-md truncate">Storage</h3>
                  <p className="text-[10px] text-white/90 font-medium">
                    {hiddenSections.length} widget{hiddenSections.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-white/30 backdrop-blur-sm rounded-full px-2 py-0.5">
                  <span className="text-white text-xs font-bold">{hiddenSections.length}</span>
                </div>
                {onMinimize && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMinimize();
                    }}
                    className="p-1 bg-white/20 backdrop-blur-sm rounded hover:bg-white/30 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title="Minimize widget"
                  >
                    <XMarkIcon className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={`p-2 bg-gradient-to-br ${colors.gradient} group`}>
              <div className="flex items-center gap-2">
                <ArchiveBoxIcon className="h-4 w-4 text-white" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">Storage</p>
                </div>
                {onMinimize && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMinimize();
                    }}
                    className="p-0.5 bg-white/20 backdrop-blur-sm rounded hover:bg-white/30 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title="Minimize widget"
                  >
                    <XMarkIcon className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Drop Zone Area / Drawers - Always rendered for drop functionality */}
          <div className={`transition-all duration-300 ${
            isOver ? 'p-3 bg-gradient-to-br from-yellow-100 to-orange-100' : hiddenSections.length > 0 ? 'p-3 bg-white' : ''
          }`}>
              {/* Drop Zone When Dragging */}
              {isOver && (
                <div className="border-2 border-dashed border-orange-400 bg-white shadow-lg scale-105 rounded-xl p-4 transition-all duration-300">
                  <div className="text-center">
                    <ArchiveBoxIcon className="h-10 w-10 mx-auto mb-2 text-orange-500 animate-bounce" />
                    <p className="text-sm font-bold text-orange-600 mb-1">Drop Here</p>
                    <p className="text-xs text-orange-500">Hide section</p>
                  </div>
                </div>
              )}

              {/* Drawers for Each Section */}
              {hiddenSections.length > 0 && !isOver && (
                <div className="space-y-1.5">
                  {hiddenSections.map((sectionId, index) => {
                    const metadata = sectionMetadata[sectionId] || { name: sectionId, icon: '📦' };
                    // Alternate drawer colors for visual interest
                    const drawerGradient = index % 2 === 0
                      ? `${colors.gradient}`
                      : 'from-indigo-500 to-purple-600';

                    return (
                      <div
                        key={sectionId}
                        className={`bg-gradient-to-r ${drawerGradient} rounded-lg shadow-md border border-white/20 p-2 hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreSection(sectionId);
                        }}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          {/* Drawer Handle & Label */}
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {/* Handle */}
                            <div className="bg-white/30 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm">
                              <div className="h-0.5 w-5 bg-white/70"></div>
                            </div>

                            {/* Section Info */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="text-base flex-shrink-0">{metadata.icon}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold text-white truncate drop-shadow-md leading-tight">{metadata.name}</p>
                              </div>
                            </div>
                          </div>

                          {/* Restore Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestoreSection(sectionId);
                            }}
                            className="p-1 bg-white/20 backdrop-blur-sm text-white rounded hover:bg-white/30 transition-all duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0"
                          >
                            <ArrowUturnLeftIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
          </div>
        </div>
      )}

      {/* Expanded Drawer */}
      {isExpanded && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
            onClick={onToggle}
          />

          {/* Drawer */}
          <div
            ref={setNodeRef}
            className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
              isExpanded ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Drawer Header */}
            <div className={`bg-gradient-to-r ${colors.gradient} p-6 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <ArchiveBoxIcon className="h-8 w-8 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">Widget Storage</h3>
                  <p className="text-sm text-white/80">
                    {hiddenSections.length} section{hiddenSections.length !== 1 ? 's' : ''} stored
                  </p>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>

            {/* Drop Zone Indicator */}
            {isOver && (
              <div className={`mx-6 mt-4 p-4 border-2 border-dashed ${colors.border} ${colors.lightBg} rounded-lg animate-pulse`}>
                <div className="text-center">
                  <ArchiveBoxIcon className={`h-8 w-8 mx-auto mb-2 ${colors.text}`} />
                  <p className={`text-sm font-medium ${colors.text}`}>Drop here to store section</p>
                </div>
              </div>
            )}

            {/* Stored Sections */}
            <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
              {hiddenSections.length === 0 ? (
                <div className="text-center py-12">
                  <ArchiveBoxIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No sections stored</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Drag sections here to hide them from the main view
                  </p>
                </div>
              ) : (
                <>
                  {hiddenSections.map((sectionId) => {
                    const metadata = sectionMetadata[sectionId] || { name: sectionId, icon: '📦' };
                    return (
                      <div
                        key={sectionId}
                        className={`border-2 ${colors.border} rounded-xl p-4 ${colors.lightBg} hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{metadata.icon}</div>
                            <div>
                              <h4 className="font-bold text-gray-900">{metadata.name}</h4>
                              <p className="text-xs text-gray-500">Hidden from view</p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onRestoreSection(sectionId)}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-2 ${colors.bg} text-white rounded-lg ${colors.hoverBg} transition-all duration-200 font-medium text-sm`}
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" />
                          Restore to View
                        </button>
                      </div>
                    );
                  })}

                  {/* Clear All Button */}
                  {hiddenSections.length > 1 && (
                    <button
                      onClick={onClearAll}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm mt-6"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Restore All Sections
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

FilingCabinet.propTypes = {
  hiddenSections: PropTypes.arrayOf(PropTypes.string),
  onRestoreSection: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  theme: PropTypes.oneOf(['mce', 'minikube']),
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func,
  isMinimized: PropTypes.bool,
  onMinimize: PropTypes.func,
};

export default FilingCabinet;
