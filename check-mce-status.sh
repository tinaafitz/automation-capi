#!/bin/bash
################################################################################
# MCE Environment Status Checker
################################################################################
# Checks MCE CAPI/CAPA environment status and returns specific exit codes
#
# Exit Codes:
#   0 - Environment is configured AND working (pods running)
#   1 - Environment is NOT configured (deployments don't exist)
#   2 - Environment is configured but BROKEN (pods failing/ImagePullBackOff)
#   3 - Cannot check (not logged in to OpenShift)
################################################################################

set +e  # Don't exit on error - we handle errors ourselves

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MCE_NAMESPACE="${MCE_NAMESPACE:-multicluster-engine}"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}MCE Environment Status Check${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

################################################################################
# Check 1: OCP Login
################################################################################
echo -e "${YELLOW}Checking OpenShift login...${NC}"
OCP_USER=$(oc whoami 2>/dev/null)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Not logged in to OpenShift${NC}"
    echo ""
    echo -e "${YELLOW}Action required:${NC} Login with:"
    echo -e "  oc login <api-url> -u <username> -p <password>"
    echo ""
    exit 3
fi

OCP_SERVER=$(oc whoami --show-server)
echo -e "${GREEN}✅ Logged in as: ${OCP_USER}${NC}"
echo -e "${GREEN}   Server: ${OCP_SERVER}${NC}"
echo ""

################################################################################
# Check 2: CAPI Deployment Exists
################################################################################
echo -e "${YELLOW}Checking CAPI deployment...${NC}"
CAPI_DEPLOY=$(oc get deployment -n $MCE_NAMESPACE -l cluster.x-k8s.io/provider=cluster-api -o name 2>/dev/null)
if [ -z "$CAPI_DEPLOY" ]; then
    echo -e "${YELLOW}⚙️  CAPI deployment not found${NC}"
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Status: ENVIRONMENT NOT CONFIGURED${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}The CAPI controller deployment does not exist.${NC}"
    echo ""
    echo -e "${YELLOW}Action required:${NC} Configure MCE environment with:"
    echo -e "  ${BLUE}./run-test-suite.py 10-configure-mce-environment${NC}"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ CAPI deployment exists${NC}"

################################################################################
# Check 3: CAPA Deployment Exists
################################################################################
echo -e "${YELLOW}Checking CAPA deployment...${NC}"
CAPA_DEPLOY=$(oc get deployment -n $MCE_NAMESPACE -l control-plane=capa-controller-manager -o name 2>/dev/null)
if [ -z "$CAPA_DEPLOY" ]; then
    echo -e "${YELLOW}⚙️  CAPA deployment not found${NC}"
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Status: ENVIRONMENT NOT CONFIGURED${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Action required:${NC} Configure MCE environment with:"
    echo -e "  ${BLUE}./run-test-suite.py 10-configure-mce-environment${NC}"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ CAPA deployment exists${NC}"
echo ""

################################################################################
# Check 4: CAPI Pod Status
################################################################################
echo -e "${YELLOW}Checking CAPI pod status...${NC}"
CAPI_POD=$(oc get pods -n $MCE_NAMESPACE -l cluster.x-k8s.io/provider=cluster-api -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -z "$CAPI_POD" ]; then
    echo -e "${RED}❌ CAPI pod not found${NC}"
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}Status: ENVIRONMENT CONFIGURED BUT BROKEN${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "Deployment exists but no pod created."
    echo ""
    exit 2
fi

CAPI_PHASE=$(oc get pod -n $MCE_NAMESPACE $CAPI_POD -o jsonpath='{.status.phase}')
CAPI_READY=$(oc get pod -n $MCE_NAMESPACE $CAPI_POD -o jsonpath='{.status.containerStatuses[0].ready}')
CAPI_REASON=$(oc get pod -n $MCE_NAMESPACE $CAPI_POD -o jsonpath='{.status.containerStatuses[0].state.waiting.reason}' 2>/dev/null)

echo -e "   Pod: ${CAPI_POD}"
echo -e "   Phase: ${CAPI_PHASE}"
echo -e "   Ready: ${CAPI_READY}"

if [ "$CAPI_PHASE" != "Running" ] || [ "$CAPI_READY" != "true" ]; then
    if [ -n "$CAPI_REASON" ]; then
        echo -e "   ${RED}Reason: ${CAPI_REASON}${NC}"
    fi

    CAPI_IMAGE=$(oc get pod -n $MCE_NAMESPACE $CAPI_POD -o jsonpath='{.spec.containers[0].image}')
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}Status: ENVIRONMENT CONFIGURED BUT BROKEN${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${RED}CAPI controller pod is not healthy!${NC}"
    echo ""
    echo -e "Pod:    ${CAPI_POD}"
    echo -e "Phase:  ${CAPI_PHASE}"
    echo -e "Ready:  ${CAPI_READY}"
    echo -e "Reason: ${CAPI_REASON}"
    echo -e "Image:  ${CAPI_IMAGE}"
    echo ""

    if [[ "$CAPI_REASON" == "ImagePullBackOff" ]] || [[ "$CAPI_REASON" == "ErrImagePull" ]]; then
        echo -e "${YELLOW}Diagnosis: MCE placeholder image bug detected${NC}"
        echo ""
        if [[ "$CAPI_IMAGE" == *"sha256:0000000000000000"* ]]; then
            echo -e "${RED}✗ Confirmed: Image has placeholder SHA256 (all zeros)${NC}"
            echo -e "  ${CAPI_IMAGE}"
        fi
        echo ""
        echo -e "${YELLOW}This is a known bug in MCE 2.11.0 builds.${NC}"
        echo ""
        echo -e "${YELLOW}Workarounds:${NC}"
        echo -e "  1. Switch to Hypershift:"
        echo -e "     ${BLUE}./run-test-suite.py 41-disable-capi-enable-hypershift${NC}"
        echo ""
        echo -e "  2. Wait for MCE 2.11.1 fix or use different MCE version"
    fi
    echo ""
    echo -e "${YELLOW}For more details:${NC}"
    echo -e "  oc describe pod -n $MCE_NAMESPACE $CAPI_POD"
    echo -e "  oc logs -n $MCE_NAMESPACE $CAPI_POD"
    echo ""
    exit 2
fi

echo -e "${GREEN}✅ CAPI pod is Running and Ready${NC}"
echo ""

################################################################################
# Check 5: CAPA Pod Status
################################################################################
echo -e "${YELLOW}Checking CAPA pod status...${NC}"
CAPA_POD=$(oc get pods -n $MCE_NAMESPACE -l control-plane=capa-controller-manager -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -z "$CAPA_POD" ]; then
    echo -e "${RED}❌ CAPA pod not found${NC}"
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}Status: ENVIRONMENT CONFIGURED BUT BROKEN${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo ""
    exit 2
fi

CAPA_PHASE=$(oc get pod -n $MCE_NAMESPACE $CAPA_POD -o jsonpath='{.status.phase}')
CAPA_READY=$(oc get pod -n $MCE_NAMESPACE $CAPA_POD -o jsonpath='{.status.containerStatuses[0].ready}')

echo -e "   Pod: ${CAPA_POD}"
echo -e "   Phase: ${CAPA_PHASE}"
echo -e "   Ready: ${CAPA_READY}"

if [ "$CAPA_PHASE" != "Running" ] || [ "$CAPA_READY" != "true" ]; then
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}Status: ENVIRONMENT CONFIGURED BUT BROKEN${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${RED}CAPA controller pod is not healthy!${NC}"
    echo ""
    exit 2
fi

echo -e "${GREEN}✅ CAPA pod is Running and Ready${NC}"
echo ""

################################################################################
# Success!
################################################################################
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Status: ENVIRONMENT CONFIGURED AND WORKING${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}All checks passed:${NC}"
echo -e "  ✅ Logged in to OpenShift"
echo -e "  ✅ CAPI deployment exists"
echo -e "  ✅ CAPA deployment exists"
echo -e "  ✅ CAPI pod running and ready"
echo -e "  ✅ CAPA pod running and ready"
echo ""
echo -e "${GREEN}🎉 Environment is ready for ROSA HCP cluster provisioning!${NC}"
echo ""

exit 0
