# Multi-Provider Architecture Plan

## Overview
This document outlines the plan to modify the automation-capi codebase to support multiple cloud providers (AWS, Azure, and future providers) while maintaining backward compatibility with existing AWS/CAPA functionality.

## Current State Analysis

### AWS/CAPA Implementation
The current codebase is AWS-specific with:
- **CAPA-focused roles**: `configure-capa-environment`, `capa-cluster-create-rosa-hcp`, `capa-cluster-delete-rosa-hcp`
- **ROSA-specific templates**: `rosa-control-plane.yaml.j2`, `capa-manager-bootstrap-credentials.yaml.j2`
- **AWS credential management**: `create_aws_credentials.yml`, `create_rosa_creds_secret.yml`
- **Hardcoded AWS namespaces**: `capa_system_namespace: "multicluster-engine"`
- **AWS-specific variables**: `rosa_creds_secret`, `capa_pod_label`, etc.

## Proposed Multi-Provider Framework

### 1. Provider Abstraction Layer

```
providers/
├── aws/
│   ├── tasks/
│   │   ├── main.yml
│   │   ├── create_credentials.yml
│   │   ├── configure_environment.yml
│   │   ├── create_cluster.yml
│   │   ├── delete_cluster.yml
│   │   └── validate_environment.yml
│   ├── templates/
│   │   ├── rosa-control-plane.yaml.j2
│   │   ├── capa-manager-bootstrap-credentials.yaml.j2
│   │   └── aws-cluster-role-config.yaml.j2
│   ├── vars/
│   │   └── main.yml
│   └── defaults/
│       └── main.yml
├── azure/
│   ├── tasks/
│   │   ├── main.yml
│   │   ├── create_credentials.yml
│   │   ├── configure_environment.yml
│   │   ├── create_cluster.yml
│   │   ├── delete_cluster.yml
│   │   └── validate_environment.yml
│   ├── templates/
│   │   ├── aks-control-plane.yaml.j2
│   │   ├── capz-manager-bootstrap-credentials.yaml.j2
│   │   └── azure-cluster-config.yaml.j2
│   ├── vars/
│   │   └── main.yml
│   └── defaults/
│       └── main.yml
└── common/
    ├── tasks/
    │   ├── main.yml
    │   ├── login_cluster.yml
    │   ├── prepare_ansible_runner.yml
    │   └── create_output_folder.yml
    ├── templates/
    │   └── cluster-base.yaml.j2
    └── vars/
        └── main.yml
```

### 2. Configuration Updates

#### Core Variables (vars/vars.yml)
```yaml
# Provider Configuration
cloud_provider: "aws"  # aws, azure
supported_providers: ["aws", "azure"]

# Provider-specific namespaces will be loaded dynamically
provider_config_path: "providers/{{ cloud_provider }}"
```

#### Provider-Specific Variables

**AWS Provider (providers/aws/vars/main.yml)**:
```yaml
provider_name: "aws"
provider_display_name: "Amazon Web Services"
provider_namespace: "multicluster-engine"
credential_secret_name: "rosa-creds-secret"
control_plane_kind: "ROSAControlPlane"
infrastructure_kind: "ROSACluster"
machine_pool_kind: "ROSAMachinePool"
bootstrap_provider: "capa"
cluster_class: "rosa-hcp"

# AWS-specific settings
rosa_creds_secret: "rosa-creds-secret"
capa_pod_label: "infrastructure-aws"
aws_identity_name: "aws-cluster-controller-identity"
```

**Azure Provider (providers/azure/vars/main.yml)**:
```yaml
provider_name: "azure"
provider_display_name: "Microsoft Azure"
provider_namespace: "multicluster-engine"
credential_secret_name: "azure-creds-secret"
control_plane_kind: "AzureManagedControlPlane"
infrastructure_kind: "AzureManagedCluster"
machine_pool_kind: "AzureManagedMachinePool"
bootstrap_provider: "capz"
cluster_class: "aks"

# Azure-specific settings
azure_creds_secret: "azure-creds-secret"
capz_pod_label: "infrastructure-azure"
azure_identity_name: "azure-cluster-controller-identity"
```

### 3. Template Organization

```
templates/
├── providers/
│   ├── aws/
│   │   ├── versions/
│   │   │   ├── 4.18/
│   │   │   ├── 4.19/
│   │   │   └── 4.20/
│   │   └── common/
│   │       ├── rosa-control-plane.yaml.j2
│   │       └── capa-manager-bootstrap-credentials.yaml.j2
│   └── azure/
│       ├── versions/
│       │   ├── 4.18/
│       │   ├── 4.19/
│       │   └── 4.20/
│       └── common/
│           ├── aks-control-plane.yaml.j2
│           └── capz-manager-bootstrap-credentials.yaml.j2
├── common/
│   ├── cluster-base.yaml.j2
│   └── managed-cluster.yaml.j2
└── schemas/
    ├── feature-matrix.yml
    ├── version-compatibility.yml
    └── provider-compatibility.yml
```

