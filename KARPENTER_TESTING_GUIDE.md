# QE Testing Guide for Karpenter Changes

## Overview
This guide provides step-by-step instructions for testing Karpenter changes using a local kind cluster and ROSA HCP.

---

## Prerequisites

- `kind` CLI installed
- `clusterctl` CLI installed
- `kubectl` or `oc` CLI installed
- `rosa` CLI installed and authenticated
- AWS credentials configured
- Terraform installed
- Git installed

---

## Part 1: Create and Configure Environment

### Step 1: Create Kind Cluster

```bash
kind create cluster --name capa-karpenter-test
```

### Step 2: Export Environment Variables

```bash
export AWS_REGION=us-east-1
export EXP_ROSA="true"
export EXP_MACHINE_POOL="true"
export CLUSTER_TOPOLOGY="true"
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)
```

### Step 3: Initialize Management Cluster

Install cert-manager, CAPI, and CAPA:

```bash
clusterctl init --infrastructure aws
```

### Step 4: Pull Karpenter PR and Checkout Branch

```bash
cd <path-to-capa-source>/cluster-api-provider-aws
git fetch origin pull/5686/head:<your-branch-name>
git checkout <your-branch-name>
```

### Step 5: Apply CRDs

```bash
kubectl apply -f config/crd/bases/controlplane.cluster.x-k8s.io_rosacontrolplanes.yaml
```

### Step 6: Apply Default Configuration

```bash
oc apply -k config/default/
```

### Step 7: Update CAPA Controller Image

Edit the deployment to use Mohamed's Quay image:

```bash
oc edit deploy capa-controller-manager -n capa-system
```

**Replace:**
```yaml
image: registry.k8s.io/cluster-api-aws/cluster-api-aws-controller:v2.9.1
```

**With:**
```yaml
image: quay.io/<your-username>/cluster-api-aws-controller-amd64:dev
```

Save and exit.

---

## Part 2: ROSA VPC and Subnets Setup

### Step 8: Set Region and Cluster Name

```bash
export REGION=<your-aws-region>
export CLUSTER_NAME=<your-cluster-name>
```

### Step 9: Setup VPC with Terraform

Run the setup script (this script should create VPC and subnets using Terraform):

```bash
./setup_rosa_vpc_with_terraform.sh
```

**Save the output subnet IDs. Example output:**
```
cluster-private-subnet = "<your-cluster-private-subnet-id>"
cluster-public-subnet = "<your-cluster-public-subnet-id>"
node-private-subnet = "<your-node-private-subnet-id>"
```

### Step 10: Create ROSA OIDC Configuration

```bash
rosa create oidc-config --mode=auto --hosted-cp
```

**Save the OIDC provider ARN and ID from the output. Example:**
```
arn:aws:iam::<your-aws-account-id>:oidc-provider/<your-oidc-provider-url>
```

**Extract the OIDC Config ID:**
```
OIDC_CONFIG_ID: <your-oidc-config-id>
```

### Step 11: Create ROSA Account Roles

```bash
rosa create account-roles --force-policy-creation --prefix <your-prefix> --hosted-cp
```

### Step 12: Create ROSA Operator Roles

Replace `OIDC_CONFIG_ID` with your actual OIDC config ID:

```bash
rosa create operator-roles --prefix <your-prefix> --oidc-config-id <your-oidc-config-id> --hosted-cp
```

---

## Part 3: Deploy ROSA HCP Cluster

### Step 13: Create Namespace

```bash
oc create ns ns-rosa-hcp
```

### Step 14: Apply AWS Identity Configuration

```bash
oc apply -f awsIdentity.yaml
```

### Step 15: Create OCM Client Secret

Run the secret creation script:

```bash
./create-ocmclient-secret.sh
```

### Step 16: Update Cluster Configuration File

Edit `capi-pr5686-test.yml` and update the following:

**1. Update subnets in RosaControlPlane spec:**
```yaml
spec:
  subnets:
    - <your-cluster-private-subnet-id>
    - <your-cluster-public-subnet-id>
    - <your-node-private-subnet-id>
```

**2. Update AutoNode configuration:**
```yaml
spec:
  autoNode:
    mode: enabled
    roleARN: arn:aws:iam::<your-aws-account-id>:role/<your-prefix>-autonode-operator-role
```

### Step 17: Create ROSA HCP Cluster

```bash
oc apply -f capi-pr5686-test.yml
```

---

## Verification

### Check Cluster Resources

```bash
# Check all resources in namespace
oc get all -n ns-rosa-hcp

# Check RosaControlPlane
oc get rosacontrolplane -n ns-rosa-hcp

# Check Cluster status
oc get cluster -n ns-rosa-hcp

# Describe RosaControlPlane for details
oc describe rosacontrolplane -n ns-rosa-hcp
```

