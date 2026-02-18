#!/bin/bash

# ROSA Automation UI Startup Script
# Starts both FastAPI backend and React frontend

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Starting ROSA Automation UI${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if backend venv exists
if [ ! -d "$SCRIPT_DIR/ui/backend/venv" ]; then
    echo -e "${YELLOW}Warning: Backend venv not found at $SCRIPT_DIR/ui/backend/venv${NC}"
    echo "Please create the virtual environment first:"
    echo "  cd ui/backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Check if frontend node_modules exists
if [ ! -d "$SCRIPT_DIR/ui/frontend/node_modules" ]; then
    echo -e "${YELLOW}Warning: Frontend node_modules not found${NC}"
    echo "Please install dependencies first:"
    echo "  cd ui/frontend && npm install"
    exit 1
fi

# Start backend
echo -e "${GREEN}Starting FastAPI backend on port 8000...${NC}"
cd "$SCRIPT_DIR/ui/backend"
source venv/bin/activate
export AUTOMATION_PATH="$SCRIPT_DIR"
uvicorn app:app --reload --port 8000 > /tmp/rosa-backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "${GREEN}Starting React frontend on port 3000...${NC}"
cd "$SCRIPT_DIR/ui/frontend"
npm start > /tmp/rosa-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Save PIDs to file for easy shutdown
echo "$BACKEND_PID" > /tmp/rosa-ui-backend.pid
echo "$FRONTEND_PID" > /tmp/rosa-ui-frontend.pid

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}UI Services Started Successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "Backend:  ${GREEN}http://localhost:8000${NC}"
echo ""
echo -e "Backend PID:  $BACKEND_PID (log: /tmp/rosa-backend.log)"
echo -e "Frontend PID: $FRONTEND_PID (log: /tmp/rosa-frontend.log)"
echo ""
echo -e "${YELLOW}To stop the services, run: ./stop-ui.sh${NC}"
echo ""
