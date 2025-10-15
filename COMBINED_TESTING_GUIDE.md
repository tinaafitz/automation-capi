# Combined Features Test Guide

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
- CAPA source code cloned locally

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
cd <path-to-capa-source>/cluster-api-provider-aws
```

### Step 6: Get Latest Code (Optional - Only if Rebuilding Image)

```bash
git pull
```

### Step 7: Build and Push Custom CAPA Image (Optional - Only if Rebuilding Image)

**Log in to Quay.io:**
```bash
podman login quay.io
```

**Build the Image:**
```bash
podman build -f Dockerfile.simple -t quay.io/<your-username>/cluster-api-provider-aws:latest .
```

**Push to Registry:**
```bash
podman push quay.io/<your-username>/cluster-api-provider-aws:latest
```

### Step 8: Update CAPA Controller Image

Edit the deployment to use your custom Quay image:

```bash
oc edit deploy capa-controller-manager -n capa-system
```

**Update the Image Field to:**
```yaml
image: quay.io/<your-username>/cluster-api-provider-aws:latest
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
./create-ocmclient-secret.sh
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

# Verify AutoNode is enabled
oc get rosacontrolplanes -n ns-rosa-hcp -o yaml | grep -A 2 autoNode

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
quay.io/<your-username>/cluster-api-provider-aws:latest
```

---

## Troubleshooting

### Common Issues

**Issue: CAPA controller pod not starting**
- Check logs: `oc logs -n capa-system deployment/capa-controller-manager`
- Verify image exists in Quay.io
- Check pod events: `oc describe pod -n capa-system <pod-name>`

**Issue: CRDs not applying**
- Ensure you're in the correct CAPA source directory
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
- `~/acm_dev/automation-capi/create-ocmclient-secret.sh`

---

## Notes

- The custom CAPA image includes your latest changes for RosaRoleConfig, RosaNetworkConfig, and Karpenter support
- Make sure to rebuild and push the image after any code changes
- The kind cluster provides a local Kubernetes environment for testing
- All ROSA resources are created in the `ns-rosa-hcp` namespace
- The CAPA controller runs in the `capa-system` namespace

---

## Understanding Changes

For detailed information about RosaRoleConfig, RosaNetworkConfig, AutoNode, and field migration, see [WHATS_NEW.md](WHATS_NEW.md).

The What's New document provides:
- **RosaRoleConfig**: Centralized IAM role and OIDC configuration management
- **RosaNetworkConfig**: Automated VPC and network infrastructure management
- **AutoNode Configuration**: Karpenter-based automatic node scaling
- **Field Mapping**: Complete mapping of old and new fields
- **Migration Guide**: Step-by-step migration instructions

---

## Quick Reference

**Complete Setup in One Go:**

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
# cd <path-to-capa-source>/cluster-api-provider-aws
# git pull
# podman login quay.io
# podman build -f Dockerfile.simple -t quay.io/<your-username>/cluster-api-provider-aws:latest .
# podman push quay.io/<your-username>/cluster-api-provider-aws:latest

# Update image (requires manual edit)
oc edit deploy capa-controller-manager -n capa-system
# Change image to: quay.io/<your-username>/cluster-api-provider-aws:latest

# Apply CRDs
cd <path-to-capa-source>/cluster-api-provider-aws
kubectl apply -f config/crd/bases/controlplane.cluster.x-k8s.io_rosacontrolplanes.yaml
kubectl apply -f config/crd/bases/infrastructure.cluster.x-k8s.io_rosanetworks.yaml
kubectl apply -f config/crd/bases/infrastructure.cluster.x-k8s.io_rosaroleconfigs.yaml

# Deploy CAPA
oc apply -k config/default/

# Deploy cluster
cd ~/acm_dev/automation-capi
oc create ns ns-rosa-hcp
oc apply -f awsIdentity.yaml
./create-ocmclient-secret.sh
oc apply -f rosa_network_config.yaml
oc apply -f rosa_role_config.yaml
oc apply -f capi-network-roles-autonode-test.yml
```
