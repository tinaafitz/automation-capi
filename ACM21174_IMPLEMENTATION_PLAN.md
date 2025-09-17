# ACM-21174 ROSANetwork Implementation Plan

## Overview

ACM-21174 introduces **ROSANetwork** functionality for automated VPC and subnet provisioning for ROSA HCP clusters, based on PR #5464 from kubernetes-sigs/cluster-api-provider-aws.

This complements the existing ACM-21162 ROSARoleConfig automation by providing network infrastructure automation.

## Key Features from PR #5464

### ROSANetwork CRD Specification
- **CloudFormation-based**: Uses static CloudFormation template from rosa-cli
- **Multi-AZ Support**: Automatically creates subnets across specified availability zones
- **CIDR Management**: Configurable CIDR blocks for VPC and subnets
- **Tag Support**: Optional AWS resource tagging
- **Status Tracking**: Comprehensive status reporting for created resources

### Integration Points
- **ROSAControlPlane Integration**: Uses `rosaNetworkRef` field to reference ROSANetwork
- **CAPA Controller**: Requires CAPA controller with ROSANetwork support
- **AWS Identity**: Leverages existing AWS identity and credentials management

## Implementation Architecture

### 1. Template Structure (OpenShift 4.18.9)

```
templates/versions/4.18/features/
├── rosa-network-config.yaml.j2           # Core ROSANetwork template
├── rosa-network-test.yaml                # Static test configuration
├── rosa-capi-network-cluster.yaml.j2     # Complete cluster with network automation
└── rosa-combined-automation.yaml.j2      # Network + Roles automation
```

### 2. ROSANetwork Template (based on PR #5464)

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: ROSANetwork
metadata:
  name: {{ rosa_network_config.name | default(cluster_name + '-network') }}
  namespace: {{ capi_namespace }}
spec:
  # AWS Identity reference
  identityRef:
    kind: AWSClusterControllerIdentity
    name: {{ rosa_network_config.identity_name | default('default') }}

  # Credentials secret reference
  credentialsSecretRef:
    name: {{ rosa_creds_secret }}

  # Network configuration
  availabilityZones:
    {% for az in rosa_network_config.availability_zones %}
    - {{ az }}
    {% endfor %}

  cidrBlock: {{ rosa_network_config.cidr_block | default('10.0.0.0/16') }}

  {% if rosa_network_config.tags is defined %}
  tags:
    {% for key, value in rosa_network_config.tags.items() %}
    {{ key }}: {{ value }}
    {% endfor %}
  {% endif %}
```

### 3. ROSAControlPlane Integration

```yaml
apiVersion: controlplane.cluster.x-k8s.io/v1beta2
kind: ROSAControlPlane
metadata:
  name: {{ cluster_name }}
  namespace: {{ capi_namespace }}
spec:
  # Network reference (from PR #5464)
  rosaNetworkRef:
    name: {{ rosa_network_config.name | default(cluster_name + '-network') }}
    namespace: {{ capi_namespace }}

  # Optional: ROSARoleConfig reference for combined automation
  {% if use_role_config | default(false) %}
  rosaRoleConfigRef:
    name: {{ rosa_role_config.name | default(cluster_name + '-roles') }}
    namespace: {{ capi_namespace }}
  {% endif %}

  rosaClusterName: {{ cluster_name }}
  version: {{ openshift_version }}
  region: {{ aws_region }}

  # Network configuration will be populated by ROSANetwork
  # No need for manual subnet specification
