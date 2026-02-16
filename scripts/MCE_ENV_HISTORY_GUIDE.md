# MCE Environment History & Selector

**Track, search, and revisit MCE test environments with test status tracking.**

---

## 🎯 What This Does

Instead of losing track of test environments or searching through old messages:
- **Automatically saves** every environment you parse
- **Tracks test status** (Pass/Fail/Blocked/In Progress)
- **Add notes** for each environment
- **Search and filter** by platform, status, or keywords
- **Interactive selector** to quickly reconnect to any previous environment

---

## 📦 Database Location

All environments are saved to: **`~/.mce-environments.json`**

This file persists across sessions and stores all your environment history.

---

## 🚀 Quick Start

### 1. Add a New Environment (Automatic)

When you use `mce-env`, environments are **automatically saved** to history:

```bash
mce-env
# Paste notification and spreadsheet data
# ✅ Environment saved to history automatically!
```

### 2. View All Environments

```bash
mce-list
```

**Output:**
```
📋 Total: 3 environments
--------------------------------------------------------------------------------
 # Status Cluster Name                 Platform        Test Status  Last Used
--------------------------------------------------------------------------------
[ 1] 🚫 rdr-acm216-hub420              IBM Power       blocked      2026-01-17
[ 2] ✅ ci-vb-tr35-arm                 AWS-ARM         pass         2026-01-16
[ 3] ⏳ ci-test-cluster                AWS x86         in_progress  2026-01-15
--------------------------------------------------------------------------------
```

### 3. Interactive Selector

**This is the most powerful feature!**

```bash
mce-select
```

**Interactive flow:**

```
================================================================================
MCE ENVIRONMENT SELECTOR
================================================================================

Filter by:
  1. All environments
  2. IBM Power only
  3. AWS/ARM only
  4. Passed tests only
  5. Failed tests only
  6. Search by keyword

Select filter (1-6, default=1): 2

📋 Found 1 environment(s):
--------------------------------------------------------------------------------
 #  Status Cluster Name                 Platform        Test Status  Last Used
--------------------------------------------------------------------------------
[ 1] 🚫 rdr-acm216-hub420              IBM Power       blocked      2026-01-17
--------------------------------------------------------------------------------

Options:
  [number]  - View details and connect
  s [num]   - Update status
  d [num]   - Delete environment
  q         - Quit

Select an option: 1

================================================================================
[1] rdr-acm216-hub420
================================================================================
  Platform:        IBM Power
  Test Status:     🚫 BLOCKED
  Cluster Status:  Running
  OCP Version:     4.20.10
  Jira:            ACM-27850
  Polarion:        IBM-POWER-TR35-FI-420
  Added:           2026-01-17
  Last Accessed:   2026-01-17
  Notes:           CRD version mismatch - v1beta2 not supported
  Total Failures:  165

================================================================================
CONNECTION COMMAND:
================================================================================
oc login https://api.rdr-acm216-hub420.rdr-ppcloud.sandbox.cis.ibm.net:6443 -u kubeadmin -p IPYyn-FZruM-sRI59-6Bjcc --insecure-skip-tls-verify
================================================================================

Options:
  c - Copy login command to clipboard
  l - Login now
  u - Update test status
  q - Quit

Select action: l

🔐 Logging in...
Login successful.
```

---

## 📊 Commands Reference

### View Commands

| Command | Description | Example |
|---------|-------------|---------|
| `mce-list` | List all environments | Shows compact table |
| `mce-stats` | Show statistics | Counts by platform/status |
| `mce-select` | Interactive selector | Filter, view, connect |
| `mce-search <keyword>` | Search environments | Find by cluster name, Jira, etc. |

### Manage Commands

| Command | Description | Example |
|---------|-------------|---------|
| `mce-select` then `s [num]` | Update status | Mark as pass/fail/blocked |
| `mce-select` then `d [num]` | Delete environment | Remove from history |
| Direct Python | Advanced operations | See below |

---

## 🏷️ Test Status Values

| Status | Emoji | When to Use |
|--------|-------|-------------|
| **pass** | ✅ | All CAPI tests passed |
| **fail** | ❌ | CAPI tests failed |
| **blocked** | 🚫 | Cannot test (e.g., CRD mismatch) |
| **in_progress** | ⏳ | Currently testing |
| **unknown** | ❓ | Not tested yet (default) |

---

## 🔍 Search & Filter Examples

### Example 1: Find All IBM Power Environments

```bash
mce-select
# Select option 2 (IBM Power only)
```

### Example 2: Find All Failed Tests

```bash
mce-select
# Select option 5 (Failed tests only)
```

### Example 3: Search by Jira Ticket

```bash
mce-search ACM-27850
```

**Output:**
```
🔍 Found 1 results for 'ACM-27850':
--------------------------------------------------------------------------------
[ 1] 🚫 rdr-acm216-hub420              IBM Power       blocked      2026-01-17
--------------------------------------------------------------------------------
```

### Example 4: Search by Platform

```bash
mce-search "IBM Power"
```

### Example 5: Search by Polarion Test Plan

```bash
mce-search IBM-POWER-TR35-FI-420
```

---

## 📝 Updating Test Status

### Method 1: Interactive (Recommended)

```bash
mce-select
# Select environment number
# Press 'u' to update
# Choose status (1-4)
# Add optional notes
```

### Method 2: Command Line

```bash
python3 scripts/mce_env_manager.py --update-status rdr-acm216-hub420 pass
```

### Method 3: With Notes

```bash
python3 scripts/mce_env_manager.py --add-notes rdr-acm216-hub420 "All CAPI tests passed after CRD fix"
```

