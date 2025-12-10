import { useState, useEffect, useCallback } from 'react';

// Custom hook for Minikube environment management
export const useMinikubeEnvironment = () => {
  const [minikubeClusterInfo, setMinikubeClusterInfo] = useState(null);
  const [verifiedMinikubeClusterInfo, setVerifiedMinikubeClusterInfo] = useState(null);
  const [minikubeActiveResources, setMinikubeActiveResources] = useState([]);
  const [minikubeClusters, setMinikubeClusters] = useState([]);
  const [selectedMinikubeCluster, setSelectedMinikubeCluster] = useState('');
  const [minikubeClusterInput, setMinikubeClusterInput] = useState('');
  const [minikubeVerificationResult, setMinikubeVerificationResult] = useState(null);
  const [minikubeLoading, setMinikubeLoading] = useState(false);
  const [minikubeResourcesLoading, setMinikubeResourcesLoading] = useState(false);
  
  // Sorting states
  const [minikubeSortField, setMinikubeSortField] = useState('type');
  const [minikubeSortDirection, setMinikubeSortDirection] = useState('asc');
  
  // Collapse states
  const [minikubeConfigurationCollapsed, setMinikubeConfigurationCollapsed] = useState(false);
  const [minikubeOperationsOutputCollapsed, setMinikubeOperationsOutputCollapsed] = useState(false);
  const [minikubeRecentOpsCollapsed, setMinikubeRecentOpsCollapsed] = useState(false);

  // Fetch active resources for a cluster
  const fetchMinikubeActiveResources = useCallback(async (clusterName, namespace) => {
    if (!clusterName || !namespace) {
      console.log('❌ Missing cluster name or namespace for active resources fetch');
      return;
    }

    setMinikubeResourcesLoading(true);
    console.log(`🔄 Fetching active resources for cluster: ${clusterName} in namespace: ${namespace}`);

    try {
      const timestamp = Date.now();
      const response = await fetch(
        `http://localhost:8000/api/clusters/${clusterName}/resources?namespace=${namespace}&t=${timestamp}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Active resources fetched:', data);
      
      if (data.resources && Array.isArray(data.resources)) {
        setMinikubeActiveResources(data.resources);
      } else {
        console.warn('⚠️ Invalid resources data structure:', data);
        setMinikubeActiveResources([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch active resources:', error);
      setMinikubeActiveResources([]);
    } finally {
      setMinikubeResourcesLoading(false);
    }
  }, []);

  // Verify Minikube cluster
  const verifyMinikubeCluster = useCallback(async (clusterName) => {
    if (!clusterName) {
      console.log('❌ No cluster name provided for verification');
      return;
    }

    setMinikubeLoading(true);
    console.log(`🔄 Verifying Minikube cluster: ${clusterName}`);

    try {
      const response = await fetch('http://localhost:8000/api/minikube/verify-cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_name: clusterName }),
      });

      const data = await response.json();
      console.log('✅ Minikube verification response:', data);
      
      // Check if verification was successful - either success=true OR (exists=true AND accessible=true)
      const isSuccessful = data.success === true || (data.exists === true && data.accessible === true);

      if (response.ok && isSuccessful) {
        setMinikubeVerificationResult({ ...data, success: true, verified_at: new Date().toISOString() });
        setVerifiedMinikubeClusterInfo(data.cluster_info);
        setSelectedMinikubeCluster(clusterName);
        return data;
      } else {
        setMinikubeVerificationResult({ ...data, success: false });
        throw new Error(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('❌ Minikube cluster verification failed:', error);
      setMinikubeVerificationResult({ success: false, message: error.message });
      throw error;
    } finally {
      setMinikubeLoading(false);
    }
  }, []);

  // Fetch available Minikube clusters
  const fetchMinikubeClusters = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/minikube/list-clusters');
      const data = await response.json();
      console.log('✅ Minikube clusters fetched:', data);
      
      if (data.clusters && Array.isArray(data.clusters)) {
        setMinikubeClusters(data.clusters);
      }
    } catch (error) {
      console.error('❌ Failed to fetch Minikube clusters:', error);
      setMinikubeClusters([]);
    }
  }, []);

  // Sort resources
  const sortedMinikubeResources = [...minikubeActiveResources].sort((a, b) => {
    const aValue = a[minikubeSortField] || '';
    const bValue = b[minikubeSortField] || '';
    
    if (minikubeSortDirection === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const handleMinikubeSort = useCallback((field) => {
    if (minikubeSortField === field) {
      setMinikubeSortDirection(minikubeSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setMinikubeSortField(field);
      setMinikubeSortDirection('asc');
    }
  }, [minikubeSortField, minikubeSortDirection]);

  // Auto-fetch resources when cluster info changes
  useEffect(() => {
    if (verifiedMinikubeClusterInfo?.name && verifiedMinikubeClusterInfo?.namespace) {
      console.log('📡 Auto-fetching active resources for verified cluster:', verifiedMinikubeClusterInfo.name);
      fetchMinikubeActiveResources(
        verifiedMinikubeClusterInfo.name,
        verifiedMinikubeClusterInfo.namespace
      ).catch((err) => console.error('Auto-fetch active resources failed:', err));
    }
  }, [verifiedMinikubeClusterInfo?.name, verifiedMinikubeClusterInfo?.namespace, fetchMinikubeActiveResources]);

  // Fetch clusters on mount
  useEffect(() => {
    fetchMinikubeClusters();
  }, [fetchMinikubeClusters]);

  return {
    // State
    minikubeClusterInfo,
    verifiedMinikubeClusterInfo,
    minikubeActiveResources: sortedMinikubeResources,
    minikubeClusters,
    selectedMinikubeCluster,
    minikubeClusterInput,
    minikubeVerificationResult,
    
    // Loading states
    minikubeLoading,
    minikubeResourcesLoading,
    
    // Sorting
    minikubeSortField,
    minikubeSortDirection,
    handleMinikubeSort,
    
    // Collapse states
    minikubeConfigurationCollapsed,
    minikubeOperationsOutputCollapsed,
    minikubeRecentOpsCollapsed,
    
    // Actions
    fetchMinikubeActiveResources,
    verifyMinikubeCluster,
    fetchMinikubeClusters,
    
    // Setters
    setMinikubeClusterInfo,
    setVerifiedMinikubeClusterInfo,
    setMinikubeActiveResources,
    setMinikubeClusters,
    setSelectedMinikubeCluster,
    setMinikubeClusterInput,
    setMinikubeVerificationResult,
    setMinikubeConfigurationCollapsed,
    setMinikubeOperationsOutputCollapsed,
    setMinikubeRecentOpsCollapsed,
    setMinikubeSortField,
    setMinikubeSortDirection
  };
};

export default useMinikubeEnvironment;