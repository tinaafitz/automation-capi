#!/bin/bash
################################################################################
# Smart ROSA HCP Provisioning Workflow
################################################################################
# This workflow handles all 3 MCE environment states:
#   - Exit 0: Configured and working → Provision cluster
#   - Exit 1: Not configured → Configure, then provision
#   - Exit 2: Configured but broken → Report issue, suggest workarounds
#   - Exit 3: Not logged in → Abort
#
# Usage:
#   ./workflows/smart-provision-workflow.sh my-cluster
#   ./workflows/smart-provision-workflow.sh my-cluster us-east-1
################################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parameters
CLUSTER_PREFIX="${1:-auto-test}"
AWS_REGION="${2:-us-west-2}"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Smart ROSA HCP Provisioning Workflow${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Cluster Prefix: ${GREEN}${CLUSTER_PREFIX}${NC}"
echo -e "  AWS Region:     ${GREEN}${AWS_REGION}${NC}"
echo ""

################################################################################
# Step 1: Check MCE Environment Status
################################################################################
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Checking MCE Environment Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run status check and capture exit code
set +e  # Don't exit on error
./check-mce-status.sh
STATUS_EXIT=$?
set -e  # Re-enable exit on error

echo ""

################################################################################
# Handle Different Exit Codes
################################################################################

# Exit 0: Environment is ready
if [ $STATUS_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Environment is ready!${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 2: Provisioning ROSA HCP Cluster${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    ./run-test-suite.py 20-rosa-hcp-provision \
        -e name_prefix="$CLUSTER_PREFIX" \
        -e aws_region="$AWS_REGION"

    echo ""
    echo -e "${GREEN}✅ Cluster provisioning initiated successfully!${NC}"
    echo ""
    exit 0

# Exit 1: Not configured
elif [ $STATUS_EXIT -eq 1 ]; then
    echo -e "${YELLOW}⚙️  Environment needs configuration${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 2: Configuring MCE Environment${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    read -p "$(echo -e ${YELLOW}Configure MCE environment now? [y/N]: ${NC})" -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./run-test-suite.py 10-configure-mce-environment

        # Check status again
        echo ""
        echo -e "${YELLOW}Re-checking environment status...${NC}"
        echo ""
        ./check-mce-status.sh
        RECHECK_EXIT=$?

        if [ $RECHECK_EXIT -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ Configuration successful!${NC}"
            echo ""
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${BLUE}Step 3: Provisioning ROSA HCP Cluster${NC}"
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""

            ./run-test-suite.py 20-rosa-hcp-provision \
                -e name_prefix="$CLUSTER_PREFIX" \
                -e aws_region="$AWS_REGION"

            echo ""
            echo -e "${GREEN}✅ Cluster provisioning initiated successfully!${NC}"
            echo ""
            exit 0
        else
            echo ""
            echo -e "${RED}❌ Configuration completed but environment still not ready${NC}"
            echo -e "${YELLOW}Review the errors above and try again.${NC}"
            echo ""
            exit 1
        fi
    else
        echo ""
        echo -e "${YELLOW}Skipping configuration. Run manually:${NC}"
        echo -e "  ${BLUE}./run-test-suite.py 10-configure-mce-environment${NC}"
        echo ""
        exit 1
    fi

# Exit 2: Configured but broken
elif [ $STATUS_EXIT -eq 2 ]; then
    echo -e "${RED}❌ Environment is broken${NC}"
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  CANNOT PROVISION - Environment Has Issues${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}The environment is configured but components are not healthy.${NC}"
    echo -e "${YELLOW}This is likely the MCE 2.11.0 placeholder image bug.${NC}"
    echo ""
    echo -e "${YELLOW}Recommended Actions:${NC}"
    echo ""
    echo -e "  ${CYAN}Option 1: Switch to Hypershift (Workaround)${NC}"
    echo -e "    ${BLUE}./run-test-suite.py 41-disable-capi-enable-hypershift${NC}"
    echo -e "    ${BLUE}# Then use Hypershift for cluster provisioning${NC}"
    echo ""
    echo -e "  ${CYAN}Option 2: Update MCE to fixed version${NC}"
    echo -e "    ${BLUE}# Upgrade to MCE 2.11.1 or newer when available${NC}"
    echo ""
    echo -e "  ${CYAN}Option 3: File Bug Report${NC}"
    echo -e "    ${BLUE}# Use the HTML bug report:${NC}"
    echo -e "    ${BLUE}# MCE_2.11.0_CAPI_PLACEHOLDER_IMAGE_BUG.html${NC}"
    echo ""
    exit 2

# Exit 3: Not logged in
elif [ $STATUS_EXIT -eq 3 ]; then
    echo -e "${RED}❌ Not logged in to OpenShift${NC}"
    echo ""
    echo -e "${YELLOW}Action required:${NC} Login with:"
    echo -e "  ${BLUE}oc login <api-url> -u <username> -p <password>${NC}"
    echo ""
    exit 3

# Unknown exit code
else
    echo -e "${RED}❌ Unexpected status check result (exit code: $STATUS_EXIT)${NC}"
    echo ""
    exit 99
fi
