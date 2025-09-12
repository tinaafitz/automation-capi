# Versioned Templates System

## Overview

This repository now supports multiple OpenShift versions (4.18, 4.19, 4.20) with version-specific templates and features. The new versioned system provides automatic template resolution, feature validation, and backward compatibility.

## Quick Start

### Option 1: Interactive Assistant (Recommended)
```bash
./capi_assistant
# Now includes version selection as the first prompt
```

### Option 2: Direct Version-Aware Cluster Creation
```bash
./create_cluster_with_version 4.19 my-cluster-name
```

### Option 3: Manual Playbook Execution
```bash
ansible-playbook create_rosa_hcp_cluster_versioned.yaml
```

## Directory Structure

```
templates/
├── versions/                    # Version-specific templates
│   ├── 4.18/                   # OpenShift 4.18 - Stable/Basic
│   │   ├── cluster-configs/
│   │   │   └── rosa-control-plane.yaml.j2
│   │   ├── machine-pools/
│   │   │   └── standard-pool.yaml.j2
│   │   └── features/
│   ├── 4.19/                   # OpenShift 4.19 - Current/Enhanced
│   │   ├── cluster-configs/
│   │   │   └── rosa-control-plane.yaml.j2
│   │   ├── machine-pools/
│   │   │   └── enhanced-pool.yaml.j2
│   │   └── features/
│   │       ├── rcp-external-oidc.yaml
│   │       ├── rcp-cluster-autoscaler-expander.yaml
│   │       └── [other 4.19 features]
│   └── 4.20/                   # OpenShift 4.20 - Latest/Premium
│       ├── cluster-configs/
│       │   └── rosa-control-plane.yaml.j2
│       ├── machine-pools/
│       │   └── premium-pool.yaml.j2
│       └── features/
├── common/                     # Version-agnostic templates
│   ├── capa-manager-bootstrap-credentials.yaml.j2
│   └── results.xml.j2
└── schemas/                    # Version definitions and compatibility
    ├── feature-matrix.yml
    └── version-compatibility.yml
```

## Version Features Comparison

| Feature | 4.18 (Stable) | 4.19 (Enhanced) | 4.20 (Premium) |
|---------|----------------|------------------|-----------------|
| **Basic ROSA HCP** | ✅ | ✅ | ✅ |
| **Multi-AZ Deployment** | ❌ | ✅ | ✅ |
| **External OIDC** | ❌ | ✅ | ✅ |
| **Cluster Autoscaler** | Basic | Enhanced | AI-Optimized |
| **Spot Instances** | ❌ | ✅ | ✅ Advanced |
| **Custom Disk Sizes** | ❌ | ✅ | ✅ NVMe |
| **GPU Support** | ❌ | ❌ | ✅ |
| **Multi-Architecture** | ❌ | ❌ | ✅ |
| **Enhanced Security** | ❌ | ❌ | ✅ |
| **Service Mesh** | ❌ | ❌ | ✅ |
| **Edge Computing** | ❌ | ❌ | ✅ |

## Template Resolution

The system uses intelligent template resolution with fallback:

1. **Version-specific**: `templates/versions/{version}/{category}/{template}`
2. **Feature-specific**: `templates/versions/{version}/features/{template}`
3. **Common fallback**: `templates/common/{template}`

### Example Resolution
```yaml
# For OpenShift 4.19 cluster config:
# 1. Try: templates/versions/4.19/cluster-configs/rosa-control-plane.yaml.j2 ✅
# 2. If not found: templates/common/rosa-control-plane.yaml.j2
# 3. If not found: Error
```

## Configuration Variables

### Version Selection (vars/vars.yml)
```yaml
# Version Management
openshift_version: "4.19"                    # Default version
supported_versions: ["4.18", "4.19", "4.20"]
template_version_path: "templates/versions/{{ openshift_version }}"
common_template_path: "templates/common"
```

### Version-Specific Features
The system automatically loads feature matrices and validates compatibility based on selected version.

## Usage Examples

### Basic Cluster Creation (4.18)
```yaml
# Minimal configuration for stable deployment
openshift_version: "4.18"
cluster_name: "stable-cluster"
instance_type: "m5.large"
replicas: 3
```

