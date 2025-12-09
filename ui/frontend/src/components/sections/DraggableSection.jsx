import React from 'react';
import PropTypes from 'prop-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3BottomLeftIcon } from '@heroicons/react/24/outline';

const DraggableSection = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    transformOrigin: 'top left',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-all duration-200 ${
        isDragging ? 'z-50 scale-105 shadow-2xl opacity-80' : 'z-0'
      }`}
    >
      {/* Drag Handle - Always visible on left side of section */}
      <div className="absolute -left-7 top-0 h-full flex items-start pt-4 z-10">
        <div
          {...attributes}
          {...listeners}
          className={`cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-all duration-200 ${
            isDragging
              ? 'bg-gradient-to-br from-cyan-600 to-blue-600 shadow-lg scale-110'
              : 'bg-gray-300 hover:bg-gradient-to-br hover:from-cyan-500 hover:to-blue-500 hover:shadow-md'
          }`}
          title="Drag to reorder or move to storage"
        >
          <Bars3BottomLeftIcon
            className={`h-4 w-4 transition-colors duration-200 ${
              isDragging ? 'text-white' : 'text-gray-600 hover:text-white'
            }`}
          />
        </div>
      </div>

      {/* Section Content */}
      <div className={isDragging ? 'pointer-events-none' : ''}>
        {children}
      </div>

      {/* Drop Shadow Overlay When Dragging */}
      {isDragging && (
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-xl pointer-events-none" />
      )}
    </div>
  );
};

DraggableSection.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default DraggableSection;
