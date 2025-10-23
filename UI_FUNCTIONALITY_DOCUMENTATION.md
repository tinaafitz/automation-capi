# ROSA Automation UI - Functionality Documentation

## Overview
The ROSA Automation UI is a React-based web application that provides a user-friendly interface for managing ROSA (Red Hat OpenShift Service on AWS) clusters using CAPI (Cluster API) and CAPA (Cluster API Provider AWS). The UI integrates with a FastAPI backend to execute Ansible automation tasks.

## Architecture

### Frontend
- **Technology**: React (Create React App)
- **Port**: 3000
- **Location**: `/Users/tinafitzgerald/acm_dev/automation-capi/ui/frontend`

### Backend
- **Technology**: FastAPI with Python 3
- **Port**: 8000
- **Location**: `/Users/tinafitzgerald/acm_dev/automation-capi/ui/backend`

### Communication
- Frontend makes REST API calls to backend at `http://localhost:8000`
- Backend executes Ansible playbooks/roles/tasks in the parent automation-capi directory

## Key Features

### 1. Configure MCE Environment Button
**Location**: WhatCanIHelp.js page
**Purpose**: Configures the Multi-Cluster Engine (MCE) CAPI/CAPA environment

**Implementation Details**:
- **Frontend Handler**: `configureEnvironment()` function in WhatCanIHelp.js
- **Backend Endpoint**: `POST /api/ansible/run-role`
- **Request Payload**:
  ```json
  {
    "role_name": "configure-capa-environment",
    "description": "Configure MCE CAPI/CAPA Environment"
  }
  ```

**Backend Processing** (`ui/backend/app.py` lines 2313-2450):
1. Creates temporary playbook with these tasks:
   - Sets OCP credentials as facts (OCP_HUB_CLUSTER_USER, OCP_HUB_CLUSTER_PASSWORD, OCP_HUB_API_URL)
   - Includes `tasks/login_ocp.yml` to login to OpenShift
   - Includes the `configure-capa-environment` role with OCM credentials

2. Playbook structure:
   ```yaml
   name: Run configure-capa-environment role
   hosts: localhost
   connection: local  # CRITICAL: Ensures local execution, not SSH
   gather_facts: false
   vars_files:
     - vars/vars.yml
     - vars/user_vars.yml
   tasks:
     - name: Set OCP credentials
       set_fact:
         ocp_user: "{{ OCP_HUB_CLUSTER_USER }}"
         ocp_password: "{{ OCP_HUB_CLUSTER_PASSWORD }}"
         api_url: "{{ OCP_HUB_API_URL }}"
     - name: Login to OCP
       include_tasks: tasks/login_ocp.yml
     - name: Configure the MCE CAPI/CAPA environment
       include_role:
         name: configure-capa-environment
       vars:
         ocm_client_id: "{{ OCM_CLIENT_ID }}"
         ocm_client_secret: "{{ OCM_CLIENT_SECRET }}"
   ```

3. Executes with:
   ```bash
   ansible-playbook <temp_playbook> -i localhost, -e skip_ansible_runner=true -v
   ```

**What It Creates**:
- `ns-rosa-hcp` namespace
- ClusterManager registration configuration with feature gates
- ClusterRoleBinding for CAPI operator
- `capa-manager-bootstrap-credentials` secret (AWS credentials)
- `rosa-creds-secret` (OCM credentials)
- AWSClusterControllerIdentity resource

### 2. Provision ROSA HCP Cluster
**Location**: WhatCanIHelp.js page
**Purpose**: Provisions a ROSA Hosted Control Plane cluster

**Implementation**:
- **Backend Endpoint**: `POST /api/ansible/run-task`
- **Task File**: `tasks/provision-rosa-hcp-cluster.yml`
- Switches kubectl context to Kind cluster
- Creates namespace and applies cluster configuration
- Creates OCM client secret
- Applies ROSA HCP cluster YAML definition

### 3. Validate CAPA Environment
**Purpose**: Validates that all CAPA components are properly configured

