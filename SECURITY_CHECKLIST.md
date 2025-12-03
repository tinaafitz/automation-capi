# Pre-Commit Security Checklist

This checklist MUST be completed before every git commit. Based on CLAUDE.md requirements and security best practices.

## ✅ Required Security Checks Before Commit

### 1. Credential & Secrets Scan 🔍
- [ ] **No hardcoded passwords** - Search for: `password|secret|key|token`
- [ ] **No API keys or credentials** - Search for: `api_key|auth|bearer|jwt|credential`
- [ ] **No AWS credentials** - Search for: `AWS_ACCESS_KEY|AWS_SECRET`
- [ ] **No database connection strings** - Search for: `postgresql://|mysql://|mongodb://`
- [ ] **No private keys** - Search for: `BEGIN PRIVATE KEY|BEGIN RSA`
- [ ] **Check env files are in .gitignore** - Verify `.env*` patterns are excluded

```bash
# Run this command to scan for credentials:
git diff --cached | grep -iE "(password|secret|key|token|api_key|auth|bearer|jwt|credential|AWS_ACCESS_KEY|AWS_SECRET)" || echo "✅ No credentials found"
```

### 2. Hardcoded URLs & Configuration 🌐
- [ ] **No hardcoded localhost URLs** - Search for: `http://localhost|https://localhost`
- [ ] **No hardcoded IP addresses** - Search for: `192\.168\.|10\.|172\.`
- [ ] **Use configuration files** - Verify API base URLs use config/environment variables
- [ ] **Production URLs not exposed** - Check no prod URLs in development code

```bash
# Run this command to check for hardcoded URLs:
git diff --cached | grep -E "http://localhost|https://localhost|http://[0-9]+\." || echo "✅ No hardcoded URLs found"
```

### 3. Debug & Logging Security 📝
- [ ] **Remove debug console statements** - Search for: `console.log|console.error|console.warn`
- [ ] **No sensitive data in logs** - Check log statements don't expose user data
- [ ] **Remove development-only debug code** - Look for `DEBUG|dev|development`
- [ ] **Alert/prompt statements removed** - Check for `alert(|prompt(`

```bash
# Run this command to check for console statements:
git diff --cached | grep -E "console\.(log|error|warn|debug)" || echo "✅ No console statements found"
```

### 4. Input Validation & Error Handling 🛡️
- [ ] **API responses validated** - All fetch calls have response validation
- [ ] **User input sanitized** - Form inputs are validated before processing
- [ ] **Error messages sanitized** - No system details leaked in error messages
- [ ] **SQL injection protection** - Use parameterized queries (if applicable)

### 5. Dependencies & Imports 📦
- [ ] **No malicious dependencies** - Review any new package.json changes
- [ ] **Unused imports removed** - Clean up imports to reduce attack surface
- [ ] **Known vulnerable packages** - Run `npm audit` before commit
- [ ] **Version pinning** - Avoid wildcard version ranges for security packages

```bash
# Run security audit:
npm audit --audit-level=high
```

### 6. File & Directory Security 📁
- [ ] **No sensitive files committed** - Check for config/credential files
- [ ] **Proper .gitignore coverage** - Verify exclusion patterns are correct
- [ ] **File permissions appropriate** - No executable permissions on non-executable files
- [ ] **No backup/temp files** - Remove .bak, .tmp, .old files

### 7. Code Quality & Logic 🔧
- [ ] **No TODO comments with sensitive info** - Remove development notes with secrets
- [ ] **No disabled security features** - Check for commented-out auth/validation
- [ ] **CORS settings appropriate** - Not overly permissive for production
- [ ] **Rate limiting considerations** - API endpoints have appropriate limits

## ⚡ Quick Security Commands

```bash
# 1. Full credential scan
find . -type f -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l -i "password\|secret\|key\|token" | grep -v node_modules || echo "✅ No credential files found"

# 2. Hardcoded URL scan  
find . -type f -name "*.js" -o -name "*.jsx" | xargs grep -l "http://localhost" | grep -v node_modules || echo "✅ No hardcoded URLs found"

# 3. Console statement scan
find . -type f -name "*.js" -o -name "*.jsx" | xargs grep -l "console\." | grep -v node_modules || echo "✅ No console statements found"

# 4. Security audit
npm audit --audit-level=high

# 5. Check staged files only
git diff --cached --name-only | xargs grep -l -i "password\|secret\|key" || echo "✅ Staged files clean"
```

## 🚨 High-Risk Patterns to Never Commit

```javascript
// ❌ NEVER commit these patterns:
const API_KEY = "sk-1234567890abcdef";                    // Hardcoded API key
const DB_URL = "postgresql://user:pass@localhost:5432";   // DB connection string
console.log("User data:", userData);                      // Sensitive data logging
fetch("http://localhost:8000/api");                       // Hardcoded localhost
const password = process.env.PASSWORD || "defaultpass";   // Default credentials
// TODO: Remove this test user: admin/password123         // Credentials in comments
```

```javascript
// ✅ CORRECT patterns:
const API_KEY = process.env.REACT_APP_API_KEY;             // Environment variable
const DB_URL = process.env.DATABASE_URL;                   // Environment variable
// Removed sensitive logging                               // Clean code
fetch(buildApiUrl(API_ENDPOINTS.USERS));                  // Configured URL
const password = process.env.PASSWORD;                     // No default credentials
// TODO: Implement proper user management                  // No sensitive info
```

## 📋 Commit Message Security Note

Add this line to commits that include security fixes:
```
Security: Fixed hardcoded URLs, removed debug statements, added input validation
```

## 🔄 Integration with Git Hooks

To automate this checklist, add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "🔒 Running security checks..."

# Check for credentials
if git diff --cached | grep -qiE "(password|secret|key|token|api_key)"; then
    echo "❌ Found potential credentials in staged changes"
    exit 1
fi

# Check for console statements
if git diff --cached | grep -qE "console\.(log|error|warn)"; then
    echo "❌ Found console statements in staged changes"
    exit 1
fi

# Check for hardcoded URLs
if git diff --cached | grep -qE "http://localhost"; then
    echo "❌ Found hardcoded localhost URLs in staged changes"
    exit 1
fi

echo "✅ Security checks passed"
```

---

**Remember**: When in doubt, err on the side of caution. If something looks potentially sensitive, review it carefully or ask for a security review before committing.