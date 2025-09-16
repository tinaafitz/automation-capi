# CAPI/CAPA Configuration Plan for MCE and ACM Environments

## Executive Summary

This document outlines a comprehensive plan to configure, enable, and use Cluster API (CAPI) and Cluster API Provider AWS (CAPA) in both MultiCluster Engine (MCE) and Advanced Cluster Management (ACM) environments. The plan leverages the new versioned template system implemented in PR #27 to provide version-aware, environment-specific CAPI deployments across OpenShift 4.18, 4.19, and 4.20.

## Document Overview

- **Target Audience**: DevOps Engineers, Cluster Administrators, ACM/MCE Users
- **Scope**: Configuration and deployment of CAPI/CAPA across MCE and ACM environments
- **Dependencies**: Versioned template system from PR #27
- **Timeline**: 5-week implementation plan

## Environment Analysis

### Current Infrastructure (from PR #27)

**Versioned Template System:**
- ✅ Version-specific templates for OpenShift 4.18, 4.19, 4.20
- ✅ Smart template resolution with automatic fallback logic
- ✅ Feature matrix defining capabilities per version
- ✅ Existing CAPI components in MCE namespace

**Current Capabilities:**
- Version selection interface via `capi-assistant`
- Template-based cluster configuration generation
- AWS credential and OCM client management
- CAPA controller deployment and management

### Target Environments

#### MCE Environment (MultiCluster Engine)
- **Purpose**: Core CAPI/CAPA functionality for cluster lifecycle management
- **Namespace**: `multicluster-engine`
- **Operator**: `multicluster-engine`
- **Focus**: Infrastructure automation and basic cluster management

#### ACM Environment (Advanced Cluster Management)  
- **Purpose**: Enhanced CAPI with advanced management capabilities
- **Namespace**: `open-cluster-management`
- **Operator**: `advanced-cluster-management`
- **Focus**: Policy governance, observability, and multi-cluster application management

## Architecture Overview

### Environment-Aware Template Resolution

**Enhanced Template Path Priority:**
```
1. templates/versions/{version}/environments/{environment}/{category}/{template}
2. templates/versions/{version}/{category}/{template} (current)
3. templates/common/{template} (current)
```

**Example Resolution:**
```
For ACM 4.20 cluster config:
1. templates/versions/4.20/environments/acm/cluster-configs/rosa-control-plane.yaml.j2
2. templates/versions/4.20/cluster-configs/rosa-control-plane.yaml.j2
3. templates/common/rosa-control-plane.yaml.j2
```

### Feature Matrix by Environment

| Feature | MCE 4.18 | MCE 4.19 | MCE 4.20 | ACM 4.19 | ACM 4.20 |
|---------|----------|----------|----------|----------|----------|
| **Basic ROSA HCP** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **External OIDC** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Cluster Autoscaler** | Basic | Enhanced | AI-Opt | Enhanced | AI-Opt |
| **GPU Support** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Multi-Architecture** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **ACM Observability** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Policy Governance** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Service Mesh** | ❌ | ❌ | ✅ | ✅ | ✅ |

## Implementation Plan

## Phase 1: Environment-Aware Configuration Framework (Week 1)

### 1.1 Environment Detection and Configuration

**Objective**: Extend existing version management to support environment-specific configurations

**New Configuration Files:**

#### `templates/schemas/environment-matrix.yml`
```yaml
environments:
  mce:
    display_name: "MultiCluster Engine"
    namespace: "multicluster-engine"
    operator: "multicluster-engine"
    operator_subscription: "multicluster-engine"
    supported_versions: ["4.18", "4.19", "4.20"]
    required_components:
      - cluster-api
      - cluster-api-provider-aws
    features:
      basic: ["rosa-hcp", "aws-integration", "cluster-lifecycle"]
      advanced: ["external-oidc", "autoscaling", "multi-zone"]
      premium: ["gpu-support", "multi-arch", "edge-computing"]
    
  acm:
    display_name: "Advanced Cluster Management"
    namespace: "open-cluster-management"
    operator: "advanced-cluster-management"
    operator_subscription: "advanced-cluster-management"
    supported_versions: ["4.19", "4.20"]  # ACM requires newer versions
    required_components:
      - cluster-api
      - cluster-api-provider-aws
      - observability
      - governance-policy-framework
    features:
      basic: ["rosa-hcp", "aws-integration", "cluster-lifecycle"]
      advanced: ["external-oidc", "autoscaling", "multi-zone", "observability", "governance"]
      premium: ["gpu-support", "multi-arch", "edge-computing", "service-mesh", "ai-workloads"]

# Environment compatibility rules
compatibility_matrix:
  version_support:
    "4.18": ["mce"]
    "4.19": ["mce", "acm"] 
    "4.20": ["mce", "acm"]
  
  upgrade_paths:
    mce:
      "4.18": ["4.19"]
      "4.19": ["4.20"]
    acm:
      "4.19": ["4.20"]
  
  migration_paths:
    "mce_to_acm": 
      min_version: "4.19"
      automatic: false
      manual_steps:
        - "Install ACM operator"
        - "Migrate CAPI configuration"
        - "Enable observability components"
        - "Configure governance policies"
```

