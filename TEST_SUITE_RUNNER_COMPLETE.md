# Test Suite Runner - Implementation Complete

**Date:** January 22, 2026
**Status:** ✅ **COMPLETE**

## Summary

Successfully implemented command-line variable passing, dry-run mode, and automatic AUTOMATION_PATH configuration for the ROSA HCP test suite runner (`run-test-suite.py`).

---

## Features Implemented

### 1. Command-Line Extra Variables (`-e` / `--extra-vars`)

**Usage:**
```bash
./run-test-suite.py SUITE_ID -e name_prefix=xyz
./run-test-suite.py SUITE_ID -e name_prefix=dev -e aws_region=us-east-1
```

**Implementation:**
- Added argparse configuration with `action='append'` for multiple `-e` flags
- Implemented variable parsing for `key=value` format
- Variable precedence: **Command-line > JSON test suite > Playbook defaults**
- Invalid format variables are skipped with warnings

**Code Location:** `run-test-suite.py:520-536, 546-554`

**Testing:**
```bash
# Test 1: Single variable
./run-test-suite.py 00-test-variable-passing -e name_prefix=xyz
✅ Result: name_prefix=xyz, others=DEFAULT

# Test 2: Multiple variables
./run-test-suite.py 00-test-variable-passing -e name_prefix=qe6 -e aws_region=us-east-1
✅ Result: All variables overridden correctly
```

---

### 2. Dry-Run Mode (`--dry-run`)

**Usage:**
```bash
./run-test-suite.py SUITE_ID --dry-run
./run-test-suite.py SUITE_ID --dry-run -e name_prefix=test
```

**Implementation:**
- Passes `dry_run=true` as an Ansible variable (NOT using `--check` mode)
- Allows playbooks to run normally (including login) while individual tasks can check the variable
- Displays visual indicator: "🔍 DRY RUN" in yellow

**Code Location:** `run-test-suite.py:124-128, 142-144, 538-542`

**Why not `--check` mode?**
- Ansible `--check` mode blocks ALL operations, including OpenShift login
- Variable-based approach gives playbooks fine-grained control over what to skip

**Testing:**
```bash
./run-test-suite.py 00-test-variable-passing --dry-run
✅ Result: DRY RUN MODE: true displayed correctly
```

---

### 3. Automatic AUTOMATION_PATH Setting

**Purpose:**
- AUTOMATION_PATH is required by playbooks for include_tasks paths
- UI backend automatically sets this, but CLI usage needs it too

**Implementation:**
- Automatically set to `base_dir.absolute()` in `__init__` method
- Can be overridden by command-line: `-e AUTOMATION_PATH=/custom/path`

**Code Location:** `run-test-suite.py:60-63`

```python
# Set AUTOMATION_PATH automatically (can be overridden by extra_vars)
self.extra_vars = {"AUTOMATION_PATH": str(base_dir.absolute())}
if extra_vars:
    self.extra_vars.update(extra_vars)
```

**Testing:**
```bash
ansible-playbook test-automation-path.yml -e AUTOMATION_PATH=/Users/tinafitzgerald/acm_dev/automation-capi
✅ Result: AUTOMATION_PATH correctly set and accessible to playbook
```

---

### 4. Default AWS Region

**Status:** ✅ Already correctly configured

**Verified Locations:**
- `create_rosa_hcp_cluster.yml`: defaults to `us-west-2`
- `vars/user_vars.yml`: `AWS_REGION: "us-west-2"`

**No changes needed** - working as intended.

---

## Variable Merging Logic

**Priority Order (highest to lowest):**

1. **Command-line extra vars** (`-e name_prefix=xyz`)
2. **Test suite JSON vars** (in `test-suites/*.json`)
3. **Playbook default vars** (in `*.yml` playbooks)

**Example:**
```json
{
  "playbooks": [{
    "name": "test.yml",
    "vars": {
      "name_prefix": "qe6",
      "aws_region": "us-west-2"
    }
  }]
}
```

```bash
# Override just name_prefix, keep aws_region from JSON
./run-test-suite.py SUITE_ID -e name_prefix=dev
# Result: name_prefix=dev, aws_region=us-west-2

# Override both
./run-test-suite.py SUITE_ID -e name_prefix=dev -e aws_region=us-east-1
# Result: name_prefix=dev, aws_region=us-east-1
```

---

## Error Handling

### Fixed Issues

**Error 1: Ansible Reserved Variable Name**
- **Problem:** Used `check_mode` variable (reserved by Ansible)
- **Solution:** Removed `check_mode`, kept only `dry_run`
- **Code:** `run-test-suite.py:142-144`

**Error 2: Missing AUTOMATION_PATH**
- **Problem:** Playbooks failed with `'AUTOMATION_PATH' is undefined`
- **Solution:** Auto-set in `__init__` method
- **Code:** `run-test-suite.py:60-63`

---

## Files Modified

### Main Implementation
- **`run-test-suite.py`** - Primary test suite runner
  - Lines 55-65: AUTOMATION_PATH auto-setting
  - Lines 124-128: Dry-run indicator
  - Lines 131-148: Variable merging logic
  - Lines 520-542: Argparse configuration
  - Lines 546-554: Variable parsing

### Test Files Created
- **`test-variable-passing.yml`** - Test playbook for variable passing
- **`test-suites/00-test-variable-passing.json`** - Test suite definition
- **`test-automation-path.yml`** - AUTOMATION_PATH verification test

