FROM python:3.11-slim

WORKDIR /app

# Install system dependencies, Podman CLI, Kind, and kubectl
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    podman \
    && rm -rf /var/lib/apt/lists/* \
    && curl -Lo /usr/local/bin/kind https://kind.sigs.k8s.io/dl/v0.30.0/kind-linux-amd64 \
    && chmod +x /usr/local/bin/kind \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/kubectl \
    && ln -s /usr/bin/podman /usr/local/bin/docker

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Ansible
RUN pip install ansible

# Copy application code
COPY . .

# Note: Running as root to access Docker/Podman socket for Kind operations
# In production, consider using a more restricted user with appropriate group permissions

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]