# CLAUDE.md - Automation CAPI Project Guide

This file contains instructions and context for Claude to work effectively with the CAPI/CAPA Test Automation project.

## Project Overview

This is a comprehensive automation framework for Red Hat OpenShift ROSA (Red Hat OpenShift Service on AWS) clusters using Cluster API (CAPI) and Cluster API Provider AWS (CAPA). The project combines Ansible automation with a modern React web UI.

### Key Components
- **Ansible Automation**: Playbooks for cluster lifecycle management
- **Web UI**: React frontend for visual cluster management 
- **FastAPI Backend**: Python API server for automation orchestration
- **Docker Support**: Containerized deployment options

## Project Structure

```
automation-capi/
├── ui/                          # Web interface
│   ├── frontend/               # React app (port 3000)
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   │   ├── environments/ # MCE, Minikube environments
│   │   │   │   ├── cards/       # StatusCard, ComponentStatusCard
│   │   │   │   ├── modals/      # Terminal modals
│   │   │   │   └── sections/    # UI sections
│   │   │   ├── pages/          # Main pages
│   │   │   ├── store/          # React context/state
│   │   │   └── styles/         # Tailwind themes
│   │   └── package.json        # Frontend dependencies
│   ├── backend/                # FastAPI server (port 8000)
│   │   ├── main.py            # FastAPI entry point
│   │   └── requirements.txt    # Python dependencies
│   └── docker-compose.yml      # Container orchestration
├── tasks/                       # Ansible task files
├── templates/                   # Jinja2 templates for cluster configs
├── vars/                        # Variable files (including credentials)
├── roles/                       # Ansible roles
├── capi-assistant.yaml         # Interactive CLI assistant
├── end2end-test.yaml           # Full lifecycle testing
└── README.md                   # Project documentation
```

## Development Environment

### Frontend Development
```bash
cd ui/frontend
npm install
npm start                 # Starts dev server on port 3000
npm run build            # Production build
npm run lint             # ESLint checking
npm run format           # Prettier formatting
```

### Backend Development  
```bash
cd ui/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Full Stack Development
```bash
cd ui
docker-compose up        # Runs both frontend and backend
```

## Key Technologies

### Frontend Stack
- **React 18**: Component framework
- **Tailwind CSS**: Styling framework with custom themes
- **Heroicons**: Icon library
- **Axios**: HTTP client
- **Socket.io**: Real-time communication
- **React Flow**: Diagram visualization

### Backend Stack
- **FastAPI**: Modern Python web framework
- **Pydantic**: Data validation
- **WebSockets**: Real-time updates
- **Uvicorn**: ASGI server

### Automation Stack
- **Ansible**: Infrastructure automation
- **YAML**: Configuration and playbooks
- **Jinja2**: Template engine
- **Docker**: Containerization

## Common Commands

### Testing & Quality
```bash
# Frontend
npm run test             # Jest tests
npm run lint            # ESLint
npm run format          # Prettier

# Backend  
pytest                  # Python tests
black .                 # Code formatting
pylint .                # Linting
mypy .                  # Type checking