### 4. Updated Playbook Structure

#### Main Playbooks (Provider-Agnostic)
- `create_cluster.yaml` - Dynamic provider selection
- `delete_cluster.yaml` - Dynamic provider selection  
- `upgrade_cluster.yaml` - Dynamic provider selection
- `configure_environment.yaml` - Dynamic provider setup

#### Provider-Specific Playbooks (Backward Compatibility)
- `create_rosa_hcp_cluster.yaml` - AWS-specific (existing)
- `create_aks_cluster.yaml` - Azure-specific (new)

### 5. Azure Provider Implementation

#### Azure Credential Management
```yaml
# tasks/create_azure_credentials.yml
- name: Create Azure Service Principal secret
  kubernetes.core.k8s:
    definition:
      apiVersion: v1
      kind: Secret
      metadata:
        name: "{{ azure_creds_secret }}"
        namespace: "{{ provider_namespace }}"
      type: Opaque
      data:
        clientId: "{{ azure_client_id | b64encode }}"
        clientSecret: "{{ azure_client_secret | b64encode }}"
        subscriptionId: "{{ azure_subscription_id | b64encode }}"
        tenantId: "{{ azure_tenant_id | b64encode }}"
```

#### Azure Cluster Templates
```yaml
# templates/providers/azure/common/aks-control-plane.yaml.j2
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureManagedControlPlane
metadata:
  name: "{{ cluster_name }}-control-plane"
  namespace: "{{ capi_namespace }}"
spec:
  version: "{{ cluster_version }}"
  resourceGroupName: "{{ cluster_name }}-rg"
  location: "{{ azure_location | default('East US') }}"
  networkPolicy: "{{ azure_network_policy | default('azure') }}"
  networkPlugin: "{{ azure_network_plugin | default('azure') }}"
  sku:
    tier: "{{ azure_sku_tier | default('Standard') }}"
```

### 6. Implementation Phases

#### Phase 1: Foundation (Week 1)
1. **Create provider directory structure**
2. **Update vars/vars.yml with provider selection logic**
3. **Create common provider interface tasks**
4. **Implement dynamic provider loading**

#### Phase 2: AWS Migration (Week 2)
1. **Move existing AWS/CAPA code to providers/aws/**
2. **Update all references and imports**
3. **Test AWS functionality with new structure**
4. **Ensure backward compatibility**

#### Phase 3: Azure Implementation (Week 3-4)
1. **Create Azure provider implementation**
2. **Implement CAPZ credential management**
3. **Create Azure cluster templates**
4. **Add Azure-specific task workflows**

#### Phase 4: Integration & Testing (Week 5)
1. **Update main playbooks for provider selection**
2. **Add comprehensive testing for both providers**
3. **Update documentation and examples**
4. **Performance and compatibility testing**

### 7. Backward Compatibility Strategy

- Existing AWS-specific playbooks remain functional
- Default `cloud_provider: "aws"` maintains current behavior
- Gradual migration path for existing users
- Provider-specific playbooks for direct access

### 8. Future Provider Support

The architecture supports easy addition of new providers:
- **Google Cloud (CAPG)**: GKE cluster support
- **OpenStack (CAPO)**: On-premises OpenStack clouds
- **vSphere (CAPV)**: VMware infrastructure
- **Bare Metal (CAPM3)**: Metal3 provider

### 9. Testing Strategy

#### Unit Testing
- Provider-specific task validation
- Template rendering verification
- Credential management testing

#### Integration Testing
- End-to-end cluster creation/deletion
- Multi-provider environment testing
- Version compatibility validation

#### Performance Testing
- Provider switching overhead
- Template generation performance
- Parallel provider operations

### 10. Migration Guide

#### For Existing Users
1. No immediate changes required - AWS remains default
2. Optional: Update to use new `cloud_provider` variable
3. New Azure users: Set `cloud_provider: "azure"` in user_vars.yml

#### For New Features
1. All new features should support both providers
2. Provider-specific features go in respective provider directories
3. Common functionality goes in common provider tasks

## Benefits

1. **Maintainability**: Clear separation of provider-specific logic
2. **Scalability**: Easy addition of new providers
3. **Flexibility**: Support for provider-specific features
4. **Compatibility**: Maintains existing AWS functionality
5. **Testability**: Isolated provider testing capabilities
6. **Documentation**: Clear provider-specific documentation structure

## Risks and Mitigation

1. **Complexity**: Mitigated by clear abstraction layers and documentation
2. **Performance**: Minimal overhead with lazy loading of provider configs
3. **Testing**: Comprehensive test matrix for provider combinations
4. **Migration**: Gradual migration path with backward compatibility

This architecture provides a solid foundation for multi-cloud cluster management while preserving the existing AWS/ROSA functionality and enabling future expansion.