#### `tasks/environment_management.yml`
```yaml
# Environment Detection and Configuration Management

- name: Detect current environment
  k8s_info:
    api_version: v1
    kind: Namespace
    name: "{{ item }}"
  register: namespace_check
  loop:
    - "open-cluster-management"
    - "multicluster-engine"
  ignore_errors: true

- name: Determine environment type
  set_fact:
    detected_environment: "{{ 'acm' if acm_ns_exists else 'mce' }}"
    acm_ns_exists: "{{ namespace_check.results[0].resources | length > 0 }}"
    mce_ns_exists: "{{ namespace_check.results[1].resources | length > 0 }}"

- name: Load environment matrix
  include_vars:
    file: "{{ schemas_path }}/environment-matrix.yml"
    name: environment_matrix

- name: Validate environment and version compatibility
  fail:
    msg: |
      Environment '{{ target_environment | default(detected_environment) }}' 
      does not support OpenShift version {{ openshift_version }}
  when: openshift_version not in environment_matrix.environments[target_environment | default(detected_environment)].supported_versions

- name: Set environment-specific variables
  set_fact:
    current_environment: "{{ target_environment | default(detected_environment) }}"
    environment_config: "{{ environment_matrix.environments[target_environment | default(detected_environment)] }}"
    environment_namespace: "{{ environment_matrix.environments[target_environment | default(detected_environment)].namespace }}"
    environment_features: "{{ environment_matrix.environments[target_environment | default(detected_environment)].features }}"
```

### 1.2 Enhanced Template Resolution

**Objective**: Extend existing template resolver for environment-aware templates

#### `tasks/enhanced_template_resolver.yml`
```yaml
# Enhanced Template Resolver with Environment Support

- name: Set environment-aware template paths
  set_fact:
    environment_specific_template: "{{ version_templates }}/environments/{{ current_environment }}/{{ template_category }}/{{ template_name }}{{ template_extension }}"
    version_specific_template: "{{ version_templates }}/{{ template_category }}/{{ template_name }}{{ template_extension }}"
    common_template: "{{ common_templates }}/{{ template_name }}{{ template_extension }}"

- name: Check template existence in priority order
  stat:
    path: "{{ item }}"
  register: template_checks
  loop:
    - "{{ environment_specific_template }}"
    - "{{ version_specific_template }}"
    - "{{ common_template }}"

- name: Resolve template with environment priority
  set_fact:
    resolved_template_path: "{{ item.item }}"
    template_source: "{{ ['environment-specific', 'version-specific', 'common'][ansible_loop.index0] }}"
  loop: "{{ template_checks.results }}"
  loop_control:
    loop_var: item
    extended: true
  when: item.stat.exists
  no_log: true
```

## Phase 2: MCE Environment Configuration (Week 2)

### 2.1 MCE-Specific CAPI Enablement

**Objective**: Configure CAPI/CAPA in standalone MCE environment

#### Prerequisites Validation Workflow:
```yaml
# MCE Prerequisites Check
- name: Validate MCE operator status
  k8s_info:
    api_version: operator.openshift.io/v1
    kind: MultiClusterEngine
    namespace: "{{ environment_namespace }}"
  register: mce_status

- name: Validate required MCE components
  k8s_info:
    api_version: v1
    kind: Deployment
    namespace: "{{ environment_namespace }}"
    label_selectors:
      - "app={{ item }}"
  register: component_status
  loop: "{{ environment_config.required_components }}"

- name: Check CAPI/CAPA component enablement
  set_fact:
    capi_enabled: "{{ mce_status.resources[0].spec.overrides.components | selectattr('name', 'equalto', 'cluster-api') | map(attribute='enabled') | first | default(false) }}"
    capa_enabled: "{{ mce_status.resources[0].spec.overrides.components | selectattr('name', 'equalto', 'cluster-api-provider-aws') | map(attribute='enabled') | first | default(false) }}"
```

