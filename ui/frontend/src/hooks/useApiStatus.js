import { useState, useEffect, useCallback } from 'react';

// Custom hook for managing API status checks
export const useApiStatus = () => {
  const [rosaStatus, setRosaStatus] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);
  const [ocpStatus, setOcpStatus] = useState(null);
  const [mceFeatures, setMceFeatures] = useState([]);
  const [mceInfo, setMceInfo] = useState(null);
  const [mceLastVerified, setMceLastVerified] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshAllStatus = useCallback(async () => {
    setLoading(true);
    const timestamp = Date.now();
    console.log('Refreshing all status at:', new Date().toISOString());
    let hasErrors = false;

    try {
      // Check ROSA status
      const rosaResponse = await fetch(`http://localhost:8000/api/rosa/status?t=${timestamp}`);
      const rosaData = await rosaResponse.json();
      console.log('ROSA status response:', rosaData);
      setRosaStatus(rosaData);
    } catch (error) {
      console.error('Failed to check ROSA status:', error);
      hasErrors = true;
      setRosaStatus({
        authenticated: false,
        status: 'error',
        message: 'Failed to check ROSA status',
      });
    }

    try {
      // Check configuration status
      const configResponse = await fetch(`http://localhost:8000/api/config/status?t=${timestamp}`);
      const configData = await configResponse.json();
      console.log('Config status response:', configData);
      setConfigStatus(configData);
    } catch (error) {
      console.error('Failed to check config status:', error);
      hasErrors = true;
      setConfigStatus({
        configured: false,
        status: 'error',
        message: 'Failed to check configuration status',
      });
    }

    try {
      // Check OCP Hub connection
      const ocpResponse = await fetch(`http://localhost:8000/api/ocp/connection-status?t=${timestamp}`);
      const ocpData = await ocpResponse.json();
      console.log('OCP status response:', ocpData);
      setOcpStatus(ocpData);

      // If connected, fetch MCE features
      if (ocpData.connected) {
        try {
          const mceResponse = await fetch(`http://localhost:8000/api/mce/features?t=${timestamp}`);
          const mceData = await mceResponse.json();
          console.log('MCE features response:', mceData);
          setMceFeatures(mceData.features || []);
          setMceInfo(mceData.mce_info || null);
          setMceLastVerified(new Date().toISOString());
        } catch (mceError) {
          console.error('Failed to fetch MCE features:', mceError);
        }
      }
    } catch (error) {
      console.error('Failed to check OCP connection:', error);
      hasErrors = true;
      setOcpStatus({
        connected: false,
        status: 'error',
        message: 'Failed to check OpenShift Hub connection',
      });
    }

    setLoading(false);
    return !hasErrors;
  }, []);

  // Auto-refresh on mount
  useEffect(() => {
    refreshAllStatus();
  }, [refreshAllStatus]);

  return {
    // Status data
    rosaStatus,
    configStatus,
    ocpStatus,
    mceFeatures,
    mceInfo,
    mceLastVerified,
    
    // Loading state
    loading,
    
    // Actions
    refreshAllStatus,
    
    // Individual setters (for external updates)
    setRosaStatus,
    setConfigStatus,
    setOcpStatus,
    setMceFeatures,
    setMceInfo,
    setMceLastVerified
  };
};

export default useApiStatus;