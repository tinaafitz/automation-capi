# Multi-Version YAML Organization Plan

## Overview

This document outlines the strategy for organizing YAML files across multiple OpenShift versions (4.18, 4.19, 4.20+) in the automation-capi repository. The goal is to create a scalable, maintainable structure that supports version-specific configurations while preserving backward compatibility.

## Current State Analysis

### Existing Structure
- `templates/4_19_tests/` contains 11 version-specific test files
- Templates scattered across role directories (`roles/*/templates/`)
- No centralized version management system
- Version references exist but not systematically organized
- Files found: `demo-v4.17.25.yaml`, various `rcp-*.yaml` files in 4.19 tests

### Pain Points
- Difficult to add new versions
- No clear version selection mechanism
- Templates duplicated across roles
- Limited version-specific feature support

## Proposed Multi-Version Strategy

### 1. Directory Structure Reorganization

```
templates/
├── versions/
│   ├── 4.18/
│   │   ├── cluster-configs/
│   │   │   ├── rosa-control-plane.yaml.j2
│   │   │   └── cluster-network.yaml.j2
│   │   ├── machine-pools/
│   │   │   ├── standard-pool.yaml.j2
│   │   │   └── autoscaler-pool.yaml.j2
│   │   └── features/
│   │       ├── basic-networking.yaml
│   │       └── standard-security.yaml
│   ├── 4.19/
│   │   ├── cluster-configs/
│   │   ├── machine-pools/
│   │   └── features/
│   │       ├── rcp-external-oidc.yaml
│   │       ├── rcp-cluster-autoscaler-expander.yaml
│   │       ├── rcp-parallel-node-upgrade.yaml
│   │       └── [existing 4_19_tests files moved here]
│   └── 4.20/
│       ├── cluster-configs/
│       ├── machine-pools/
│       └── features/
│           ├── enhanced-security.yaml
│           ├── multi-arch-support.yaml
│           └── advanced-networking.yaml
├── common/                 # Version-agnostic templates
│   ├── capa-manager-bootstrap-credentials.yaml.j2
│   ├── results.xml.j2
│   └── base-configurations/
└── schemas/               # Version compatibility definitions
    ├── feature-matrix.yml
    └── version-compatibility.yml
```

### 2. Version Management System

#### Variable-Based Selection
```yaml
# In vars/vars.yml
openshift_version: "4.19"                    # Default version
supported_versions: ["4.18", "4.19", "4.20"]
template_version_path: "templates/versions/{{ openshift_version }}"
common_template_path: "templates/common"
```

#### Template Resolution Logic
1. Try version-specific template first: `templates/versions/{version}/{category}/{template}`
2. Fall back to common template: `templates/common/{template}`  
3. Error if neither exists

### 3. Feature Matrix Approach

#### Version-Feature Mapping
```yaml
# schemas/feature-matrix.yml
version_features:
  "4.18":
    cluster_configs:
      - basic-networking
      - standard-machine-pools
      - basic-security
    supported_features:
      - rosa-hcp-basic
      - aws-integration
  "4.19":
    cluster_configs:
      - external-oidc
      - cluster-autoscaler-expander
      - parallel-node-upgrades
    supported_features:
      - rosa-hcp-advanced
      - enhanced-networking
      - multi-zone-deployment
  "4.20":
    cluster_configs:
      - enhanced-security
      - multi-arch-support
      - advanced-networking
    supported_features:
      - rosa-hcp-premium
      - edge-computing
      - ai-workloads
```

### 4. Migration Strategy

#### Phase 1: Foundation (Week 1)
**Objectives:**
- Create new directory structure
- Move existing files without breaking functionality
- Establish basic version selection

**Tasks:**
1. Create `templates/versions/{4.18,4.19,4.20}` directories
2. Create subdirectories: `cluster-configs/`, `machine-pools/`, `features/`
3. Move `templates/4_19_tests/*` → `templates/versions/4.19/features/`
4. Move common templates to `templates/common/`
5. Update critical playbook paths
6. Test existing functionality

**Success Criteria:**
- All existing playbooks continue to work
- Files are organized in new structure
- No broken template references

#### Phase 2: Framework (Week 2)
**Objectives:**
- Implement version selection mechanism
- Add smart template lookup
- Create version validation

**Tasks:**
1. Add version variables to `vars/vars.yml`
2. Create template lookup tasks with fallback logic
3. Implement version validation in main playbooks
4. Update `capi-assistant.yaml` for version selection
5. Create helper tasks for version-aware operations

**Success Criteria:**
- Version can be selected via variables
- Template fallback works correctly
- Version validation prevents incompatible operations

#### Phase 3: Content Creation (Week 3)
**Objectives:**
- Populate version-specific templates
- Implement feature differentiation
- Create version documentation

