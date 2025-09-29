# AutoNode Testing Guide for automation-capi

## Overview

This guide explains how to test PR #5686 AutoNode (Karpenter) functionality using the automation-capi repository. The AutoNode feature enables automatic node scaling in ROSA HCP clusters through Karpenter integration.

## Prerequisites

### 1. Environment Setup

- **OCP Hub Cluster:** Running with ACM/MCE installed
- **AWS Credentials:** Valid AWS access keys with appropriate permissions
- **ROSA CLI:** Logged into ROSA stage environment
- **OCM Credentials:** Valid OCM client ID and secret

### 2. IAM Role Requirements

Create a Karpenter IAM role with the required permissions (see `KARPENTER_IAM_PERMISSIONS.md`):

```bash
# Create the role with trust relationship for your ROSA cluster's OIDC provider
aws iam create-role --role-name KarpenterNodeRole \
  --assume-role-policy-document file://karpenter-trust-policy.json

# Attach required permissions policy
aws iam attach-role-policy --role-name KarpenterNodeRole \
  --policy-arn arn:aws:iam::YOUR-ACCOUNT:policy/KarpenterPolicy
```

### 3. CAPA Controller Update

Ensure your CAPA controller includes PR #5686 AutoNode support:

```bash
# Check current CAPA controller image
oc get deployment -n multicluster-engine capa-controller-manager \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Update to image with AutoNode support (if needed)
# This step depends on your environment and CAPA build process
```

## Configuration

### 1. Update User Variables

Copy and customize the AutoNode configuration:

```bash
cp vars/user_vars_autonode_example.yml vars/user_vars.yml
```

Edit `vars/user_vars.yml` with your specific values:

```yaml
# Required for AutoNode testing
AUTONODE_TESTING_ENABLED: true
AUTONODE_DEFAULT_MODE: "enabled"
AUTONODE_KARPENTER_ROLE_ARN: "arn:aws:iam::YOUR-ACCOUNT:role/KarpenterNodeRole"
AWS_ACCOUNT_ID: "YOUR-ACCOUNT-ID"
ROSA_OIDC_PROVIDER_URL: "your-cluster-oidc-provider-url"

# Your existing AWS and OCP credentials
OCP_HUB_API_URL: "https://api.your-cluster.domain.com:6443"
AWS_ACCESS_KEY_ID: "your-access-key"
AWS_SECRET_ACCESS_KEY: "your-secret-key"
# ... other required variables
```

## Testing Methods

### Method 1: Full End-to-End Testing

Run comprehensive AutoNode testing with multiple scenarios:

```bash
ansible-playbook end2end_tests_autonode.yaml -e "skip_ansible_runner=true"
```

This will:
- Validate AutoNode prerequisites
- Test AutoNode enabled cluster creation
- Test AutoNode disabled cluster creation (baseline)
- Validate Karpenter functionality
- Generate detailed test reports
- Clean up test resources

### Method 2: Individual Scenario Testing

Test specific AutoNode configurations:

```bash
# Test AutoNode enabled cluster
ansible-playbook create_rosa_hcp_cluster_with_autonode.yaml \
  -e "AUTONODE_DEFAULT_MODE=enabled" \
  -e "skip_ansible_runner=true"

# Test AutoNode disabled cluster (baseline)
ansible-playbook create_rosa_hcp_cluster_with_autonode.yaml \
  -e "AUTONODE_DEFAULT_MODE=disabled" \
  -e "skip_ansible_runner=true"
```

### Method 3: Manual Configuration Testing

Use pre-configured cluster templates:

```bash
# Test with AutoNode enabled template
oc apply -f rosa-control-plane-autonode-enabled.yaml

# Test with AutoNode disabled template
oc apply -f rosa-control-plane-autonode-disabled.yaml
```

## Validation Steps

### 1. Pre-Test Validation

Run validation tasks separately:

```bash
ansible-playbook -i localhost, tasks/validate_autonode_setup.yml \
  -e "skip_ansible_runner=true"
```

Expected output:
```
✅ AWS CLI available
✅ ROSA CLI logged in
✅ Role ARN format valid
✅ IAM Role exists
Ready for AutoNode Testing: YES
```

### 2. Monitor Cluster Creation

```bash
# Watch cluster creation progress
oc get clusters -n ns-rosa-hcp -w

# Check control plane status
oc get rosacontrolplanes -n ns-rosa-hcp -o yaml

# View AutoNode configuration
oc get rosacontrolplanes -n ns-rosa-hcp -o yaml | grep -A 10 autoNode
```

### 3. Validate AutoNode Functionality

For AutoNode enabled clusters:

```bash
# Check if cluster is ready
rosa describe cluster rosa-autonode-test

# Verify Karpenter installation (once cluster is ready)
oc get pods -n karpenter

# Test workload scaling
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: karpenter-test
spec:
  replicas: 5
  selector:
    matchLabels:
      app: karpenter-test
  template:
    metadata:
      labels:
        app: karpenter-test
    spec:
      containers:
      - name: test
        image: nginx:alpine
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
EOF

# Check if Karpenter provisions nodes
oc get nodes --show-labels | grep karpenter
```

## Expected Results

### AutoNode Enabled Cluster

1. **Cluster Creation:**
   - ROSAControlPlane shows `autoNode.mode: enabled`
   - Karpenter role ARN is configured
   - Cluster provisions successfully

