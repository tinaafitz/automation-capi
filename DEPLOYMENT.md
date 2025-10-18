# Deployment Guide

Complete guide for deploying the ROSA Automation UI to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
- [Production Checklist](#production-checklist)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Docker** 20.10+ and Docker Compose 2.0+
- **Server**: 2+ CPU cores, 4GB+ RAM, 20GB+ disk
- **OS**: Linux (Ubuntu 20.04+, RHEL 8+, etc.)
- **Network**: Ports 80, 443 (frontend), 8000 (backend API)

### External Services

- **ROSA CLI**: Installed and configured
- **AWS Account**: With appropriate permissions
- **OpenShift Cluster**: For management (or Kind cluster for testing)
- **Domain**: (Optional) For production HTTPS

### Optional Services

- **Sentry**: Error monitoring
- **Prometheus**: Metrics collection
- **Load Balancer**: For high availability

## Environment Configuration

### 1. Backend Configuration

Create `ui/backend/.env.prod`:

```bash
# Application
APP_NAME=ROSA Automation
APP_ENV=production
DEBUG=false

# Logging
LOG_LEVEL=INFO
LOG_JSON=true

# Server
HOST=0.0.0.0
PORT=8000

# CORS - Set to your frontend URL(s)
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Security
SECRET_KEY=<generate-strong-random-key>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60

# Sentry (optional)
SENTRY_DSN=<your-sentry-dsn>

# Application Version (for tracking)
APP_VERSION=1.0.0
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

**Generate SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Frontend Configuration

Create `ui/frontend/.env.production`:

```bash
# API Configuration
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_WS_URL=wss://your-api-domain.com/ws

# Build Settings
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false

# Features
REACT_APP_ENABLE_ANALYTICS=true
```

### 3. Ansible Configuration

Update `vars/user_vars.yml`:

```yaml
# OpenShift Hub Configuration
OCP_HUB_API_URL: "https://api.your-ocp-cluster.com:6443"
OCP_HUB_CLUSTER_USER: "admin"
OCP_HUB_CLUSTER_PASSWORD: "<encrypted-password>"
MCE_NAMESPACE: "multiclusterengine"

# AWS Configuration
AWS_REGION: "us-west-2"
AWS_ACCESS_KEY_ID: "<aws-access-key>"
AWS_SECRET_ACCESS_KEY: "<aws-secret-key>"

# OCM Configuration
OCM_CLIENT_ID: "<ocm-client-id>"
OCM_CLIENT_SECRET: "<ocm-client-secret>"
```

## Deployment Options

### Option 1: Docker Compose (Recommended for Small/Medium Deployments)

#### 1. Prepare Configuration

```bash
# Clone repository
git clone https://github.com/yourorg/automation-capi.git
cd automation-capi

# Create production environment files
cp ui/backend/.env.example ui/backend/.env.prod
cp ui/frontend/.env.production.example ui/frontend/.env.production

# Edit configuration files
nano ui/backend/.env.prod
nano ui/frontend/.env.production
```

#### 2. Build and Deploy

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### 3. Verify Deployment

```bash
# Check service health
curl http://localhost/health
curl http://localhost:8000/health/detailed

# Check containers
docker-compose -f docker-compose.prod.yml ps
```

### Option 2: Kubernetes/OpenShift

Create deployment manifests:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rosa-automation-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: rosa-automation-backend
  template:
    metadata:
      labels:
        app: rosa-automation-backend
    spec:
      containers:
      - name: backend
        image: rosa-automation-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: APP_ENV
          value: "production"
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: rosa-secrets
              key: secret-key
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: rosa-automation-backend
spec:
  selector:
    app: rosa-automation-backend
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
```

Deploy:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### Option 3: VM/Bare Metal

#### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.12
sudo apt install python3.12 python3.12-venv

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install nginx

# Install Docker (optional, for containerized deployment)
curl -fsSL https://get.docker.com | sudo sh
```

#### 2. Deploy Backend

```bash
# Create application user
sudo useradd -m -s /bin/bash rosaapp
sudo su - rosaapp

# Clone and setup
git clone https://github.com/yourorg/automation-capi.git
cd automation-capi/ui/backend

# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env.prod
nano .env.prod

# Test run
uvicorn app:app --host 0.0.0.0 --port 8000
```

#### 3. Deploy Frontend

```bash
cd ../frontend

# Install dependencies
npm ci --production

# Build
npm run build

# Copy to web root
sudo cp -r build/* /var/www/rosa-automation/
```

#### 4. Configure Nginx

```nginx
# /etc/nginx/sites-available/rosa-automation
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    # Frontend
    root /var/www/rosa-automation;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/rosa-automation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Setup Systemd Service

```ini
# /etc/systemd/system/rosa-automation.service
[Unit]
Description=ROSA Automation Backend
After=network.target

[Service]
Type=simple
User=rosaapp
WorkingDirectory=/home/rosaapp/automation-capi/ui/backend
Environment="PATH=/home/rosaapp/automation-capi/ui/backend/venv/bin"
ExecStart=/home/rosaapp/automation-capi/ui/backend/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rosa-automation
sudo systemctl start rosa-automation
sudo systemctl status rosa-automation
```

## Production Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] SECRET_KEY generated and set
- [ ] CORS origins configured
- [ ] SSL certificates obtained
- [ ] Database backups configured (if applicable)
- [ ] Monitoring setup (Sentry, Prometheus)
- [ ] Log aggregation configured

### Security

- [ ] HTTPS enabled with valid certificates
- [ ] Security headers configured
- [ ] CORS properly restricted
- [ ] Secrets not in version control
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] Regular security updates scheduled

### Performance

- [ ] Build optimizations applied
- [ ] Gzip compression enabled
- [ ] Static assets cached
- [ ] CDN configured (if needed)
- [ ] Load balancer configured (if needed)
- [ ] Database indexes optimized (if applicable)

### Monitoring

- [ ] Health checks responding
- [ ] Error tracking active (Sentry)
- [ ] Metrics collection active
- [ ] Log aggregation working
- [ ] Alerts configured
- [ ] Dashboard setup

### Testing

- [ ] Production build tested locally
- [ ] All API endpoints tested
- [ ] Frontend routes tested
- [ ] WebSocket connections tested
- [ ] Load testing performed
- [ ] Disaster recovery tested

## Monitoring

### Health Checks

Monitor these endpoints:

- **Liveness**: `GET /health/live` - Container alive
- **Readiness**: `GET /health/ready` - Ready for traffic
- **Detailed**: `GET /health/detailed` - Component status
- **Metrics**: `GET /metrics` - Application metrics

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'rosa-automation'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Sentry Setup

1. Create Sentry project at https://sentry.io
2. Copy DSN
3. Set `SENTRY_DSN` environment variable
4. Restart backend

### Logging

Logs are written to stdout in JSON format (production) or plain text (development).

**View logs:**

```bash
# Docker Compose
docker-compose -f docker-compose.prod.yml logs -f backend

# Systemd
sudo journalctl -u rosa-automation -f

# Kubernetes
kubectl logs -f deployment/rosa-automation-backend
```

## Troubleshooting

### Backend Won't Start

```bash
# Check configuration
cd ui/backend
source venv/bin/activate
python -c "from config import get_settings; print(get_settings())"

# Check dependencies
pip list

# Test manually
uvicorn app:app --host 127.0.0.1 --port 8000
```

### Frontend Build Fails

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+

# Try build
npm run build
```

### CORS Errors

1. Check `CORS_ORIGINS` in backend `.env.prod`
2. Verify frontend URL matches allowed origins
3. Check browser console for exact error
4. Ensure protocol (http/https) matches

### Health Check Failing

```bash
# Test health endpoint
curl http://localhost:8000/health/detailed

# Check logs
docker-compose logs backend

# Verify dependencies
# - Configuration files exist
# - Ansible installed
# - ROSA CLI installed
```

### High Memory Usage

1. Check number of workers (`--workers` flag)
2. Monitor with `/metrics` endpoint
3. Implement caching
4. Consider scaling horizontally

## Rollback Procedure

### Docker Compose

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Pull previous version
git checkout <previous-tag>

# Rebuild and deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes

```bash
# Rollback deployment
kubectl rollout undo deployment/rosa-automation-backend

# Check rollback status
kubectl rollout status deployment/rosa-automation-backend
```

## Scaling

### Horizontal Scaling (Multiple Instances)

**Docker Compose:**

```yaml
services:
  backend:
    deploy:
      replicas: 3
```

**Kubernetes:**

```bash
kubectl scale deployment rosa-automation-backend --replicas=3
```

### Vertical Scaling (More Resources)

Update resource limits in deployment configuration.

## Backup and Recovery

### Configuration Backup

```bash
# Backup environment files
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  ui/backend/.env.prod \
  ui/frontend/.env.production \
  vars/user_vars.yml
```

### Database Backup

If using a database (future enhancement):

```bash
# PostgreSQL example
pg_dump dbname > backup-$(date +%Y%m%d).sql
```

## Updates and Maintenance

### Update Procedure

1. Test in staging environment
2. Create backup
3. Deploy to production
4. Monitor for errors
5. Rollback if needed

### Maintenance Window

Schedule updates during low-traffic periods:

```bash
# Put application in maintenance mode
# (Implement maintenance page)

# Perform update
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Remove maintenance mode
```

## Support

For deployment issues:

1. Check logs (see Logging section)
2. Review health checks
3. Consult troubleshooting guide
4. Open GitHub issue with logs

## Additional Resources

- [UI README](UI_README.md) - Development setup
- [Docker Setup](DOCKER_SETUP.md) - Container details
- [Security Improvements](SECURITY_IMPROVEMENTS.md) - Security guidelines
- [Contributing](CONTRIBUTING.md) - Development guidelines
