# CAPI/CAPA Helm Chart Test Framework

## Overview

This is a hybrid Ansible + Go test framework for validating CAPI (Cluster API) and CAPA (Cluster API Provider AWS) Helm chart installations across different environments.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Test Control Plane                         │
│                   (run_tests.sh)                            │
├─────────────────────────────────────────────────────────────┤
│              Test Orchestration (Ansible)                    │
│  • Environment Detection                                     │
│  • cert-manager Prerequisites                                │
│  • CAPI/CAPA Installation                                    │
├─────────────────────────────────────────────────────────────┤
│              Validation Engine (Go)                          │
│  • Component Status Checks                                   │
│  • Deployment Readiness                                      │
│  • Resource Verification                                     │
└─────────────────────────────────────────────────────────────┘
```

### Why Hybrid Ansible + Go?

**Ansible Strengths:**
- Orchestration and workflow management
- Environment provisioning
- Installation procedures
- Cross-platform compatibility

**Go Strengths:**
- Native Kubernetes API integration
- Fast validation execution
- Type-safe resource checks
- Structured test reporting

## Directory Structure

```
tests/
├── ansible/                      # Ansible playbooks for orchestration
│   ├── detect_environment.yml    # Auto-detect OpenShift vs Minikube
│   ├── check_cert_manager.yml    # cert-manager prerequisite check
│   └── test_capi_installation.yml # Main test orchestration
├── go/                           # Go validation framework
│   ├── go.mod                    # Go module definition
│   ├── cmd/                      # Command-line tools
│   │   └── main.go               # Test validator executable
│   └── pkg/                      # Shared packages
│       └── validators/           # Validation logic
│           └── capi_validator.go # CAPI/CAPA validators
├── results/                      # Test results (generated)
│   ├── environment.json          # Environment detection results
│   ├── cert-manager-status.json  # cert-manager status
│   └── validation-results.json   # Final test results
├── run_tests.sh                  # Main test runner script
└── README.md                     # This file
```

## Prerequisites

1. **kubectl** - Kubernetes command-line tool
2. **Ansible** - Automation framework (2.9+)
3. **Go** - Go programming language (1.21+)
4. **Access to a Kubernetes cluster** (Minikube or OpenShift)

### Installing Prerequisites

**macOS:**
```bash
# Install kubectl
brew install kubectl

# Install Ansible
brew install ansible

# Install Go
brew install go
```

**Linux:**
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Ansible
sudo apt update
sudo apt install ansible

# Install Go
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

## Quick Start

### Run Tests (Auto-Detect Environment)

```bash
cd tests
./run_tests.sh
```

This will:
1. Detect your cluster environment (OpenShift vs Minikube)
2. Check/install cert-manager prerequisites
3. Install CAPI/CAPA using the appropriate Helm charts
4. Run Go-based validations
5. Generate test reports

### Run Tests with Options

```bash
# Clean results before running
./run_tests.sh --clean

# Enable verbose output
./run_tests.sh --verbose

# Specify custom kubeconfig
./run_tests.sh --kubeconfig /path/to/kubeconfig