2. **Karpenter Functionality:**
   - Karpenter pods are running in cluster
   - Test workloads trigger automatic node provisioning
   - Nodes are labeled with Karpenter information

3. **Scaling Behavior:**
   - Pods are scheduled quickly (< 60 seconds)
   - Nodes are provisioned automatically based on demand
   - Underutilized nodes are consolidated/removed

### AutoNode Disabled Cluster

1. **Cluster Creation:**
   - ROSAControlPlane shows `autoNode.mode: disabled`
   - Traditional machine pools are used
   - Cluster provisions successfully

2. **Traditional Scaling:**
   - Machine pool autoscaling works as expected
   - No Karpenter components are installed
   - Scaling follows traditional cluster autoscaler behavior

## Troubleshooting

### Common Issues

#### 1. IAM Role Not Found
```
Error: Role KarpenterNodeRole not found
```

**Solution:**
```bash
# Verify role exists
aws iam get-role --role-name KarpenterNodeRole

# Check role ARN format in configuration
grep AUTONODE_KARPENTER_ROLE_ARN vars/user_vars.yml
```

#### 2. OIDC Trust Relationship Issues
```
Error: role trust relationship does not match cluster OIDC provider
```

**Solution:**
```bash
# Get cluster OIDC provider URL
rosa describe cluster <cluster-name> --output json | jq '.aws.sts.oidc_endpoint_url'

# Update role trust relationship with correct OIDC provider
aws iam update-assume-role-policy --role-name KarpenterNodeRole \
  --policy-document file://updated-trust-policy.json
```

#### 3. Cluster Creation Failures
```
Error: AutoNode configuration validation failed
```

**Solution:**
```bash
# Check CAPA controller logs
oc logs -n multicluster-engine -l app.kubernetes.io/name=cluster-api-provider-aws --tail=100

# Verify cluster configuration
oc get rosacontrolplanes -n ns-rosa-hcp -o yaml

# Check cluster events
oc get events -n ns-rosa-hcp --sort-by='.lastTimestamp'
```

#### 4. Karpenter Not Installing
```
Cluster created but Karpenter pods not found
```

**Solution:**
```bash
# Wait for cluster to be fully ready
rosa describe cluster <cluster-name>

# Check cluster version compatibility
rosa describe cluster <cluster-name> --output json | jq '.version'

# Manual Karpenter installation (if needed)
# This should be automatic but may need manual intervention
```

### Diagnostic Commands

```bash
# Check AutoNode configuration
oc get rosacontrolplanes -n ns-rosa-hcp -o yaml | grep -A 10 autoNode

# Monitor CAPA controller
oc logs -n multicluster-engine -l app.kubernetes.io/name=cluster-api-provider-aws -f

# Check cluster status
oc get clusters,rosacontrolplanes,rosaclusters -n ns-rosa-hcp

# AWS resource validation
aws ec2 describe-instances --filters "Name=tag:karpenter.sh/cluster,Values=<cluster-name>"
aws iam get-role --role-name KarpenterNodeRole
```

## Test Reports

### Generated Reports

After running end-to-end tests, reports are generated in:

- **Detailed Report:** `results/autonode-tests/autonode-test-report-<timestamp>.md`
- **JSON Results:** `results/autonode-tests/autonode-test-results-<timestamp>.json`
- **Cleanup Report:** `results/autonode-tests/cleanup-report-<timestamp>.md`

### Report Contents

1. **Executive Summary:** Pass/fail rates, duration, environment details
2. **Scenario Results:** Individual test outcomes and metrics
3. **AutoNode Analysis:** Feature-specific validation results
4. **Troubleshooting:** Failed test analysis and remediation steps
5. **Next Steps:** Recommendations based on test outcomes

## Cleanup

### Automatic Cleanup

End-to-end tests clean up automatically (if configured):

```yaml
# In user_vars.yml
AUTONODE_TESTING:
  cleanup_on_success: true
  cleanup_on_failure: false
```

### Manual Cleanup

```bash
# Remove test clusters
oc delete cluster rosa-autonode-test rosa-autonode-disabled -n ns-rosa-hcp

# Remove test workloads
oc delete deployment karpenter-test autonode-scale-test -n default

# Clean up AWS resources (if needed)
aws ec2 describe-instances --filters "Name=tag:AutoNodeTesting,Values=true"
aws ec2 terminate-instances --instance-ids <instance-ids>
```

## Best Practices

1. **Test Both Modes:** Always test both enabled and disabled AutoNode modes
2. **Validate Prerequisites:** Run validation tasks before cluster creation
3. **Monitor Resources:** Watch AWS costs during testing
4. **Document Issues:** Capture logs and configurations for any failures
5. **Clean Up:** Remove test resources to avoid unnecessary AWS charges

## Getting Help

If you encounter issues during testing:

1. **Check Logs:** CAPA controller and cluster events
2. **Validate Configuration:** Role ARNs, OIDC providers, AWS permissions
3. **Review Documentation:** `KARPENTER_IAM_PERMISSIONS.md`, `AUTONODE_TROUBLESHOOTING_GUIDE.md`
4. **Contact Support:** Provide test reports and logs for assistance

---

*This guide is specific to testing PR #5686 AutoNode functionality in the automation-capi environment.*