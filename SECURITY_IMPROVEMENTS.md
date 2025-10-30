# Security Improvements Recommendations

## Overview
This document outlines security improvements identified for the CAPI/CAPA automation UI based on code analysis.

## Current Security Posture

### Authentication & Authorization
- **Current State**: Uses ROSA CLI authentication via `rosa whoami` (ui/backend/app.py:477-575)
- **Gap**: No robust authentication/authorization system for the web UI
- **Recommendation**: Implement JWT or OAuth-based authentication

### API Endpoint Security
- **Current State**: FastAPI with basic error handling
- **CORS**: Configured for localhost:3000 only (ui/backend/app.py:21-28)
- **Gaps**:
  - No production CORS configuration
  - No rate limiting
  - Limited request validation beyond basic Pydantic models

### Input Validation
- **Current State**: Basic validation in `/api/validate` endpoint (ui/backend/app.py:1385-1409)
  - Cluster name alphanumeric validation
  - Cluster name length checks
  - Replica count constraints
  - OpenShift version validation
- **Gap**: Could be more comprehensive and strict

### Sensitive Data Handling
- **Critical Issue**: Credentials stored in plain text in `vars/user_vars.yml`
- **Current**: Basic presence/non-empty validation (ui/backend/app.py:577-672)
- **Risk**: High - credentials are not encrypted

### WebSocket Security
- **Current State**: Basic WebSocket endpoint for job updates (ui/backend/app.py:284-319)
- **Gap**: No authentication for WebSocket connections

## Priority Recommendations

### High Priority

#### 1. Implement Secure Secret Management
**Issue**: Plain text credentials in YAML files
**Solution**:
- Integrate AWS Secrets Manager or HashiCorp Vault
- Encrypt sensitive configuration files
- Implement credential rotation mechanisms
- Add audit logging for credential access

#### 2. Add Authentication & Authorization
**Issue**: No web UI authentication
**Solution**:
- Implement JWT-based authentication
- Add role-based access control (RBAC)
- Secure WebSocket connections with auth tokens
- Add session management with timeout

#### 3. Enhance Input Validation
**Issue**: Limited validation, potential for injection attacks
**Solution**:
- Implement comprehensive input sanitization
- Add stricter regex patterns for all user inputs
- Validate subprocess command arguments
- Use parameterized commands to prevent injection

### Medium Priority

#### 4. Implement Rate Limiting
**Solution**:
- Add rate limiting middleware to FastAPI
- Configure per-endpoint limits
- Implement IP-based throttling
- Add DDoS protection measures

#### 5. Enhance CORS Configuration
**Current**: Only localhost:3000 allowed
**Solution**:
- Add environment-specific CORS configuration
- Restrict allowed origins based on deployment
- Limit allowed methods and headers
- Implement CORS preflight caching

#### 6. Improve Error Handling
**Issue**: Potentially verbose error messages
**Solution**:
- Reduce error verbosity in production
- Implement proper error logging (separate from user-facing messages)
- Avoid exposing system details in error responses
- Add structured error codes

### Low Priority

#### 7. Add Security Monitoring
**Solution**:
- Implement audit logging for sensitive operations
- Add request/response logging
- Set up alerts for suspicious activities
- Monitor authentication failures

#### 8. Enhance Subprocess Security
**Current**: Uses subprocess for CLI interactions
**Solution**:
- Implement command allowlisting
- Add timeout mechanisms (partially implemented)
- Validate all subprocess arguments
- Use secure environment variable handling

## Implementation Checklist

- [ ] Set up AWS Secrets Manager or HashiCorp Vault
- [ ] Migrate credentials from `vars/user_vars.yml` to secret manager
- [ ] Implement JWT authentication for API endpoints
- [ ] Add WebSocket authentication
- [ ] Implement RBAC with user roles
- [ ] Add rate limiting middleware
- [ ] Create environment-specific CORS configuration
- [ ] Enhance input validation across all endpoints
- [ ] Implement comprehensive error handling
- [ ] Add audit logging for sensitive operations
- [ ] Set up security monitoring and alerting
- [ ] Review and harden subprocess command execution
- [ ] Add security headers (HSTS, CSP, etc.)
- [ ] Implement session management
- [ ] Add automated security testing (SAST/DAST)

## References

### Key Files
- `ui/backend/app.py` - Main backend application
- `vars/user_vars.yml` - Credential storage (needs migration)
- `.gitignore` - Updated to exclude sensitive files

### Security Standards
- OWASP Top 10
- CIS Benchmarks for FastAPI/Python
- Cloud-specific security best practices (AWS, Azure)

## Notes

This is a living document. Update as security improvements are implemented and new vulnerabilities are discovered.