#### MCE Component Enablement:
```yaml
# Enable CAPI/CAPA in MCE
- name: Enable cluster-api component in MCE
  k8s:
    state: present
    definition:
      apiVersion: operator.openshift.io/v1
      kind: MultiClusterEngine
      metadata:
        name: "{{ mce_name }}"
        namespace: "{{ environment_namespace }}"
      spec:
        overrides:
          components:
            - name: cluster-api
              enabled: true
            - name: cluster-api-provider-aws
              enabled: true

- name: Wait for CAPI components to be ready
  k8s_info:
    api_version: apps/v1
    kind: Deployment
    namespace: "{{ environment_namespace }}"
    label_selectors:
      - "cluster.x-k8s.io/provider=cluster-api"
  register: capi_deployments
  until: capi_deployments.resources | selectattr('status.readyReplicas', 'defined') | list | length > 0
  retries: 30
  delay: 10
```

### 2.2 MCE Version-Specific Templates

#### OpenShift 4.18 (Basic MCE)
**Template**: `templates/versions/4.18/environments/mce/cluster-configs/rosa-control-plane.yaml.j2`
```yaml
apiVersion: controlplane.cluster.x-k8s.io/v1beta2
kind: ROSAControlPlane
metadata:
  name: "{{ cluster_name }}"
  namespace: "{{ capi_namespace }}"
  labels:
    cluster.x-k8s.io/cluster-name: "{{ cluster_name }}"
    environment: "mce"
    version: "4.18"
spec:
  version: "{{ openshift_version }}"
  
  # Basic MCE configuration - simplified for stability
  network:
    machineCIDR: "{{ machine_cidr | default('10.0.0.0/16') }}"
    podCIDR: "{{ pod_cidr | default('10.128.0.0/14') }}"
    serviceCIDR: "{{ service_cidr | default('172.30.0.0/16') }}"
  
  # Standard configuration for MCE basic deployment
  defaultMachinePool:
    instanceType: "{{ instance_type | default('m5.large') }}"
    replicas: {{ replicas | default(3) }}
  
  region: "{{ aws_region | default('us-east-1') }}"
  availabilityZone: "{{ aws_region | default('us-east-1') }}a"
  
  endpointAccess: "{{ endpoint_access | default('Public') }}"
  
  credentialsSecretRef:
    name: "{{ rosa_creds_secret }}"
    namespace: "{{ environment_namespace }}"
  
  # Basic MCE addons
  addons:
    - name: "cluster-logging-operator"
      id: "cluster-logging-operator"
    - name: "cluster-monitoring-operator"
      id: "cluster-monitoring-operator"
```

#### OpenShift 4.19 (Enhanced MCE)
**Template**: `templates/versions/4.19/environments/mce/cluster-configs/rosa-control-plane.yaml.j2`
```yaml
apiVersion: controlplane.cluster.x-k8s.io/v1beta2
kind: ROSAControlPlane
metadata:
  name: "{{ cluster_name }}"
  namespace: "{{ capi_namespace }}"
  labels:
    cluster.x-k8s.io/cluster-name: "{{ cluster_name }}"
    environment: "mce"
    version: "4.19"
spec:
  version: "{{ openshift_version }}"
  
  # Enhanced MCE configuration with advanced features
  network:
    machineCIDR: "{{ machine_cidr | default('10.0.0.0/16') }}"
    podCIDR: "{{ pod_cidr | default('10.128.0.0/14') }}"
    serviceCIDR: "{{ service_cidr | default('172.30.0.0/16') }}"
    {% if enable_private_cluster | default(false) %}
    type: "Private"
    {% endif %}
  
  # Enhanced machine pool with custom configurations
  defaultMachinePool:
    instanceType: "{{ instance_type | default('m5.xlarge') }}"
    replicas: {{ replicas | default(3) }}
    {% if custom_disk_size is defined %}
    rootVolume:
      size: "{{ custom_disk_size }}Gi"
      type: "{{ disk_type | default('gp3') }}"
    {% endif %}
  
  # Multi-AZ support for enhanced reliability
  region: "{{ aws_region | default('us-east-1') }}"
  {% if multi_az | default(false) %}
  availabilityZones:
    {% for az in availability_zones | default(['a', 'b', 'c']) %}
    - "{{ aws_region | default('us-east-1') }}{{ az }}"
    {% endfor %}
  {% else %}
  availabilityZone: "{{ aws_region | default('us-east-1') }}a"
  {% endif %}
  
  endpointAccess: "{{ endpoint_access | default('Public') }}"
  
  # External OIDC support (4.19 MCE feature)
  {% if external_oidc_config is defined %}
  oidcConfig:
    issuerURL: "{{ external_oidc_config.issuer_url }}"
    clientID: "{{ external_oidc_config.client_id }}"
    usernameClaim: "{{ external_oidc_config.username_claim | default('preferred_username') }}"
    groupsClaim: "{{ external_oidc_config.groups_claim | default('groups') }}"
  {% endif %}
  
  credentialsSecretRef:
    name: "{{ rosa_creds_secret }}"
    namespace: "{{ environment_namespace }}"
  
  # Enhanced MCE addons with autoscaling
  addons:
    - name: "cluster-logging-operator"
      id: "cluster-logging-operator"
    - name: "cluster-monitoring-operator"
      id: "cluster-monitoring-operator"
    {% if enable_cluster_autoscaler | default(false) %}
    - name: "cluster-autoscaler"
      id: "cluster-autoscaler"
      parameters:
        expander: "{{ autoscaler_expander | default('least-waste') }}"
        scaleDownEnabled: "{{ scale_down_enabled | default(true) }}"
    {% endif %}
```

