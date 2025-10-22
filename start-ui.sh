#!/bin/bash

# ROSA Automation UI Startup Script
# This script provides an easy way to start the automation UI

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="${SCRIPT_DIR}/ui"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ROSA Automation UI Startup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if Podman is available
check_podman() {
    # Check if podman is available
    if ! command -v podman &> /dev/null; then
        return 1
    fi

    # Check if podman-compose is available in PATH or common locations
    if command -v podman-compose &> /dev/null; then
        PODMAN_COMPOSE="podman-compose"
        return 0
    elif [ -f "/Library/Frameworks/Python.framework/Versions/3.12/bin/podman-compose" ]; then
        PODMAN_COMPOSE="/Library/Frameworks/Python.framework/Versions/3.12/bin/podman-compose"
        return 0
    elif [ -f "/usr/local/bin/podman-compose" ]; then
        PODMAN_COMPOSE="/usr/local/bin/podman-compose"
        return 0
    else
        return 1
    fi
}

# Function to check if Node.js and Python are available
check_local_deps() {
    local has_node=false
    local has_python=false

    if command -v node &> /dev/null; then
        has_node=true
    fi

    if command -v python3 &> /dev/null; then
        has_python=true
    fi

    if [ "$has_node" = true ] && [ "$has_python" = true ]; then
        return 0
    else
        return 1
    fi
}

# Function to start with Podman Compose (frontend/redis) and local backend
start_with_podman() {
    echo -e "${GREEN}Starting UI with Podman (hybrid mode)...${NC}"
    echo -e "${BLUE}Frontend/Redis: Containerized | Backend: Local${NC}"
    echo ""

    cd "${UI_DIR}"

    # Stop backend container if running
    echo -e "${BLUE}Stopping backend container (will run locally instead)...${NC}"
    $PODMAN_COMPOSE stop backend 2>/dev/null || true

    # Start only frontend and redis
    echo -e "${BLUE}Starting frontend and Redis containers...${NC}"
    $PODMAN_COMPOSE up -d frontend redis

    echo ""
    echo -e "${GREEN}Containers started. Now starting backend locally...${NC}"

    # Setup and start backend locally
    cd "${UI_DIR}/backend"

    # Check if venv exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating Python virtual environment for backend...${NC}"
        python3 -m venv venv
        source venv/bin/activate
        pip install -q -r requirements.txt
        pip install -q ansible
    else
        source venv/bin/activate
    fi

    echo -e "${BLUE}Starting backend server (local)...${NC}"
    # Start backend in background
    nohup python app.py > /tmp/ui-backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > /tmp/ui-backend.pid

    echo ""
    echo -e "${GREEN}Waiting for services to be ready...${NC}"
    sleep 5

    echo ""
    echo -e "${GREEN}✓ UI started successfully!${NC}"
    echo ""
    echo -e "${BLUE}Access the application at:${NC}"
    echo -e "  Frontend:  ${GREEN}http://localhost:3000${NC}"
    echo -e "  Backend:   ${GREEN}http://localhost:8000${NC} ${YELLOW}(local)${NC}"
    echo -e "  API Docs:  ${GREEN}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${BLUE}Service details:${NC}"
    echo -e "  Frontend:  ${YELLOW}Podman container${NC}"
    echo -e "  Redis:     ${YELLOW}Podman container${NC}"
    echo -e "  Backend:   ${YELLOW}Local Python (PID: $BACKEND_PID)${NC}"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo -e "  Frontend logs:  ${YELLOW}$PODMAN_COMPOSE logs -f frontend${NC}"
    echo -e "  Backend logs:   ${YELLOW}tail -f /tmp/ui-backend.log${NC}"
    echo -e "  Stop frontend:  ${YELLOW}$PODMAN_COMPOSE stop${NC}"
    echo -e "  Stop backend:   ${YELLOW}kill \$(cat /tmp/ui-backend.pid)${NC}"
    echo -e "  Stop all:       ${YELLOW}$PODMAN_COMPOSE stop && kill \$(cat /tmp/ui-backend.pid 2>/dev/null)${NC}"
    echo ""
    echo -e "${GREEN}Note: Backend runs locally for Kind cluster access${NC}"
    echo ""
}

