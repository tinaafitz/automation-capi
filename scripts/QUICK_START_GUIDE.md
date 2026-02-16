# Quick Start: MCE Environment Parser

## What This Does

Gets you from a test notification message to logged into the cluster in **30 seconds** instead of manually:
- Opening the spreadsheet
- Finding the row
- Copying credentials
- Building the API URL
- Finding the login command

## Installation (One-Time Setup)

```bash
# 1. Make sure scripts are executable (already done)
cd ~/acm_dev/automation-capi
chmod +x scripts/*.sh scripts/*.py

# 2. Add aliases to your shell (optional but recommended)
echo 'source ~/acm_dev/automation-capi/scripts/mce-env-aliases.sh' >> ~/.zshrc
source ~/.zshrc
```

## Usage

### Fastest Way: Interactive Mode

```bash
cd ~/acm_dev/automation-capi
./scripts/quick-env-setup.sh
```

**Then:**
1. Paste the entire test notification message
2. Press Enter twice (or Ctrl+D)
3. Paste the spreadsheet row
4. Press Enter
5. Copy and run the login command it shows

**That's it!** You're connected.

### Even Faster: Use Aliases

```bash
# After adding aliases to .zshrc
mce-env
# Same interactive flow as above
```

### Example Session

```
$ mce-env

==================================================
Quick MCE Environment Setup
==================================================

Paste the test notification message (end with empty line):
Train 35 - ACM 2.16.0 Fresh Install on IBM Power with OCP 4.20.z
MCE: 2.11.0-DOWNSTREAM-2026-01-13-05-17-08
ACM: 2.16.0-DOWNSTREAM-2026-01-13-05-17-59
Jira ticket: ACM-27850
Hub creds: rdr-acm216-hub420
Polarion: IBM-POWER-TR35-FI-420
[Ctrl+D]

✓ Notification parsed

Paste the spreadsheet row data:
IBM Power    rdr-acm216-hub420    4.20.10    "MCE: 2.11.0..." Running    IPYyn-FZruM-sRI59-6Bjcc    https://console...

✓ Spreadsheet data parsed

================================================================================
MCE TEST ENVIRONMENT - CONNECTION INFO
================================================================================

ENVIRONMENT DETAILS:
  Platform:        IBM Power
  Hub Cluster:     rdr-acm216-hub420
  Status:          Running
  ...

QUICK LOGIN:
  oc login https://api.rdr-acm216-hub420.rdr-ppcloud.sandbox.cis.ibm.net:6443 \
    -u kubeadmin -p IPYyn-FZruM-sRI59-6Bjcc --insecure-skip-tls-verify

CAPI VERIFICATION COMMANDS:
  oc get deployment -n multicluster-engine | grep capi
  ...

Save this configuration? (y/n): y
Environment data saved to: /tmp/mce-env-rdr-acm216-hub420-20260117.json
```

Now just copy the login command and run it!

## Useful Aliases (After Setup)

```bash
# Parse and connect to environment
mce-env

# List saved environments
mce-list

# Quick CAPI status check (after logged in)
capi-check

# View CAPI controller logs
capi-logs

# Check for CAPI errors
capi-errors

# Show MCE components
mce-components

# Show environment info
mce-info
```

## Real-World Example

**Before (Manual Process):**
1. Open Slack notification ✉️
2. Open Google Sheets 📊
3. Search for cluster name 🔍
4. Copy password 📋
5. Figure out API URL format 🤔
6. Build oc login command ⌨️
7. Run login ✅

**Time: ~2-3 minutes**

**After (With Tool):**
1. Run `mce-env` 🚀
2. Paste notification + spreadsheet row 📋
3. Copy login command ⌨️
4. Run login ✅

**Time: ~30 seconds**

## Tips

1. **Save environments** you use frequently:
   ```bash
   mce-env
   # Answer 'y' when asked to save
   ```

2. **Reuse saved environments:**
   ```bash
   python3 scripts/parse-test-env.py --load /tmp/mce-env-rdr-acm216-hub420.json
   ```

3. **Auto-login** (skip the manual copy/paste):
   ```bash
   python3 scripts/parse-test-env.py \
     --notification msg.txt \
     --row "..." \
     --login
   ```

4. **Check CAPI immediately** after login:
   ```bash
   capi-check
   ```

## Files Created

- `scripts/parse-test-env.py` - Main parser script
- `scripts/quick-env-setup.sh` - Interactive wrapper
- `scripts/mce-env-aliases.sh` - Shell aliases
- `scripts/README-ENV-PARSER.md` - Full documentation

## Next Steps

1. Try it with the next test notification you receive
2. Add the aliases to your `.zshrc` for permanent use
3. Share with teammates who need to access test environments

---

**Questions?** Check `scripts/README-ENV-PARSER.md` for detailed docs.
