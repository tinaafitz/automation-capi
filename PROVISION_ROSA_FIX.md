# ROSA HCP Provisioning - Context Switching Fix

## Problem Identified

The ROSA HCP cluster provisioning was failing with error:
```
dial tcp: lookup api.tf-combom.8jk3.s3.devshift.org on 10.11.5.19:53: no such host
```

This error occurred because the provisioning was trying to connect to a non-existent OpenShift cluster instead of the local Kind cluster.

## Root Cause

The automatic Kind cluster context switching code existed in the role's `main.yml` file (lines 4-21), but was **NOT being executed** when the role was called from the UI. The backend's Ansible wrapper was including the tasks file, but the role structure was incorrect for how the backend calls it.

## Solution Applied

**File:** `/Users/tinafitzgerald/acm_dev/automation-capi/tasks/provision-rosa-hcp-cluster.yml`

**Changes Made:**

1. **Restructured as complete playbook**: Changed from using `include_role` to being a complete, standalone playbook with `hosts`, `gather_facts`, and `vars`

2. **Moved context switching to task level**: Put the Kind cluster detection and context switching logic BEFORE the provisioning block:
   ```yaml
   tasks:
     - name: Get active Kind cluster name
       shell: kind get clusters | head -1
       register: kind_cluster_result

     - name: Set kubectl context to Kind cluster
       shell: kubectl config use-context kind-{{ kind_cluster_result.stdout }}
       when: kind_cluster_result.stdout is defined and kind_cluster_result.stdout != ""

     - name: Provision ROSA HCP resources
       block:
         # All provisioning tasks here
   ```

3. **Inlined all provisioning tasks**: Removed the `include_role` dependency and put all provisioning tasks directly in the playbook, eliminating the role path resolution issue

## How It Works Now

When the user clicks "Provision ROSA HCP" button:

1. Backend calls `ansible-playbook tasks/provision-rosa-hcp-cluster.yml`
2. Playbook runs **Get active Kind cluster name** task first
3. Playbook runs **Set kubectl context to Kind cluster** task second
4. **ONLY THEN** does provisioning begin (Create namespace, Apply AWS Identity, etc.)

## Testing the Fix

To test that this fix works:

1. Click "Provision ROSA HCP" button in the UI
2. Check the Ansible output modal - you should now see:
   ```
   TASK [Get active Kind cluster name] ********************************************
   ok: [localhost] => {"stdout": "capa-combo-test", ...}

   TASK [Set kubectl context to Kind cluster] *************************************
   ok: [localhost] => {"stdout": "Switched to context \"kind-capa-combo-test\".", ...}

   TASK [Display context switch result] *******************************************
   ok: [localhost] => {
       "msg": "Switched to Kind cluster context: kind-capa-combo-test"
   }

   TASK [Provision ROSA HCP resources] ********************************************
   ```

3. Provisioning should now proceed against the Kind cluster instead of failing with "no such host" error

## Files Modified

1. **`/Users/tinafitzgerald/acm_dev/automation-capi/tasks/provision-rosa-hcp-cluster.yml`**
   - Complete rewrite from role-based to inline playbook
   - Added context switching tasks at beginning
   - Inlined all provisioning tasks from the role

2. **`/Users/tinafitzgerald/acm_dev/automation-capi/roles/provision-rosa-hcp-cluster/tasks/main.yml`**
   - Removed duplicate context switching code (lines 4-21)
   - Role now starts directly with "Create namespace" task
   - Role can still be called independently if needed

## Why The Previous Fix Didn't Work

The role file DID have the context switching code, but:
- The backend's Ansible wrapper was calling the tasks file, not the role directly
- The tasks file was using `include_role`, which required specific role paths
- Ansible couldn't find the role because it was searching from the `tasks/` directory perspective
- Even when it found the role, the wrapper wasn't preserving the role's initial tasks

## Verification

Run the playbook manually to verify it works:

```bash
cd /Users/tinafitzgerald/acm_dev/automation-capi
ansible-playbook tasks/provision-rosa-hcp-cluster.yml -e rosa_hcp_cluster_file=capi-network-roles-autonode-test.yml -v
```

Expected output should show:
1. Kind cluster detection
2. Context switch to `kind-capa-combo-test`
3. Namespace creation in Kind cluster
4. AWS Identity application
5. OCM secret creation
6. Cluster definition application

## Date Fixed

2025-10-22 11:30 AM