---

## 💾 Database Management

### View Database Location

The database is stored at: `~/.mce-environments.json`

### Backup Database

```bash
cp ~/.mce-environments.json ~/backups/mce-env-backup-$(date +%Y%m%d).json
```

### View Raw Database

```bash
cat ~/.mce-environments.json | jq
```

### Clear All History

```bash
rm ~/.mce-environments.json
# Next time you add an environment, a new database will be created
```

---

## 🎬 Real-World Workflows

### Workflow 1: New Test Run Notification

**Scenario:** You receive a Train 35 test notification

```bash
# 1. Parse and save the environment
mce-env
# Paste notification and spreadsheet row
# ✅ Environment saved to history: rdr-acm216-hub420

# 2. Connect and test
oc login https://api.rdr-acm216-hub420...

# 3. Run CAPI tests
capi-check

# 4. Update status based on results
mce-select
# Select environment
# Press 'u' → Choose status → Add notes
```

### Workflow 2: Revisiting Previous Test

**Scenario:** You need to recheck a test from last week

```bash
# 1. Find the environment
mce-list
# Shows all environments, sorted by most recent

# 2. Select and reconnect
mce-select
# Choose the environment
# Press 'l' to login
# ✅ Connected!

# 3. Verify CAPI status
capi-check
```

### Workflow 3: Reporting Test Results

**Scenario:** Need to report CAPI test status for Train 35

```bash
# 1. View stats
mce-stats

# Output shows:
# By Test Status:
#   ✅ pass           2
#   ❌ fail           1
#   🚫 blocked        1

# 2. List all environments
mce-list

# 3. Filter by failed tests
mce-select
# Option 5 (Failed tests only)
# Review each failed environment

# 4. Update Polarion with status from notes
```

### Workflow 4: Comparing Platforms

**Scenario:** Compare CAPI behavior on IBM Power vs AWS ARM

```bash
# 1. Filter by IBM Power
mce-select → Option 2 (IBM Power only)
# View status and notes

# 2. Filter by AWS ARM
mce-select → Option 3 (AWS/ARM only)
# Compare results

# 3. Search for specific test
mce-search "Train 35"
# Shows all Train 35 environments across platforms
```

---

## 🔧 Advanced Usage

### Python API

You can use the environment manager programmatically:

```python
import sys
sys.path.insert(0, 'scripts')
from mce_env_manager import MCEEnvManager

manager = MCEEnvManager()

# Get all environments
envs = manager.list_environments()

# Search
results = manager.search_environments("IBM Power")

# Update status
manager.update_status("rdr-acm216-hub420", "pass", "All tests passed!")

# Get specific environment
env = manager.get_environment("rdr-acm216-hub420")
print(env['data'])  # Full environment data
```

### Custom Filters

```python
# Filter by multiple criteria
envs = manager.list_environments()
failed_power = [e for e in envs 
                if e['platform'] == 'IBM Power' 
                and e['status'] == 'fail']
```

---

## 📊 Statistics Examples

```bash
mce-stats
```

**Sample Output:**

```
================================================================================
MCE ENVIRONMENT STATISTICS
================================================================================

Total Environments: 8

By Platform:
  IBM Power            3
  AWS-ARM              3
  AWS x86              2

By Test Status:
  ✅ pass              4
  ❌ fail              2
  🚫 blocked           1
  ⏳ in_progress       1

Recently Accessed:
  ✅ ci-vb-tr35-arm              2026-01-17 09:15
  🚫 rdr-acm216-hub420              2026-01-17 07:01
  ⏳ ci-test-cluster                2026-01-16 14:30
  ✅ rdr-power-test                 2026-01-15 11:20
  ❌ ci-arm-test-2                  2026-01-15 08:45
================================================================================
```

---

## 🎯 Tips & Best Practices

1. **Always update status** after testing - helps track progress
2. **Add meaningful notes** - future you will thank you
3. **Use search** instead of scrolling through long lists
4. **Filter by platform** when comparing architecture-specific issues
5. **Check stats regularly** to see testing trends
6. **Backup your database** before major changes
7. **Use the interactive selector** - it's faster than CLI commands

---

## 🆘 Troubleshooting

### "No environments found"

- Check if database exists: `ls ~/.mce-environments.json`
- If not, add an environment first: `mce-env`

### "Module not found: mce_env_manager"

- Make sure you're running from the automation-capi directory
- Or use the full path: `python3 ~/acm_dev/automation-capi/scripts/mce_env_manager.py`

### Can't connect to old environment

- Check cluster status in the environment details
- Clusters may be stopped after testing completes
- Status "Stopped" means you cannot login

### Database corrupted

- Restore from backup: `cp ~/backups/mce-env-backup-*.json ~/.mce-environments.json`
- Or start fresh: `rm ~/.mce-environments.json`

---

## 📚 Related Documentation

- **Quick Start:** `scripts/QUICK_START_GUIDE.md`
- **Parser Docs:** `scripts/README-ENV-PARSER.md`
- **Aliases:** `scripts/mce-env-aliases.sh`

---

**Created:** January 17, 2026  
**Version:** 1.0  
**Author:** Tina Fitzgerald

---

## Summary

You now have a complete environment history system that:
- ✅ Automatically saves every environment
- ✅ Tracks test status (Pass/Fail/Blocked/In Progress)
- ✅ Lets you search and filter environments
- ✅ Provides interactive selection and connection
- ✅ Maintains notes and metadata
- ✅ Shows statistics and trends

**Never lose track of test environments again!** 🎉
