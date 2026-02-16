# Test Suite Framework Documentation

## Overview

This is a custom test automation framework for testing Red Hat OpenShift Service on AWS (ROSA) clusters, specifically Hypershift-based deployments with CAPA (Cluster API Provider AWS).

The framework uses **Ansible playbooks** for test execution, **JSON files** for test suite definitions, and a **Python test runner** to orchestrate everything.

## Architecture

```
test-automation-capa/
├── test-suites/          # JSON test suite definitions
├── playbooks/            # Ansible playbooks (actual test logic)
├── test-results/         # Test execution results
├── tasks/                # Reusable Ansible tasks
├── scripts/              # Supporting scripts
└── vars/                 # Variable definitions
```

## How It Works

### 1. Test Suite Definitions (JSON)
Each test suite is defined in a JSON file that specifies:
- Test name and description
- Ansible playbook to execute
- Tags for filtering
- Prerequisites
- Expected outcomes

Example: `20-rosa-hcp-provision.json`

### 2. Test Execution (Ansible Playbooks)
Playbooks in the `playbooks/` directory contain the actual test logic:
- Cluster provisioning steps
- Resource creation/validation
- Configuration verification
- Cleanup operations

### 3. Test Runner (Python)
The `run-test-suite.py` script orchestrates test execution:
- Reads JSON test suite definitions
- Executes Ansible playbooks
- Tracks results (pass/fail/timeout)
- Generates reports

## Usage

### Basic Commands

**Run a specific test suite:**
```bash
./run-test-suite.py <suite-name> -e <variables>
```

**List all available test suites:**
```bash
./run-test-suite.py --list
```

**Run all test suites:**
```bash
./run-test-suite.py --all
```

**Filter by tag:**
```bash
./run-test-suite.py --tag provision
```

**Dry run (no actual changes):**
```bash
./run-test-suite.py <suite-name> --dry-run
```

### Common Examples

**Provision a ROSA HCP cluster:**
```bash
./run-test-suite.py 20-rosa-hcp-provision -e name_prefix=qe6
```

**Run with custom variables:**
```bash
./run-test-suite.py 20-rosa-hcp-provision \
  -e name_prefix=test123 \
  -e region=us-west-2 \
  -e aws_account_id=123456789012
```

**Run with verbose output:**
```bash
./run-test-suite.py 20-rosa-hcp-provision -e name_prefix=qe6 -v
```

## Test Runner Options

| Option | Description |
|--------|-------------|
| `--all` | Run all available test suites |
| `--tag <tag>` | Filter test suites by tag |
| `--list` | List all available test suites without running |
| `--format <format>` | Output format: `json`, `html`, or `junit` |
| `-e, --extra-vars` | Pass extra variables to Ansible |
| `--dry-run` | Run in check mode (no actual changes) |
| `-v, --verbose` | Increase output verbosity |
| `--parallel` | Run tests in parallel (if supported) |
| `--timeout <seconds>` | Set timeout for test execution |

## Test Results

Test results are stored in the `test-results/` directory with:
- Execution timestamp
- Pass/fail status
- Detailed logs
- Error messages (if any)

### Report Formats

**JSON Output:**
```bash
./run-test-suite.py 20-rosa-hcp-provision --format json
```

**HTML Report:**
```bash
./run-test-suite.py 20-rosa-hcp-provision --format html
```

**JUnit XML (for CI/CD):**
```bash
./run-test-suite.py 20-rosa-hcp-provision --format junit
```

## Test Suite Structure

A typical test suite JSON file contains:

```json
{
  "name": "Test Suite Name",
  "description": "What this test does",
  "playbook": "path/to/playbook.yml",
  "tags": ["tag1", "tag2"],
  "prerequisites": [
    "Requirement 1",
    "Requirement 2"
  ],
  "expected_results": [
    "Expected outcome 1",
    "Expected outcome 2"
  ]
}
```

## What Gets Tested

