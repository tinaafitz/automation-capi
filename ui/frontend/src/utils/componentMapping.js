/**
 * Helper function to map MCE component/feature names to actual deployment names
 *
 * MCE features like "cluster-api-preview" and "cluster-api-provider-aws-preview"
 * map to deployments named "capi-controller-manager" and "capa-controller-manager"
 * in the multicluster-engine namespace.
 */
export const getDeploymentInfo = (componentName) => {
  // Remove -preview suffix and add -controller-manager suffix
  const deploymentName = componentName.replace('-preview', '') + '-controller-manager';

  // All CAPI/CAPA deployments are in multicluster-engine namespace
  return {
    name: deploymentName,
    namespace: 'multicluster-engine',
  };
};