## Phase 3: ACM Environment Configuration (Week 3)

### 3.1 ACM-Specific CAPI Enhancement

**Objective**: Leverage ACM's advanced features with CAPI/CAPA

#### ACM Prerequisites and Integration:
```yaml
# ACM Prerequisites and Integration Check
- name: Validate ACM operator status
  k8s_info:
    api_version: operator.open-cluster-management.io/v1
    kind: MultiClusterHub
    namespace: "{{ environment_namespace }}"
  register: acm_status

- name: Check ACM observability components
  k8s_info:
    api_version: observability.open-cluster-management.io/v1beta2
    kind: MultiClusterObservability
    namespace: "{{ environment_namespace }}"
  register: observability_status

- name: Validate policy framework
  k8s_info:
    api_version: policy.open-cluster-management.io/v1
    kind: Policy
    namespace: "{{ environment_namespace }}"
  register: policy_framework_status
```

#### ACM Integration Templates:

**Template**: `templates/versions/4.19/environments/acm/cluster-configs/rosa-control-plane.yaml.j2`
```yaml
apiVersion: controlplane.cluster.x-k8s.io/v1beta2
kind: ROSAControlPlane
metadata:
  name: "{{ cluster_name }}"
  namespace: "{{ capi_namespace }}"
  labels:
    cluster.x-k8s.io/cluster-name: "{{ cluster_name }}"
    environment: "acm"
    version: "4.19"
    # ACM-specific labels for observability
    observability.open-cluster-management.io/enabled: "true"
    governance.open-cluster-management.io/managed: "true"
  annotations:
    # ACM governance annotations
    policy.open-cluster-management.io/standards: "NIST-CSF"
    policy.open-cluster-management.io/categories: "PR.AC Identity Management Authentication and Access Control"
spec:
  version: "{{ openshift_version }}"
  
  # ACM-enhanced configuration
  network:
    machineCIDR: "{{ machine_cidr | default('10.0.0.0/16') }}"
    podCIDR: "{{ pod_cidr | default('10.128.0.0/14') }}"
    serviceCIDR: "{{ service_cidr | default('172.30.0.0/16') }}"
    {% if enable_private_cluster | default(false) %}
    type: "Private"
    {% endif %}
  
  defaultMachinePool:
    instanceType: "{{ instance_type | default('m5.xlarge') }}"
    replicas: {{ replicas | default(3) }}
    rootVolume:
      size: "{{ custom_disk_size | default(200) }}Gi"
      type: "{{ disk_type | default('gp3') }}"
      # ACM governance requirement: encryption enabled
      encrypted: true
  
  region: "{{ aws_region | default('us-east-1') }}"
  availabilityZones:
    {% for az in availability_zones | default(['a', 'b', 'c']) %}
    - "{{ aws_region | default('us-east-1') }}{{ az }}"
    {% endfor %}
  
  # ACM governance: private endpoint required for compliance
  endpointAccess: "{{ endpoint_access | default('Private') }}"
  
  # Enhanced OIDC with ACM identity integration
  {% if external_oidc_config is defined %}
  oidcConfig:
    issuerURL: "{{ external_oidc_config.issuer_url }}"
    clientID: "{{ external_oidc_config.client_id }}"
    usernameClaim: "{{ external_oidc_config.username_claim | default('preferred_username') }}"
    groupsClaim: "{{ external_oidc_config.groups_claim | default('groups') }}"
    # ACM integration for identity federation
    additionalClientIDs:
      - "{{ acm_client_id | default('acm-integration') }}"
  {% endif %}
  
  credentialsSecretRef:
    name: "{{ rosa_creds_secret }}"
    namespace: "{{ environment_namespace }}"
  
  # ACM-specific addons with observability integration
  addons:
    - name: "cluster-logging-operator"
      id: "cluster-logging-operator"
      # ACM observability integration
      parameters:
        logForwarding: "{{ acm_log_forwarding | default(true) }}"
    - name: "cluster-monitoring-operator"
      id: "cluster-monitoring-operator"
      parameters:
        # Enhanced monitoring for ACM observability
        enableUserWorkloadMonitoring: "{{ enable_user_workload_monitoring | default(true) }}"
    - name: "cluster-autoscaler"
      id: "cluster-autoscaler"
      parameters:
        expander: "{{ autoscaler_expander | default('priority') }}"
        scaleDownEnabled: "{{ scale_down_enabled | default(true) }}"
    # ACM-specific addons
    {% if enable_acm_observability | default(true) %}
    - name: "observability-addon"
      id: "observability-addon"
    {% endif %}
    {% if enable_governance_framework | default(true) %}
    - name: "governance-policy-framework"
      id: "governance-policy-framework"
    {% endif %}

# ACM Post-deployment configuration
---
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
metadata:
  name: "{{ cluster_name }}"
  labels:
    cloud: "Amazon"
    region: "{{ aws_region | default('us-east-1') }}"
    vendor: "OpenShift"
    environment: "{{ cluster_environment | default('production') }}"
    # ACM governance labels
    policy.open-cluster-management.io/placement: "acm-governance"
spec:
  hubAcceptsClient: true
  leaseDurationSeconds: 60
```

