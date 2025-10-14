# Combined Testing Guide: RosaRoleConfig, RosaNetworkConfig and Karpenter

## Overview
This guide provides step-by-step instructions for testing RosaRoleConfig, RosaNetworkConfig, and Karpenter changes using a local kind cluster and custom CAPA build.

---

## Prerequisites

- `kind` CLI installed
- `clusterctl` CLI installed
- `kubectl` or `oc` CLI installed
- `podman` installed
- AWS credentials configured
- Quay.io account with credentials
- CAPA source code cloned at `/Users/tinafitzgerald/sd_dev/cluster-api-provider-aws`

---

## Setup Steps

### Step 1: Source AWS Environment Variables and Verify ROSA Login

```bash
source ~/aws_env_vars
rosa whoami
```

Ensure you are logged into ROSA stage environment.

### Step 2: Create Kind Cluster

```bash
kind create cluster --name capa-karpenter-test
```

### Step 3: Export Required Environment Variables

```bash
export AWS_REGION=us-east-1
export EXP_ROSA="true"
export EXP_MACHINE_POOL="true"
export CLUSTER_TOPOLOGY="true"
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)
```

### Step 4: Initialize Management Cluster

Install cert-manager, CAPI, and CAPA:

```bash
clusterctl init --infrastructure aws
```

---

## Build and Deploy Custom CAPA Image

### Step 5: Navigate to CAPA Source Directory

```bash
cd /Users/tinafitzgerald/sd_dev/cluster-api-provider-aws
```

### Step 6: Get Latest Code (Optional - only if rebuilding image)

```bash
git pull
```

### Step 7: Build and Push Custom CAPA Image (Optional - only if rebuilding image)

**Login to Quay.io:**
```bash
podman login -u='tinaafitz+test' -p='9BTFQ3XRG67TUQLH8VIZLPN90IU51L9BN3G04RRTZ53NC3TSOYRQ8L4S9R6DZAL2' quay.io
```

**Build the image:**
```bash
podman build -f Dockerfile.simple -t quay.io/tinaafitz/cluster-api-provider-aws:latest .
```

**Push to registry:**
```bash
podman push quay.io/tinaafitz/cluster-api-provider-aws:latest
```

### Step 8: Update CAPA Controller Image

Edit the deployment to use your custom Quay image:

```bash
oc edit deploy capa-controller-manager -n capa-system
```

**Update the image field to:**
```yaml
image: quay.io/tinaafitz/cluster-api-provider-aws:latest
```

Save and exit the editor. The deployment will automatically restart with the new image.

### Step 9: Apply Custom Resource Definitions (CRDs)

```bash
kubectl apply -f config/crd/bases/controlplane.cluster.x-k8s.io_rosacontrolplanes.yaml
kubectl apply -f config/crd/bases/infrastructure.cluster.x-k8s.io_rosanetworks.yaml
kubectl apply -f config/crd/bases/infrastructure.cluster.x-k8s.io_rosaroleconfigs.yaml
```

### Step 10: Deploy CAPA Default Configuration

```bash
oc apply -k config/default/
```

---

## Deploy ROSA HCP Cluster

### Step 11: Create Namespace

```bash
oc create ns ns-rosa-hcp
```

### Step 12: Apply AWS Identity Configuration

```bash
cd ~/acm_dev/automation-capi
oc apply -f awsIdentity.yaml
```

### Step 13: Create OCM Client Secret

Run the secret creation script:

```bash
/Users/tinafitzgerald/create-ocmclient-secret.sh
```

### Step 14: Create RosaNetworkConfig

```bash
oc apply -f rosa_network_config.yaml
```

### Step 15: Create RosaRoleConfig

```bash
oc apply -f rosa_role_config.yaml
```

### Step 16: Create ROSA HCP Cluster with AutoNode

```bash
oc apply -f capi-network-roles-autonode-test.yml
```

### Step 17: Configure AutoNode (Optional)

