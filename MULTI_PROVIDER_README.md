# Multi-Provider Support for Automation CAPI

This implementation adds support for multiple cloud providers (AWS and Azure) to the automation-capi project while maintaining backward compatibility with existing AWS/ROSA functionality.

## Quick Start

### Using AWS (Default - No Changes Required)
```bash
# Existing functionality works unchanged
./create_rosa_hcp_cluster.yaml
```

### Using Azure (New)
```bash
# Set provider in vars/user_vars.yml
cloud_provider: "azure"

# Or override at runtime
ansible-playbook create_cluster.yaml -e cloud_provider=azure
```

### Using Multi-Provider Playbooks
```bash
# Configure environment for selected provider
ansible-playbook configure_environment.yaml

# Create cluster using selected provider  
ansible-playbook create_cluster.yaml

# Test multi-provider functionality
ansible-playbook test_multi_provider.yaml
```

## Architecture

### Provider Structure
```
providers/
├── aws/          # AWS/CAPA provider (migrated from existing code)
├── azure/        # Azure/CAPZ provider (new)
└── common/       # Shared provider functionality
```

### Configuration
- `cloud_provider` variable selects active provider (default: "aws")
- Provider-specific configurations in `providers/{provider}/vars/main.yml`
- Common settings in `providers/common/vars/main.yml`

### Templates
- Provider-specific templates in `providers/{provider}/templates/`
- Versioned templates support maintained
- Common templates in `providers/common/templates/`

## Azure Provider Configuration

### Required Environment Variables
```bash
export AZURE_CLIENT_ID="your-service-principal-id"
export AZURE_CLIENT_SECRET="your-service-principal-secret"  
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_TENANT_ID="your-tenant-id"
```

### Azure-Specific Variables (vars/user_vars.yml)
```yaml
cloud_provider: "azure"
cluster_name: "my-aks-cluster"
azure_location: "East US"
azure_vm_size: "Standard_D2s_v3"
machine_pool_node_count: 3
```

## Provider Capabilities

### AWS Provider (Existing)
- ✅ ROSA HCP cluster creation/deletion
- ✅ CAPA provider configuration
- ✅ AWS credential management
- ✅ Multi-version support
- ✅ All existing functionality preserved

### Azure Provider (New)
- ✅ AKS cluster creation
- ✅ CAPZ provider configuration
- ✅ Azure credential management
- ✅ Machine pool management
- ✅ Multi-version template support

## Backward Compatibility

- All existing AWS playbooks work unchanged
- Default provider remains "aws"
- No breaking changes to existing configurations
- Gradual migration path available

## Testing

```bash
# Test provider configurations
ansible-playbook test_multi_provider.yaml

# Test AWS provider (existing functionality)
ansible-playbook create_rosa_hcp_cluster.yaml -e skip_ansible_runner=true

# Test Azure provider
ansible-playbook create_cluster.yaml -e cloud_provider=azure -e skip_ansible_runner=true
```

## Migration Path

### For Existing Users
1. **No immediate action required** - AWS remains default
2. **Optional**: Add `cloud_provider: "aws"` to user_vars.yml for clarity
3. **Future**: Migrate to new multi-provider playbooks when ready

### For New Azure Users
1. Set up Azure credentials (Service Principal)
2. Configure `cloud_provider: "azure"` in user_vars.yml
3. Use new multi-provider playbooks or Azure-specific equivalents

## Future Providers

The architecture supports easy addition of:
- Google Cloud Platform (CAPG)
- OpenStack (CAPO) 
- vSphere (CAPV)
- Bare Metal (CAPM3)

## Troubleshooting

### Provider Selection Issues
```bash
# Verify provider configuration
ansible-playbook test_multi_provider.yaml

# Check provider variables
cat providers/aws/vars/main.yml
cat providers/azure/vars/main.yml
```

### Azure Credential Issues
```bash
# Verify Azure credentials
az login
az account show

# Test credential environment variables
echo $AZURE_CLIENT_ID
echo $AZURE_SUBSCRIPTION_ID
```

### Template Issues
```bash
# Check template generation
ansible-playbook create_cluster.yaml --check -v
```

## Contributing

When adding new features:
1. Consider multi-provider support from the start
2. Provider-specific code goes in `providers/{provider}/`
3. Common functionality goes in `providers/common/`
4. Update tests in `test_multi_provider.yaml`
5. Document provider-specific requirements