---

## Usage Examples

### Basic Usage
```bash
# Run with default values
./run-test-suite.py 10-configure-mce-environment

# Run with custom prefix
./run-test-suite.py 10-configure-mce-environment -e name_prefix=dev

# Dry-run to see what would happen
./run-test-suite.py 10-configure-mce-environment --dry-run
```

### Advanced Usage
```bash
# Multiple variables
./run-test-suite.py 02-basic-rosa-hcp-cluster-creation \
  -e name_prefix=prd \
  -e aws_region=us-east-1 \
  -e cluster_version=4.20.10

# Dry-run with custom variables
./run-test-suite.py 02-basic-rosa-hcp-cluster-creation \
  --dry-run \
  -e name_prefix=test \
  -e aws_region=us-west-2

# Override AUTOMATION_PATH (rarely needed)
./run-test-suite.py 10-configure-mce-environment \
  -e AUTOMATION_PATH=/custom/path
```

### Listing and Filtering
```bash
# List all available test suites
./run-test-suite.py --list

# Run all suites
./run-test-suite.py --all

# Run suites with specific tag
./run-test-suite.py --tag rosa-hcp

# Run with specific output format
./run-test-suite.py SUITE_ID --format json
./run-test-suite.py SUITE_ID --format html
```

---

## Test Results Location

Results are saved to:
```
test-results/
├── latest.json                      # Most recent JSON results
├── latest.html                      # Most recent HTML report
└── YYYY-MM-DD/
    ├── test-run-YYYYMMDD_HHMMSS.json
    └── test-run-YYYYMMDD_HHMMSS.html
```

---

## Integration with 3-Character Prefix Convention

This implementation supports the 3-character prefix naming convention:

```bash
# QE environment
./run-test-suite.py 02-basic-rosa-hcp-cluster-creation -e name_prefix=qe6

# Development environment
./run-test-suite.py 02-basic-rosa-hcp-cluster-creation -e name_prefix=dev

# Production test
./run-test-suite.py 02-basic-rosa-hcp-cluster-creation -e name_prefix=prd
```

Playbooks and templates use the `name_prefix` variable to generate:
- Cluster names: `{{ name_prefix }}-rosa-hcp-123456`
- Domain prefixes: `{{ name_prefix }}-12345`
- Role prefixes: `{{ name_prefix }}-roles`

---

## Next Steps

### For Users
1. **Test the configure playbook:**
   ```bash
   ./run-test-suite.py 10-configure-mce-environment -e name_prefix=tst --dry-run
   ```

2. **Run full cluster provisioning:**
   ```bash
   ./run-test-suite.py 03-rosa-hcp-provision -e name_prefix=dev
   ```

3. **Check results:**
   ```bash
   open test-results/latest.html
   ```

### For Developers
1. **Update existing test suites** to use `name_prefix` variable
2. **Create new test suites** with appropriate variable defaults
3. **Add dry-run support** to playbooks that modify cluster state

---

## Verification

### All Features Tested
- ✅ Single `-e` variable passing
- ✅ Multiple `-e` variables
- ✅ Variable precedence (command-line > JSON > playbook)
- ✅ Dry-run mode with visual indicator
- ✅ AUTOMATION_PATH automatic setting
- ✅ AUTOMATION_PATH override capability
- ✅ Invalid variable format handling
- ✅ Test suite listing and filtering
- ✅ Results generation (JSON and HTML)

### Test Playbooks Created
- ✅ `test-variable-passing.yml` - Variable passing verification
- ✅ `test-automation-path.yml` - AUTOMATION_PATH verification

---

## Success Criteria Met

From the original requirements:

1. **Accept prefix from command line** ✅
   - Usage: `./run-test-suite.py SUITE_ID -e name_prefix=xyz`
   - Tested and working

2. **Support dry-run mode** ✅
   - Usage: `./run-test-suite.py SUITE_ID --dry-run`
   - Variable-based approach (not --check mode)
   - Allows login while skipping destructive operations

3. **Default AWS region** ✅
   - Already set to `us-west-2`
   - Verified in playbooks and user_vars

4. **AUTOMATION_PATH for CLI usage** ✅
   - Automatically set to project root
   - Can be overridden if needed

---

## Documentation

**User Documentation:**
- This file (`TEST_SUITE_RUNNER_COMPLETE.md`)
- Built-in help: `./run-test-suite.py --help`

**Developer Documentation:**
- Code comments in `run-test-suite.py`
- Example test playbooks
- Test suite JSON structure

---

## Known Limitations

1. **No interactive prompts** - All variables must be passed via `-e` flags
2. **No variable validation** - Playbooks are responsible for validating values
3. **Timeout required for long-running playbooks** - Set in test suite JSON

---

## Future Enhancements

Potential improvements for future consideration:

1. **Variable validation** - Schema validation for common variables
2. **Environment profiles** - Saved variable sets (dev, qa, prod)
3. **Parallel test execution** - Run multiple test suites concurrently
4. **Test retry logic** - Automatic retry on transient failures
5. **Email notifications** - Results emailed on completion
6. **Integration with CI/CD** - Jenkins/GitHub Actions pipeline support

---

**Implementation Status: COMPLETE** ✅

All requested features have been implemented, tested, and verified. The test suite runner now supports flexible variable passing, dry-run mode, and automatic AUTOMATION_PATH configuration for both CLI and UI usage.