For detailed AutoNode configuration, IAM role setup, and testing procedures, refer to the comprehensive [QE AutoNode Test Guide](QE_AUTONODE_TEST_GUIDE.md).

The QE AutoNode Test Guide provides complete step-by-step instructions for:
- **IAM Policy Creation**: Creating the AutoNode IAM policy with all required permissions
- **Trust Policy Configuration**: Setting up trust relationships with OIDC providers
- **IAM Role Setup**: Creating and configuring the Karpenter IAM role
- **Resource Tagging**: Tagging security groups and subnets for Karpenter discovery
- **OpenshiftEC2NodeClass**: Creating and applying EC2 node class configurations
- **NodePool Configuration**: Setting up node pools with autoscaling parameters
- **Verification Steps**: Testing AutoNode functionality and scaling
- **Troubleshooting**: Common issues and diagnostic procedures

**Reference**: [AutoNode GitLab Documentation](https://gitlab.cee.redhat.com/service/uhc-clusters-service/-/blob/master/docs/rosa_hcp/autonode.md)

**Quick AutoNode Configuration Check:**

```bash
# Verify AutoNode configuration in ROSAControlPlane
oc get rosacontrolplanes -n ns-rosa-hcp -o yaml | grep -A 10 autoNode

# Check if Karpenter IAM role exists
aws iam get-role --role-name <prefix>-autonode-operator-role

# Verify provision shard ID is set
oc get rosacontrolplanes -n ns-rosa-hcp -o yaml | grep provisionShardID

# Check AutoNode policy
aws iam get-policy --policy-arn arn:aws:iam::<account-id>:policy/autonode-private-preview
```

---

## Verification

### Check Cluster Resources

```bash
# Check all resources in the namespace
oc get all -n ns-rosa-hcp

# Check RosaNetworkConfig
oc get rosanetwork -n ns-rosa-hcp

# Check RosaRoleConfig
oc get rosaroleconfig -n ns-rosa-hcp

# Check RosaControlPlane
oc get rosacontrolplane -n ns-rosa-hcp

# Check Cluster status
oc get cluster -n ns-rosa-hcp
```

### Check CAPA Controller Logs

```bash
oc logs -n capa-system deployment/capa-controller-manager -f
```

### Verify Custom Image is Running

```bash
oc get deployment capa-controller-manager -n capa-system -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Expected output:
```
quay.io/tinaafitz/cluster-api-provider-aws:latest
```

---

## Troubleshooting

### Common Issues

**Issue: CAPA controller pod not starting**
- Check logs: `oc logs -n capa-system deployment/capa-controller-manager`
- Verify image exists in Quay.io
- Check pod events: `oc describe pod -n capa-system <pod-name>`

**Issue: CRDs not applying**
- Ensure you're in the correct directory: `/Users/tinafitzgerald/sd_dev/cluster-api-provider-aws`
- Check CRD status: `kubectl get crd | grep rosa`

**Issue: Cluster not creating**
- Check RosaControlPlane status: `oc describe rosacontrolplane -n ns-rosa-hcp`
- Verify AWS credentials are correct
- Check OCM client secret exists: `oc get secret -n ns-rosa-hcp`

**Issue: Image pull failures**
- Verify Quay.io login is successful
- Check image exists: `podman images | grep cluster-api-provider-aws`
- Ensure image was pushed successfully

### Useful Commands

```bash
# Check all ROSA custom resources
oc get rosanetwork,rosaroleconfig,rosacontrolplane -A

# View events in namespace
oc get events -n ns-rosa-hcp --sort-by='.lastTimestamp'

# Restart CAPA controller
oc rollout restart deployment/capa-controller-manager -n capa-system

# Check kind cluster status
kind get clusters

# View CAPA controller deployment
oc get deploy -n capa-system

# Check all CRDs related to ROSA
kubectl get crd | grep rosa
```

---

## Cleanup

### Delete ROSA HCP Cluster

```bash
oc delete -f capi-network-roles-autonode-test.yml
```

### Delete RosaRoleConfig

```bash
oc delete -f rosa_role_config.yaml
```

### Delete RosaNetworkConfig

```bash
oc delete -f rosa_network_config.yaml
```

### Delete Namespace

```bash
oc delete ns ns-rosa-hcp
```

### Delete Kind Cluster

```bash
kind delete cluster --name capa-karpenter-test
```

---

## File Locations

All configuration files referenced in this guide should be located at:
- `~/acm_dev/automation-capi/awsIdentity.yaml`
- `~/acm_dev/automation-capi/rosa_network_config.yaml`
- `~/acm_dev/automation-capi/rosa_role_config.yaml`
- `~/acm_dev/automation-capi/capi-network-roles-autonode-test.yml`
- `/Users/tinafitzgerald/create-ocmclient-secret.sh`

---

## Notes

- The custom CAPA image includes your latest changes for RosaRoleConfig, RosaNetworkConfig, and Karpenter support
- Make sure to rebuild and push the image after any code changes
- The kind cluster provides a local Kubernetes environment for testing
- All ROSA resources are created in the `ns-rosa-hcp` namespace
- The CAPA controller runs in the `capa-system` namespace

---

## Understanding RosaRoleConfig and RosaNetworkConfig Changes

This section explains the architectural changes introduced by RosaRoleConfig and RosaNetworkConfig, showing what fields were moved out of ROSAControlPlane and how they're now managed separately.

### RosaRoleConfig: Centralized IAM Role Management

**Purpose**: RosaRoleConfig extracts all IAM role and OIDC configuration from ROSAControlPlane into a reusable resource that can be shared across multiple clusters.

**Key Benefits**:
- **Reusability**: Create IAM roles once, reference them in multiple clusters
- **Simplified Management**: Automatic role creation and lifecycle management
- **Consistency**: Ensures all clusters use the same role configuration
- **Reduced Complexity**: No need to manually specify individual role ARNs

#### Fields Removed from ROSAControlPlane

The following fields are **NO LONGER** specified in `ROSAControlPlane.spec`:

```yaml
# REMOVED FIELDS (now managed by RosaRoleConfig):
installerRoleARN: "arn:aws:iam::471112697682:role/rt3-HCP-ROSA-Installer-Role"
supportRoleARN: "arn:aws:iam::471112697682:role/rt3-HCP-ROSA-Support-Role"
workerRoleARN: "arn:aws:iam::471112697682:role/rt3-HCP-ROSA-Worker-Role"
oidcID: "2j1ob5s4mvqq9ra6fnnrdogi4l0c7dhq"

rolesRef:
  ingressARN: "arn:aws:iam::471112697682:role/rt3-openshift-ingress-operator-cloud-credentials"
  imageRegistryARN: "arn:aws:iam::471112697682:role/rt3-openshift-image-registry-installer-cloud-credentials"
  storageARN: "arn:aws:iam::471112697682:role/rt3-openshift-cluster-csi-drivers-ebs-cloud-credentials"
  networkARN: "arn:aws:iam::471112697682:role/rt3-openshift-cloud-network-config-controller-cloud-credentials"
  kubeCloudControllerARN: "arn:aws:iam::471112697682:role/rt3-kube-system-kube-controller-manager"
  nodePoolManagementARN: "arn:aws:iam::471112697682:role/rt3-kube-system-capa-controller-manager"
  controlPlaneOperatorARN: "arn:aws:iam::471112697682:role/rt3-kube-system-control-plane-operator"
```

#### Fields Added to RosaRoleConfig

The new `ROSARoleConfig` resource manages these configurations:

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: ROSARoleConfig
metadata:
  name: tfitzger-rosa-role-config
  namespace: ns-rosa-hcp
spec:
  # AWS credentials and identity
  identityRef:
    kind: AWSClusterControllerIdentity
    name: default
  credentialsSecretRef:
    name: rosa-creds-secret

  # Account role configuration (replaces installerRoleARN, supportRoleARN, workerRoleARN)
  accountRoleConfig:
    prefix: "tfm"
    version: "4.19.10"

  # Operator role configuration (replaces all rolesRef ARNs)
  operatorRoleConfig:
    prefix: "tfm"
```

#### Reference in ROSAControlPlane

Instead of listing all role ARNs, you now simply reference the RosaRoleConfig:

```yaml
spec:
  # NEW: Reference to RosaRoleConfig
  rosaRoleConfigRef:
    name: tfitzger-rosa-role-config
```

**Field Mapping**:
| Old ROSAControlPlane Fields | New RosaRoleConfig Fields | Relationship |
|----------------------------|---------------------------|--------------|
| `installerRoleARN` | `accountRoleConfig.prefix` | Auto-generated from prefix |
| `supportRoleARN` | `accountRoleConfig.prefix` | Auto-generated from prefix |
| `workerRoleARN` | `accountRoleConfig.prefix` | Auto-generated from prefix |
| `oidcID` | Auto-created by controller | Automatically managed |
| `rolesRef.ingressARN` | `operatorRoleConfig.prefix` | Auto-generated from prefix |
| `rolesRef.imageRegistryARN` | `operatorRoleConfig.prefix` | Auto-generated from prefix |
| `rolesRef.storageARN` | `operatorRoleConfig.prefix` | Auto-generated from prefix |
| `rolesRef.networkARN` | `operatorRoleConfig.prefix` | Auto-generated from prefix |
| `rolesRef.kubeCloudControllerARN` | `operatorRoleConfig.prefix` | Auto-generated from prefix |
| `rolesRef.nodePoolManagementARN` | `operatorRoleConfig.prefix` | Auto-generated from prefix |
| `rolesRef.controlPlaneOperatorARN` | `operatorRoleConfig.prefix` | Auto-generated from prefix |

---

### RosaNetworkConfig: Centralized Network Management

**Purpose**: RosaNetworkConfig extracts network configuration from ROSAControlPlane into a reusable resource that automatically creates and manages VPC, subnets, and networking infrastructure.

**Key Benefits**:
- **Automatic VPC Creation**: No need to manually create VPCs and subnets
- **Reusability**: Share network configuration across multiple clusters
- **Simplified Configuration**: Specify CIDR blocks and availability zones; the rest is automated
- **Lifecycle Management**: Automatic cleanup of network resources when deleted

#### Fields Removed from ROSAControlPlane

The following fields are **NO LONGER** specified in `ROSAControlPlane.spec`:

```yaml
# REMOVED FIELDS (now managed by RosaNetworkConfig):
subnets:
  - "subnet-062e797b5126b599a"
  - "subnet-0bbe3b8c424bcc607"

availabilityZones:
  - "us-west-2b"
```

#### Fields Added to RosaNetworkConfig

The new `ROSANetwork` resource manages network infrastructure:

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: ROSANetwork
metadata:
  name: tfitzger-rosa-network
  namespace: ns-rosa-hcp
spec:
  # AWS region for network resources
  region: us-west-2

  # CloudFormation stack name for tracking resources
  stackName: tf1-network-test-stack

  # Number of availability zones (auto-selects zones)
  availabilityZoneCount: 1

  # Optional: Explicitly specify availability zones
  # availabilityZones:
  #   - us-west-2b

  # VPC CIDR block
  cidrBlock: 10.0.0.0/16

  # AWS credentials identity
  identityRef:
    kind: AWSClusterControllerIdentity
    name: default
```

#### Reference in ROSAControlPlane

Instead of specifying subnets and availability zones, you now reference the RosaNetworkConfig:

```yaml
spec:
  # NEW: Reference to RosaNetworkConfig
  rosaNetworkRef:
    name: tfitzger-rosa-network
```

**Field Mapping**:
| Old ROSAControlPlane Fields | New RosaNetworkConfig Fields | Relationship |
|----------------------------|------------------------------|--------------|
| `subnets[]` | Auto-created by controller | Subnets created automatically based on `cidrBlock` and `availabilityZoneCount` |
| `availabilityZones[]` | `availabilityZones[]` or `availabilityZoneCount` | Either specify explicitly or auto-select by count |
| N/A | `stackName` | NEW: CloudFormation stack name for resource tracking |
| N/A | `cidrBlock` | NEW: VPC CIDR block configuration |
| `region` | `region` | Moved to RosaNetworkConfig (still available in ROSAControlPlane) |

---

### Autoscaling Configuration in ROSAControlPlane

The `defaultMachinePoolSpec` section configures the default worker node pool with autoscaling capabilities.

#### Autoscaling Fields in ROSAControlPlane

```yaml
spec:
  defaultMachinePoolSpec:
    instanceType: "m5.xlarge"          # EC2 instance type for worker nodes
    autoscaling:
      maxReplicas: 3                    # Maximum number of worker nodes
      minReplicas: 2                    # Minimum number of worker nodes
```

**How Autoscaling Works**:
- **minReplicas**: The cluster always maintains at least this many worker nodes
- **maxReplicas**: The cluster can scale up to this many worker nodes based on workload demand
- **instanceType**: All worker nodes in this pool use this EC2 instance type

#### Provision Shard Configuration

The `provisionShardID` specifies where the hosted control plane is deployed:

```yaml
spec:
  # Provision shard ID for hosted control plane placement
  provisionShardID: "18d315bc-88bf-11f0-a4d5-0a580a80065d"
```

**Purpose**:
- Controls which Red Hat infrastructure shard hosts your control plane
- Useful for testing specific control plane environments
- Optional field; if not specified, a default shard is selected

**When to Use**:
- Testing control plane features on specific infrastructure
- Regulatory or compliance requirements for control plane location
- Performance testing across different shards

---

### Complete Field Migration Summary

#### ROSAControlPlane: Before vs. After

**BEFORE (Old Structure)**:
```yaml
spec:
  # IAM Roles (now in RosaRoleConfig)
  installerRoleARN: "..."
  supportRoleARN: "..."
  workerRoleARN: "..."
  oidcID: "..."
  rolesRef:
    ingressARN: "..."
    imageRegistryARN: "..."
    storageARN: "..."
    networkARN: "..."
    kubeCloudControllerARN: "..."
    nodePoolManagementARN: "..."
    controlPlaneOperatorARN: "..."

  # Network Config (now in RosaNetworkConfig)
  subnets:
    - "subnet-062e797b5126b599a"
    - "subnet-0bbe3b8c424bcc607"
  availabilityZones:
    - "us-west-2b"

  # Cluster Config (remains in ROSAControlPlane)
  rosaClusterName: rosa-rt3
  domainPrefix: rosa-hcp4
  version: "4.19.0-ec.5"
  region: "us-west-2"
  network:
    machineCIDR: "10.0.0.0/16"
    podCIDR: "10.128.0.0/14"
    serviceCIDR: "172.30.0.0/16"
  defaultMachinePoolSpec:
    instanceType: "m5.xlarge"
    autoscaling:
      maxReplicas: 3
      minReplicas: 2
```

**AFTER (New Structure with References)**:
```yaml
spec:
  # NEW: References to separate configs
  rosaRoleConfigRef:
    name: tfitzger-rosa-role-config
  rosaNetworkRef:
    name: tfitzger-rosa-network

  # Cluster Config (unchanged)
  rosaClusterName: tfitzger-rosa-hcp-combo-test
  domainPrefix: tf-combo
  version: "4.19.10"
  region: "us-west-2"
  channelGroup: stable
  network:
    machineCIDR: "10.0.0.0/16"
    podCIDR: "10.128.0.0/14"
    serviceCIDR: "172.30.0.0/16"
  defaultMachinePoolSpec:
    instanceType: "m5.xlarge"
    autoscaling:
      maxReplicas: 3
      minReplicas: 2

  # NEW: Optional provision shard configuration
  provisionShardID: "18d315bc-88bf-11f0-a4d5-0a580a80065d"

  additionalTags:
    env: "tue"
    profile: "tue"
```

#### Summary of Removed Fields

**From ROSAControlPlane.spec**:
- ❌ `installerRoleARN` → Moved to `RosaRoleConfig.spec.accountRoleConfig`
- ❌ `supportRoleARN` → Moved to `RosaRoleConfig.spec.accountRoleConfig`
- ❌ `workerRoleARN` → Moved to `RosaRoleConfig.spec.accountRoleConfig`
- ❌ `oidcID` → Automatically managed by RosaRoleConfig
- ❌ `rolesRef.*` (all 7 operator role ARNs) → Moved to `RosaRoleConfig.spec.operatorRoleConfig`
- ❌ `subnets[]` → Automatically created by RosaNetworkConfig
- ❌ `availabilityZones[]` → Moved to `RosaNetworkConfig.spec.availabilityZones` or `availabilityZoneCount`

#### Summary of Added Fields

**To ROSAControlPlane.spec**:
- ✅ `rosaRoleConfigRef` → Reference to RosaRoleConfig resource
- ✅ `rosaNetworkRef` → Reference to RosaNetworkConfig resource
- ✅ `provisionShardID` → Optional control plane shard placement

**New Resources Created**:
- ✅ `RosaRoleConfig` → Manages all IAM roles and OIDC configuration
- ✅ `RosaNetworkConfig` → Manages VPC, subnets, and network infrastructure

---

## Quick Reference

**Complete setup in one go:**

```bash
# Environment setup and verify ROSA login
source ~/aws_env_vars
rosa whoami
kind create cluster --name capa-karpenter-test

# Export variables
export AWS_REGION=us-east-1
export EXP_ROSA="true"
export EXP_MACHINE_POOL="true"
export CLUSTER_TOPOLOGY="true"
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

# Initialize cluster
clusterctl init --infrastructure aws

# OPTIONAL: Build and deploy custom image (only if you made code changes)
# cd /Users/tinafitzgerald/sd_dev/cluster-api-provider-aws
# git pull
# podman login -u='tinaafitz+test' -p='9BTFQ3XRG67TUQLH8VIZLPN90IU51L9BN3G04RRTZ53NC3TSOYRQ8L4S9R6DZAL2' quay.io
# podman build -f Dockerfile.simple -t quay.io/tinaafitz/cluster-api-provider-aws:latest .
# podman push quay.io/tinaafitz/cluster-api-provider-aws:latest

# Update image (requires manual edit)
oc edit deploy capa-controller-manager -n capa-system
# Change image to: quay.io/tinaafitz/cluster-api-provider-aws:latest

# Apply CRDs
cd /Users/tinafitzgerald/sd_dev/cluster-api-provider-aws
kubectl apply -f config/crd/bases/controlplane.cluster.x-k8s.io_rosacontrolplanes.yaml
kubectl apply -f config/crd/bases/infrastructure.cluster.x-k8s.io_rosanetworks.yaml
kubectl apply -f config/crd/bases/infrastructure.cluster.x-k8s.io_rosaroleconfigs.yaml

# Deploy CAPA
oc apply -k config/default/

# Deploy cluster
cd ~/acm_dev/automation-capi
oc create ns ns-rosa-hcp
oc apply -f awsIdentity.yaml
/Users/tinafitzgerald/create-ocmclient-secret.sh
oc apply -f rosa_network_config.yaml
oc apply -f rosa_role_config.yaml
oc apply -f capi-network-roles-autonode-test.yml
```
