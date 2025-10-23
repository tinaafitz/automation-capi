# ROSA Automation UI - Startup Procedures

## Quick Start (Development Mode - RECOMMENDED)

### Prerequisites
1. Node.js and npm installed
2. Python 3 installed
3. Ansible installed
4. OpenShift CLI (oc) installed
5. ROSA CLI installed (optional, for ROSA features)
6. Kind installed (optional, for local cluster testing)
7. AWS CLI installed (optional, for AWS credential validation)

### Step 1: Start the Backend

```bash
# Navigate to project root
cd /Users/tinafitzgerald/acm_dev/automation-capi

# Set environment variables and start uvicorn
PYTHONPATH=/Users/tinafitzgerald/acm_dev/automation-capi/ui/backend \
AUTOMATION_PATH=/Users/tinafitzgerald/acm_dev/automation-capi \
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**What this does**:
- Starts FastAPI backend on port 8000
- Enables auto-reload on code changes
- Sets PYTHONPATH for proper Python imports
- Sets AUTOMATION_PATH for Ansible playbook execution

**Verify backend is running**:
```bash
curl http://localhost:8000/api/health
# Should return: {"status":"healthy","timestamp":"..."}
```

### Step 2: Start the Frontend

```bash
# Navigate to frontend directory
cd /Users/tinafitzgerald/acm_dev/automation-capi/ui/frontend

# Install dependencies (first time only)
npm install

# Start React dev server
npm start
```

**What this does**:
- Starts React development server on port 3000
- Enables hot module replacement (HMR) for instant code updates
- Automatically opens browser to http://localhost:3000

**Verify frontend is running**:
- Browser should open automatically
- If not, manually navigate to http://localhost:3000
- UI should load without errors

### Step 3: Configure Credentials (if not already done)

1. Copy the template:
```bash
cp vars/user_vars.yml.template vars/user_vars.yml
```

2. Edit vars/user_vars.yml with your credentials:
```yaml
# OpenShift Hub Cluster
OCP_HUB_API_URL: "https://api.your-cluster.com:6443"
OCP_HUB_CLUSTER_USER: "your-username"
OCP_HUB_CLUSTER_PASSWORD: "your-password"

# AWS Credentials
AWS_REGION: "us-east-1"
AWS_ACCESS_KEY_ID: "AKIA..."
AWS_SECRET_ACCESS_KEY: "your-secret-key"

# OpenShift Cluster Manager
OCM_CLIENT_ID: "your-client-id"
OCM_CLIENT_SECRET: "your-client-secret"
```

### Step 4: Test the UI

1. Navigate to http://localhost:3000
2. The UI should show status checks for:
   - ROSA authentication
   - Configuration status
   - AWS credentials
   - OCP connection

3. Click "Configure MCE Environment" to test the main functionality

## Alternative: Docker/Podman Containerized Deployment

### Prerequisites
- Podman or Docker installed
- Podman machine running (for macOS)

### Start Podman Machine (macOS only)
```bash
podman machine start
```

### Option A: Using docker-compose / podman-compose

```bash
# Navigate to UI directory
cd /Users/tinafitzgerald/acm_dev/automation-capi/ui

# Start both frontend and backend
podman-compose up -d

# Or with Docker
docker-compose up -d
```

### Option B: Manual Container Commands

**Backend Container**:
```bash
cd /Users/tinafitzgerald/acm_dev/automation-capi/ui

# Build backend image
podman build -t rosa-backend -f backend/Dockerfile backend/

# Run backend container
podman run -d \
  --name rosa-backend \
  -p 8000:8000 \
  -v /Users/tinafitzgerald/acm_dev/automation-capi:/app/automation \
  -e AUTOMATION_PATH=/app/automation \
  rosa-backend
```

**Frontend Container**:
```bash
cd /Users/tinafitzgerald/acm_dev/automation-capi/ui/frontend

# Build frontend image
podman build -t rosa-frontend .

# Run frontend container
podman run -d \
  --name rosa-frontend \
  -p 3000:3000 \
  rosa-frontend
```

**Note**: When using containers, the frontend and backend must be on the same Docker/Podman network to communicate, OR you need to configure the frontend to use the backend container's network name instead of localhost.

## Current Working Configuration (as of this session)

**Backend**:
```bash
# Terminal 1 - Backend
cd /Users/tinafitzgerald/acm_dev/automation-capi
PYTHONPATH=/Users/tinafitzgerald/acm_dev/automation-capi/ui/backend \
AUTOMATION_PATH=/Users/tinafitzgerald/acm_dev/automation-capi \
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend**:
```bash
# Terminal 2 - Frontend
cd /Users/tinafitzgerald/acm_dev/automation-capi/ui/frontend
npm start
```

**Access**: http://localhost:3000

## Troubleshooting

### Backend Issues

**Issue**: "ModuleNotFoundError: No module named 'app'"
**Solution**: Ensure PYTHONPATH is set correctly:
```bash
export PYTHONPATH=/Users/tinafitzgerald/acm_dev/automation-capi/ui/backend
```