# Function to start locally
start_locally() {
    echo -e "${GREEN}Starting UI locally...${NC}"
    echo ""

    # Check if backend virtual environment exists
    if [ ! -d "${UI_DIR}/backend/venv" ]; then
        echo -e "${YELLOW}Creating Python virtual environment...${NC}"
        cd "${UI_DIR}/backend"
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    fi

    # Check if frontend dependencies are installed
    if [ ! -d "${UI_DIR}/frontend/node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        cd "${UI_DIR}/frontend"
        npm install
    fi

    echo ""
    echo -e "${BLUE}Starting backend server...${NC}"
    cd "${UI_DIR}/backend"
    source venv/bin/activate
    python app.py &
    BACKEND_PID=$!

    # Wait a bit for backend to start
    sleep 3

    echo -e "${BLUE}Starting frontend server...${NC}"
    cd "${UI_DIR}/frontend"
    npm start &
    FRONTEND_PID=$!

    echo ""
    echo -e "${GREEN}✓ UI started successfully!${NC}"
    echo ""
    echo -e "${BLUE}Access the application at:${NC}"
    echo -e "  Frontend:  ${GREEN}http://localhost:3000${NC}"
    echo -e "  Backend:   ${GREEN}http://localhost:8000${NC}"
    echo -e "  API Docs:  ${GREEN}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${YELLOW}Process IDs:${NC}"
    echo -e "  Backend:  ${BACKEND_PID}"
    echo -e "  Frontend: ${FRONTEND_PID}"
    echo ""
    echo -e "${RED}Press Ctrl+C to stop all services${NC}"
    echo ""

    # Wait for user to stop
    wait
}

# Main menu
echo -e "${BLUE}Choose how to start the UI:${NC}"
echo ""

if check_podman; then
    echo -e "  ${GREEN}1)${NC} Podman Compose (recommended)"
else
    echo -e "  ${RED}1)${NC} Podman Compose (not available - Podman not installed)"
fi

if check_local_deps; then
    echo -e "  ${GREEN}2)${NC} Local development (Node.js + Python)"
else
    echo -e "  ${RED}2)${NC} Local development (not available - missing Node.js or Python)"
fi

echo -e "  ${YELLOW}3)${NC} Show requirements"
echo -e "  ${RED}4)${NC} Exit"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        if check_podman; then
            start_with_podman
        else
            echo -e "${RED}Error: Podman and Podman Compose are required but not installed.${NC}"
            echo -e "${YELLOW}Please install Podman:${NC}"
            echo -e "  - macOS: ${YELLOW}brew install podman podman-compose${NC}"
            echo -e "  - Linux: Check your distribution's package manager"
            echo -e "  - More info: https://podman.io/getting-started/installation"
            exit 1
        fi
        ;;
    2)
        if check_local_deps; then
            start_locally
        else
            echo -e "${RED}Error: Node.js and Python 3 are required but not installed.${NC}"
            echo -e "${YELLOW}Please install:${NC}"
            echo -e "  - Node.js 18+: https://nodejs.org/"
            echo -e "  - Python 3.9+: https://www.python.org/"
            exit 1
        fi
        ;;
    3)
        echo ""
        echo -e "${BLUE}Requirements:${NC}"
        echo ""
        echo -e "${GREEN}Option 1: Podman (recommended)${NC}"
        echo -e "  - Podman Engine"
        echo -e "  - Podman Compose"
        echo -e "  Installation: ${YELLOW}brew install podman podman-compose${NC}"
        echo ""
        echo -e "${GREEN}Option 2: Local Development${NC}"
        echo -e "  - Node.js 18+"
        echo -e "  - Python 3.9+"
        echo -e "  - Ansible"
        echo -e "  - ROSA CLI"
        echo -e "  - AWS CLI"
        echo ""
        echo -e "${BLUE}Additional Requirements (for all options):${NC}"
        echo -e "  - Ansible installed and configured"
        echo -e "  - ROSA CLI authenticated (${YELLOW}rosa whoami${NC})"
        echo -e "  - AWS CLI configured (${YELLOW}aws configure${NC})"
        echo ""
        ;;
    4)
        echo -e "${YELLOW}Exiting...${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac
