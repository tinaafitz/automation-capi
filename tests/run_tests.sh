#!/usr/bin/env bash

# CAPI Helm Chart Test Runner
# Executes the Ansible + Go hybrid test framework

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$SCRIPT_DIR/results"

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║     CAPI/CAPA Helm Chart Test Framework - Test Runner        ║"
    echo "║              Ansible + Go Hybrid Implementation               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -e, --env ENV           Specify environment type (auto-detect if not provided)"
    echo "  -k, --kubeconfig PATH   Path to kubeconfig file (default: ~/.kube/config)"
    echo "  -c, --clean             Clean results directory before running"
    echo "  -v, --verbose           Enable verbose output"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Auto-detect environment and run tests"
    echo "  $0 --env minikube                     # Run tests for Minikube environment"
    echo "  $0 --clean --verbose                  # Clean and run with verbose output"
    echo ""
}

# Parse command line arguments
CLEAN=false
VERBOSE=false
ENV_TYPE=""
KUBECONFIG_PATH="$HOME/.kube/config"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -e|--env)
            ENV_TYPE="$2"
            shift 2
            ;;
        -k|--kubeconfig)
            KUBECONFIG_PATH="$2"
            shift 2
            ;;
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_banner

    # Clean results directory if requested
    if [ "$CLEAN" = true ]; then
        echo -e "${YELLOW}🧹 Cleaning results directory...${NC}"
        rm -rf "$RESULTS_DIR"
        mkdir -p "$RESULTS_DIR"
    fi

    # Ensure results directory exists
    mkdir -p "$RESULTS_DIR"

    # Check prerequisites
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}❌ kubectl not found. Please install kubectl.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ kubectl found${NC}"

    # Check if ansible-playbook is available
    if ! command -v ansible-playbook &> /dev/null; then
        echo -e "${RED}❌ ansible-playbook not found. Please install Ansible.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ ansible-playbook found${NC}"

    # Check if Go is available
    if ! command -v go &> /dev/null; then
        echo -e "${RED}❌ Go not found. Please install Go 1.21 or later.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Go found ($(go version))${NC}"

    # Check kubeconfig
    if [ ! -f "$KUBECONFIG_PATH" ]; then
        echo -e "${RED}❌ Kubeconfig not found at $KUBECONFIG_PATH${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Kubeconfig found at $KUBECONFIG_PATH${NC}"

    # Test cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Cluster connectivity verified${NC}"

    echo ""
    echo -e "${BLUE}🚀 Starting test execution...${NC}"
    echo ""

    # Set environment variable for kubeconfig
    export KUBECONFIG="$KUBECONFIG_PATH"

    # Run Ansible test playbook
    if [ "$VERBOSE" = true ]; then
        ansible-playbook -v "$SCRIPT_DIR/ansible/test_capi_installation.yml"
    else
        ansible-playbook "$SCRIPT_DIR/ansible/test_capi_installation.yml"
    fi

    TEST_EXIT_CODE=$?

    echo ""
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║               ✅  TEST SUITE PASSED  ✅                        ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        echo -e "${BLUE}📊 Results saved to: $RESULTS_DIR${NC}"
        echo ""

        # Display summary if validation results exist
        if [ -f "$RESULTS_DIR/validation-results.json" ]; then
            echo -e "${BLUE}📋 Test Summary:${NC}"
            cat "$RESULTS_DIR/validation-results.json" | jq -r '
                "  Environment:   \(.environment)",
                "  Test Suite:    \(.test_suite)",
                "  Total Tests:   \(.total_tests)",
                "  Passed:        \(.passed_tests)",
                "  Failed:        \(.failed_tests)",
                "  Duration:      \(.duration)",
                "  Status:        \(.status)"
            ' 2>/dev/null || echo "  (Summary not available - jq not installed)"
            echo ""
        fi

        exit 0
    else
        echo -e "${RED}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║               ❌  TEST SUITE FAILED  ❌                        ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        echo -e "${YELLOW}📊 Check results in: $RESULTS_DIR${NC}"
        echo ""
        exit 1
    fi
}

# Run main function
main
