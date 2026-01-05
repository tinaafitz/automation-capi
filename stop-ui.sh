#!/bin/bash

# ROSA Automation UI Shutdown Script
# Stops both FastAPI backend and React frontend

# Colors for output
RED='\033[0;31m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Stopping ROSA Automation UI${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to stop a service
stop_service() {
    local SERVICE_NAME=$1
    local PID_FILE=$2
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${RED}Stopping $SERVICE_NAME (PID: $PID)...${NC}"
            kill $PID
            sleep 1
            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                echo -e "${RED}Force killing $SERVICE_NAME...${NC}"
                kill -9 $PID
            fi
            echo -e "${GREEN}$SERVICE_NAME stopped${NC}"
        else
            echo -e "${BLUE}$SERVICE_NAME is not running${NC}"
        fi
        rm -f "$PID_FILE"
    else
        echo -e "${BLUE}No PID file found for $SERVICE_NAME${NC}"
    fi
}

# Stop backend
stop_service "Backend" "/tmp/rosa-ui-backend.pid"

# Stop frontend
stop_service "Frontend" "/tmp/rosa-ui-frontend.pid"

# Also kill any remaining node/uvicorn processes running on these ports
echo ""
echo -e "${BLUE}Cleaning up any remaining processes on ports 3000 and 8000...${NC}"

# Kill processes on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill processes on port 8000 (backend)
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

echo ""
echo -e "${GREEN}All UI services stopped${NC}"
echo ""