This framework tests:
- ✅ ROSA HCP cluster provisioning
- ✅ Network resource creation and configuration
- ✅ IAM role setup and permissions
- ✅ Cluster readiness and health checks
- ✅ Multi-Cluster Engine (MCE) integration
- ✅ Resource cleanup and deletion

## Prerequisites

Before running tests, ensure you have:
1. **Ansible** installed and configured
2. **AWS credentials** properly set up
3. **Required IAM permissions** for ROSA operations
4. **Python 3.x** installed
5. **Network access** to AWS and Red Hat services

## Environment Variables

Common variables you can set:

| Variable | Description | Example |
|----------|-------------|---------|
| `name_prefix` | Prefix for created resources | `qe6` |
| `region` | AWS region | `us-east-1` |
| `aws_account_id` | AWS Account ID | `123456789012` |
| `vpc_cidr` | VPC CIDR block | `10.0.0.0/16` |

## Monitoring

### Check Cluster Resources
```bash
# View all ROSA cluster resources
oc get rosacontrolplane,rosamachinepool,rosanetwork,rosaroleconfig -n ns-rosa-hcp

# Check specific cluster status
oc describe rosacontrolplane <cluster-name> -n ns-rosa-hcp

# View all ROSA clusters across all namespaces
oc get rosacontrolplane --all-namespaces -o wide

# Get detailed cluster information with status
oc get rosacontrolplane -n ns-rosa-hcp -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.ready}{"\t"}{.spec.region}{"\n"}{end}'
```

### Check MCE Components
```bash
# View MCE configuration
oc get mce multiclusterengine -n multicluster-engine -o yaml

# Check CAPA controller logs
oc logs -n multicluster-engine deployment/capa-controller-manager
```

### View Test Results
Test results are saved in `test-results/` directory with timestamped subdirectories.

## Troubleshooting

### Common Issues

**1. OCP Login Failed**
```bash
# Verify credentials
oc login $OCP_HUB_API_URL -u $OCP_HUB_CLUSTER_USER -p $OCP_HUB_CLUSTER_PASSWORD
```

**2. CAPI/CAPA Not Enabled**
```bash
# Run configuration playbook
./run-test-suite.py 10-configure-mce-environment
```

**3. Cluster Provisioning Stuck**
```bash
# Check ROSAControlPlane status
oc describe rosacontrolplane <cluster-name> -n ns-rosa-hcp

# Check CAPA controller logs
oc logs -n multicluster-engine deployment/capa-controller-manager
```

**Test fails immediately:**
- Check prerequisites are met
- Verify AWS credentials are configured
- Ensure required variables are provided

**Test times out:**
- Check network connectivity
- Verify AWS service availability
- Review cluster capacity limits

**Permission errors:**
- Verify IAM roles and policies
- Check AWS account permissions
- Ensure service quotas aren't exceeded

## CI/CD Integration

The framework supports CI/CD integration via:
- JUnit XML output format
- Jenkins pipeline support (see `Jenkinsfile`)
- Exit codes for pass/fail status
- Automated result reporting

### Jenkins Example
```groovy
stage('Run E2E Tests') {
    steps {
        sh './run-test-suite.py --all --format junit'
    }
}
```

## Best Practices

1. **Use descriptive name prefixes** to identify your test resources
2. **Always clean up** test resources after completion
3. **Review prerequisites** before running test suites
4. **Use dry-run mode** to validate before actual execution
5. **Tag your tests** appropriately for easy filtering
6. **Monitor resource quotas** in your AWS account

## Support

For issues or questions:
- Review test suite JSON files for specific test documentation
- Check Ansible playbook logs in `test-results/`
- Consult the main project repository for updates

## Quick Reference

```bash
# List tests
./run-test-suite.py --list

# Run single test
./run-test-suite.py 20-rosa-hcp-provision -e name_prefix=mytest

# Run all provision tests
./run-test-suite.py --tag provision

# Dry run
./run-test-suite.py 20-rosa-hcp-provision --dry-run -e name_prefix=test

# Generate HTML report
./run-test-suite.py 20-rosa-hcp-provision --format html -e name_prefix=report
```