### 3.2 ACM Governance Integration

#### Policy Templates for ROSA HCP Clusters:
**Template**: `templates/versions/4.19/environments/acm/governance/rosa-cluster-policy.yaml.j2`
```yaml
apiVersion: policy.open-cluster-management.io/v1
kind: Policy
metadata:
  name: "rosa-cluster-governance-{{ cluster_name }}"
  namespace: "{{ environment_namespace }}"
  annotations:
    policy.open-cluster-management.io/standards: "NIST-CSF"
    policy.open-cluster-management.io/categories: "PR.AC Identity Management Authentication and Access Control"
spec:
  remediationAction: "{{ governance_remediation_action | default('inform') }}"
  disabled: false
  policy-templates:
    - objectDefinition:
        apiVersion: policy.open-cluster-management.io/v1
        kind: ConfigurationPolicy
        metadata:
          name: "rosa-security-requirements"
        spec:
          remediationAction: "{{ governance_remediation_action | default('inform') }}"
          severity: "{{ governance_severity | default('medium') }}"
          object-templates:
            # Require encryption at rest
            - complianceType: "musthave"
              objectDefinition:
                apiVersion: v1
                kind: Secret
                metadata:
                  name: "encryption-config"
                  namespace: "{{ capi_namespace }}"
                data:
                  encryption: "enabled"
            
            # Require private endpoint access
            - complianceType: "musthave"
              objectDefinition:
                apiVersion: controlplane.cluster.x-k8s.io/v1beta2
                kind: ROSAControlPlane
                metadata:
                  name: "{{ cluster_name }}"
                  namespace: "{{ capi_namespace }}"
                spec:
                  endpointAccess: "Private"
            
            # Require external OIDC authentication
            {% if require_external_oidc | default(false) %}
            - complianceType: "musthave"
              objectDefinition:
                apiVersion: controlplane.cluster.x-k8s.io/v1beta2
                kind: ROSAControlPlane
                metadata:
                  name: "{{ cluster_name }}"
                  namespace: "{{ capi_namespace }}"
                spec:
                  oidcConfig:
                    issuerURL: "{{ required_oidc_issuer }}"
            {% endif %}
```

## Phase 4: Enhanced User Experience (Week 4)

### 4.1 Enhanced capi-assistant Integration

**Objective**: Extend existing capi-assistant with environment selection

