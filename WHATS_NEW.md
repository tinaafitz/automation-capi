# What's New

## Overview

This document explains the major architectural changes introduced to ROSA HCP cluster management, including:
- **RosaRoleConfig**: Centralized IAM role and OIDC configuration management
- **RosaNetworkConfig**: Automated VPC and network infrastructure management
- **AutoNode**: Karpenter-based automatic node scaling

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
installerRoleARN: "arn:aws:iam::<account-id>:role/<prefix>-HCP-ROSA-Installer-Role"
supportRoleARN: "arn:aws:iam::<account-id>:role/<prefix>-HCP-ROSA-Support-Role"
workerRoleARN: "arn:aws:iam::<account-id>:role/<prefix>-HCP-ROSA-Worker-Role"
oidcID: "<oidc-config-id>"

rolesRef:
  ingressARN: "arn:aws:iam::<account-id>:role/<prefix>-openshift-ingress-operator-cloud-credentials"
  imageRegistryARN: "arn:aws:iam::<account-id>:role/<prefix>-openshift-image-registry-installer-cloud-credentials"
  storageARN: "arn:aws:iam::<account-id>:role/<prefix>-openshift-cluster-csi-drivers-ebs-cloud-credentials"
  networkARN: "arn:aws:iam::<account-id>:role/<prefix>-openshift-cloud-network-config-controller-cloud-credentials"
  kubeCloudControllerARN: "arn:aws:iam::<account-id>:role/<prefix>-kube-system-kube-controller-manager"
  nodePoolManagementARN: "arn:aws:iam::<account-id>:role/<prefix>-kube-system-capa-controller-manager"
  controlPlaneOperatorARN: "arn:aws:iam::<account-id>:role/<prefix>-kube-system-control-plane-operator"
```

#### Fields Added to RosaRoleConfig

The new `ROSARoleConfig` resource manages these configurations:

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: ROSARoleConfig
metadata:
  name: my-rosa-role-config
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
    prefix: "<your-prefix>"
    version: "4.19.10"

  # Operator role configuration (replaces all rolesRef ARNs)
  operatorRoleConfig:
    prefix: "<your-prefix>"
```

#### Reference in ROSAControlPlane

Instead of listing all role ARNs, you now simply reference the RosaRoleConfig:

```yaml
spec:
  # NEW: Reference to RosaRoleConfig
  rosaRoleConfigRef:
    name: my-rosa-role-config
```

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
  - "subnet-xxxxxxxxxxxxxxxxx"
  - "subnet-yyyyyyyyyyyyyyyyy"

availabilityZones:
  - "us-west-2a"
```

#### Fields Added to RosaNetworkConfig

The new `ROSANetwork` resource manages network infrastructure:

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: ROSANetwork
metadata:
  name: my-rosa-network
  namespace: ns-rosa-hcp
spec:
  # AWS region for network resources
  region: us-west-2

  # CloudFormation stack name for tracking resources
  stackName: my-network-stack

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
    name: my-rosa-network
```

---

## Field Mapping

### RosaRoleConfig Field Mapping

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

### RosaNetworkConfig Field Mapping

| Old ROSAControlPlane Fields | New RosaNetworkConfig Fields | Relationship |
|----------------------------|------------------------------|--------------|
| `subnets[]` | Auto-created by controller | Subnets created automatically based on `cidrBlock` and `availabilityZoneCount` |
| `availabilityZones[]` | `availabilityZones[]` or `availabilityZoneCount` | Either specify explicitly or auto-select by count |
| N/A | `stackName` | NEW: CloudFormation stack name for resource tracking |
| N/A | `cidrBlock` | NEW: VPC CIDR block configuration |
| `region` | `region` | Moved to RosaNetworkConfig (still available in ROSAControlPlane) |

---

## Complete Field Migration Summary

### ROSAControlPlane: Before vs. After

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
    - "subnet-xxxxxxxxxxxxxxxxx"
    - "subnet-yyyyyyyyyyyyyyyyy"
  availabilityZones:
    - "us-west-2a"

  # Cluster Config (remains in ROSAControlPlane)
  rosaClusterName: my-cluster
  domainPrefix: my-prefix
  version: "4.19.10"
  region: "us-west-2"
  network:
    machineCIDR: "10.0.0.0/16"
    podCIDR: "10.128.0.0/14"
    serviceCIDR: "172.30.0.0/16"
  defaultMachinePoolSpec:
    instanceType: "m5.xlarge"
```

**AFTER (New Structure with References)**:
```yaml
spec:
  # NEW: References to separate configs
  rosaRoleConfigRef:
    name: my-rosa-role-config
  rosaNetworkRef:
    name: my-rosa-network

  # Cluster Config (unchanged)
  rosaClusterName: my-cluster
  domainPrefix: my-prefix
  version: "4.19.10"
  region: "us-west-2"
  channelGroup: stable
  network:
    machineCIDR: "10.0.0.0/16"
    podCIDR: "10.128.0.0/14"
    serviceCIDR: "172.30.0.0/16"

  # NEW: AutoNode configuration for Karpenter-based automatic node scaling
  autoNode:
    mode: enabled
    roleARN: "arn:aws:iam::<account-id>:role/KarpenterNodeRole"

  # Provision shard (REQUIRED for AutoNode)
  provisionShardID: "<your-provision-shard-id>"

  # Optional: defaultMachinePoolSpec (still configurable but optional with AutoNode)
  defaultMachinePoolSpec:
    instanceType: "m5.xlarge"

  additionalTags:
    env: "production"
    team: "platform"
