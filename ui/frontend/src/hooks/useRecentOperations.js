import { useState, useCallback, useEffect } from 'react';

// Custom hook for managing recent operations
export const useRecentOperations = () => {
  const [recentOperations, setRecentOperations] = useState([]);
  const [recentOperationsCollapsed, setRecentOperationsCollapsed] = useState(false);
  const [recentOperationsOutputCollapsed, setRecentOperationsOutputCollapsed] = useState(false);
  const [loadingStates, setLoadingStates] = useState(new Set());

  // Load recent operations from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentOperations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentOperations(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load recent operations from localStorage:', error);
    }
  }, []);

  // Save to localStorage whenever operations change
  useEffect(() => {
    try {
      localStorage.setItem('recentOperations', JSON.stringify(recentOperations));
    } catch (error) {
      console.error('Failed to save recent operations to localStorage:', error);
    }
  }, [recentOperations]);

  // Add operation to recent list
  const addToRecent = useCallback((operation) => {
    console.log('📝 Adding to recent operations:', operation);
    
    const newOperation = {
      ...operation,
      timestamp: operation.timestamp || new Date().toISOString(),
      id: operation.id || `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: operation.status || '⏳ Starting...'
    };

    setRecentOperations(prev => {
      // Remove existing operation with same ID if it exists
      const filtered = prev.filter(op => op.id !== newOperation.id);
      // Add to beginning of array
      const updated = [newOperation, ...filtered];
      // Keep only last 50 operations
      return updated.slice(0, 50);
    });
  }, []);

  // Update operation status
  const updateRecentOperationStatus = useCallback((operationId, newStatus) => {
    console.log(`📝 Updating operation ${operationId} status:`, newStatus);
    
    setRecentOperations(prev => prev.map(op => 
      op.id === operationId 
        ? { 
            ...op, 
            status: newStatus,
            completedAt: new Date().toISOString()
          }
        : op
    ));
  }, []);

  // Remove operation
  const removeRecentOperation = useCallback((operationId) => {
    console.log(`🗑️ Removing operation:`, operationId);
    setRecentOperations(prev => prev.filter(op => op.id !== operationId));
  }, []);

  // Clear all operations
  const clearRecentOperations = useCallback(() => {
    console.log('🗑️ Clearing all recent operations');
    setRecentOperations([]);
    localStorage.removeItem('recentOperations');
  }, []);

  // Loading state management
  const setOperationLoading = useCallback((operationId, isLoading) => {
    setLoadingStates(prev => {
      const newSet = new Set(prev);
      if (isLoading) {
        newSet.add(operationId);
      } else {
        newSet.delete(operationId);
      }
      return newSet;
    });
  }, []);

  const isOperationLoading = useCallback((operationId) => {
    return loadingStates.has(operationId);
  }, [loadingStates]);

  // Get operations by environment
  const getOperationsByEnvironment = useCallback((environment) => {
    return recentOperations.filter(op => 
      op.environment === environment || 
      (!op.environment && environment === 'all')
    );
  }, [recentOperations]);

  // Get recent operations with time grouping
  const getGroupedOperations = useCallback(() => {
    const now = new Date();
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    recentOperations.forEach(op => {
      const opDate = new Date(op.timestamp);
      const diffDays = Math.floor((now - opDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        groups.today.push(op);
      } else if (diffDays === 1) {
        groups.yesterday.push(op);
      } else if (diffDays <= 7) {
        groups.thisWeek.push(op);
      } else {
        groups.older.push(op);
      }
    });

    return groups;
  }, [recentOperations]);

  return {
    // State
    recentOperations,
    recentOperationsCollapsed,
    recentOperationsOutputCollapsed,
    loadingStates,

    // Actions
    addToRecent,
    updateRecentOperationStatus,
    removeRecentOperation,
    clearRecentOperations,
    setOperationLoading,
    isOperationLoading,
    getOperationsByEnvironment,
    getGroupedOperations,

    // Setters
    setRecentOperations,
    setRecentOperationsCollapsed,
    setRecentOperationsOutputCollapsed,
    setLoadingStates
  };
};

export default useRecentOperations;