#### Enhanced User Interface:
```yaml
# Enhanced capi-assistant.yaml with environment selection
- name: CAPI assistant with environment support
  hosts: localhost
  any_errors_fatal: true
  vars_files:
    - vars/vars.yml
    - vars/user_vars.yml
  vars_prompt:
    - name: environment_selection
      prompt: |
       Select target environment:
          1 - MCE (MultiCluster Engine) - Core CAPI functionality
          2 - ACM (Advanced Cluster Management) - Enhanced governance and observability
          3 - Auto-detect environment
      default: "3"
      private: no
    - name: openshift_version_selection
      prompt: |
       Select OpenShift version:
          1 - OpenShift 4.18 (Stable - Basic features) [MCE only]
          2 - OpenShift 4.19 (Current - Enhanced features)
          3 - OpenShift 4.20 (Latest - Premium features)
      default: "2"
      private: no
    - name: selected_action
      prompt: |
       Choose action:
          1 - Check CAPI/CAPA status
          2 - Enable CAPI/CAPA components
          3 - Configure environment for CAPI/CAPA
          4 - Validate environment configuration
          5 - Create ROSA HCP cluster
          6 - Upgrade ROSA HCP cluster
          7 - Delete ROSA HCP cluster
          8 - Environment migration (MCE to ACM)
          9 - Generate governance policies (ACM only)
         10 - Configure observability (ACM only)
      private: no
  tasks:
    - name: Process environment selection
      set_fact:
        target_environment: "{{ {'1': 'mce', '2': 'acm', '3': 'auto'}[environment_selection] }}"
        openshift_version: "{{ {'1': '4.18', '2': '4.19', '3': '4.20'}[openshift_version_selection] }}"
    
    - name: Initialize environment management
      include_tasks: tasks/environment_management.yml
    
    - name: Initialize version management
      include_tasks: tasks/version_management.yml
    
    - name: Validate environment and version compatibility
      fail:
        msg: |
          Selected combination not supported:
          Environment: {{ current_environment }}
          Version: {{ openshift_version }}
          Supported combinations: {{ environment_matrix.compatibility_matrix.version_support }}
      when: current_environment not in environment_matrix.compatibility_matrix.version_support[openshift_version]
```

### 4.2 Environment-Specific Workflows

#### MCE Workflow Template:
```yaml
# MCE-specific workflow
- name: MCE environment workflow
  block:
    - name: MCE component enablement
      include_tasks: tasks/mce_capi_enablement.yml
      when: selected_action in ["2", "3"]
    
    - name: MCE cluster creation
      include_tasks: tasks/create_rosa_control_plane_versioned.yml
      vars:
        template_category: "environments/mce/cluster-configs"
      when: selected_action == "5"
    
    - name: MCE validation
      include_tasks: tasks/validate_mce_environment.yml
      when: selected_action == "4"
  when: current_environment == "mce"
```

#### ACM Workflow Template:
```yaml
# ACM-specific workflow
- name: ACM environment workflow
  block:
    - name: ACM component enablement
      include_tasks: tasks/acm_capi_enablement.yml
      when: selected_action in ["2", "3"]
    
    - name: ACM cluster creation with governance
      include_tasks: tasks/create_rosa_control_plane_versioned.yml
      vars:
        template_category: "environments/acm/cluster-configs"
      when: selected_action == "5"
    
    - name: Generate governance policies
      include_tasks: tasks/generate_acm_policies.yml
      when: selected_action == "9"
    
    - name: Configure observability
      include_tasks: tasks/configure_acm_observability.yml
      when: selected_action == "10"
    
    - name: ACM validation
      include_tasks: tasks/validate_acm_environment.yml
      when: selected_action == "4"
  when: current_environment == "acm"
```

## Phase 5: Operational Procedures (Week 5)

### 5.1 Environment Validation and Health Checks

#### Comprehensive Health Check Framework:
```yaml
# tasks/comprehensive_health_check.yml
- name: Environment-specific health checks
  include_tasks: "tasks/health_check_{{ current_environment }}.yml"

- name: Version-specific validation
  include_tasks: "tasks/version_validation_{{ openshift_version | replace('.', '_') }}.yml"

- name: Cross-component integration check
  include_tasks: tasks/integration_health_check.yml

- name: Generate health report
  template:
    src: "templates/common/health-report.yaml.j2"
    dest: "{{ output_dir }}/health-report-{{ ansible_date_time.epoch }}.yaml"
```