# Combine options
./run_tests.sh --clean --verbose
```

## Test Workflow

### Phase 1: Environment Detection

The framework automatically detects:
- Cluster type (OpenShift, Minikube, or generic Kubernetes)
- cert-manager availability
- Recommended Helm chart source (stolostron vs capi-operator)

**Detection Logic:**
- **OpenShift**: Checks for Red Hat node OS, OpenShift-specific labels
- **Minikube**: Checks for Minikube labels and node names
- **cert-manager**: Checks for OpenShift operator or standalone installation

### Phase 2: cert-manager Prerequisites

For non-OpenShift environments, ensures cert-manager is installed:
- Checks if cert-manager namespace exists
- Installs cert-manager v1.14.0 if not present
- Waits for all cert-manager components to be ready

OpenShift environments use the built-in cert-manager operator.

### Phase 3: CAPI/CAPA Installation

Based on environment detection:

**Minikube/Kubernetes:**
- Uses CAPI Operator Helm charts
- Source: `kubernetes-sigs.github.io/cluster-api-operator`
- cert-manager: Standalone

**OpenShift:**
- Uses stolostron Helm charts
- Source: `stolostron/cluster-api-installer`
- cert-manager: OpenShift operator

### Phase 4: Go-Based Validation

Executes comprehensive checks:

1. **cert-manager Validation**
   - Namespace exists
   - All deployments ready (cert-manager, webhook, cainjector)

2. **CAPI System Validation**
   - capi-system namespace exists
   - capi-controller-manager deployment ready

3. **CAPA System Validation**
   - capa-system namespace exists
   - capa-controller-manager deployment ready

4. **Namespace Validation**
   - ns-rosa-hcp namespace exists and active

### Phase 5: Results Reporting

Generates structured JSON reports with:
- Test execution summary
- Individual validation results
- Timing information
- Pass/fail status

## Test Results

### Result Files

All test results are saved in `tests/results/`:

**environment.json** - Environment detection:
```json
{
  "environment_type": "minikube",
  "is_openshift": false,
  "is_minikube": true,
  "has_cert_manager": true,
  "cert_manager_type": "standalone",
  "recommended_chart": "capi-operator",
  "kubernetes_version": "v1.32.0"
}
```

**validation-results.json** - Test results:
```json
{
  "environment": "minikube",
  "test_suite": "capi-installation-minikube",
  "total_tests": 4,
  "passed_tests": 4,
  "failed_tests": 0,
  "status": "PASSED",
  "duration": "2.5s",
  "results": [...]
}
```

### Interpreting Results

**Exit Codes:**
- `0` - All tests passed
- `1` - One or more tests failed

**Test Status:**
- ✅ `PASSED` - All validations successful
- ❌ `FAILED` - One or more validations failed

## Manual Test Execution

### Run Only Environment Detection

```bash
cd tests/ansible
ansible-playbook detect_environment.yml
```

### Run Only cert-manager Check

```bash
cd tests/ansible
ansible-playbook check_cert_manager.yml
```

### Run Only Go Validations

```bash
cd tests/go/cmd
go run main.go \
  --env minikube \
  --suite capi-installation \
  --output ../../results/validation-results.json
```

## Extending the Framework

### Adding New Validators

1. Add validation method to `go/pkg/validators/capi_validator.go`:

```go
func (v *CAPIValidator) ValidateNewComponent() ValidationResult {
    start := time.Now()
    result := ValidationResult{
        Name:      "New Component",
        Timestamp: start,
    }

    // Your validation logic here

    result.Duration = time.Since(start).String()
    return result
}
```

2. Add to `RunAllValidations()`:

```go
func (v *CAPIValidator) RunAllValidations() []ValidationResult {
    results := []ValidationResult{}
    results = append(results, v.ValidateNewComponent())
    return results
}
```

### Adding New Test Scenarios

Create new playbook in `tests/ansible/`:

```yaml
---
- name: My Custom Test Scenario
  hosts: localhost
  tasks:
    - name: Custom validation step
      shell: kubectl get pods -n custom-namespace
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: CAPI Helm Chart Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Minikube
        uses: medyagh/setup-minikube@latest

      - name: Run CAPI Tests
        run: |
          cd tests
          ./run_tests.sh --verbose

      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/results/
```

## Troubleshooting

### Common Issues

**Issue: "kubectl not found"**
```bash
# Install kubectl
brew install kubectl  # macOS
sudo apt install kubectl  # Linux
```

**Issue: "Cannot connect to cluster"**
```bash
# Verify kubeconfig
kubectl cluster-info

# Check context
kubectl config current-context
```

**Issue: "cert-manager installation timeout"**
```bash
# Check cert-manager pods
kubectl get pods -n cert-manager

# View pod logs
kubectl logs -n cert-manager deployment/cert-manager
```

**Issue: "Go module dependencies"**
```bash
cd tests/go
go mod download
go mod tidy
```

## Support Matrix

| Environment | CAPI Chart Source | cert-manager | Status |
|-------------|-------------------|--------------|--------|
| Minikube | capi-operator | Standalone | ✅ Supported |
| OpenShift | stolostron | OCP Operator | ✅ Supported |
| Generic K8s | capi-operator | Standalone | ✅ Supported |

## Contributing

To contribute to the test framework:

1. Add tests for new functionality
2. Update documentation
3. Ensure all tests pass before submitting PR
4. Follow existing code patterns

## License

This test framework is part of the automation-capi project.
