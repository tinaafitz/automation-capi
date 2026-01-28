# ROSA HCP Test Automation Framework

**Standalone CLI test runner for ROSA HCP cluster provisioning - No UI required!**

## Quick Start

```bash
# 1. Make scripts executable (one-time setup)
chmod +x run-test-suite.py run-test.sh

# 2. Run your first test (choose one method)
./run-test.sh basic          # Bash wrapper (simplest)
make test-basic              # Using Make
./run-test-suite.py 02-basic-rosa-hcp-cluster-creation  # Python CLI (full control)

# 3. View results
./run-test.sh report         # Opens HTML report in browser
```

## Three Ways to Run Tests

### 1. Bash Wrapper (Easiest)
```bash
./run-test.sh basic          # Basic cluster creation
./run-test.sh configure      # Environment setup
./run-test.sh lifecycle      # Full lifecycle test
./run-test.sh all            # Run all tests
./run-test.sh rosa           # All ROSA tests
./run-test.sh list           # List available tests
./run-test.sh report         # View latest report
```

### 2. Makefile (Convenient)
```bash
make test-list               # List all test suites
make test-basic              # Basic cluster creation
make test-configure          # MCE environment setup
make test-lifecycle          # Full lifecycle test
make test-all                # Run all test suites
make test-rosa               # All ROSA HCP tests
make ci-test                 # CI/CD mode (JSON only)
make ci-validate             # Validate test suite JSON
make reports                 # Open latest HTML report
make clean                   # Remove test results
make help                    # Show all targets
```

### 3. Python CLI (Full Control)
```bash
./run-test-suite.py --list   # List available test suites
./run-test-suite.py 02-basic-rosa-hcp-cluster-creation  # Run specific suite
./run-test-suite.py --all    # Run all test suites
./run-test-suite.py --tag rosa-hcp  # Filter by tag
./run-test-suite.py --format json   # JSON output only
./run-test-suite.py --help   # Show all options
```

## Available Test Suites

| Suite ID | Description | Tags |
|----------|-------------|------|
| `10-configure-mce-environment` | Configure MCE environment | setup, mce, configuration |
| `02-basic-rosa-hcp-cluster-creation` | Create basic ROSA HCP cluster | rosa-hcp, basic, cluster-creation |
| `23-rosa-hcp-full-lifecycle` | Complete cluster lifecycle | rosa-hcp, lifecycle, comprehensive |

## Test Reports

Reports are automatically generated in two formats:

- **JSON**: `test-results/latest.json` - Machine-readable, for CI/CD
- **HTML**: `test-results/latest.html` - Beautiful web report with charts

### Report Features

- Summary dashboard with pass/fail stats
- Visual progress bars
- Color-coded test results
- Detailed error messages
- Execution duration tracking
- Dated archive for history

## CI/CD Integration

### GitHub Actions

The framework includes a complete CI/CD workflow:

**Location**: `.github/workflows/test-suite.yml`

**Triggers**:
- Push to `main` or `develop`
- Pull requests
- Manual dispatch (run any test on demand)

**Required Secrets**:
```yaml
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
OCP_HUB_API_URL
OCP_HUB_CLUSTER_USER
OCP_HUB_CLUSTER_PASSWORD
OCM_CLIENT_ID
OCM_CLIENT_SECRET
```

### Exit Codes

- `0` = All tests passed
- `1` = One or more tests failed

Perfect for CI/CD pipelines!

## Creating Custom Tests

1. Create a JSON file in `test-suites/`:
```json
{
  "name": "My Custom Test",
  "description": "What this test does",
  "execution": "sequential",
  "stopOnFailure": true,
  "playbooks": [
    {
      "name": "my-playbook.yml",
      "description": "Playbook description",
      "timeout": 1800,
      "required": true
    }
  ],
  "tags": ["custom", "my-feature"]
}
```

2. Run it:
```bash
./run-test-suite.py 04-my-custom-test
```

## Requirements

- Python 3.11+
- Ansible 2.15+
- OpenShift CLI (`oc`)
- AWS CLI (configured)
- ROSA CLI

## Documentation

**Full Documentation**: [`docs/TEST_FRAMEWORK_GUIDE.md`](docs/TEST_FRAMEWORK_GUIDE.md)

Includes:
- Detailed usage for all interfaces
- Test suite structure and JSON schema
- Advanced configuration options
- Troubleshooting guide
- Best practices
- CI/CD integration details

## Examples

### Run basic test and view report
```bash
./run-test.sh basic && ./run-test.sh report
```

### Run all ROSA tests with JSON output only
```bash
./run-test-suite.py --tag rosa-hcp --format json
```

### Validate test suites before committing
```bash
make ci-validate
```

### Clean old results and run fresh tests
```bash
make clean && make test-all
```

## Features

- **No UI Required**: Pure CLI operation
- **Multiple Interfaces**: Python, Make, Bash - choose your preference
- **Automated Reports**: JSON + beautiful HTML reports
- **Tag Filtering**: Run specific test subsets
- **CI/CD Ready**: GitHub Actions workflow included
- **Real-Time Progress**: Colored terminal output
- **Exit Codes**: Proper codes for automation
- **Test History**: Timestamped results with "latest" links

## Project Structure

```
automation-capi/
├── run-test-suite.py          # Python CLI test runner
├── run-test.sh                # Bash wrapper
├── Makefile                   # Make targets
├── test-suites/               # Test definitions (JSON)
│   ├── 10-configure-mce-environment.json
│   ├── 02-basic-rosa-hcp-cluster-creation.json
│   └── 23-rosa-hcp-full-lifecycle.json
├── test-results/              # Generated reports
│   ├── YYYY-MM-DD/           # Dated results
│   ├── latest.json           # Symlink to latest JSON
│   └── latest.html           # Symlink to latest HTML
├── .github/workflows/         # CI/CD automation
│   └── test-suite.yml        # GitHub Actions workflow
└── docs/
    └── TEST_FRAMEWORK_GUIDE.md  # Complete documentation
```

## Support

- Full documentation: [`docs/TEST_FRAMEWORK_GUIDE.md`](docs/TEST_FRAMEWORK_GUIDE.md)
- Help commands: `./run-test-suite.py --help`, `make help`, `./run-test.sh help`
- Check HTML reports for detailed error messages

## License

Part of the ROSA HCP CAPI Automation Framework

---

**Version**: 1.0
**Created**: January 22, 2026
**Author**: Tina Fitzgerald