#### MCE Health Check Tasks:
```yaml
# tasks/health_check_mce.yml
- name: Check MCE operator status
  k8s_info:
    api_version: operator.openshift.io/v1
    kind: MultiClusterEngine
    namespace: "{{ environment_namespace }}"
  register: mce_operator_status

- name: Validate CAPI components
  k8s_info:
    api_version: apps/v1
    kind: Deployment
    namespace: "{{ environment_namespace }}"
    label_selectors:
      - "cluster.x-k8s.io/provider=cluster-api"
  register: capi_components

- name: Check CAPA controller health
  k8s_info:
    api_version: apps/v1
    kind: Deployment
    namespace: "{{ environment_namespace }}"
    label_selectors:
      - "cluster.x-k8s.io/provider=infrastructure-aws"
  register: capa_controller

- name: Validate credentials and connectivity
  include_tasks: tasks/validate_aws_connectivity.yml

- name: Test OCM client authentication
  include_tasks: tasks/validate_ocm_connectivity.yml
```

#### ACM Health Check Tasks:
```yaml
# tasks/health_check_acm.yml
- name: Include MCE health checks
  include_tasks: tasks/health_check_mce.yml

- name: Check ACM hub status
  k8s_info:
    api_version: operator.open-cluster-management.io/v1
    kind: MultiClusterHub
    namespace: "{{ environment_namespace }}"
  register: acm_hub_status

- name: Validate observability components
  k8s_info:
    api_version: observability.open-cluster-management.io/v1beta2
    kind: MultiClusterObservability
    namespace: "{{ environment_namespace }}"
  register: observability_components

- name: Check policy framework status
  k8s_info:
    api_version: policy.open-cluster-management.io/v1
    kind: Policy
    namespace: "{{ environment_namespace }}"
  register: policy_framework

- name: Validate cross-cluster connectivity
  include_tasks: tasks/validate_cross_cluster_connectivity.yml
```

### 5.2 Migration and Upgrade Procedures

#### Environment Migration (MCE to ACM):
```yaml
# tasks/migrate_mce_to_acm.yml
- name: Pre-migration validation
  block:
    - name: Check current MCE configuration
      include_tasks: tasks/health_check_mce.yml
    
    - name: Validate ACM prerequisites
      k8s_info:
        api_version: operators.coreos.com/v1alpha1
        kind: Subscription
        namespace: "open-cluster-management"
        field_selectors:
          - "metadata.name=advanced-cluster-management"
      register: acm_subscription
    
    - name: Check version compatibility
      fail:
        msg: "MCE to ACM migration requires OpenShift 4.19 or higher"
      when: openshift_version is version('4.19', '<')

- name: Migration execution
  block:
    - name: Backup current MCE configuration
      include_tasks: tasks/backup_mce_config.yml
    
    - name: Install ACM operator
      include_tasks: tasks/install_acm_operator.yml
      when: acm_subscription.resources | length == 0
    
    - name: Migrate CAPI configuration
      include_tasks: tasks/migrate_capi_config.yml
    
    - name: Enable ACM components
      include_tasks: tasks/enable_acm_components.yml
    
    - name: Validate migration success
      include_tasks: tasks/validate_acm_migration.yml
```

#### Version Upgrade Procedures:
```yaml
# tasks/version_upgrade.yml
- name: Version upgrade validation
  block:
    - name: Check upgrade path compatibility
      fail:
        msg: "Upgrade from {{ current_openshift_version }} to {{ target_openshift_version }} not supported"
      when: target_openshift_version not in environment_matrix.compatibility_matrix.upgrade_paths[current_environment][current_openshift_version]
    
    - name: Backup current configuration
      include_tasks: tasks/backup_current_config.yml
    
    - name: Check cluster readiness
      include_tasks: tasks/check_cluster_upgrade_readiness.yml

- name: Execute upgrade
  block:
    - name: Update version-specific configurations
      include_tasks: tasks/update_version_configs.yml
    
    - name: Apply feature migrations
      include_tasks: tasks/apply_feature_migrations.yml
    
    - name: Update templates and manifests
      include_tasks: tasks/update_templates.yml
    
    - name: Validate upgrade success
      include_tasks: tasks/validate_upgrade.yml
```

## Success Metrics and KPIs

### Technical Metrics
- ✅ **Environment Coverage**: 100% support for MCE and ACM across supported OpenShift versions
- ✅ **Deployment Success Rate**: >99% successful cluster provisioning
- ✅ **Template Resolution Accuracy**: <100ms average template resolution time
- ✅ **Health Check Coverage**: 100% component health validation

