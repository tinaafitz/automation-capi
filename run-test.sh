#!/bin/bash
#
# ROSA HCP Test Runner - Bash Wrapper
# ====================================
#
# Simple wrapper script for common test operations.
# For advanced usage, use run-test-suite.py directly.
#
# Usage:
#   ./run-test.sh list               - List all test suites
#   ./run-test.sh basic              - Run basic cluster creation
#   ./run-test.sh configure          - Configure MCE environment
#   ./run-test.sh lifecycle          - Run full lifecycle test
#   ./run-test.sh all                - Run all test suites
#   ./run-test.sh TAG                - Run tests with specific tag
#
# Author: Tina Fitzgerald
# Created: January 22, 2026

set -e  # Exit on error

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;91m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_RUNNER="${SCRIPT_DIR}/run-test-suite.py"

# Check if test runner exists
if [ ! -f "$TEST_RUNNER" ]; then
    echo -e "${RED}Error: Test runner not found at $TEST_RUNNER${NC}"
    exit 1
fi

# Make sure it's executable
chmod +x "$TEST_RUNNER"

# Parse command
COMMAND="${1:-help}"

case "$COMMAND" in
    list|--list|-l)
        echo -e "${CYAN}Listing available test suites...${NC}\n"
        "$TEST_RUNNER" --list
        ;;

    basic|cluster|create)
        echo -e "${CYAN}Running basic ROSA HCP cluster creation test...${NC}\n"
        "$TEST_RUNNER" 02-basic-rosa-hcp-cluster-creation
        ;;

    configure|config|setup|env)
        echo -e "${CYAN}Running MCE environment configuration...${NC}\n"
        "$TEST_RUNNER" 10-configure-mce-environment
        ;;

    lifecycle|full)
        echo -e "${CYAN}Running full ROSA HCP lifecycle test...${NC}\n"
        "$TEST_RUNNER" 23-rosa-hcp-full-lifecycle
        ;;

    provision)
        echo -e "${CYAN}Running ROSA HCP provision test...${NC}\n"
        "$TEST_RUNNER" 20-rosa-hcp-provision
        ;;

    all|--all)
        echo -e "${CYAN}Running all test suites...${NC}\n"
        "$TEST_RUNNER" --all
        ;;

    rosa|rosa-hcp)
        echo -e "${CYAN}Running all ROSA HCP tests (tag filter)...${NC}\n"
        "$TEST_RUNNER" --tag rosa-hcp
        ;;

    clean)
        echo -e "${YELLOW}Cleaning test results...${NC}"
        rm -rf "${SCRIPT_DIR}/test-results"/*
        echo -e "${GREEN}Test results cleaned${NC}"
        ;;

    report|reports)
        LATEST_HTML="${SCRIPT_DIR}/test-results/latest.html"
        if [ -f "$LATEST_HTML" ]; then
            echo -e "${CYAN}Opening latest test report...${NC}"
            if command -v open &> /dev/null; then
                open "$LATEST_HTML"
            elif command -v xdg-open &> /dev/null; then
                xdg-open "$LATEST_HTML"
            else
                echo -e "${YELLOW}Could not open browser. Report at: $LATEST_HTML${NC}"
            fi
        else
            echo -e "${YELLOW}No test reports found. Run a test first.${NC}"
        fi
        ;;

    help|--help|-h|"")
        cat << HELP

${CYAN}ROSA HCP Test Runner - Quick Commands${NC}

${GREEN}Usage:${NC}
  ./run-test.sh [command]

${GREEN}Commands:${NC}
  list               List all available test suites
  basic              Run basic ROSA HCP cluster creation test
  configure          Configure MCE environment
  lifecycle          Run full lifecycle test
  provision          Run provision test
  all                Run all test suites
  rosa               Run all ROSA HCP tests (tag: rosa-hcp)
  clean              Clean test results directory
  report             Open latest HTML test report
  help               Show this help message

${YELLOW}Examples:${NC}
  ./run-test.sh list              # See what tests are available
  ./run-test.sh basic             # Quick cluster creation test
  ./run-test.sh all               # Run everything

${YELLOW}Advanced Usage:${NC}
  For more options, use the Python runner directly:
    ./run-test-suite.py --help

HELP
        ;;

    *)
        # Try to run as suite ID
        if [ -f "${SCRIPT_DIR}/test-suites/${COMMAND}.json" ]; then
            echo -e "${CYAN}Running test suite: $COMMAND${NC}\n"
            "$TEST_RUNNER" "$COMMAND"
        else
            echo -e "${RED}Unknown command or test suite: $COMMAND${NC}"
            echo -e "Run './run-test.sh help' for usage information"
            exit 1
        fi
        ;;
esac
