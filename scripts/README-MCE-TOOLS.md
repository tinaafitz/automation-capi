# MCE Test Environment Tools - Complete Suite

**Everything you need to manage MCE test environments efficiently.**

---

## 🎉 What You Have Now

A complete toolkit for managing MCE test environments:

1. **Environment Parser** - Extract connection details from notifications
2. **Environment History** - Track all environments with test status
3. **Interactive Selector** - Browse, search, and reconnect to environments
4. **Health Check Tool** - Systematically detect known issues across all environments
5. **CAPI Verification Tools** - Quick commands for CAPI testing

---

## 📦 Files Created

| File | Purpose |
|------|---------|
| `parse-test-env.py` | Parse notifications & spreadsheet data |
| `mce_env_manager.py` | Environment history & selector |
| `quick-env-setup.sh` | Interactive wrapper for parser |
| `mce-env-aliases.sh` | Shell aliases for all tools |
| `README-ENV-PARSER.md` | Parser documentation |
| `MCE_ENV_HISTORY_GUIDE.md` | History system documentation |
| `QUICK_START_GUIDE.md` | Quick reference guide |

---

## 🚀 Quick Start

### 1. One-Time Setup

```bash
# Add aliases to your shell (optional but recommended)
echo 'source ~/acm_dev/automation-capi/scripts/mce-env-aliases.sh' >> ~/.zshrc
source ~/.zshrc
```

### 2. Daily Workflow

**When you receive a new test notification:**

```bash
mce-env
# Paste notification message
# Paste spreadsheet row
# ✅ Auto-saved to history!
# Copy login command and connect
```

**To revisit a previous environment:**

```bash
mce-select
# Filter/search
# Select environment
# Connect!
```

---

## 📋 All Commands

### Environment Management

```bash
mce-env          # Parse new environment from notification
mce-select       # Interactive selector (browse all saved)
mce-list         # List all environments
mce-stats        # Show statistics
mce-search TEXT  # Search by keyword
mce-health       # Check all environments for known issues
```

### CAPI Tools (after login)

```bash
capi-check       # Quick CAPI status
capi-logs        # View controller logs
capi-errors      # Show errors only
```

### Cluster Info

```bash
mce-components   # Show MCE components
mce-info         # Show versions & architecture
```

---

## 🎯 Real-World Examples

### Example 1: New Train 35 Notification

```bash
$ mce-env

Paste notification message:
Train 35 - ACM 2.16.0 Fresh Install on IBM Power...
MCE: 2.11.0-DOWNSTREAM-2026-01-13...
[Ctrl+D]

Paste spreadsheet row:
IBM Power    rdr-acm216-hub420    4.20.10    ...

✅ Environment saved to history: rdr-acm216-hub420

QUICK LOGIN:
  oc login https://api.rdr-acm216-hub420... -u kubeadmin -p IPYyn...

# Copy and run login command
$ oc login https://api.rdr-acm216-hub420...
Login successful!

# Check CAPI
$ capi-check
=== CAPI Status ===
CAPI Deployments:
capi-controller-manager     1/1     Running
...
```

### Example 2: Checking Last Week's Test

```bash
$ mce-list

📋 Total: 5 environments
--------------------------------------------------------------------------------
 # Status Cluster Name                 Platform      Test Status  Last Used
--------------------------------------------------------------------------------
[ 1] 🚫 rdr-acm216-hub420              IBM Power     blocked      2026-01-17
[ 2] ✅ ci-vb-tr35-arm                 AWS-ARM       pass         2026-01-16
[ 3] ❌ ci-test-failed                 AWS x86       fail         2026-01-15
[ 4] ⏳ ci-ongoing                     IBM Power     in_progress  2026-01-14
[ 5] ✅ ci-old-test                    AWS-ARM       pass         2026-01-10
--------------------------------------------------------------------------------

$ mce-select
# Select #2 (ci-vb-tr35-arm)
# Press 'l' to login
# ✅ Connected to AWS-ARM cluster!
```

### Example 3: Finding All IBM Power Tests

```bash
$ mce-search "IBM Power"

🔍 Found 2 results for 'IBM Power':
--------------------------------------------------------------------------------
[ 1] 🚫 rdr-acm216-hub420              IBM Power     blocked      2026-01-17
[ 2] ⏳ ci-ongoing                     IBM Power     in_progress  2026-01-14
--------------------------------------------------------------------------------
```

### Example 4: Reporting Test Status

```bash
$ mce-stats

================================================================================
MCE ENVIRONMENT STATISTICS
================================================================================

Total Environments: 5

By Platform:
  IBM Power            2
  AWS-ARM              2
  AWS x86              1

By Test Status:
  ✅ pass              2
  ❌ fail              1
  🚫 blocked           1
  ⏳ in_progress       1

Recently Accessed:
  🚫 rdr-acm216-hub420              2026-01-17 07:01
  ✅ ci-vb-tr35-arm                 2026-01-16 14:30
  ...
================================================================================

# Now you can easily report:
# - 2 environments passed
# - 1 failed
# - 1 blocked (CRD mismatch on IBM Power)
# - 1 still in progress
```

