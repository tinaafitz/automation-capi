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

### Step 1: Source AWS Environment Variables

```bash
source ~/aws_env_vars
```

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

### Step 6: Get Latest Code

```bash
git pull
```

### Step 7: Build and Push Custom CAPA Image

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

### Step 8: Apply Custom Resource Definitions (CRDs)

```bash
kubectl apply -f config/crd/bases/controlplane.cluster.x-k8s.io_rosacontrolplanes.yaml
kubectl apply -f config/crd/bases/infrastructure.cluster.x-k8s.io_rosanetworks.yaml
kubectl apply -f config/crd/bases/infrastructure.cluster.x-k8s.io_rosaroleconfigs.yaml
```

### Step 9: Deploy CAPA Default Configuration

```bash
oc apply -k config/default/
```

### Step 10: Update CAPA Controller Image

Edit the deployment to use your custom Quay image:

```bash
oc edit deploy capa-controller-manager -n capa-system
```

**Update the image field to:**
```yaml
image: quay.io/tinaafitz/cluster-api-provider-aws:latest
```

Save and exit the editor. The deployment will automatically restart with the new image.

---

## Deploy ROSA HCP Cluster

### Step 11: Create Namespace

```bash
oc create ns ns-rosa-hcp
```

### Step 12: Apply AWS Identity Configuration

```bash
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

## Quick Reference

**Complete setup in one go:**

```bash
# Environment setup
source ~/aws_env_vars
kind create cluster --name capa-karpenter-test

# Export variables
export AWS_REGION=us-east-1
export EXP_ROSA="true"
export EXP_MACHINE_POOL="true"
export CLUSTER_TOPOLOGY="true"
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

# Initialize cluster
clusterctl init --infrastructure aws

# Build and deploy custom image
cd /Users/tinafitzgerald/sd_dev/cluster-api-provider-aws
git pull
podman login -u='tinaafitz+test' -p='9BTFQ3XRG67TUQLH8VIZLPN90IU51L9BN3G04RRTZ53NC3TSOYRQ8L4S9R6DZAL2' quay.io
podman build -f Dockerfile.simple -t quay.io/tinaafitz/cluster-api-provider-aws:latest .
podman push quay.io/tinaafitz/cluster-api-provider-aws:latest

# Apply CRDs
kubectl apply -f config/crd/bases/controlplane.cluster.x-k8s.io_rosacontrolplanes.yaml
kubectl apply -f config/crd/bases/infrastructure.cluster.x-k8s.io_rosanetworks.yaml
kubectl apply -f config/crd/bases/infrastructure.cluster.x-k8s.io_rosaroleconfigs.yaml

# Deploy CAPA
oc apply -k config/default/

# Update image (requires manual edit)
oc edit deploy capa-controller-manager -n capa-system
# Change image to: quay.io/tinaafitz/cluster-api-provider-aws:latest

# Deploy cluster
cd ~/acm_dev/automation-capi
oc create ns ns-rosa-hcp
oc apply -f awsIdentity.yaml
/Users/tinafitzgerald/create-ocmclient-secret.sh
oc apply -f rosa_network_config.yaml
oc apply -f rosa_role_config.yaml
oc apply -f capi-network-roles-autonode-test.yml
```