**Implementation**:
- **Backend Endpoint**: `POST /api/ansible/run-task`
- **Task File**: `tasks/validate-capa-environment.yml`
- Checks for:
  - capi-controller-manager deployment
  - capa-controller-manager deployment
  - ClusterManager registration configuration
  - ClusterRoleBinding
  - Bootstrap credentials secret
  - ROSA credentials secret
  - AWSClusterControllerIdentity

### 4. Enable CAPI and CAPA
**Purpose**: Enables CAPI and CAPA components in MCE

**Implementation**:
- **Backend Endpoint**: `POST /api/ansible/run-task`
- **Task File**: `tasks/enable_capi_capa.yml`
- Patches MCE resource to enable components

### 5. Kind Cluster Integration
**Features**:
- List available Kind clusters
- Create new Kind clusters
- Select active Kind cluster
- Execute kubectl commands in Kind cluster context
- View active CAPI/ROSA resources in Kind cluster
- View detailed YAML of resources

**Endpoints**:
- `GET /api/kind/list-clusters` - List all Kind clusters
- `POST /api/kind/verify-cluster` - Verify cluster exists and is accessible
- `POST /api/kind/create-cluster` - Create new Kind cluster
- `POST /api/kind/execute-command` - Execute kubectl command
- `POST /api/kind/get-active-resources` - Get CAPI/ROSA resources
- `POST /api/kind/get-resource-detail` - Get resource YAML details

### 6. Status Checks
**ROSA Authentication Status**:
- **Endpoint**: `GET /api/rosa/status`
- **Checks**: `rosa whoami` command
- **Caching**: 30 second TTL
- **Returns**: Authentication status, user info, account details

**OCP Connection Status**:
- **Endpoint**: `GET /api/ocp/connection-status`
- **Checks**: Attempts `oc login` with credentials from `vars/user_vars.yml`
- **Caching**: 60 second TTL
- **Returns**: Connection status, cluster info, version

**AWS Credentials Status**:
- **Endpoint**: `GET /api/aws/credentials-status`
- **Checks**: `aws sts get-caller-identity`
- **Returns**: Credential validity, account info

**Configuration Status**:
- **Endpoint**: `GET /api/config/status`
- **Checks**: Presence and completeness of `vars/user_vars.yml`
- **Returns**: List of configured/missing fields

### 7. Guided Setup Workflow
**Endpoint**: `GET /api/guided-setup/status`
**Purpose**: Provides step-by-step onboarding

**Steps**:
1. ROSA Staging Authentication
2. Configuration Setup (vars/user_vars.yml)
3. AWS Credentials
4. OpenShift Hub Connection
5. Ready for Automation

## Critical Backend Implementation Details

### MCE Role Execution Fix (app.py:2313-2450)
**Problem Solved**: The configure-capa-environment role was failing because:
1. Missing Ansible inventory
2. Not logging into OCP before accessing MCE resources
3. Trying to SSH to localhost instead of running locally

**Solution Implemented**:
1. Add `-i localhost,` to ansible-playbook command
2. Add OCP login tasks before role execution (for MCE roles)
3. Add `connection: "local"` to playbook structure
4. Use `include_role` instead of `import_role` for runtime execution

### Temporary Playbook Pattern
Backend creates temporary YAML playbooks on-the-fly for:
- Running roles (`/api/ansible/run-role`)
- Running tasks (`/api/ansible/run-task`)

Files are created in project root and cleaned up after execution.

## Configuration Requirements

### Required Files
1. **vars/user_vars.yml**: Contains all credentials
   - OCP_HUB_API_URL
   - OCP_HUB_CLUSTER_USER
   - OCP_HUB_CLUSTER_PASSWORD
   - AWS_REGION
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - OCM_CLIENT_ID
   - OCM_CLIENT_SECRET

2. **vars/vars.yml**: Static configuration variables

### Environment Variables (Backend)
- `PYTHONPATH`: Set to `ui/backend` directory
- `AUTOMATION_PATH`: Set to automation-capi root directory
- `KUBECONFIG`: Path to kubeconfig file (defaults to ~/.kube/config)