### Enhanced Cluster with External OIDC (4.19)
```yaml
openshift_version: "4.19"
cluster_name: "enhanced-cluster"
enable_external_oidc: true
external_oidc_config:
  issuer_url: "https://auth.example.com"
  client_id: "rosa-cluster"
enable_cluster_autoscaler: true
autoscaler_expander: "least-waste"
```

### Premium AI/ML Cluster (4.20)
```yaml
openshift_version: "4.20"
cluster_name: "ai-cluster"
enable_gpu_instances: true
gpu_type: "nvidia-tesla-v100"
gpu_count: 2
enable_multi_arch: true
architecture: "arm64"
enable_enhanced_security: true
```

## Migration and Backward Compatibility

### Existing Users
The new system maintains backward compatibility:
- Existing playbooks continue to work
- `templates/4_19_tests/` symlinked to new location
- Original file paths preserved

### Migration Steps
1. **Automatic Migration**: Run the migration script
   ```bash
   ./migrate_to_versioned_structure.sh
   ```

2. **Validation**: Verify migration success
   ```bash
   ./validate_migration.sh
   ```

3. **Rollback** (if needed):
   ```bash
   ./rollback_migration.sh backup_20240912_143000
   ```

## Advanced Usage

### Custom Feature Selection
```bash
# Set specific features for a version
ansible-playbook create_rosa_hcp_cluster_versioned.yaml \
  -e "openshift_version=4.19" \
  -e "requested_features=['external_oidc','cluster_autoscaler_expander']"
```

### Template Development
Add new version-specific templates:
```bash
# Create new feature template
templates/versions/4.20/features/my-new-feature.yaml

# System automatically detects and uses it
```

### Version Validation
```yaml
# System validates feature availability
- name: Check feature compatibility
  fail:
    msg: "Feature 'gpu_support' requires OpenShift 4.20+"
  when: 
    - enable_gpu_instances | default(false)
    - openshift_version is version('4.20', '<')
```

## Troubleshooting

### Common Issues

1. **Template Not Found**
   ```
   Error: Template 'my-template' not found in any location
   ```
   **Solution**: Check template exists in version-specific or common directory

2. **Feature Not Available**
   ```
   Error: Feature 'external_oidc' not available in OpenShift 4.18
   ```
   **Solution**: Upgrade to 4.19+ or remove the feature

3. **Version Selection Issues**
   ```
   Error: Invalid OpenShift version: 4.17
   ```
   **Solution**: Use supported versions: 4.18, 4.19, 4.20

### Debug Mode
Enable template resolution debugging:
```yaml
template_debug: true
```

### Validation Commands
```bash
# Check version compatibility
ansible-playbook validate_version.yaml -e "openshift_version=4.20"

# List available features
ansible-playbook list_features.yaml -e "openshift_version=4.19"

# Test template resolution
ansible-playbook test_templates.yaml -e "openshift_version=4.18"
```

## Development Guidelines

### Adding New Versions
1. Create version directory: `templates/versions/4.21/`
2. Add to supported versions: `vars/vars.yml`
3. Update feature matrix: `templates/schemas/feature-matrix.yml`
4. Create version-specific templates
5. Test compatibility

### Template Best Practices
- Use consistent variable naming across versions
- Implement graceful feature degradation
- Include version-specific comments
- Test with multiple configurations

### Feature Development
- Define feature availability in `feature-matrix.yml`
- Add validation rules in `version-compatibility.yml`
- Create version-specific implementations
- Document breaking changes

## Support and Maintenance

### Version Lifecycle
- **4.18**: Stable - Basic features, long-term support
- **4.19**: Current - Enhanced features, recommended for production
- **4.20**: Latest - Premium features, early adoption

### Deprecation Policy
- Features deprecated with 6-month notice
- Old versions supported for 12 months
- Migration guides provided for breaking changes

### Getting Help
- Check logs: `{{ output_dir }}/template-resolution.log`
- Validation: `./validate_migration.sh`
- Issues: Review `VERSION_ORGANIZATION_PLAN.md`

## Contributing

When contributing new features:
1. Update feature matrix
2. Create templates for appropriate versions
3. Add validation rules
4. Test across all supported versions
5. Update documentation