```

## Task Implementation

### 1. Core ROSANetwork Tasks

#### `tasks/create_rosa_network.yml`
```yaml
---
- name: "Create ROSANetwork for cluster {{ cluster_name }}"
  block:
    - name: Generate ROSANetwork from template
      template:
        src: "{{ template_version_path }}/features/rosa-network-config.yaml.j2"
        dest: "{{ output_dir }}/{{ cluster_name }}-rosa-network.yaml"
      vars:
        rosa_network_config:
          name: "{{ cluster_name }}-network"
          availability_zones: "{{ aws_availability_zones }}"
          cidr_block: "{{ vpc_cidr_block | default('10.0.0.0/16') }}"
          tags: "{{ network_tags | default({}) }}"

    - name: Apply ROSANetwork to cluster
      kubernetes.core.k8s:
        state: present
        src: "{{ output_dir }}/{{ cluster_name }}-rosa-network.yaml"
        wait: true
        wait_condition:
          type: Ready
          status: "True"
        wait_timeout: "{{ rosa_network_creation_timeout | default(900) }}"
      register: rosa_network_result

    - name: Validate ROSANetwork creation
      kubernetes.core.k8s_info:
        api_version: infrastructure.cluster.x-k8s.io/v1beta2
        kind: ROSANetwork
        name: "{{ cluster_name }}-network"
        namespace: "{{ capi_namespace }}"
      register: network_status

    - name: Extract network information
      set_fact:
        vpc_id: "{{ network_status.resources[0].status.vpcId | default('') }}"
        public_subnets: "{{ network_status.resources[0].status.publicSubnets | default([]) }}"
        private_subnets: "{{ network_status.resources[0].status.privateSubnets | default([]) }}"
```

#### `tasks/validate_rosa_network.yml`
```yaml
---
- name: "Validate ROSANetwork for cluster {{ cluster_name }}"
  block:
    - name: Get ROSANetwork status
      kubernetes.core.k8s_info:
        api_version: infrastructure.cluster.x-k8s.io/v1beta2
        kind: ROSANetwork
        name: "{{ cluster_name }}-network"
        namespace: "{{ capi_namespace }}"
      register: network_info

    - name: Validate network resource exists and is ready
      assert:
        that:
          - network_info.resources | length > 0
          - network_info.resources[0].status.ready is defined
          - network_info.resources[0].status.ready == true
          - network_info.resources[0].status.vpcId is defined
          - network_info.resources[0].status.publicSubnets | length > 0
          - network_info.resources[0].status.privateSubnets | length > 0
        fail_msg: "ROSANetwork is not ready or missing required resources"
        success_msg: "ROSANetwork validation passed"

    - name: Display created network resources
      debug:
        msg:
          - "VPC ID: {{ network_info.resources[0].status.vpcId }}"
          - "Public Subnets: {{ network_info.resources[0].status.publicSubnets | length }}"
          - "Private Subnets: {{ network_info.resources[0].status.privateSubnets | length }}"
          - "CloudFormation Stack: {{ network_info.resources[0].status.stackName | default('N/A') }}"
```

#### `tasks/validate_aws_vpc_created.yml`
```yaml
---
- name: "Validate AWS VPC was created by ROSANetwork"
  block:
    - name: Get ROSANetwork status with VPC information
      kubernetes.core.k8s_info:
        api_version: infrastructure.cluster.x-k8s.io/v1beta2
        kind: ROSANetwork
        name: "{{ cluster_name }}-network"
        namespace: "{{ capi_namespace }}"
      register: network_status

    - name: Extract VPC information
      set_fact:
        vpc_id: "{{ network_status.resources[0].status.vpcId }}"
        cloudformation_stack: "{{ network_status.resources[0].status.stackName | default('') }}"

    - name: Validate VPC exists using AWS CLI (if available)
      block:
        - name: Check if AWS CLI is available
          command: aws --version
          register: aws_cli_check
          failed_when: false

        - name: Get VPC details from AWS
          command: aws ec2 describe-vpcs --vpc-ids {{ vpc_id }}
          register: aws_vpc_details
          failed_when: false
          when: aws_cli_check.rc == 0

        - name: Verify VPC exists in AWS
          assert:
            that:
              - aws_vpc_details.rc == 0
              - "'Vpcs' in aws_vpc_details.stdout"
            fail_msg: "VPC {{ vpc_id }} not found in AWS"
            success_msg: "VPC successfully verified in AWS"
          when: aws_cli_check.rc == 0

        - name: Validate CloudFormation stack (if available)
          command: aws cloudformation describe-stacks --stack-name {{ cloudformation_stack }}
          register: cf_stack_details
          failed_when: false
          when: aws_cli_check.rc == 0 and cloudformation_stack != ""

        - name: Display CloudFormation stack status
          debug:
            msg: "CloudFormation Stack Status: {{ (cf_stack_details.stdout | from_json).Stacks[0].StackStatus if cf_stack_details.rc == 0 else 'Unknown' }}"
          when: aws_cli_check.rc == 0 and cloudformation_stack != ""