## API Response Formats

### Success Response
```json
{
  "success": true,
  "return_code": 0,
  "output": "ansible stdout output",
  "message": "Task completed successfully",
  "stdout_lines": ["line1", "line2"]
}
```

### Error Response
```json
{
  "success": false,
  "return_code": <non-zero>,
  "error": "error message",
  "message": "Task failed",
  "stderr_lines": ["error1", "error2"]
}
```

## Security Considerations

### Command Execution
The `/api/kind/execute-command` endpoint blocks dangerous commands:
- `rm -rf /` and similar destructive file operations
- `mkfs` (filesystem formatting)
- `dd` to devices
- `shutdown`, `reboot`, `killall`
- Fork bombs

### Credential Handling
- Secrets are marked with `no_log: true` in Ansible tasks
- OCM secrets use censored output
- AWS and OCP credentials are read from vars files, not exposed in API responses

## UI Components

### Key React Components
1. **WhatCanIHelp.js** (Main page - 6000+ lines)
   - Primary automation interface
   - Configure MCE Environment button
   - ROSA HCP provisioning
   - Recent operations tracking
   - Resource detail viewing

2. **KindClusterModal.js**
   - Kind cluster selection/creation dialog
   - Cluster verification
   - Creation wizard

3. **KindTerminalModal.js**
   - Terminal-like interface for kubectl commands
   - Command history
   - Real-time output

4. **ConfigStatus.js**
   - Configuration status display
   - Missing credentials highlighting

5. **ROSAStatus.js**
   - ROSA authentication status
   - Login instructions

6. **OCPConnectionStatus.js**
   - OpenShift connection status
   - Connection details

## Recent Operations Tracking
The UI tracks all operations in localStorage with:
- Operation name
- Timestamp
- Status (success/failed/running)
- Duration
- Output summary
- Full output details

**Storage Key**: `recentOperations`
**Max Items**: 50 (oldest removed automatically)

## Notification System
Uses react-toastify for notifications:
- Success: Green toast
- Error: Red toast
- Info: Blue toast
- Warning: Yellow toast

Position: Bottom-right
Auto-close: 5 seconds (errors: 10 seconds)

## Known Issues and Workarounds

### Podman Container Networking
**Issue**: Containerized frontend can't reach localhost:8000 backend
**Workaround**: Use React dev server (`npm start`) instead of containerized deployment

### Python Interpreter Warning
**Symptom**: Warning about Python interpreter discovery
**Impact**: Cosmetic only, does not affect functionality
**Message**: "Platform darwin on host localhost is using the discovered Python interpreter..."

## Testing the UI

### Manual Test Checklist
1. ✅ Configure MCE Environment button executes successfully
2. ✅ Role logs into OCP before creating resources
3. ✅ All MCE resources created (namespace, secrets, ClusterRoleBinding, etc.)
4. ✅ ROSA status check works
5. ✅ OCP connection status works
6. ✅ AWS credentials validation works
7. ✅ Kind cluster operations work
8. ✅ Resource viewing and details work

### Direct Backend Testing
```bash
# Test the configure-capa-environment role endpoint
curl -X POST http://localhost:8000/api/ansible/run-role \
  -H "Content-Type: application/json" \
  -d '{"role_name": "configure-capa-environment", "description": "Test MCE Configuration"}'
```

## Deployment Modes

### Development Mode (Current)
- Frontend: React dev server on port 3000
- Backend: uvicorn with --reload on port 8000
- Both run on host machine (not containerized)

### Production Mode (Future)
- Frontend: Containerized with nginx serving built React app
- Backend: Containerized with gunicorn workers
- Communication via Docker network or host networking

## Future Enhancements
1. WebSocket support for real-time job progress
2. Better error handling and recovery
3. Audit logging
4. Multi-user support
5. Role-based access control
6. Cluster lifecycle management (delete, upgrade)
7. Cost estimation and tracking
8. Integration with monitoring/alerting systems
