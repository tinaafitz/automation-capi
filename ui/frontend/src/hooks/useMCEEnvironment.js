import { useState, useEffect, useCallback } from 'react';

// Custom hook for MCE environment management
export const useMCEEnvironment = () => {
  const [mceInfo, setMceInfo] = useState(null);
  const [mceFeatures, setMceFeatures] = useState([]);
  const [mceActiveResources, setMceActiveResources] = useState([]);
  const [mceLastVerified, setMceLastVerified] = useState(null);
  const [mceLoading, setMceLoading] = useState(false);
  const [mceResourcesLoading, setMceResourcesLoading] = useState(false);
  
  // Sorting states
  const [mceSortField, setMceSortField] = useState('type');
  const [mceSortDirection, setMceSortDirection] = useState('asc');
  const [mceComponentSortField, setMceComponentSortField] = useState('component');
  const [mceComponentSortDirection, setMceComponentSortDirection] = useState('asc');
  
  // Collapse states
  const [mceConfigurationCollapsed, setMceConfigurationCollapsed] = useState(false);
  const [mceRecentOpsCollapsed, setMceRecentOpsCollapsed] = useState(false);

  // Fetch MCE active resources
  const fetchMceActiveResources = useCallback(async () => {
    if (!mceInfo?.name) {
      console.log('❌ No MCE info available for active resources fetch');
      return;
    }

    setMceResourcesLoading(true);
    console.log(`🔄 Fetching MCE active resources for: ${mceInfo.name}`);

    try {
      const timestamp = Date.now();
      const response = await fetch(
        `http://localhost:8000/api/mce/active-resources?t=${timestamp}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ MCE active resources fetched:', data);
      
      if (data.resources && Array.isArray(data.resources)) {
        setMceActiveResources(data.resources);
      } else {
        console.warn('⚠️ Invalid MCE resources data structure:', data);
        setMceActiveResources([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch MCE active resources:', error);
      setMceActiveResources([]);
    } finally {
      setMceResourcesLoading(false);
    }
  }, [mceInfo?.name]);

  // Verify MCE environment
  const verifyMceEnvironment = useCallback(async () => {
    setMceLoading(true);
    console.log('🔄 Verifying MCE environment...');

    try {
      const timestamp = Date.now();
      
      // Refresh MCE features data
      const mceResponse = await fetch(`http://localhost:8000/api/mce/features?t=${timestamp}`);
      const mceData = await mceResponse.json();
      
      // Update states with fresh data
      if (mceResponse.ok) {
        setMceFeatures(mceData.features || []);
        setMceInfo(mceData.mce_info || null);
        setMceLastVerified(new Date().toISOString());
        
        // Also fetch active resources if we have MCE info
        if (mceData.mce_info) {
          await fetchMceActiveResources();
        }
      } else {
        throw new Error(mceData.message || 'Failed to verify MCE environment');
      }

      console.log('✅ MCE environment verified successfully');
      return { success: true, data: mceData };
    } catch (error) {
      console.error('❌ MCE environment verification failed:', error);
      throw error;
    } finally {
      setMceLoading(false);
    }
  }, [fetchMceActiveResources]);

  // Sort resources
  const sortedMceResources = [...mceActiveResources].sort((a, b) => {
    const aValue = a[mceSortField] || '';
    const bValue = b[mceSortField] || '';
    
    if (mceSortDirection === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const handleMceSort = useCallback((field) => {
    if (mceSortField === field) {
      setMceSortDirection(mceSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setMceSortField(field);
      setMceSortDirection('asc');
    }
  }, [mceSortField, mceSortDirection]);

  // Sort components (features)
  const sortedMceFeatures = [...mceFeatures].sort((a, b) => {
    const aValue = a[mceComponentSortField] || '';
    const bValue = b[mceComponentSortField] || '';
    
    if (mceComponentSortDirection === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const handleMceComponentSort = useCallback((field) => {
    if (mceComponentSortField === field) {
      setMceComponentSortDirection(mceComponentSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setMceComponentSortField(field);
      setMceComponentSortDirection('asc');
    }
  }, [mceComponentSortField, mceComponentSortDirection]);

  // Auto-fetch resources when MCE info changes
  useEffect(() => {
    if (mceInfo?.name) {
      console.log('📡 Auto-fetching MCE active resources for:', mceInfo.name);
      fetchMceActiveResources().catch((err) => 
        console.error('Auto-fetch MCE active resources failed:', err)
      );
    }
  }, [mceInfo?.name, fetchMceActiveResources]);

  return {
    // State
    mceInfo,
    mceFeatures: sortedMceFeatures,
    mceActiveResources: sortedMceResources,
    mceLastVerified,
    
    // Loading states
    mceLoading,
    mceResourcesLoading,
    
    // Sorting
    mceSortField,
    mceSortDirection,
    handleMceSort,
    mceComponentSortField,
    mceComponentSortDirection,
    handleMceComponentSort,
    
    // Collapse states
    mceConfigurationCollapsed,
    mceRecentOpsCollapsed,
    
    // Actions
    fetchMceActiveResources,
    verifyMceEnvironment,
    
    // Setters
    setMceInfo,
    setMceFeatures,
    setMceActiveResources,
    setMceLastVerified,
    setMceConfigurationCollapsed,
    setMceRecentOpsCollapsed,
    setMceSortField,
    setMceSortDirection,
    setMceComponentSortField,
    setMceComponentSortDirection
  };
};

export default useMCEEnvironment;