#!/bin/bash
################################################################################
# Automated ROSA HCP Provisioning Workflow
################################################################################
# This workflow automatically:
#   1. Checks if MCE environment is configured
#   2. If not configured → Configures it automatically
#   3. If configured and working → Provisions cluster
#   4. If broken → Aborts with error
#
# Usage:
#   ./auto-provision-rosa.sh my-cluster
#   ./auto-provision-rosa.sh my-cluster us-east-1
#
# Exit Codes:
#   0 - Success (cluster provisioning initiated)
#   1 - Configuration failed
#   2 - Environment broken (MCE bug)
#   3 - Not logged in
#   4 - Provisioning failed
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
CLUSTER_PREFIX="${1}"
AWS_REGION="${2:-us-west-2}"

if [ -z "$CLUSTER_PREFIX" ]; then
    echo -e "${RED}Error: Cluster prefix required${NC}"
    echo ""
    echo "Usage: $0 <cluster-prefix> [aws-region]"
    echo ""
    echo "Example:"
    echo "  $0 my-test-cluster"
    echo "  $0 prod-cluster us-east-1"
    echo ""
    exit 1
fi

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Automated ROSA HCP Provisioning Workflow            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Cluster Prefix: ${GREEN}${CLUSTER_PREFIX}${NC}"
echo -e "  AWS Region:     ${GREEN}${AWS_REGION}${NC}"
echo ""

################################################################################
# Step 1: Check MCE Environment Status
################################################################################
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1/3: Checking MCE Environment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run status check and capture exit code
set +e  # Don't exit on error
./check-mce-status.sh
STATUS_EXIT=$?
set -e  # Re-enable exit on error

echo ""

################################################################################
# Handle Environment Status
################################################################################

# Exit 0: Environment ready - proceed to provisioning
if [ $STATUS_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Environment is configured and working${NC}"
    echo ""

# Exit 1: Not configured - auto-configure then provision
elif [ $STATUS_EXIT -eq 1 ]; then
    echo -e "${YELLOW}⚙️  Environment not configured - configuring automatically...${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 2/3: Configuring MCE Environment${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    ./run-test-suite.py 10-configure-mce-environment
    CONFIG_EXIT=$?

    if [ $CONFIG_EXIT -ne 0 ]; then
        echo ""
        echo -e "${RED}❌ MCE configuration failed${NC}"
        echo ""
        exit 1
    fi

    echo ""
    echo -e "${GREEN}✅ Configuration successful${NC}"
    echo ""

    # Verify configuration worked
    echo -e "${YELLOW}Verifying configuration...${NC}"
    echo ""
    set +e
    ./check-mce-status.sh
    VERIFY_EXIT=$?
    set -e

    if [ $VERIFY_EXIT -ne 0 ]; then
        echo ""
        echo -e "${RED}❌ Environment still not ready after configuration${NC}"
        echo -e "${YELLOW}This may indicate the MCE 2.11.0 placeholder image bug.${NC}"
        echo ""
        exit 2
    fi

    echo ""
    echo -e "${GREEN}✅ Verification passed${NC}"
    echo ""

# Exit 2: Configured but broken - cannot proceed
elif [ $STATUS_EXIT -eq 2 ]; then
    echo -e "${RED}❌ Environment is broken - cannot provision clusters${NC}"
    echo ""
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  MCE 2.11.0 Placeholder Image Bug Detected           ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}The CAPI controller cannot start due to an invalid image.${NC}"
    echo -e "${YELLOW}This is a known bug in MCE 2.11.0 builds.${NC}"
    echo ""
    echo -e "${YELLOW}Workaround: Switch to Hypershift mode${NC}"
    echo -e "  ${BLUE}./run-test-suite.py 41-disable-capi-enable-hypershift${NC}"
    echo ""
    exit 2

# Exit 3: Not logged in
elif [ $STATUS_EXIT -eq 3 ]; then
    echo -e "${RED}❌ Not logged in to OpenShift${NC}"
    echo ""
    echo -e "${YELLOW}Login required:${NC}"
    echo -e "  ${BLUE}oc login <api-url> -u <username> -p <password>${NC}"
    echo ""
    exit 3

# Unknown exit code
else
    echo -e "${RED}❌ Unexpected status (exit code: $STATUS_EXIT)${NC}"
    echo ""
    exit 99
fi

################################################################################
# Step 3: Provision ROSA HCP Cluster
################################################################################
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3/3: Provisioning ROSA HCP Cluster${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

./run-test-suite.py 20-rosa-hcp-provision \
    -e name_prefix="$CLUSTER_PREFIX" \
    -e aws_region="$AWS_REGION"

PROVISION_EXIT=$?

if [ $PROVISION_EXIT -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Cluster provisioning failed${NC}"
    echo ""
    exit 4
fi

################################################################################
# Success!
################################################################################
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅  SUCCESS - Cluster Provisioning Initiated         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Cluster Name:   ${GREEN}${CLUSTER_PREFIX}-rosa-hcp${NC}"
echo -e "  AWS Region:     ${GREEN}${AWS_REGION}${NC}"
echo -e "  Namespace:      ${GREEN}ns-${CLUSTER_PREFIX}${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo ""
echo -e "  ${YELLOW}1. Monitor provisioning:${NC}"
echo -e "     ${BLUE}oc get rosacontrolplane,rosamachinepool -n ns-${CLUSTER_PREFIX} -w${NC}"
echo ""
echo -e "  ${YELLOW}2. Check ROSA cluster status:${NC}"
echo -e "     ${BLUE}rosa describe cluster -c ${CLUSTER_PREFIX}-rosa-hcp${NC}"
echo ""
echo -e "  ${YELLOW}3. When finished, delete cluster:${NC}"
echo -e "     ${BLUE}./run-test-suite.py 30-rosa-hcp-delete -e name_prefix=${CLUSTER_PREFIX}${NC}"
echo ""

exit 0
