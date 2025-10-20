# Docker Setup Guide

This guide explains how to run the ROSA Automation UI using Docker and Docker Compose.

## Prerequisites

- **Docker**: 20.10 or higher
- **Docker Compose**: 2.0 or higher

Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

## Quick Start

### Development Environment

Start both backend and frontend in development mode with hot reload:

```bash
# Start all services
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000

### Production Environment

Build and run optimized production containers:

```bash
# Create production environment file
cp .env.example .env.prod
# Edit .env.prod with production values

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Available Commands

### Build Commands

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend

# Force rebuild without cache
docker-compose build --no-cache
```

### Service Management

```bash
# Start services
docker-compose up

# Start specific service
docker-compose up backend

# Stop services (keeps containers)
docker-compose stop

# Remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### Executing Commands in Containers

```bash
# Backend shell
docker-compose exec backend /bin/bash

# Frontend shell
docker-compose exec frontend /bin/sh

# Run backend tests
docker-compose exec backend pytest

# Run frontend tests
docker-compose exec frontend npm test
```

## Configuration

### Environment Variables

#### Backend (.env)

```bash
APP_ENV=development
DEBUG=true
LOG_LEVEL=DEBUG
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

#### Frontend

Frontend environment variables are configured in `docker-compose.yml`:

```yaml
environment:
  - REACT_APP_API_URL=http://localhost:8000
  - REACT_APP_WS_URL=ws://localhost:8000
```

### Volume Mounts

#### Development Mode

Source code is mounted for hot reload:

```yaml
volumes:
  - ./ui/backend:/app          # Backend code
  - ./ui/frontend/src:/app/src # Frontend code
```

Changes to files are immediately reflected in running containers.

#### Production Mode

No source mounts - code is baked into images.

## Services

### Backend Service

- **Image**: Custom Python image with FastAPI
- **Port**: 8000
- **Health Check**: Checks `/health` endpoint every 30s
- **Volumes**:
  - Source code (dev only)
  - Virtual environment
  - User variables

### Frontend Service

- **Image**: Node.js (dev) / Nginx (prod)
- **Port**: 3000 (dev) / 80 (prod)
- **Dependencies**: Waits for backend to be healthy
- **Volumes**:
  - Source code (dev only)
  - node_modules

## Networking

Services communicate through the `rosa-network` bridge network:

```
frontend:3000 -> backend:8000
```

The frontend can access the backend at `http://backend:8000` internally.

## Health Checks

### Backend Health Check

```bash
# Check backend health
curl http://localhost:8000/health

# Inside docker network
curl http://backend:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Check Service Status

```bash
# View service health
docker-compose ps

# Detailed container info
docker inspect rosa-automation-backend
docker inspect rosa-automation-frontend
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different ports in docker-compose.yml
ports:
  - "8001:8000"  # Host:Container
```

### Container Fails to Start

```bash
# View container logs
docker-compose logs backend
docker-compose logs frontend

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart backend
```

### Build Failures

```bash
# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up

# Remove dangling images
docker image prune

# Remove all stopped containers
docker container prune
```

### Volume Issues

```bash
# Remove volumes and rebuild
docker-compose down -v
docker-compose up --build

# List volumes
docker volume ls

# Remove specific volume
docker volume rm automation-capi_backend-venv
```

### Permission Issues

```bash
# Backend runs as non-root user (uid 1000)
# Ensure files are accessible:
chmod -R 755 ui/backend
chmod -R 755 ui/frontend
```

## Performance Optimization

### Build Cache

Use BuildKit for faster builds:

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build with BuildKit
docker-compose build
```

### Image Size

View image sizes:

```bash
docker images | grep rosa-automation
```

Optimize:
- Use multi-stage builds (already implemented for frontend)
- Use .dockerignore to exclude unnecessary files
- Use alpine-based images where possible

## Production Deployment

### Build Production Images

```bash
docker-compose -f docker-compose.prod.yml build
```

### Push to Registry

```bash
# Tag images
docker tag rosa-automation-backend:latest your-registry/rosa-automation-backend:latest
docker tag rosa-automation-frontend:latest your-registry/rosa-automation-frontend:latest

# Push to registry
docker push your-registry/rosa-automation-backend:latest
docker push your-registry/rosa-automation-frontend:latest
```

### Deploy to Server

```bash
# On production server
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Security Considerations

### Production Checklist

- [ ] Use environment-specific .env files
- [ ] Set strong SECRET_KEY
- [ ] Disable DEBUG mode
- [ ] Configure CORS properly
- [ ] Use HTTPS in production
- [ ] Regularly update base images
- [ ] Scan images for vulnerabilities
- [ ] Use secrets management (not .env files)
- [ ] Enable TLS for backend API
- [ ] Implement rate limiting

### Scan for Vulnerabilities

```bash
# Using Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image rosa-automation-backend:latest

docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image rosa-automation-frontend:latest
```

## Monitoring

### View Resource Usage

```bash
# Real-time stats
docker stats

# Specific containers
docker stats rosa-automation-backend rosa-automation-frontend
```

### Container Inspection

```bash
# Full container details
docker inspect rosa-automation-backend

# Network details
docker network inspect automation-capi_rosa-network
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Docker Guide](https://fastapi.tiangolo.com/deployment/docker/)
- [React Docker Guide](https://create-react-app.dev/docs/deployment/)

## Support

For issues with Docker setup:
1. Check container logs: `docker-compose logs`
2. Verify configuration: `docker-compose config`
3. Review [UI_README.md](UI_README.md) for application-specific setup
4. Open an issue in the GitHub repository