```

### Summary of Removed Fields

**From ROSAControlPlane.spec**:
- ❌ `installerRoleARN` → Moved to `RosaRoleConfig.spec.accountRoleConfig`
- ❌ `supportRoleARN` → Moved to `RosaRoleConfig.spec.accountRoleConfig`
- ❌ `workerRoleARN` → Moved to `RosaRoleConfig.spec.accountRoleConfig`
- ❌ `oidcID` → Automatically managed by RosaRoleConfig
- ❌ `rolesRef.*` (all 7 operator role ARNs) → Moved to `RosaRoleConfig.spec.operatorRoleConfig`
- ❌ `subnets[]` → Automatically created by RosaNetworkConfig
- ❌ `availabilityZones[]` → Moved to `RosaNetworkConfig.spec.availabilityZones` or `availabilityZoneCount`

### Summary of Added Fields

**To ROSAControlPlane.spec**:
- ✅ `rosaRoleConfigRef` → Reference to RosaRoleConfig resource
- ✅ `rosaNetworkRef` → Reference to RosaNetworkConfig resource
- ✅ `autoNode` → AutoNode (Karpenter) configuration for automatic node scaling
  - `autoNode.mode` → Enable/disable Karpenter (values: `enabled`, `disabled`)
  - `autoNode.roleARN` → IAM role ARN for Karpenter node provisioning
- ✅ `provisionShardID` → Control plane shard placement (REQUIRED for AutoNode)

**New Resources Created**:
- ✅ `RosaRoleConfig` → Manages all IAM roles and OIDC configuration
- ✅ `RosaNetworkConfig` → Manages VPC, subnets, and network infrastructure

---

## AutoNode Configuration

### Overview

AutoNode uses Karpenter to provide automatic, intelligent node scaling for ROSA HCP clusters. Unlike traditional cluster autoscaling that scales machine pools, Karpenter provisions nodes directly based on pending pod requirements.

### Configuration in ROSAControlPlane

```yaml
spec:
  # AutoNode configuration
  autoNode:
    mode: enabled
    roleARN: "arn:aws:iam::<account-id>:role/KarpenterNodeRole"

  # Provision shard (REQUIRED for AutoNode)
  provisionShardID: "<your-provision-shard-id>"
```

### Key Components

1. **AutoNode Mode**: Enable or disable Karpenter (`enabled` or `disabled`)
2. **IAM Role**: IAM role with permissions for Karpenter to provision EC2 instances
3. **Provision Shard ID**: Required for AutoNode; specifies control plane placement

### Provision Shard Configuration

The `provisionShardID` specifies where the hosted control plane is deployed:

```yaml
spec:
  # Provision shard ID for hosted control plane placement
  provisionShardID: "18d315bc-88bf-11f0-a4d5-0a580a80065d"
```

**Purpose**:
- Controls which Red Hat infrastructure shard hosts your control plane
- Useful for testing specific control plane environments
- Required when AutoNode is enabled

**When to Use**:
- Testing control plane features on specific infrastructure
- Regulatory or compliance requirements for control plane location
- Performance testing across different shards
- **Always required when AutoNode is enabled**

### Complete AutoNode Configuration Example

```yaml
spec:
  # AutoNode configuration
  autoNode:
    mode: enabled
    roleARN: "arn:aws:iam::<account-id>:role/KarpenterNodeRole"

  # Provision shard (REQUIRED for AutoNode)
  provisionShardID: "<your-provision-shard-id>"

  # Optional: Machine pool spec (can coexist with AutoNode)
  defaultMachinePoolSpec:
    instanceType: "m5.xlarge"
```

---

## Migration Guide

### Step 1: Create RosaRoleConfig

Instead of specifying individual role ARNs in ROSAControlPlane, create a RosaRoleConfig:

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: ROSARoleConfig
metadata:
  name: my-rosa-role-config
  namespace: ns-rosa-hcp
spec:
  identityRef:
    kind: AWSClusterControllerIdentity
    name: default
  credentialsSecretRef:
    name: rosa-creds-secret
  accountRoleConfig:
    prefix: "myprefix"
    version: "4.19.10"
  operatorRoleConfig:
    prefix: "myprefix"
```

### Step 2: Create RosaNetworkConfig

Instead of manually creating VPC/subnets and specifying them in ROSAControlPlane, create a RosaNetworkConfig:

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: ROSANetwork
metadata:
  name: my-rosa-network
  namespace: ns-rosa-hcp
spec:
  region: us-west-2
  stackName: my-network-stack
  availabilityZoneCount: 1
  cidrBlock: 10.0.0.0/16
  identityRef:
    kind: AWSClusterControllerIdentity
    name: default
```

### Step 3: Update ROSAControlPlane

Reference the new resources instead of listing individual values:

```yaml
spec:
  # Reference the configs
  rosaRoleConfigRef:
    name: my-rosa-role-config
  rosaNetworkRef:
    name: my-rosa-network

  # Add AutoNode if desired
  autoNode:
    mode: enabled
    roleARN: "arn:aws:iam::<account-id>:role/KarpenterNodeRole"
  provisionShardID: "<your-provision-shard-id>"

  # Rest of cluster config...
  rosaClusterName: my-cluster
  version: "4.19.10"
  # ...
```

---

## Additional Resources

- [QE AutoNode Test Guide](QE_AUTONODE_TEST_GUIDE.md) - Detailed AutoNode setup and testing
- [Combined Testing Guide](COMBINED_TESTING_GUIDE.md) - Testing RosaRoleConfig, RosaNetworkConfig, and Karpenter
- [AutoNode GitLab Documentation](https://gitlab.cee.redhat.com/service/uhc-clusters-service/-/blob/master/docs/rosa_hcp/autonode.md)
