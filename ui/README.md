# ROSA Automation UI

A web-based user interface for the ROSA automation toolkit, providing an intuitive way to create, manage, and monitor ROSA HCP clusters.

## Features

- **Cluster Creation Wizard**: Step-by-step guided cluster creation
- **Real-time Monitoring**: Live progress tracking and log streaming
- **Configuration Management**: Save and reuse cluster configurations
- **Multi-Feature Support**: ROSANetwork and ROSARoleConfig automation
- **OpenShift 4.20 Focus**: Optimized for the latest OpenShift version

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │────│  FastAPI/Flask  │────│  Ansible Runner │
│   (Frontend)    │    │   (Backend)     │    │   (Automation)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
    Web Browser              REST API               ROSA/AWS APIs
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Ansible
- ROSA CLI
- AWS CLI

### Backend Setup
```bash
cd ui/backend
pip install -r requirements.txt
python app.py
```

### Frontend Setup
```bash
cd ui/frontend
npm install
npm start
```

## API Endpoints

### Cluster Management
- `POST /api/clusters` - Create new cluster
- `GET /api/clusters/{id}` - Get cluster status
- `DELETE /api/clusters/{id}` - Delete cluster
- `GET /api/clusters/{id}/logs` - Stream logs

### Configuration
- `GET /api/templates` - List available templates
- `POST /api/validate` - Validate configuration
- `GET /api/versions` - Get supported OpenShift versions

### Monitoring
- `GET /api/jobs/{id}` - Get job status
- `WebSocket /ws/jobs/{id}` - Real-time updates

## Development

### Adding New Features
1. Create backend API endpoint
2. Add frontend component
3. Update navigation
4. Add tests

### Testing
```bash
# Backend tests
cd ui/backend && python -m pytest

# Frontend tests
cd ui/frontend && npm test
```

## Deployment

### Docker Compose
```bash
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

## Security Considerations

- API authentication via JWT
- RBAC for cluster operations
- Secure credential storage
- Audit logging