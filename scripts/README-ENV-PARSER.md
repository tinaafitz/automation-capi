# MCE Test Environment Parser

Quick tool to extract connection details from test notification messages without manually copying from spreadsheets.

## Quick Start

### Method 1: Interactive Mode (Easiest)

```bash
cd ~/acm_dev/automation-capi
./scripts/quick-env-setup.sh
```

Then paste:
1. The entire test notification message (Ctrl+D when done)
2. The spreadsheet row data

### Method 2: Command Line

```bash
# Parse and display connection info
python3 scripts/parse-test-env.py \
  --notification /path/to/message.txt \
  --row "IBM Power    rdr-acm216-hub420    4.20.10    ..."

# Auto-login to the cluster
python3 scripts/parse-test-env.py \
  --notification /path/to/message.txt \
  --row "..." \
  --login

# Save for later use
python3 scripts/parse-test-env.py \
  --notification /path/to/message.txt \
  --row "..." \
  --save /tmp/my-env.json

# Load saved environment
python3 scripts/parse-test-env.py --load /tmp/my-env.json
```

## What You Need

### 1. Test Notification Message

The Slack/email notification, including:
- Title (e.g., "Train 35 - ACM 2.16.0 Fresh Install on IBM Power...")
- MCE and ACM versions
- Hub credentials name
- Polarion test plan
- Jira ticket
- Component failures

Example:
```
------------------------------------------------------------------------------------------------------------------------
-------------------- Train 35 - ACM 2.16.0 Fresh Install on IBM Power with OCP 4.20.z  -------------------
------------------------------------------------------------------------------------------------------------------------
MCE: 2.11.0-DOWNSTREAM-2026-01-13-05-17-08
ACM: 2.16.0-DOWNSTREAM-2026-01-13-05-17-59
Jira ticket: ACM-27850
Hub creds: rdr-acm216-hub420
Polarion: IBM-POWER-TR35-FI-420
Components:
GRC(53): @acm-qe-grc --> Jenkins Job
ALC(89): @acm-qe-workload-mgmt --> Jenkins Job
...
```

### 2. Spreadsheet Row Data

Copy the entire row from the Google Sheet. The format is:
```
Platform | Hub Cluster | OCP Version | ACM/MCE Versions | Status | Password | Console URL
```

Example:
```
IBM Power    rdr-acm216-hub420    4.20.10    "ACM: 2.16.0..." Running    IPYyn-FZruM-sRI59-6Bjcc    https://console...
```

## What You Get

### Connection Information

```
ENVIRONMENT DETAILS:
  Platform:        IBM Power
  Hub Cluster:     rdr-acm216-hub420
  Status:          Running
  OCP Version:     4.20.10
  MCE Version:     2.11.0-DOWNSTREAM-2026-01-13-05-17-08
  ACM Version:     2.16.0-DOWNSTREAM-2026-01-13-05-17-59

CONNECTION DETAILS:
  API URL:         https://api.rdr-acm216-hub420.rdr-ppcloud.sandbox.cis.ibm.net:6443
  Username:        kubeadmin
  Password:        IPYyn-FZruM-sRI59-6Bjcc
  Console:         https://console-openshift-console.apps...

QUICK LOGIN:
  oc login https://api.rdr-acm216-hub420... -u kubeadmin -p IPYyn... --insecure-skip-tls-verify
```

### Ready-to-Use CAPI Commands

```bash
# Check CAPI installation
oc get deployment -n multicluster-engine | grep capi

# Check CAPI CRDs
oc get crd | grep cluster.x-k8s.io | wc -l

# Check for ROSA CRDs
oc get crd | grep rosa

# Check CAPI controller logs
oc logs -n multicluster-engine deployment/capi-controller-manager --tail=50
```

### Component Failure Summary

```
COMPONENT FAILURES:
  ALC                 89 failures  (@acm-qe-workload-mgmt)
  GRC                 53 failures  (@acm-qe-grc)
  OBSERVABILITY       10 failures  (@observatorium-support)
  DISCOVERY            7 failures  (@acm-qe-install)
  RIGHT_SIZING         6 failures  (@Savitha Jose)
```

## Typical Workflow

### Scenario: New Test Notification Received

1. **Copy the notification message** from Slack/email
2. **Go to the spreadsheet**, find the row, copy it
3. **Run the parser:**
   ```bash
   ./scripts/quick-env-setup.sh
   ```
4. **Paste both** when prompted
5. **Copy the login command** and run it
6. **Run CAPI verification commands**

### Scenario: Quick Login to Known Environment

```bash
# If you saved the config before
python3 scripts/parse-test-env.py --load /tmp/mce-env-rdr-acm216-hub420.json --login
```

### Scenario: Share Environment with Team

```bash
# Save to a file
python3 scripts/parse-test-env.py ... --save /tmp/ibm-power-env.json

# Share the JSON file
# Anyone can load it with:
python3 scripts/parse-test-env.py --load /tmp/ibm-power-env.json
```

## Supported Platforms

The parser automatically detects the platform and generates the correct API URL:

- **IBM Power**: `https://api.{cluster}.rdr-ppcloud.sandbox.cis.ibm.net:6443`
- **AWS/ARM**: `https://api.{cluster}.dev09.red-chesterfield.com:6443`
- **Others**: `https://api.{cluster}:6443`

## Tips

1. **Save frequently used environments** to JSON files for quick access
2. **Use `--login` flag** to automatically log in after parsing
3. **Keep the JSON files** in `/tmp/` for temporary access
4. **Check cluster status** in the output - don't try to login to "Stopped" clusters

## Troubleshooting

### "No cluster data available"

- Make sure you pasted the spreadsheet row data
- Verify the row has all required fields

### Login fails

- Check if cluster status is "Running" (not "Stopped")
- Verify the password is correct (run ID from spreadsheet)
- Check network connectivity

### Missing component data

- Ensure you copied the entire notification message
- Check that component lines match the format: `NAME(count): @owner --> Jenkins Job`

## Examples

### Example 1: IBM Power Environment

```bash
python3 scripts/parse-test-env.py \
  --row "IBM Power    rdr-acm216-hub420    4.20.10    ... Running    IPYyn-FZruM-sRI59-6Bjcc    https://..." \
  --login
```

### Example 2: AWS ARM Environment

```bash
python3 scripts/parse-test-env.py \
  --row "AWS-ARM    ci-vb-tr35-arm    4.20.8    ... Stopped    QIEe7-dYHRh-5I4jw-98xhb    https://..." \
  --save /tmp/aws-arm-env.json
```

### Example 3: Check Saved Environment

```bash
python3 scripts/parse-test-env.py --load /tmp/aws-arm-env.json
# Shows full connection info without logging in
```

---

**Created:** January 17, 2026
**Author:** Tina Fitzgerald
**Purpose:** Streamline MCE test environment access
