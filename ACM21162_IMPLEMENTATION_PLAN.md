# ACM-21162 Implementation Plan

## Overview
Implementation plan for testing the new ROSARoleConfig functionality in OpenShift 4.20 that automates AWS IAM role creation for ROSA HCP clusters.

## Key Functionality Being Tested
The ROSARoleConfig API (from CAPA PR #5499/#5667) that automatically:
- Creates AWS IAM **Account Roles** (Installer, Support, Worker)
- Creates AWS IAM **Operator Roles** (Ingress, Image Registry, Storage, etc.)
- Configures **OIDC Provider** for cluster authentication
- Eliminates manual `rosa create account-roles` and `rosa create operator-roles` steps

## Framework Analysis
Existing automation framework has:
- Multi-version support (4.18, 4.19, 4.20) in `vars/vars.yml:14`
- Template versioning structure under `templates/versions/`
- 4.20 cluster configs already exist at `templates/versions/4.20/cluster-configs/`
- ROSARoleConfig sample exists in `rosa_role_config.yaml`

## Required Code Changes

### 1. Create 4.20 ROSARoleConfig Templates
**Location**: `templates/versions/4.20/features/`
**Files**:
- `rosa-role-config.yaml.j2` - Template for ROSARoleConfig with variable substitution
- `rosa-role-config-test.yaml` - Test configuration for ACM-21162
- `rosa-capi-roles-cluster.yaml.j2` - Full cluster template using ROSARoleConfig

### 2. New Ansible Tasks for ROSARoleConfig
**Location**: `tasks/`
**Files**:
- `create_rosa_role_config.yml` - Task to create ROSARoleConfig
- `validate_rosa_role_config.yml` - Verify role creation status
- `wait_for_rosa_roles.yml` - Wait for AWS IAM roles to be created
- `cleanup_rosa_role_config.yml` - Delete ROSARoleConfig and roles

### 3. Environment Setup for ACM-21162
**Location**: Root directory
**File**: `acm21162_environment_setup.yaml`
**Tasks**:
- Kind cluster creation with proper feature flags
- CAPI/CAPA initialization with 4.20.0-rc.0 image
- CRD application (Robin's development CRDs)
- ClusterRole permission updates

### 4. CAPA Controller Management
**Location**: `tasks/`
**Files**:
- `update_capa_controller_image.yml` - Patch deployment with 4.20 image
- `update_capa_clusterrole.yml` - Add ROSARoleConfig permissions
- `verify_capa_controller.yml` - Validate controller is ready

### 5. End-to-End ACM-21162 Test Playbook
**Location**: Root directory
**File**: `test_acm21162_rosa_role_config.yaml`
**Flow**:
1. Environment setup
2. ROSARoleConfig creation
3. ROSA HCP cluster creation
4. Validation that roles were auto-created
5. Cluster operation tests
6. Cleanup

### 6. Enhanced Variables for 4.20
**Location**: `vars/vars.yml`
**Additions**:
```yaml
# ACM-21162 Testing
rosa_role_config:
  enabled: true
  prefix: "{{ cluster_name_prefix }}"
  version: "4.20"

capa_controller_420:
  image: "quay.io/melserng/cluster-api-aws-controller-amd64:dev"
  tag: "4.20.0-rc.0"
```

### 7. Validation Tasks
**Location**: `tasks/`
**Files**:
- `validate_aws_roles_created.yml` - Check AWS IAM roles exist
- `validate_oidc_provider.yml` - Verify OIDC provider configuration
- `compare_manual_vs_automated.yml` - Test both approaches

## Test Scenarios
1. **Positive Flow**: ROSARoleConfig → Auto role creation → Successful cluster
2. **Permission Test**: Verify CAPA controller has ROSARoleConfig permissions
3. **Version Test**: Test with different OpenShift versions (4.18, 4.20)
4. **Cleanup Test**: Ensure roles are properly deleted with cluster
5. **Error Handling**: Invalid configurations, AWS permission issues

## Integration with Existing Framework
- Extends `configure_capa_environment.yaml` for 4.20 setup
- Enhances `create_rosa_hcp_cluster.yaml` with ROSARoleConfig workflow
- Adds validation tasks to `verify_capa_environment.yaml`
- Updates `vars/vars.yml` with 4.20 configuration options

## Implementation Status
- [x] Framework analysis complete
- [x] Templates created
- [x] Tasks implemented
- [x] Playbooks created
- [x] Variables updated
- [x] Validation tasks added
- [x] Testing complete