---

## 💡 Key Features

### Auto-Save

Every environment you parse is **automatically saved** to `~/.mce-environments.json`

### Test Status Tracking

Track status for each environment:
- ✅ Pass
- ❌ Fail  
- 🚫 Blocked
- ⏳ In Progress
- ❓ Unknown

### Notes

Add notes to remember important details:
```bash
mce-select
# Select environment
# Press 'u' to update
# Add notes: "CRD mismatch issue - see ACM-27850"
```

### Search & Filter

Find environments by:
- Platform (IBM Power, AWS-ARM, etc.)
- Test status (pass, fail, blocked)
- Cluster name
- Jira ticket
- Polarion test plan
- Any keyword in notes

### Quick Reconnect

No more hunting for passwords or building API URLs:
```bash
mce-select
# Select environment
# Press 'l' to login
# Done!
```

---

## 📚 Documentation

| Guide | Purpose |
|-------|---------|
| **QUICK_START_GUIDE.md** | Get started in 30 seconds |
| **README-ENV-PARSER.md** | Parser deep dive |
| **MCE_ENV_HISTORY_GUIDE.md** | History system & workflows |
| **README-MCE-TOOLS.md** | This file - overview of everything |

---

## 🎨 Color-Coded Status

| Emoji | Status | Meaning |
|-------|--------|---------|
| ✅ | Pass | All tests passed |
| ❌ | Fail | Tests failed |
| 🚫 | Blocked | Cannot test |
| ⏳ | In Progress | Currently testing |
| ❓ | Unknown | Not tested yet |

---

## 🔧 Configuration

### Database Location

`~/.mce-environments.json` - Stores all environment history

### Backup

```bash
cp ~/.mce-environments.json ~/backups/mce-env-backup-$(date +%Y%m%d).json
```

### Clear History

```bash
rm ~/.mce-environments.json
```

---

## 📊 Before vs After

### Before (Manual Process)

1. Receive test notification ✉️
2. Open Google Sheets 📊
3. Find cluster row 🔍
4. Copy password 📋
5. Figure out API URL format 🤔
6. Build `oc login` command ⌨️
7. Forget which clusters you tested 🤷
8. Search through old messages 📧
9. Lose track of test results 😵

**Time: ~5-10 minutes per environment**

### After (With MCE Tools)

1. Run `mce-env` 🚀
2. Paste notification + row 📋
3. Auto-saved to history ✅
4. Copy login command ⌨️
5. Connect immediately 🔗
6. Test and update status 📝
7. Anytime later: `mce-select` to reconnect 🔄
8. `mce-stats` shows all test results 📊
9. Never lose track again! 🎉

**Time: ~30 seconds per environment**

---

## 🎯 Use Cases

### Use Case 1: Train 35 Testing

You need to test CAPI on 3 platforms:
- IBM Power
- AWS ARM
- AWS x86

**Workflow:**
```bash
# For each notification:
mce-env → test → update status

# At the end:
mce-stats  # Shows pass/fail breakdown
mce-list   # Shows all environments tested
```

### Use Case 2: Bug Investigation

A bug appears on IBM Power but not AWS:

**Workflow:**
```bash
mce-search "IBM Power"  # Find all Power environments
mce-select              # Pick one to investigate
capi-check             # Verify CAPI status
capi-logs              # Check for errors
```

### Use Case 3: Weekly Reporting

Need to report CAPI test status:

**Workflow:**
```bash
mce-stats              # Shows breakdown by status
mce-list               # Lists all environments
mce-select             # Update any missing statuses
```

---

## 🆘 Getting Help

### Quick Help

Each command has built-in help:
```bash
python3 scripts/parse-test-env.py --help
python3 scripts/mce_env_manager.py --help
```

### Documentation

- `QUICK_START_GUIDE.md` - Get started fast
- `README-ENV-PARSER.md` - Parser details
- `MCE_ENV_HISTORY_GUIDE.md` - History system guide

### Aliases

After sourcing the aliases file:
```bash
source ~/acm_dev/automation-capi/scripts/mce-env-aliases.sh
# Shows all available commands
```

---

## ✨ What Makes This Awesome

1. **Zero Manual Work** - Everything auto-saves
2. **Never Lose Track** - Full history of all environments
3. **Quick Reconnect** - Select and login in seconds
4. **Test Tracking** - Know what passed/failed at a glance
5. **Search Anything** - Find environments by any criteria
6. **Platform Comparison** - Easy to compare IBM Power vs AWS
7. **Team Sharing** - Database can be shared/backed up
8. **Progressive** - Works standalone or with full history

---

## 🚀 Next Steps

1. **Try it now** with the next test notification you receive
2. **Add aliases** to your shell for permanent use
3. **Explore mce-select** - the interactive selector is powerful
4. **Check mce-stats** regularly to track testing progress
5. **Share with teammates** who need to access test environments

---

**Created:** January 17, 2026  
**Author:** Tina Fitzgerald  
**Version:** 1.0

---

**Never hunt for test environments again!** 🎊