**Issue**: "Ansible playbook not found"
**Solution**: Ensure AUTOMATION_PATH is set:
```bash
export AUTOMATION_PATH=/Users/tinafitzgerald/acm_dev/automation-capi
```

**Issue**: Backend port 8000 already in use
**Solution**: Kill existing process:
```bash
lsof -ti:8000 | xargs kill -9
```

### Frontend Issues

**Issue**: "Failed to connect to backend"
**Solution**: Verify backend is running on port 8000:
```bash
curl http://localhost:8000/api/health
```

**Issue**: Frontend port 3000 already in use
**Solution**: Kill existing process:
```bash
lsof -ti:3000 | xargs kill -9
```

**Issue**: ESLint warnings during compile
**Solution**: These are code quality warnings, not errors. They don't prevent the app from running.

### Container Issues

**Issue**: "Cannot connect to Podman socket"
**Solution**: Start Podman machine:
```bash
podman machine start
```

**Issue**: Frontend can't reach backend (containerized)
**Solution**: Use host networking or create shared network:
```bash
# Create network
podman network create rosa-net

# Run containers on same network
podman run --network rosa-net --name rosa-backend ...
podman run --network rosa-net --name rosa-frontend ...
```

## Stopping the Services

### Development Mode
```bash
# Stop backend (Ctrl+C in backend terminal)
# Stop frontend (Ctrl+C in frontend terminal)
```

### Container Mode
```bash
# Stop all containers
podman-compose down

# Or manually
podman stop rosa-backend rosa-frontend
podman rm rosa-backend rosa-frontend
```

## Environment Variables Reference

### Backend Variables
| Variable | Description | Example |
|----------|-------------|---------|
| PYTHONPATH | Path to backend Python modules | /path/to/ui/backend |
| AUTOMATION_PATH | Path to Ansible automation root | /path/to/automation-capi |
| KUBECONFIG | Path to kubectl config | ~/.kube/config |
| PORT | Backend port (default: 8000) | 8000 |

### Frontend Variables
| Variable | Description | Example |
|----------|-------------|---------|
| REACT_APP_API_URL | Backend API URL | http://localhost:8000 |
| PORT | Frontend port (default: 3000) | 3000 |

## Production Deployment Considerations

### Backend
- Use gunicorn instead of uvicorn for production:
  ```bash
  gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
  ```
- Set up HTTPS/TLS
- Configure proper CORS origins
- Use environment variables for credentials
- Set up logging to files
- Implement rate limiting
- Add authentication/authorization

### Frontend
- Build production bundle:
  ```bash
  npm run build
  ```
- Serve with nginx or similar
- Configure API URL for production backend
- Enable gzip compression
- Set up CDN for static assets
- Implement proper error boundaries
- Add monitoring/analytics

## Logs and Debugging

### Backend Logs
- uvicorn outputs to stdout
- Watch for:
  - "INFO: Uvicorn running on http://0.0.0.0:8000"
  - API request logs (GET/POST endpoints)
  - Ansible task execution logs

### Frontend Logs
- React outputs to browser console (F12)
- Watch for:
  - "Compiled successfully!"
  - API fetch calls
  - Error messages

### Ansible Logs
- Displayed in backend terminal
- Also returned in API responses
- Shows playbook execution progress

## Performance Tips

### Development Mode
- Use `--reload` flag for auto-reload during development
- Keep browser dev tools open for debugging
- Clear localStorage if UI behaves unexpectedly:
  ```javascript
  localStorage.clear()
  ```

### Production Mode
- Build frontend with `npm run build` for optimized bundle
- Use production-grade WSGI server (gunicorn)
- Enable caching headers
- Use CDN for static assets
- Implement proper monitoring

## Health Check Endpoints

### Backend
```bash
# Health check
curl http://localhost:8000/api/health

# ROSA status
curl http://localhost:8000/api/rosa/status

# Config status
curl http://localhost:8000/api/config/status

# OCP connection status
curl http://localhost:8000/api/ocp/connection-status
```

### Frontend
```bash
# Basic connectivity
curl http://localhost:3000

# Should return HTML page
```

## Backup and Recovery

### Important Files to Backup
1. `vars/user_vars.yml` - Credentials (DO NOT commit to git)
2. `ui/frontend/src/` - Frontend source code
3. `ui/backend/app.py` - Backend source code
4. `.env` files (if using)

### Restoring from Backup
1. Clone repository
2. Restore `vars/user_vars.yml`
3. Install dependencies:
   ```bash
   cd ui/frontend && npm install
   pip install -r requirements.txt  # if exists
   ```
4. Start services as described above

## Security Checklist

- [ ] Never commit `vars/user_vars.yml` to git
- [ ] Use environment variables for sensitive data in production
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly (don't use wildcard in production)
- [ ] Implement authentication/authorization
- [ ] Validate all API inputs
- [ ] Use security headers (CSP, HSTS, etc.)
- [ ] Keep dependencies updated
- [ ] Regular security audits with `npm audit`
- [ ] Use secrets management system (Vault, etc.)
