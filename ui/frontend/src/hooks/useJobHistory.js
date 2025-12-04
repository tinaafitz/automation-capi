import { useState, useCallback, useEffect } from 'react';

// Custom hook for managing job/task execution history from API
export const useJobHistory = () => {
  const [jobHistory, setJobHistory] = useState([]);
  const [jobHistoryCollapsed, setJobHistoryCollapsed] = useState(false);
  const [jobHistoryOutputCollapsed, setJobHistoryOutputCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch job history from API
  const fetchJobHistory = useCallback(async () => {
    try {
      console.log('🔄 [useJobHistory] Fetching job history from API...');
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:8000/api/jobs');
      console.log('📥 [useJobHistory] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch job history: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📋 [useJobHistory] Fetched jobs:', data.jobs?.length || 0, 'jobs');

      if (data.success) {
        setJobHistory(data.jobs || []);
      } else {
        throw new Error(data.error || 'Failed to fetch job history');
      }
    } catch (error) {
      console.error('❌ [useJobHistory] Failed to fetch job history:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load job history on mount
  useEffect(() => {
    fetchJobHistory();

    // Set up polling to refresh job history every 5 seconds (more responsive)
    const interval = setInterval(fetchJobHistory, 5000);

    return () => clearInterval(interval);
  }, [fetchJobHistory]);

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