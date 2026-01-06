import React from 'react';
import PropTypes from 'prop-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3BottomLeftIcon } from '@heroicons/react/24/outline';
import { useApp } from '../../store/AppContext';

const DraggableSection = ({ id, children }) => {
  const app = useApp();
  const theme = app.selectedEnvironment || 'mce';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    transformOrigin: 'top left',
  };

  // Determine drag handle classes based on theme
  const getDragHandleClasses = () => {
    if (theme === 'minikube') {
      if (isDragging) {
        return 'bg-gradient-to-br from-purple-600 to-violet-600 shadow-lg scale-110';
      }
      return 'bg-gray-300 hover:bg-gradient-to-br hover:from-purple-500 hover:to-violet-500 hover:shadow-md group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-violet-500';
    }
    // MCE theme
    if (isDragging) {
      return 'bg-gradient-to-br from-cyan-600 to-blue-600 shadow-lg scale-110';
    }
    return 'bg-gray-300 hover:bg-gradient-to-br hover:from-cyan-500 hover:to-blue-500 hover:shadow-md group-hover:bg-gradient-to-br group-hover:from-cyan-500 group-hover:to-blue-500';
  };

  const getOverlayClasses = () => {
    if (theme === 'minikube') {
      return 'absolute inset-0 bg-gradient-to-r from-purple-400/20 to-violet-400/20 rounded-2xl pointer-events-none';
    }
    return 'absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-2xl pointer-events-none';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-all duration-300 group ml-2 ${
        isDragging
          ? 'z-50 scale-105 shadow-2xl opacity-80'
          : 'z-0 hover:-translate-y-1 hover:shadow-xl'
      }`}
    >
      {/* Drag Handle - Positioned to left of section */}
      <div className="absolute -left-10 top-0 h-full flex items-start pt-6 z-10">
        <div
          {...attributes}
          {...listeners}
          className={`cursor-grab active:cursor-grabbing p-2 rounded-xl transition-all duration-200 ${getDragHandleClasses()}`}
          title="Drag to reorder or move to storage"
        >
          <Bars3BottomLeftIcon
            className={`h-5 w-5 transition-colors duration-200 ${
              isDragging ? 'text-white' : 'text-gray-600 hover:text-white group-hover:text-white'
            }`}
          />
        </div>
      </div>

      {/* Section Content */}
      <div className={isDragging ? 'pointer-events-none' : ''}>{children}</div>

      {/* Drop Shadow Overlay When Dragging */}
      {isDragging && <div className={getOverlayClasses()} />}
    </div>
  );
};

DraggableSection.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default DraggableSection;