### Check CAPA Controller

```bash
# Verify controller is using correct image
oc get deployment capa-controller-manager -n capa-system -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check controller logs
oc logs -n capa-system deployment/capa-controller-manager -f
```

### Verify AutoNode Configuration

```bash
# Check if AutoNode policy exists
aws iam get-policy-version \
  --policy-arn arn:aws:iam::<your-aws-account-id>:policy/autonode-private-preview \
  --version-id v1

# Verify AutoNode role
aws iam get-role --role-name <your-prefix>-autonode-operator-role
```

### Check Cluster in ROSA

```bash
# List ROSA clusters
rosa list clusters

# Describe the cluster
rosa describe cluster --cluster <cluster-name>
```

---

## Troubleshooting

### Common Issues

**Issue: CAPA controller not starting**
- Check logs: `oc logs -n capa-system deployment/capa-controller-manager`
- Verify image is correct: `oc get deploy -n capa-system capa-controller-manager -o yaml | grep image`
- Check pod events: `oc get events -n capa-system --sort-by='.lastTimestamp'`

**Issue: Cluster not creating**
- Check RosaControlPlane status: `oc describe rosacontrolplane -n ns-rosa-hcp`
- Verify subnets exist in AWS: `aws ec2 describe-subnets --subnet-ids <subnet-id>`
- Check OIDC config: `rosa list oidc-config`
- Verify OCM client secret exists: `oc get secret -n ns-rosa-hcp`

**Issue: AutoNode not working**
- Verify IAM role exists: `aws iam get-role --role-name <your-prefix>-autonode-operator-role`
- Check policy is attached: `aws iam list-attached-role-policies --role-name <your-prefix>-autonode-operator-role`
- Verify roleARN in RosaControlPlane: `oc get rosacontrolplane -n ns-rosa-hcp -o yaml | grep roleARN`

**Issue: Subnets not found**
- Re-run Terraform script: `./setup_rosa_vpc_with_terraform.sh`
- Verify subnets in AWS console or CLI: `aws ec2 describe-subnets --filters "Name=vpc-id,Values=<vpc-id>"`

### Useful Commands

```bash
# Check all ROSA resources
oc get rosacontrolplane,cluster,machine -A

# View events in namespace
oc get events -n ns-rosa-hcp --sort-by='.lastTimestamp'

# Check kind cluster
kind get clusters
kubectl cluster-info --context kind-capa-karpenter-test

# List all CRDs
kubectl get crd | grep rosa

# Check VPC and subnets
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=*rosa*"
aws ec2 describe-subnets --filters "Name=tag:Name,Values=*rosa*"
```

---

## Cleanup

### Delete ROSA Cluster

```bash
oc delete -f capi-pr5686-test.yml
```

### Delete ROSA Operator Roles

```bash
rosa delete operator-roles --prefix <your-prefix> --hosted-cp
```

### Delete ROSA Account Roles

```bash
rosa delete account-roles --prefix <your-prefix> --hosted-cp
```

### Delete OIDC Config

```bash
rosa delete oidc-config --oidc-config-id <your-oidc-config-id>
```

### Delete VPC with Terraform

```bash
# Navigate to Terraform directory and run
terraform destroy
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

## Important Notes

- **Subnet IDs**: Always save the subnet IDs from the Terraform output - you'll need them for the cluster configuration
- **OIDC Config ID**: Save the OIDC config ID - it's needed for creating operator roles
- **Role Prefix**: Choose a consistent prefix and use it across all commands (e.g., `test-prefix`)
- **AutoNode Role**: The AutoNode IAM role must exist before creating the cluster with AutoNode enabled
- **Image**: Make sure to use the custom Quay image for testing the Karpenter PR changes

---

## Quick Reference

**Environment Variables:**
```bash
export AWS_REGION=<your-aws-region>
export REGION=<your-aws-region>
export CLUSTER_NAME=<your-cluster-name>
export EXP_ROSA="true"
export EXP_MACHINE_POOL="true"
export CLUSTER_TOPOLOGY="true"
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)
```

**Key Files:**
- `<path-to-capa-source>/cluster-api-provider-aws` - CAPA source code
- `./setup_rosa_vpc_with_terraform.sh` - VPC setup script
- `./create-ocmclient-secret.sh` - OCM secret script
- `awsIdentity.yaml` - AWS identity configuration
- `capi-pr5686-test.yml` - ROSA HCP cluster configuration

**Key Images:**
- Custom CAPA: `quay.io/<your-username>/cluster-api-aws-controller-amd64:dev`

**Key AWS Resources:**
- AutoNode Policy: `arn:aws:iam::<your-aws-account-id>:policy/autonode-private-preview`
- AutoNode Role: `arn:aws:iam::<your-aws-account-id>:role/<your-prefix>-autonode-operator-role`