# Ansible
ansible-playbook capi-assistant.yaml
./capi_assistant        # Interactive mode
./end2end_tests        # Full automation test
```

### Build & Deployment
```bash
npm run build           # Frontend production build
docker-compose up --build  # Rebuild containers
```

## File Patterns

### Important File Types
- `*.jsx` - React components (use functional components with hooks)
- `*.yaml/*.yml` - Ansible playbooks and configuration
- `*.j2` - Jinja2 templates for Kubernetes resources
- `user_vars.yml` - Credentials and environment configuration

### Naming Conventions
- React components: PascalCase (`StatusCard.jsx`)
- Ansible files: snake_case (`create_rosa_hcp_cluster.yaml`)
- Directories: lowercase with hyphens (`ui/frontend/src/components`)

## Environment Configuration

### Required Credentials (`vars/user_vars.yml`)
```yaml
OCP_HUB_API_URL: ""              # OpenShift cluster API
OCP_HUB_CLUSTER_USER: ""         # Cluster admin user
OCP_HUB_CLUSTER_PASSWORD: ""     # Cluster password
AWS_REGION: ""                   # AWS region
AWS_ACCESS_KEY_ID: ""            # AWS credentials
AWS_SECRET_ACCESS_KEY: ""        # AWS secret
OCM_CLIENT_ID: ""                # OpenShift Cluster Manager
OCM_CLIENT_SECRET: ""            # OCM secret
```

### Environment Types
- **MCE Environment**: OpenShift hub cluster with Multicluster Engine
- **Minikube Environment**: Local development cluster
- **Kind Environment**: Kubernetes in Docker for testing

## UI Architecture

### Theme System
The UI uses a theme system in `src/styles/themes.js`:
- **MCE Theme**: Cyan/blue gradient colors
- **Minikube Theme**: Purple/violet gradient colors

### Component Patterns
- **StatusCard**: Standard status display with actions
- **ComponentStatusCard**: Component status with enable/disable indicators  
- **EnvironmentCard**: Collapsible environment sections
- **Terminal Modals**: Interactive command execution

### State Management
- React Context API for global state
- Custom hooks for specific domains (MCE, Minikube, API status)
- Recent operations tracking for user feedback

## Ansible Integration

### Key Playbooks
- `capi-assistant.yaml`: Interactive cluster management
- `end2end-test.yaml`: Automated testing pipeline  
- `create_rosa_hcp_cluster.yaml`: ROSA cluster creation
- `configure_environment.yaml`: Environment setup
- `verify_capi_environment.yaml`: Environment validation

### Automation Patterns
- Idempotent operations
- Comprehensive error handling
- Template-driven configuration
- Multi-environment support

## Security Considerations

### Credential Management
- Never commit credentials to git
- Use `vars/user_vars.yml` for sensitive data
- Environment variables for CI/CD
- Secure secret injection in containers

### Development Security
- ESLint security rules enabled
- No hardcoded credentials in frontend
- API input validation with Pydantic
- CORS configuration for production

## Common Development Tasks

### Adding New UI Components
1. Create component in appropriate `src/components/` subdirectory
2. Follow existing patterns for theming and state management
3. Add to appropriate environment page
4. Test with both MCE and Minikube themes

### Adding Ansible Tasks
1. Create task file in `tasks/` directory
2. Add appropriate error handling and logging
3. Include in relevant playbooks
4. Test with different environment configurations

### Updating Styling
1. Use Tailwind classes with theme system
2. Maintain consistency between environment themes
3. Test responsive behavior
4. Follow accessibility guidelines

## Troubleshooting

### Common Issues
- **Port conflicts**: Check ports 3000 (frontend) and 8000 (backend)
- **Dependency issues**: Clear node_modules and reinstall
- **Ansible failures**: Check `vars/user_vars.yml` configuration
- **Docker issues**: Restart Docker daemon and rebuild containers

### Debug Commands
```bash
# Frontend debugging
npm start                # Dev server with hot reload
npm run analyze         # Bundle analysis

# Backend debugging  
uvicorn main:app --reload --log-level debug

# Ansible debugging
ansible-playbook -v     # Verbose output
ansible-playbook --check  # Dry run mode
```

## Testing Guidelines

### Frontend Testing
- Component tests with React Testing Library
- Integration tests for user workflows
- Visual regression testing for UI components

### Backend Testing
- Unit tests with pytest
- API endpoint testing with httpx
- WebSocket connection testing

### Automation Testing
- Ansible playbook syntax checking
- Idempotency testing
- Multi-environment validation

## Contributing Guidelines

### Code Style
- Follow existing patterns and conventions
- Use TypeScript types where applicable
- Maintain consistent indentation and formatting
- Add appropriate comments for complex logic

### Git Workflow
- Create feature branches for new work
- Write descriptive commit messages
- Test changes thoroughly before committing
- Use conventional commit format when possible

## Performance Considerations

### Frontend Performance
- Lazy loading for large components
- Memoization for expensive calculations
- Optimized bundle splitting
- Efficient state updates

### Backend Performance
- Async/await patterns for I/O operations
- Connection pooling for database access
- Caching for frequently accessed data
- Resource cleanup for long-running operations

## User Preferences & Working Style

### Tina's Development Preferences
*Add your preferences here for how you like to work*

**Communication Style:**
- [Preference for concise vs detailed explanations]
- [Preferred level of technical detail]
- [How you like status updates during long tasks]

**Development Workflow:**
- Always work on feature branches, never directly on main
- Always check for security issues prior to committing (scan for credentials, hardcoded values)
- Always review changes before committing (git status, git diff)
- Never push commits without explicit permission or instruction
- Manual control required for when changes go to remote repositories
- [Testing approach preferences]
- [Code review preferences]
- [Deployment preferences]

**UI/UX Preferences:**
- [Design system preferences]
- [Component organization preferences] 
- [Styling approach preferences]
- [User experience priorities]

**Automation Preferences:**
- [Ansible playbook organization preferences]
- [Error handling approaches]
- [Logging and monitoring preferences]
- [Environment management preferences]

**Project Management:**
- [Task tracking preferences]
- [Documentation standards]
- [Issue reporting preferences]
- [Progress communication style]

---

This guide should help Claude understand the project structure, development patterns, and common workflows for effective collaboration on the CAPI automation framework.