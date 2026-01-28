# ROSA HCP Test Automation Framework - User Guide

**Version:** 1.0
**Created:** January 22, 2026
**Author:** Tina Fitzgerald

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Suite Structure](#test-suite-structure)
4. [Usage Interfaces](#usage-interfaces)
5. [Test Reports](#test-reports)
6. [CI/CD Integration](#cicd-integration)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The ROSA HCP Test Automation Framework provides a standalone CLI tool for executing automated tests of ROSA (Red Hat OpenShift Service on AWS) cluster provisioning and lifecycle management. The framework operates **independently of the web UI**, making it suitable for:

- Local development testing
- CI/CD pipelines
- Automated regression testing
- QE validation workflows
- Continuous integration environments

### Key Features

- **CLI-Based Execution**: No UI required
- **Multiple Usage Interfaces**: Python CLI, Makefile targets, bash wrapper
- **Automated Reporting**: JSON and HTML reports with detailed metrics
- **Tag-Based Filtering**: Run specific subsets of tests
- **CI/CD Ready**: GitHub Actions workflow included
- **Real-Time Progress**: Colored terminal output with live status
- **Exit Codes**: Proper exit codes for automation (0 = success, 1 = failure)
- **Test History**: Timestamped results with "latest" symlinks

---

## Quick Start

### Prerequisites

```bash
# Required software
- Python 3.11+
- Ansible 2.15+
- oc CLI (for OpenShift interactions)
- AWS CLI (configured with credentials)
- rosa CLI (for ROSA operations)
```

### Installation

The framework is already included in the `automation-capi` repository. No separate installation required.

```bash
cd ~/acm_dev/automation-capi

# Make scripts executable (one-time setup)
chmod +x run-test-suite.py
chmod +x run-test.sh
```

### Your First Test

**Option 1: Using the bash wrapper (simplest)**
```bash
./run-test.sh basic
```

**Option 2: Using Make**
```bash
make test-basic
```

**Option 3: Using Python directly**
```bash
./run-test-suite.py 02-basic-rosa-hcp-cluster-creation
```

All three commands run the same basic ROSA HCP cluster creation test.

---

## Test Suite Structure

### Test Suite JSON Format

Test suites are defined in JSON files in the `test-suites/` directory:

```json
{
  "name": "Basic ROSA HCP Cluster Creation",
  "description": "Create and validate a basic ROSA HCP cluster",
  "execution": "sequential",
  "stopOnFailure": true,
  "notifyOnComplete": true,
  "playbooks": [
    {
      "name": "create_rosa_hcp_cluster.yml",
      "description": "Create ROSA HCP cluster using Cluster API",
      "timeout": 2400,
      "required": true,
      "vars": {
        "cluster_name": "test-cluster",
        "aws_region": "us-west-2"
      }
    }
  ],
  "tags": ["rosa-hcp", "basic", "cluster-creation"],
  "schedule": null
}
```

### Available Test Suites

| Suite ID | Name | Description | Tags |
|----------|------|-------------|------|
| `10-configure-mce-environment` | MCE Environment Setup | Configure MultiCluster Engine environment | `setup`, `mce`, `configuration` |
| `02-basic-rosa-hcp-cluster-creation` | Basic Cluster Creation | Create a basic ROSA HCP cluster | `rosa-hcp`, `basic`, `cluster-creation` |
| `23-rosa-hcp-full-lifecycle` | Full Lifecycle | Complete cluster lifecycle test | `rosa-hcp`, `lifecycle`, `comprehensive` |

### Creating Custom Test Suites

1. Create a new JSON file in `test-suites/`:
```bash
touch test-suites/04-my-custom-test.json
```

2. Define your test suite structure:
```json
{
  "name": "My Custom Test",
  "description": "Description of what this test does",
  "execution": "sequential",
  "stopOnFailure": true,
  "notifyOnComplete": true,
  "playbooks": [
    {
      "name": "my-playbook.yml",
      "description": "What this playbook does",
      "timeout": 1800,
      "required": true
    }
  ],
  "tags": ["custom", "my-feature"],
  "schedule": null
}
```

3. Run your custom test:
```bash
./run-test-suite.py 04-my-custom-test
```

---

## Usage Interfaces

The framework provides three interfaces with increasing levels of simplicity:

### 1. Python CLI (Full Control)

**Location**: `./run-test-suite.py`

**Advantages**:
- All command-line options available
- Most flexible and powerful
- Direct access to all features

**Usage**:
```bash
# List all available test suites
./run-test-suite.py --list

# Run a specific test suite
./run-test-suite.py 02-basic-rosa-hcp-cluster-creation

# Run all test suites
./run-test-suite.py --all

# Filter by tags
./run-test-suite.py --tag rosa-hcp

# Control report format
./run-test-suite.py --all --format json      # JSON only
./run-test-suite.py --all --format html      # HTML only
./run-test-suite.py --all --format both      # Both formats (default)

# Don't save results
./run-test-suite.py --all --no-save

# Get help
./run-test-suite.py --help
```

### 2. Makefile Targets (Convenient)

**Location**: `Makefile`

**Advantages**:
- Easy to remember commands
- Pre-configured targets
- Tab completion in many shells

**Usage**:
```bash
# Show all available targets
make help

# List test suites
make test-list

# Run specific test suites
make test-basic      # Basic cluster creation
make test-configure  # MCE environment setup
make test-lifecycle  # Full lifecycle test

# Run all tests
make test-all

# Filter by tags
make test-rosa       # All ROSA HCP tests

# CI/CD targets
make ci-test         # JSON output for CI/CD
make ci-validate     # Validate test suite JSON

# Utility targets
make clean           # Clean test results
make reports         # Open latest HTML report
make demo            # Demo colored output
```

### 3. Bash Wrapper (Simplest)

**Location**: `./run-test.sh`

**Advantages**:
- Shortest commands
- Intuitive aliases
- Perfect for quick testing

**Usage**:
```bash
# Run basic cluster creation
./run-test.sh basic
./run-test.sh cluster
./run-test.sh create

# Run environment configuration
./run-test.sh configure
./run-test.sh config
./run-test.sh setup
./run-test.sh env

# Run full lifecycle test
./run-test.sh lifecycle
./run-test.sh full

# Run all tests
./run-test.sh all

# Filter by tag
./run-test.sh rosa
./run-test.sh rosa-hcp

# List available tests
./run-test.sh list
./run-test.sh ls

# Open latest report
./run-test.sh report
./run-test.sh reports

# Show help
./run-test.sh help
```

---

## Test Reports

### Report Formats

The framework generates two report formats:

1. **JSON**: Machine-readable, perfect for CI/CD parsing
2. **HTML**: Human-readable, beautiful visualization

### Report Locations

```
test-results/
├── YYYY-MM-DD/              # Dated directories
│   ├── test-run-TIMESTAMP.json
│   └── test-run-TIMESTAMP.html
├── latest.json              # Symlink to most recent JSON
└── latest.html              # Symlink to most recent HTML
```

### JSON Report Structure

```json
{
  "start_time": "2026-01-22T10:00:00",
  "end_time": "2026-01-22T10:45:00",
  "duration": 2700.5,
  "total_tests": 5,
  "passed": 4,
  "failed": 1,
  "skipped": 0,
  "suites": [
    {
      "id": "02-basic-rosa-hcp-cluster-creation",
      "name": "Basic ROSA HCP Cluster Creation",
      "start_time": "2026-01-22T10:00:00",
      "end_time": "2026-01-22T10:40:00",
      "duration": 2400.0,
      "playbooks": [
        {
          "name": "create_rosa_hcp_cluster.yml",
          "description": "Create ROSA HCP cluster using Cluster API",
          "success": true,
          "duration": 2400.0,
          "output": "..."
        }
      ]
    }
  ]
}
```

### HTML Report Features

- **Summary Dashboard**: Total tests, pass/fail counts, success rate
- **Progress Bar**: Visual representation of pass percentage
- **Suite Details**: Expandable sections for each test suite
- **Playbook Results**: Color-coded success/failure indicators
- **Error Messages**: Detailed error output for failed tests
- **Duration Tracking**: Execution time for each playbook and suite
- **Responsive Design**: Works on all screen sizes

### Viewing Reports

```bash
# Option 1: Using bash wrapper
./run-test.sh report

# Option 2: Using Make
make reports

# Option 3: Manual
open test-results/latest.html   # macOS
xdg-open test-results/latest.html  # Linux
```

---

## CI/CD Integration

### GitHub Actions Workflow

The framework includes a complete GitHub Actions workflow at `.github/workflows/test-suite.yml`.

#### Workflow Triggers

1. **Push to main/develop**: Runs validation + full tests on main, basic tests on develop
2. **Pull Requests**: Runs validation + basic tests
3. **Manual Dispatch**: Run any test suite on demand

#### Manual Workflow Execution

```bash
# Via GitHub UI:
1. Go to Actions tab
2. Select "ROSA HCP Test Suite" workflow
3. Click "Run workflow"
4. Choose:
   - Branch
   - Suite ID (or "all")
   - Tags (optional filter)
5. Click "Run workflow"

# Via GitHub CLI:
gh workflow run test-suite.yml \
  -f suite_id="02-basic-rosa-hcp-cluster-creation"

gh workflow run test-suite.yml \
  -f tags="rosa-hcp"
```

#### Required Secrets

Configure these in GitHub Repository Settings > Secrets:

```yaml
AWS_ACCESS_KEY_ID: "YOUR_AWS_ACCESS_KEY"
AWS_SECRET_ACCESS_KEY: "YOUR_AWS_SECRET_KEY"
AWS_REGION: "us-west-2"
OCP_HUB_API_URL: "https://api.your-cluster.example.com:6443"
OCP_HUB_CLUSTER_USER: "your-username"
OCP_HUB_CLUSTER_PASSWORD: "your-password"
OCM_CLIENT_ID: "your-ocm-client-id"
OCM_CLIENT_SECRET: "your-ocm-client-secret"
```

#### Test Results Artifacts

All test runs automatically upload results as GitHub Artifacts:

- **Retention**: 30 days for PR/develop, 90 days for main
- **Formats**: Both JSON and HTML reports
- **Download**: Via GitHub UI or `gh run download`

---

## Advanced Usage

### Environment Variables

Override default behavior with environment variables:

```bash
# AWS Configuration
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."

# OpenShift Configuration
export OCP_HUB_API_URL="https://api.cluster.example.com:6443"
export OCP_HUB_CLUSTER_USER="admin"
export OCP_HUB_CLUSTER_PASSWORD="password"

# OCM Configuration
export OCM_CLIENT_ID="..."
export OCM_CLIENT_SECRET="..."

# Run tests
./run-test-suite.py --all
```

### Timeout Configuration

Control test timeouts in the test suite JSON:

```json
{
  "playbooks": [
    {
      "name": "long-running-playbook.yml",
      "timeout": 3600,  // 1 hour
      "required": true
    }
  ]
}
```

### Stop on Failure

Configure whether to continue after failures:

```json
{
  "stopOnFailure": false,  // Continue even if tests fail
  "playbooks": [
    {
      "name": "optional-test.yml",
      "required": false  // Non-critical test
    }
  ]
}
```

### Parallel vs Sequential Execution

```json
{
  "execution": "parallel",  // Run playbooks in parallel
  // or
  "execution": "sequential"  // Run playbooks one at a time
}
```

**Note**: Parallel execution is not yet implemented but reserved for future use.

---

## Troubleshooting

### Common Issues

#### 1. Permission Denied

**Problem**: `./run-test-suite.py: Permission denied`

**Solution**:
```bash
chmod +x run-test-suite.py run-test.sh
```

#### 2. Test Suite Not Found

**Problem**: `✗ Test suite not found: my-test`

**Solution**:
```bash
# List available suites
./run-test-suite.py --list

# Ensure JSON file exists
ls -la test-suites/*.json
```

#### 3. Invalid JSON

**Problem**: `✗ Invalid JSON in my-test: ...`

**Solution**:
```bash
# Validate JSON syntax
make ci-validate

# Check specific file
python3 -m json.tool test-suites/my-test.json
```

#### 4. Playbook Not Found

**Problem**: `Playbook not found: create_cluster.yml`

**Solution**:
```bash
# Ensure playbook exists in project root
ls -la *.yml

# Check path in test suite JSON
cat test-suites/my-test.json | jq '.playbooks[].name'
```

#### 5. Ansible Command Not Found

**Problem**: `ansible-playbook: command not found`

**Solution**:
```bash
# Install Ansible
pip install ansible==2.15
```

#### 6. AWS Credentials Error

**Problem**: `Unable to locate credentials`

**Solution**:
```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-west-2"
```

### Debug Output

Enable verbose logging:

```bash
# Run test with verbose Ansible output
ansible-playbook -vvv create_rosa_hcp_cluster.yml

# Check playbook syntax before running
ansible-playbook --syntax-check create_rosa_hcp_cluster.yml
```

### Cleaning Up

```bash
# Remove all test results
make clean

# Or manually
rm -rf test-results/

# Keep dated results, remove latest symlinks
rm test-results/latest.json test-results/latest.html
```

---

## Best Practices

### For Developers

1. **Run locally first**: Test changes locally before pushing to CI/CD
2. **Use tags**: Organize tests with meaningful tags for easy filtering
3. **Set appropriate timeouts**: Give tests enough time but not too much
4. **Check exit codes**: Use `$?` to verify test success in scripts
5. **Review reports**: Always check HTML reports for detailed failure info

### For CI/CD Pipelines

1. **Use JSON format**: Easier to parse in automation
2. **Set --no-save flag**: If you don't need local results
3. **Upload artifacts**: Always upload test results for debugging
4. **Fail fast**: Use `stopOnFailure: true` for critical tests
5. **Tag-based runs**: Run different test suites for different branches

### For QE Teams

1. **Comprehensive tags**: Use tags to organize test types (smoke, regression, etc.)
2. **Document requirements**: Include clear descriptions in test suite JSON
3. **Track history**: Keep dated results for regression analysis
4. **Report summaries**: Use HTML reports for stakeholder communication
5. **Scheduled runs**: Use GitHub Actions schedules for nightly tests

---

## Reference

### Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed
- `1`: Invalid arguments or configuration error

### Test Suite JSON Schema

```json
{
  "name": "string (required)",
  "description": "string (required)",
  "execution": "sequential|parallel (default: sequential)",
  "stopOnFailure": "boolean (default: false)",
  "notifyOnComplete": "boolean (default: false)",
  "playbooks": [
    {
      "name": "string (required, relative to project root)",
      "description": "string (optional)",
      "timeout": "integer (seconds, optional, default: 120)",
      "required": "boolean (optional, default: true)",
      "vars": {
        "key": "value"  // Extra variables for playbook
      }
    }
  ],
  "tags": ["string array"],
  "schedule": "cron expression or null"
}
```

### Python CLI Help

```bash
./run-test-suite.py --help
```

### Makefile Help

```bash
make help
```

### Bash Wrapper Help

```bash
./run-test.sh help
```

---

## Support and Contributing

### Getting Help

- Check this documentation first
- Review existing test suites for examples
- Check HTML reports for detailed error messages
- Run with `--help` for command-line assistance

### Reporting Issues

Include:
1. Command used
2. Test suite JSON (if custom)
3. Error messages
4. Environment details (OS, Python version, Ansible version)

### Contributing

1. Create test suites in `test-suites/` directory
2. Follow existing JSON structure
3. Test locally before committing
4. Update documentation if needed

---

**Last Updated**: January 22, 2026
**Framework Version**: 1.0
**Maintained By**: Tina Fitzgerald
