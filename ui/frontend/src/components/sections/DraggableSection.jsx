import React from 'react';
import PropTypes from 'prop-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon } from '@heroicons/react/24/outline';

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
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag Handle - Positioned absolutely at top-left */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-4 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        title="Drag to reorder"
      >
        <div className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2 shadow-lg">
          <Bars3Icon className="h-5 w-5 text-gray-300" />
        </div>
      </div>

      {/* Section Content */}
      <div className={isDragging ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
};

DraggableSection.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default DraggableSection;