**Tasks:**
1. Create 4.18 templates (baseline/simplified versions)
2. Create 4.20 templates (advanced features)
3. Implement `schemas/feature-matrix.yml`
4. Add version-specific documentation
5. Create migration guides for existing users

**Success Criteria:**
- All three versions have complete template sets
- Feature matrix correctly maps capabilities
- Clear documentation for version differences

#### Phase 4: Integration & Testing (Week 4)
**Objectives:**
- Complete integration across all components
- Comprehensive testing
- Production readiness

**Tasks:**
1. Update all role templates (`roles/*/templates/`)
2. Implement version-aware CI/CD testing
3. Create comprehensive test matrix
4. Update README and documentation
5. Performance testing across versions

**Success Criteria:**
- All roles work with new structure
- CI/CD validates all version combinations
- Performance meets existing benchmarks
- Documentation is complete

### 5. Playbook Integration

#### Version-Aware Task Example
```yaml
# Enhanced task structure
- name: Set version-specific paths
  set_fact:
    version_templates: "templates/versions/{{ openshift_version }}"
    common_templates: "templates/common"
    feature_list: "{{ version_features[openshift_version] }}"

- name: Validate version compatibility
  fail:
    msg: "OpenShift version {{ openshift_version }} is not supported"
  when: openshift_version not in supported_versions

- name: Create version-specific cluster config
  template:
    src: "{{ version_templates }}/cluster-configs/rosa-control-plane.yaml.j2"
    dest: "{{ output_dir }}/rosa-control-plane.yaml"
  when: lookup('file', version_templates + '/cluster-configs/rosa-control-plane.yaml.j2', errors='ignore')

- name: Fall back to common template
  template:
    src: "{{ common_templates }}/rosa-control-plane.yaml.j2"
    dest: "{{ output_dir }}/rosa-control-plane.yaml"
  when: 
    - lookup('file', version_templates + '/cluster-configs/rosa-control-plane.yaml.j2', errors='ignore') == ""
    - lookup('file', common_templates + '/rosa-control-plane.yaml.j2', errors='ignore') != ""
```

#### Updated User Interface
```yaml
# Enhanced capi-assistant.yaml
vars_prompt:
  - name: openshift_version
    prompt: |
      Select OpenShift version:
        1 - 4.18 (Basic features, stable)
        2 - 4.19 (Enhanced features, current)  
        3 - 4.20 (Latest features, preview)
    default: "2"
    private: no

- name: Convert selection to version
  set_fact:
    openshift_version: "{{ {'1': '4.18', '2': '4.19', '3': '4.20'}[openshift_version] }}"
```

### 6. Benefits of This Approach

#### Scalability
- Easy addition of new versions (4.21, 4.22, etc.)
- Clear pattern for version-specific features
- Automated feature compatibility checking

#### Maintainability  
- Clear separation of version-specific vs common code
- Centralized template management
- Reduced code duplication across roles

#### Flexibility
- Mix and match features across versions
- Gradual migration support
- Version-specific testing capabilities

#### Backward Compatibility
- Existing workflows continue working
- Graceful fallback mechanisms
- Smooth migration path

### 7. Risk Mitigation

#### Backup Strategy
- Keep existing structure during transition period
- Use feature flags to toggle between old/new systems
- Comprehensive testing before removing old paths
- Git branching strategy for safe rollbacks

#### Rollback Plan
- Maintain parallel systems during transition
- Quick revert capability via variable changes
- Staged deployment to minimize impact
- Clear rollback procedures documented

#### Testing Strategy
- Version-specific test suites
- Cross-version compatibility testing
- Performance regression testing
- User acceptance testing

### 8. Success Metrics

#### Technical Metrics
- Zero breaking changes to existing functionality
- Template lookup performance < 100ms
- 100% test coverage across all versions
- < 5% increase in playbook execution time

#### User Experience Metrics
- Clear version selection interface
- Comprehensive error messages for version conflicts
- Complete documentation for all versions
- Smooth migration experience

### 9. Future Considerations

#### Long-term Maintenance
- Deprecation strategy for old versions
- Security update procedures
- Feature backporting guidelines
- Version lifecycle management

#### Extensibility
- Plugin architecture for custom features
- External template repositories
- Version-specific hooks and callbacks
- Integration with upstream OpenShift releases

## Implementation Timeline

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1 | Foundation | New directory structure, file migration |
| 2 | Framework | Version selection, template lookup logic |
| 3 | Content | Version-specific templates, feature matrix |
| 4 | Integration | Complete testing, documentation, production ready |

## Conclusion

This plan provides a systematic approach to organizing multiple OpenShift versions while maintaining operational continuity and enabling future scalability. The phased implementation ensures minimal disruption while delivering significant long-term benefits for maintainability and feature development.