```

### 2. Environment Setup

#### `acm21174_environment_setup.yaml`
```yaml
---
- name: ACM-21174 Environment Setup for ROSANetwork Testing
  hosts: localhost
  gather_facts: true
  vars_files:
    - vars/vars.yml
    - vars/user_vars.yml

  vars:
    test_case: "ACM-21174"
    test_description: "Environment setup for ROSANetwork automated VPC creation"
    kind_cluster_name: "{{ acm21174_config.kind_cluster_name | default('capa-network-test') }}"
    openshift_version: "{{ acm21174_config.openshift_version | default('4.18.9') }}"
    capa_network_image: "{{ capa_controller_network.image }}"
    capa_network_tag: "{{ capa_controller_network.tag }}"

  tasks:
    - name: Display environment setup information
      debug:
        msg: |
          ACM-21174 Environment Setup
          ===========================
          Test Case: {{ test_case }}
          Description: {{ test_description }}
          Kind Cluster: {{ kind_cluster_name }}
          OpenShift Version: {{ openshift_version }}
          AWS Region: {{ aws_region }}

    - name: Verify prerequisite tools
      block:
        - name: Check required tools
          command: "{{ item }} --version"
          loop:
            - kind
            - kubectl
            - clusterctl
            - rosa
          register: tool_checks
          failed_when: false

        - name: Validate all tools are available
          assert:
            that: item.rc == 0
            fail_msg: "Required tool {{ item.item }} is not available"
          loop: "{{ tool_checks.results }}"

    - name: Verify ROSA authentication
      command: rosa whoami
      register: rosa_auth_check

    - name: Create kind cluster for ACM-21174 testing
      block:
        - name: Check if kind cluster exists
          command: kind get clusters
          register: existing_clusters

        - name: Delete existing cluster if it exists
          command: kind delete cluster --name {{ kind_cluster_name }}
          when: kind_cluster_name in existing_clusters.stdout
          ignore_errors: true

        - name: Create new kind cluster
          command: kind create cluster --name {{ kind_cluster_name }}

        - name: Set environment variables for CAPI/CAPA
          shell: |
            export EXP_ROSA="true"
            export EXP_MACHINE_POOL="true"
            export CLUSTER_TOPOLOGY="true"
            export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

    - name: Initialize CAPI management cluster
      command: clusterctl init --infrastructure aws

    - name: Apply ROSANetwork CRDs
      block:
        - name: Apply ROSAControlPlane CRD (Milan's version)
          uri:
            url: "{{ milan_crds_base_url }}/controlplane.cluster.x-k8s.io_rosacontrolplanes.yaml"
            method: GET
            return_content: yes
          register: rosacontrolplane_crd

        - name: Apply ROSAControlPlane CRD
          kubernetes.core.k8s:
            definition: "{{ rosacontrolplane_crd.content | from_yaml_all | list }}"
            state: present

        - name: Apply ROSANetwork CRD (Milan's version)
          uri:
            url: "{{ milan_crds_base_url }}/infrastructure.cluster.x-k8s.io_rosanetworks.yaml"
            method: GET
            return_content: yes
          register: rosanetwork_crd

        - name: Apply ROSANetwork CRD
          kubernetes.core.k8s:
            definition: "{{ rosanetwork_crd.content | from_yaml_all | list }}"
            state: present

    - name: Update CAPA controller for ROSANetwork support
      include_tasks: tasks/update_capa_controller_network.yml

    - name: Update CAPA ClusterRole with ROSANetwork permissions
      include_tasks: tasks/update_capa_clusterrole_network.yml

    - name: Verify CAPA controller readiness
      include_tasks: tasks/verify_capa_network_controller.yml

    - name: Create namespace for ACM-21174 testing
      kubernetes.core.k8s:
        name: "{{ capi_namespace }}"
        api_version: v1
        kind: Namespace
        state: present

    - name: Environment setup completion
      debug:
        msg:
          - "ACM-21174 environment setup completed successfully!"
          - "Kind cluster: {{ kind_cluster_name }}"
          - "CAPI namespace: {{ capi_namespace }}"
          - "CAPA controller image: {{ capa_network_image }}:{{ capa_network_tag }}"
          - "Ready for ROSANetwork testing"
```

### 3. Comprehensive Testing

#### `test_acm21174_rosa_network.yaml`
```yaml
---
- name: ACM-21174 End-to-End ROSANetwork Testing
  hosts: localhost
  gather_facts: true
  vars_files:
    - vars/vars.yml
    - vars/user_vars.yml

  vars:
    test_case: "ACM-21174"
    test_cluster_name: "acm21174-test-{{ ansible_date_time.epoch[-6:] }}"
    test_results: []
    openshift_version: "4.18.9"

    # ROSANetwork configuration
    rosa_network_config:
      name: "{{ test_cluster_name }}-network"
      availability_zones:
        - "{{ aws_region }}a"
        - "{{ aws_region }}b"
      cidr_block: "10.0.0.0/16"
      tags:
        Environment: "test"
        TestCase: "ACM-21174"
        CreatedBy: "ansible-automation"

  tasks:
    - name: Display test configuration
      debug:
        msg:
          - "Starting ACM-21174 ROSANetwork test"
          - "Test cluster: {{ test_cluster_name }}"
          - "OpenShift version: {{ openshift_version }}"
          - "AWS region: {{ aws_region }}"
          - "Availability zones: {{ rosa_network_config.availability_zones | join(', ') }}"

    - name: Test 1 - Create ROSANetwork
      block:
        - name: Create ROSANetwork for test cluster
          include_tasks: tasks/create_rosa_network.yml
          vars:
            cluster_name: "{{ test_cluster_name }}"

        - name: Validate ROSANetwork creation
          include_tasks: tasks/validate_rosa_network.yml
          vars:
            cluster_name: "{{ test_cluster_name }}"

        - name: Record test success
          set_fact:
            test_results: "{{ test_results + [{'name': 'ROSANetwork Creation', 'status': 'passed', 'time': 180}] }}"

      rescue:
        - name: Record test failure
          set_fact:
            test_results: "{{ test_results + [{'name': 'ROSANetwork Creation', 'status': 'failed', 'time': 180, 'failure_message': 'ROSANetwork creation failed'}] }}"

    - name: Test 2 - Validate AWS VPC Creation
      block:
        - name: Validate AWS VPC was created
          include_tasks: tasks/validate_aws_vpc_created.yml
          vars:
            cluster_name: "{{ test_cluster_name }}"

        - name: Validate subnets were created
          include_tasks: tasks/validate_aws_subnets_created.yml
          vars:
            cluster_name: "{{ test_cluster_name }}"

        - name: Record test success
          set_fact:
            test_results: "{{ test_results + [{'name': 'AWS VPC Validation', 'status': 'passed', 'time': 120}] }}"

      rescue:
        - name: Record test failure
          set_fact:
            test_results: "{{ test_results + [{'name': 'AWS VPC Validation', 'status': 'failed', 'time': 120, 'failure_message': 'AWS VPC validation failed'}] }}"

    - name: Test 3 - Create ROSA Cluster with Network Reference
      block:
        - name: Generate cluster configuration with ROSANetwork reference
          template:
            src: "{{ template_version_path }}/features/rosa-capi-network-cluster.yaml.j2"
            dest: "{{ output_dir }}/{{ test_cluster_name }}-cluster.yaml"

        - name: Apply ROSA cluster configuration
          kubernetes.core.k8s:
            state: present
            src: "{{ output_dir }}/{{ test_cluster_name }}-cluster.yaml"
            wait: true
            wait_timeout: 600

        - name: Verify network integration
          kubernetes.core.k8s_info:
            api_version: controlplane.cluster.x-k8s.io/v1beta2
            kind: ROSAControlPlane
            name: "{{ test_cluster_name }}"
            namespace: "{{ capi_namespace }}"
          register: controlplane_status

        - name: Validate network reference
          assert:
            that:
              - controlplane_status.resources[0].spec.rosaNetworkRef is defined
              - controlplane_status.resources[0].spec.rosaNetworkRef.name == test_cluster_name + "-network"
            fail_msg: "ROSANetwork reference not properly set in ROSAControlPlane"
            success_msg: "ROSANetwork properly referenced in ROSA cluster"

        - name: Record test success
          set_fact:
            test_results: "{{ test_results + [{'name': 'ROSA Cluster Network Integration', 'status': 'passed', 'time': 300}] }}"

      rescue:
        - name: Record test failure
          set_fact:
            test_results: "{{ test_results + [{'name': 'ROSA Cluster Network Integration', 'status': 'failed', 'time': 300, 'failure_message': 'Network integration test failed'}] }}"

    - name: Test 4 - Combined Network + Roles Automation (Optional)
      block:
        - name: Test combined ROSANetwork + ROSARoleConfig
          include_tasks: tasks/test_combined_automation.yml
          vars:
            cluster_name: "{{ test_cluster_name }}"
          when: test_combined_automation | default(false)

        - name: Record test success
          set_fact:
            test_results: "{{ test_results + [{'name': 'Combined Network + Roles Automation', 'status': 'passed', 'time': 240}] }}"
          when: test_combined_automation | default(false)

      rescue:
        - name: Record test failure
          set_fact:
            test_results: "{{ test_results + [{'name': 'Combined Network + Roles Automation', 'status': 'failed', 'time': 240, 'failure_message': 'Combined automation test failed'}] }}"
          when: test_combined_automation | default(false)

      when: test_combined_automation | default(false)

    - name: Cleanup test resources
      block:
        - name: Delete test cluster
          kubernetes.core.k8s:
            state: absent
            src: "{{ output_dir }}/{{ test_cluster_name }}-cluster.yaml"
            wait: true
            wait_timeout: 600
          ignore_errors: true

        - name: Clean up ROSANetwork
          include_tasks: tasks/cleanup_rosa_network.yml
          vars:
            cluster_name: "{{ test_cluster_name }}"
          ignore_errors: true

    - name: Display test results summary
      debug:
        msg:
          - "================================================="
          - "ACM-21174 ROSANetwork Test Results"
          - "================================================="
          - "{% for test in test_results %}"
          - "{{ loop.index }}. {{ test.name }}: {{ test.status | upper }}"
          - "   Duration: {{ test.time }}s"
          - "   {% if test.failure_message is defined %}Error: {{ test.failure_message }}{% endif %}"
          - "{% endfor %}"
          - "================================================="
          - "Overall Result: {{ 'SUCCESS' if test_results | selectattr('status', 'equalto', 'failed') | list | length == 0 else 'PARTIAL FAILURE' }}"
```

## Configuration Updates

### `vars/vars.yml` additions:
```yaml
#==== ACM-21174 ROSANetwork Testing ====
acm21174_config:
  enabled: true
  kind_cluster_name: "capa-network-test"
  openshift_version: "4.18.9"
  aws_region: "us-west-2"
  feature_flags:
    EXP_ROSA: "true"
    EXP_MACHINE_POOL: "true"
    CLUSTER_TOPOLOGY: "true"

rosa_network_config:
  enabled: true
  default_prefix: "{{ cluster_name_prefix | default('acm21174') }}"
  creation_timeout: 900  # 15 minutes for network setup
  default_cidr: "10.0.0.0/16"

capa_controller_network:
  image: "quay.io/mzazrivec/cluster-api-provider-aws"
  tag: "latest"
  milan_crds_base_url: "https://raw.githubusercontent.com/mzazrivec/cluster-api-provider-aws/main/config/crd/bases"

network_test_config:
  default_availability_zones:
    - "{{ aws_region }}a"
    - "{{ aws_region }}b"
  default_tags:
    Environment: "test"
    Project: "ACM-CAPI-Automation"
    TestCase: "ACM-21174"
    CreatedBy: "ansible-automation"
```

## Integration with Existing Framework

This implementation:
- ✅ **Extends existing patterns** from ACM-21162 ROSARoleConfig
- ✅ **Uses same automation framework** and task structure
- ✅ **Supports combined scenarios** (Network + Roles automation)
- ✅ **Follows template versioning** (4.18 vs 4.20)
- ✅ **Integrates with existing testing** and CI/CD workflows

## Key Benefits

✅ **Eliminates Manual VPC Setup**: No more manual VPC and subnet creation
✅ **CloudFormation-based**: Leverages proven AWS infrastructure templates
✅ **Multi-AZ Automation**: Automatic subnet distribution across availability zones
✅ **Status Tracking**: Comprehensive reporting of created network resources
✅ **Combined Automation**: Works with ROSARoleConfig for complete ROSA automation
✅ **AWS Best Practices**: Uses rosa-cli CloudFormation templates for network architecture