### User Experience Metrics
- ✅ **Interface Simplicity**: Single interface for both MCE and ACM deployments
- ✅ **Documentation Completeness**: 100% feature documentation coverage
- ✅ **Error Resolution**: <5 minutes average troubleshooting time
- ✅ **Migration Success**: 100% successful MCE to ACM migrations

### Operational Metrics
- ✅ **Deployment Time**: <30 minutes for standard cluster provisioning
- ✅ **Automation Coverage**: 95% of operations automated
- ✅ **Compliance Adherence**: 100% governance policy compliance (ACM)
- ✅ **Resource Efficiency**: <10% overhead for environment-specific features

## Risk Assessment and Mitigation

### Technical Risks

#### High Risk: Template Conflicts
- **Impact**: Incorrect template resolution could cause deployment failures
- **Mitigation**: Comprehensive template validation and testing framework
- **Detection**: Automated template syntax checking and resolution testing

#### Medium Risk: Environment Compatibility
- **Impact**: Feature mismatches between environments could cause runtime issues
- **Mitigation**: Strict compatibility matrix enforcement and validation
- **Detection**: Pre-deployment compatibility checks and warnings

#### Low Risk: Performance Impact
- **Impact**: Additional environment detection could slow deployment
- **Mitigation**: Optimized detection logic and caching mechanisms
- **Detection**: Performance monitoring and benchmarking

### Operational Risks

#### High Risk: Migration Complexity
- **Impact**: MCE to ACM migration failures could cause service disruption
- **Mitigation**: Comprehensive backup and rollback procedures
- **Detection**: Migration validation checkpoints and rollback triggers

#### Medium Risk: User Training
- **Impact**: Complex new interface could reduce adoption
- **Mitigation**: Comprehensive documentation and training materials
- **Detection**: User feedback collection and support ticket analysis

#### Low Risk: Maintenance Overhead
- **Impact**: Multiple environments could increase maintenance complexity
- **Mitigation**: Automated health checks and self-healing procedures
- **Detection**: Maintenance metrics tracking and analysis

## Implementation Timeline

### Week 1: Foundation (Environment Framework)
- ✅ Environment detection and configuration system
- ✅ Enhanced template resolution logic
- ✅ Environment compatibility matrix
- ✅ Basic validation and testing

### Week 2: MCE Integration
- ✅ MCE-specific CAPI enablement workflows
- ✅ Version-specific MCE templates (4.18, 4.19, 4.20)
- ✅ MCE health checks and validation procedures
- ✅ MCE deployment testing and validation

### Week 3: ACM Integration
- ✅ ACM-specific CAPI enhancement workflows
- ✅ ACM governance and observability integration
- ✅ ACM-specific templates and policies
- ✅ ACM deployment testing and validation

### Week 4: User Experience Enhancement
- ✅ Enhanced capi-assistant with environment selection
- ✅ Environment-specific workflow implementations
- ✅ Migration procedures (MCE to ACM)
- ✅ User interface testing and refinement

### Week 5: Validation and Documentation
- ✅ End-to-end testing across all combinations
- ✅ Performance and reliability testing
- ✅ Comprehensive documentation and runbooks
- ✅ Training materials and user guides

## Conclusion

This comprehensive plan leverages the versioned template system foundation to create a robust, scalable approach to CAPI/CAPA configuration across both MCE and ACM environments. The implementation provides:

1. **Unified Interface**: Single point of control for both environments
2. **Version Awareness**: Automatic adaptation to OpenShift version capabilities  
3. **Environment Optimization**: Tailored configurations for MCE vs ACM use cases
4. **Operational Excellence**: Comprehensive health checks, migrations, and maintenance procedures
5. **Future Scalability**: Architecture ready for additional environments and versions

The plan ensures operational continuity while enabling advanced capabilities in ACM environments, providing a clear migration path for organizations evolving from basic MCE deployments to comprehensive ACM management.

## Appendices

### A. Configuration File Templates
- Environment matrix schema
- Template resolution examples
- Health check configuration samples

### B. Troubleshooting Guides
- Common deployment issues and resolutions
- Environment-specific troubleshooting procedures
- Migration problem resolution

### C. API Reference
- Environment management task parameters
- Template resolution variables
- Health check output formats

### D. Best Practices
- Environment selection guidelines
- Version upgrade recommendations
- Security and compliance considerations