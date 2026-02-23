# FIPS Testing Guide - UI & Playbook Integration

This guide explains how to test the FIPS implementation through the UI and Ansible playbooks.

## Overview

The FIPS feature adds support for FIPS-compliant cryptographic libraries in ROSA HCP clusters. This is only available in **OpenShift 4.21+**.

## Testing Steps

### Step 1: Build Custom CAPA Controller Image

Since the FIPS code is on the `add_fips_support` branch in your fork, you need to build a custom CAPA controller image.

#### Option A: Build Locally with Docker/Podman

```bash
cd ~/acm_dev/cluster-api-provider-aws
git checkout add_fips_support

# Build the CAPA controller image
make docker-build IMG=quay.io/tinaafitz/cluster-api-aws-controller:fips-test

# Push to quay.io (requires login)
podman login quay.io
make docker-push IMG=quay.io/tinaafitz/cluster-api-aws-controller:fips-test
```

#### Option B: Use GitHub Actions (if available)

If your fork has GitHub Actions enabled, the CAPA repo typically builds images automatically for PRs.

### Step 2: Deploy Custom CAPA Image to Test Environment

Use the UI's **Reconfigure** feature on the Minikube dashboard:

1. Navigate to **Minikube Dashboard → Configure**
2. Click **Reconfigure** button
3. Check **"Use Custom CAPA Image"**
4. Enter:
   - **Image Repository**: `quay.io/tinaafitz/cluster-api-aws-controller`
   - **Image Tag**: `fips-test`
5. Click **Apply Reconfiguration**

This will:
- Update the CAPA controller deployment with your custom image
- Restart the controller pods
- Make the FIPS field available in the API

### Step 3: Update UI to Add FIPS Checkbox

The `RosaProvisionModal.js` needs to be updated to:
1. Add FIPS toggle in the form
2. Only show for OpenShift 4.21+
3. Pass the FIPS value to the backend

**File**: `/Users/tinafitzgerald/acm_dev/automation-capi/ui/frontend/src/components/RosaProvisionModal.js`

**Changes needed**:
1. Add `fips: false` to the config state (line 72)
2. Add FIPS checkbox in the "Cluster Configuration" section (after line 543)
3. Only enable for OpenShift version 4.21+

### Step 4: Update Ansible Template

The ROSAControlPlane template needs to include the FIPS field.

**Files to update**:
- `/Users/tinafitzgerald/acm_dev/automation-capi/templates/rosa-control-plane.yaml.j2`
- `/Users/tinafitzgerald/acm_dev/automation-capi/roles/capa-cluster-create-rosa-hcp/templates/rosa-control-plane.yaml.j2`

**Add**:
```yaml
spec:
  version: "{{ rcp_version }}"
  fips: {{ fips | default(false) | bool }}
```

### Step 5: Test End-to-End

1. **Verify CAPI is using custom image**:
   ```bash
   kubectl get deployment -n capi-system capi-aws-controller-manager -o yaml | grep image:
   ```

2. **Provision test cluster with FIPS enabled**:
   - Open UI at http://localhost:3000
   - Navigate to Minikube Dashboard → Provision
   - Select **OpenShift Version 4.21.0**
   - Check **"Enable FIPS Mode"** checkbox
   - Fill in other required fields
   - Click **Preview & Provision**

3. **Verify FIPS field in CRD**:
   ```bash
   kubectl get rosacontrolplane test-fips-cluster -n ns-rosa-hcp -o yaml | grep fips
   ```

   Should show:
   ```yaml
   spec:
     fips: true
   ```

4. **Check ROSA cluster in AWS**:
   - After cluster provisions (10-20 minutes)
   - Verify FIPS is enabled via ROSA CLI:
     ```bash
     rosa describe cluster test-fips-cluster
     ```

   Look for: `FIPS mode: enabled`

## Version Compatibility

| OpenShift Version | FIPS Support |
|-------------------|--------------|
| 4.21.0+ | ✅ Supported |
| 4.20.x | ❌ Not supported |
| 4.19.x | ❌ Not supported |

## Troubleshooting

### FIPS field not appearing in CRD
- Verify custom CAPA image is deployed
- Check CRD has been updated: `kubectl get crd rosacontrolplanes.controlplane.cluster.x-k8s.io -o yaml | grep fips`

### FIPS checkbox not showing in UI
- Verify you selected OpenShift 4.21+
- Check browser console for errors
- Ensure frontend has been rebuilt: `cd ui/frontend && npm run build`

### Cluster provisioning fails with FIPS enabled
- Check ROSA version supports FIPS (4.21+)
- Review controller logs: `kubectl logs -n capi-system deployment/capi-aws-controller-manager -f`

## Code Changes Required

See the following sections for exact code changes needed in the UI and playbooks.
