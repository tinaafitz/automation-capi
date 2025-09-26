# ROSA Automation UI Setup Guide

This guide will help you set up the web-based UI for the ROSA automation toolkit.

## Prerequisites

- **Docker & Docker Compose** (recommended) OR
- **Node.js 18+** and **Python 3.9+** for local development
- **Ansible** installed and configured
- **ROSA CLI** installed and authenticated
- **AWS CLI** configured with appropriate permissions

## Quick Start with Docker

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository (if not already done)
cd automation-capi/ui

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Local Development Setup

### Backend Setup

```bash
cd ui/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend
python app.py
```

### Frontend Setup

```bash
cd ui/frontend

# Install dependencies
npm install

# Start development server
npm start
```

## Configuration

### Environment Variables

Create a `.env` file in the `ui/backend` directory:

```bash
# Backend configuration
AUTOMATION_PATH=/path/to/automation-capi
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO

# AWS Configuration (optional, can use AWS CLI config)
AWS_DEFAULT_REGION=us-west-2

# Redis (optional, for production)
REDIS_URL=redis://localhost:6379
```

### AWS Credentials

Ensure your AWS credentials are configured for ROSA operations:

```bash
# Configure AWS CLI
aws configure

# Verify ROSA authentication
rosa whoami

# Test ROSA functionality
rosa list clusters
```

## Features Overview

### 1. Dashboard
- **Overview**: System status and quick actions
- **Features**: ROSANetwork and ROSARoleConfig automation overview
- **Getting Started**: Step-by-step guide for new users

### 2. Cluster Creation Wizard
- **Basic Configuration**: Name, version, region, instance type
- **Scaling Options**: Min/max replicas configuration
- **Automation Features**:
  - ROSANetwork (ACM-21174): Automated VPC/subnet creation
  - ROSARoleConfig (ACM-21162): Automated IAM role creation
- **Network Settings**: CIDR blocks, availability zones
- **Validation**: Real-time configuration validation

### 3. Cluster Management
- **List View**: All clusters with status and basic info
- **Detail View**: Comprehensive cluster information
- **Real-time Monitoring**: Live progress tracking via WebSockets
- **Log Streaming**: Real-time Ansible execution logs

### 4. API Integration
- **RESTful API**: Full cluster lifecycle management
- **WebSocket Support**: Real-time updates
- **Validation Endpoints**: Configuration validation
- **Job Management**: Background task tracking

## Usage Examples

### Creating a Basic ROSA Cluster

1. Navigate to http://localhost:3000
2. Click "Create New Cluster"
3. Fill in the basic information:
   - **Name**: `my-rosa-cluster`
   - **Version**: `4.20.0` (recommended)
   - **Region**: `us-west-2`
4. Enable **ROSANetwork Automation** for automatic VPC creation
5. Configure scaling (min: 2, max: 3)
6. Click "Create Cluster"
7. Monitor progress in real-time

### Advanced Configuration

For clusters requiring custom networking:

1. Enable **ROSANetwork Automation**
2. Set custom **CIDR Block**: `10.1.0.0/16`
3. Configure **Availability Zones** as needed
4. Add custom **Tags** for resource management

### Role Automation

For clusters requiring automated IAM setup:

1. Enable **ROSARoleConfig Automation**
2. The system will automatically:
   - Create installer, support, and worker roles
   - Set up OIDC providers
   - Configure trust relationships

## API Usage

### Create a Cluster Programmatically

```bash
curl -X POST http://localhost:8000/api/clusters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api-test-cluster",
    "version": "4.20.0",
    "region": "us-west-2",
    "network_automation": true,
    "role_automation": false
  }'
```

### Monitor Job Progress

```bash
# Get job status
curl http://localhost:8000/api/jobs/{job_id}

# Stream logs
curl http://localhost:8000/api/jobs/{job_id}/logs
```

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/jobs/{job_id}');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Progress:', update.progress);
};
```

## Troubleshooting

### Common Issues

1. **"Connection refused" errors**
   - Verify Docker containers are running: `docker-compose ps`
   - Check port availability: `netstat -an | grep 8000`

2. **Ansible playbook failures**
   - Verify ROSA authentication: `rosa whoami`
   - Check AWS permissions: `aws sts get-caller-identity`
   - Review logs: `docker-compose logs backend`

3. **UI not loading**
   - Clear browser cache
   - Check frontend container: `docker-compose logs frontend`
   - Verify backend API: `curl http://localhost:8000/api/health`

### Debug Mode

Enable debug logging:

```bash
# Backend debug
docker-compose exec backend tail -f /var/log/automation.log

# Frontend debug
docker-compose logs frontend
```

## Production Deployment

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n rosa-automation
```

### Security Considerations

1. **Authentication**: Implement JWT-based auth
2. **RBAC**: Role-based access control
3. **Network Security**: Use HTTPS and secure ingress
4. **Secrets Management**: Use Kubernetes secrets or HashiCorp Vault
5. **Audit Logging**: Enable comprehensive audit trails

### Scaling

- **Backend**: Horizontal scaling with load balancer
- **Database**: Use PostgreSQL or MongoDB for persistence
- **Queue**: Use Redis or RabbitMQ for job processing
- **Monitoring**: Integrate with Prometheus/Grafana

## Development

### Adding New Features

1. **Backend**: Add new FastAPI endpoints
2. **Frontend**: Create React components
3. **Integration**: Update API calls and navigation
4. **Testing**: Add unit and integration tests

### Code Structure

```
ui/
├── backend/                 # FastAPI backend
│   ├── app.py              # Main application
│   ├── models/             # Pydantic models
│   ├── api/                # API routes
│   └── services/           # Business logic
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API clients
│   │   └── utils/          # Utilities
│   └── public/             # Static assets
└── k8s/                    # Kubernetes manifests
```

## Support

For issues and feature requests:
1. Check the troubleshooting section above
2. Review logs for error details
3. Consult the main automation-capi documentation
4. Open an issue in the project repository