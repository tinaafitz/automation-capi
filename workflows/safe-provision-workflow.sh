#!/bin/bash
################################################################################
# Safe ROSA HCP Provisioning Workflow
################################################################################
# This script demonstrates using test suite exit codes to control workflow
# execution. It will ONLY provision a cluster if environment verification passes.
#
# Usage:
#   ./workflows/safe-provision-workflow.sh test-cluster
#   ./workflows/safe-provision-workflow.sh prod-cluster us-east-1
#
# Exit Codes:
#   0 - Success (cluster provisioned)
#   1 - Environment verification failed (cluster not provisioned)
#   2 - Provisioning failed
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parameters
CLUSTER_PREFIX="${1:-auto-test}"
AWS_REGION="${2:-us-west-2}"
STRICT_MODE="${3:-true}"  # Set to 'false' to use basic validation

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Safe ROSA HCP Provisioning Workflow${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Cluster Prefix: ${GREEN}${CLUSTER_PREFIX}${NC}"
echo -e "AWS Region:     ${GREEN}${AWS_REGION}${NC}"
echo -e "Strict Mode:    ${GREEN}${STRICT_MODE}${NC}"
echo ""

################################################################################
# Step 1: Environment Verification
################################################################################
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Verifying MCE Environment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$STRICT_MODE" = "true" ]; then
    echo -e "${YELLOW}Running STRICT verification (checks pod health)...${NC}"
    VERIFY_SUITE="06-verify-mce-environment-strict"
else
    echo -e "${YELLOW}Running BASIC verification (checks deployment existence)...${NC}"
    VERIFY_SUITE="05-verify-mce-environment"
fi

./run-test-suite.py "$VERIFY_SUITE"
VERIFY_EXIT=$?

if [ $VERIFY_EXIT -ne 0 ]; then
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}❌ ENVIRONMENT VERIFICATION FAILED${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${RED}Environment is not ready for cluster provisioning.${NC}"
    echo ""
    echo -e "${YELLOW}Common Issues:${NC}"
    echo -e "  • CAPI controller in ImagePullBackOff (MCE 2.11.0 bug)"
    echo -e "  • CAPA controller not deployed"
    echo -e "  • Missing credentials or configuration"
    echo ""
    echo -e "${YELLOW}Suggested Actions:${NC}"
    echo -e "  1. Check pod status:"
    echo -e "     ${BLUE}oc get pods -n multicluster-engine | grep -E '(capi|capa)'${NC}"
    echo ""
    echo -e "  2. Check for MCE 2.11.0 placeholder image bug:"
    echo -e "     ${BLUE}oc describe pod -n multicluster-engine <capi-pod-name> | grep Image${NC}"
    echo ""
    echo -e "  3. Run configuration:"
    echo -e "     ${BLUE}./run-test-suite.py 10-configure-mce-environment${NC}"
    echo ""
    echo -e "  4. Switch to Hypershift (workaround):"
    echo -e "     ${BLUE}./run-test-suite.py 41-disable-capi-enable-hypershift${NC}"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Environment verification passed!${NC}"
echo ""

################################################################################
# Step 2: Cluster Provisioning
################################################################################
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Provisioning ROSA HCP Cluster${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Provisioning cluster with prefix: ${CLUSTER_PREFIX}${NC}"
echo ""

./run-test-suite.py 20-rosa-hcp-provision \
    -e name_prefix="$CLUSTER_PREFIX" \
    -e aws_region="$AWS_REGION"

PROVISION_EXIT=$?

if [ $PROVISION_EXIT -ne 0 ]; then
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}❌ CLUSTER PROVISIONING FAILED${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Check the test results for details.${NC}"
    echo ""
    exit 2
fi

################################################################################
# Success!
################################################################################
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SUCCESS! CLUSTER PROVISIONED${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Cluster Name:   ${GREEN}${CLUSTER_PREFIX}-rosa-hcp${NC}"
echo -e "AWS Region:     ${GREEN}${AWS_REGION}${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Check cluster status:"
echo -e "     ${BLUE}oc get rosacontrolplane,rosamachinepool -n ns-${CLUSTER_PREFIX}${NC}"
echo ""
echo -e "  2. Monitor provisioning:"
echo -e "     ${BLUE}rosa describe cluster -c ${CLUSTER_PREFIX}-rosa-hcp${NC}"
echo ""
echo -e "  3. When done, delete cluster:"
echo -e "     ${BLUE}./run-test-suite.py 30-rosa-hcp-delete -e name_prefix=${CLUSTER_PREFIX}${NC}"
echo ""

exit 0
