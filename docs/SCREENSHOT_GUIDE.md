# 📸 Screenshot Guide for PRODUCT.md

Quick guide to capture the 4 screenshots needed for your product launch documentation!

## 📁 Setup

```bash
mkdir -p docs/screenshots
```

All screenshots go in `docs/screenshots/` as PNG files.

---

## 🎯 4 Screenshots You Need

### 1. **mce-environment.png**
**What:** MCE dashboard with 3-card layout

**Capture:**
- Switch to MCE environment (cyan/blue theme)
- Show full view with all 3 cards:
  - MCE Environment (left)
  - Components (middle)
  - Resources (right)
- Make sure "Connected" status is visible
- Component list with checkmarks showing

**Used for:** Problem #1 (environment status)

---

### 2. **yaml-editor.png**
**What:** YAML editor modal open

**Capture:**
- Click to provision a cluster
- YAML editor modal should be open
- Show "✓ Valid YAML" badge
- Buttons visible: Download, Reset, Show Diff, Provision Now
- Some YAML content visible

**Used for:** Problem #2 (cluster provisioning)

---

### 3. **ai-assistant.png**
**What:** AI assistant chat window

**Capture:**
- Open AI assistant (chat icon)
- Show welcome message:
  "Hi! I'm your ROSA cluster assistant..."
- Quick suggestion buttons visible
- Chat input field at bottom

**Used for:** Problem #4 (getting help)

---

### 4. **test-dashboard.png**
**What:** Test Suite Dashboard

**Capture:**
- Navigate to Test Suite Dashboard
- Show "Helm Chart Test Matrix" section
- Status filters visible (Pass, Fail, Running, Pending)
- Provider list with "Run All Tests" buttons:
  - CAPI (Core)
  - CAPA
  - CAPZ
  - CAP-metal3
  - CAPOA

**Used for:** Problem #5 (provider testing)

---

## 📸 Optional Screenshots

If you want to add these later:

### **environment-switcher.png**
- Environment dropdown open showing both MCE and Minikube options
- Used for: Problem #3

### **cluster-progress.png**
- ROSA cluster showing provisioning progress
- Progress bar and percentage visible
- Used for: Problem #6

---

## 🚀 Quick Capture Session

**5-minute screenshot run:**

```bash
# 1. Start UI
cd ui && docker-compose up

# 2. Open browser
open http://localhost:3000

# 3. Switch to MCE
   → Take screenshot #1 (mce-environment.png)

# 4. Click Provision
   → Take screenshot #2 (yaml-editor.png)
   → Close modal

# 5. Click AI Assistant icon
   → Take screenshot #3 (ai-assistant.png)
   → Close chat

# 6. Navigate to Test Suite Dashboard
   → Take screenshot #4 (test-dashboard.png)

# Done! 🎉
```

---

## 💡 Screenshot Tips

**Do:**
- ✅ Full browser width
- ✅ Hide browser bookmarks bar
- ✅ PNG format
- ✅ Clear, readable text

**Don't:**
- ❌ Crop too tight
- ❌ Include browser dev tools
- ❌ Use JPEG (text gets blurry)

---

## ✅ Checklist

```
Essential (4 screenshots):
[ ] mce-environment.png
[ ] yaml-editor.png
[ ] ai-assistant.png
[ ] test-dashboard.png

Optional (2 screenshots):
[ ] environment-switcher.png
[ ] cluster-progress.png
```

---

## 📁 Final Step

Once you have the screenshots:

```bash
# Move them to the right place
mv ~/Desktop/*.png docs/screenshots/

# Verify they're named correctly
ls docs/screenshots/

# View the product page
open PRODUCT.md
```

That's it! Your product documentation will have all the visuals it needs! 🚀
