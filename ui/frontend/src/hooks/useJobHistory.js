import { useState, useCallback, useEffect, useRef } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

// Shared state across all hook instances (singleton pattern)
let sharedJobHistory = [];
let sharedLoading = false;
let sharedError = null;
let lastFetchTime = 0;
const subscribers = new Set();
let pollingInterval = null;

const FETCH_TIMEOUT = 10000; // 10 seconds timeout

// Fetch function that updates all subscribers
const fetchJobHistoryShared = async () => {
  const now = Date.now();

  // Check if previous fetch is stale (timeout exceeded)
  if (sharedLoading && (now - lastFetchTime) < FETCH_TIMEOUT) {
    console.log('⏭️ [useJobHistory] Skipping fetch - already in progress');
    return;
  }

  // Reset stale fetch
  if (sharedLoading && (now - lastFetchTime) >= FETCH_TIMEOUT) {
    console.warn('⚠️ [useJobHistory] Previous fetch timed out, resetting...');
    sharedLoading = false;
  }

  try {
    const url = buildApiUrl(API_ENDPOINTS.JOBS_HISTORY);
    console.log('🔄 [useJobHistory] Fetching job history from API...', url);
    sharedLoading = true;
    lastFetchTime = now;
    sharedError = null;

    // Notify all subscribers loading started
    subscribers.forEach(cb => cb({ loading: true, error: null }));

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('📥 [useJobHistory] Response status:', response.status, 'URL:', url);

    if (!response.ok) {
      console.error('❌ [useJobHistory] Response not OK:', response.status, response.statusText);
      throw new Error(`Failed to fetch job history: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📋 [useJobHistory] Fetched data:', data);
    console.log('📋 [useJobHistory] Jobs count:', data.jobs?.length || 0);

    if (data.success) {
      sharedJobHistory = data.jobs || [];
      sharedLoading = false;

      // Notify all subscribers with new data
      subscribers.forEach(cb => cb({
        jobHistory: sharedJobHistory,
        loading: false,
        error: null
      }));
    } else {
      throw new Error(data.error || 'Failed to fetch job history');
    }
  } catch (error) {
    console.error('❌ [useJobHistory] Failed to fetch job history:', error);
    console.error('❌ [useJobHistory] Error details:', error.message, error.stack);
    sharedError = error.message;
    sharedLoading = false;

    // Notify all subscribers of error
    subscribers.forEach(cb => cb({
      loading: false,
      error: sharedError
    }));
  }
};

// Start polling (only once for all instances)
const startPolling = () => {
  if (!pollingInterval) {
    console.log('🔁 [useJobHistory] Starting shared polling interval');
    pollingInterval = setInterval(fetchJobHistoryShared, 5000);
  }
};

// Stop polling when no more subscribers
const stopPolling = () => {
  if (pollingInterval && subscribers.size === 0) {
    console.log('⏸️ [useJobHistory] Stopping shared polling interval');
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

// Custom hook for managing job/task execution history from API
export const useJobHistory = () => {
  const [jobHistory, setJobHistory] = useState(sharedJobHistory);
  const [jobHistoryCollapsed, setJobHistoryCollapsed] = useState(false);
  const [jobHistoryOutputCollapsed, setJobHistoryOutputCollapsed] = useState(false);
  const [loading, setLoading] = useState(sharedLoading);
  const [error, setError] = useState(sharedError);

  // Use ref to avoid recreating callback on every render
  const subscriberRef = useRef(null);

  // Load job history on mount and subscribe to updates
  useEffect(() => {
    // Create subscriber callback
    subscriberRef.current = (update) => {
      if ('jobHistory' in update) setJobHistory(update.jobHistory);
      if ('loading' in update) setLoading(update.loading);
      if ('error' in update) setError(update.error);
    };

    // Add to subscribers
    subscribers.add(subscriberRef.current);
    console.log('📡 [useJobHistory] Component subscribed, total subscribers:', subscribers.size);

    // Initial fetch
    fetchJobHistoryShared();

    // Start shared polling
    startPolling();

    // Cleanup on unmount
    return () => {
      subscribers.delete(subscriberRef.current);
      console.log('📴 [useJobHistory] Component unsubscribed, remaining subscribers:', subscribers.size);
      stopPolling();
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Manual fetch function
  const fetchJobHistory = useCallback(() => {
    fetchJobHistoryShared();
  }, []);

  // Get jobs by environment/type
  const getJobsByEnvironment = useCallback((environment) => {
    return jobHistory.filter(job => {
      // Match based on task_file or description containing environment keywords
      const taskFile = job.task_file || '';
      const description = job.description || '';
      
      if (environment === 'mce') {
        return taskFile.includes('validate-capa-environment') || 
               taskFile.includes('validate-mce') ||
               description.toLowerCase().includes('mce') ||
               description.toLowerCase().includes('capi') ||
               description.toLowerCase().includes('capa') ||
               description.toLowerCase().includes('rosa provisioning');
      } else if (environment === 'minikube') {
        return taskFile.includes('minikube') || 
               description.toLowerCase().includes('minikube');
      } else if (environment === 'all') {
        return true;
      }
      
      return false;
    });
  }, [jobHistory]);

  // Get jobs with time grouping
  const getGroupedJobs = useCallback(() => {
    const now = new Date();
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    jobHistory.forEach(job => {
      const jobDate = new Date(job.created_at);
      const diffDays = Math.floor((now - jobDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        groups.today.push(job);
      } else if (diffDays === 1) {
        groups.yesterday.push(job);
      } else if (diffDays <= 7) {
        groups.thisWeek.push(job);
      } else {
        groups.older.push(job);
      }
    });

    return groups;
  }, [jobHistory]);

  return {
    // State
    jobHistory,
    jobHistoryCollapsed,
    jobHistoryOutputCollapsed,
    loading,
    error,

    // Actions
    fetchJobHistory,
    getJobsByEnvironment,
    getGroupedJobs,

    // Setters
    setJobHistoryCollapsed,
    setJobHistoryOutputCollapsed,
  };
};

export default useJobHistory;