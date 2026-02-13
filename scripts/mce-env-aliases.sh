#!/bin/bash
# Shell aliases for quick MCE environment access
# Add to your ~/.bashrc or ~/.zshrc:
#   source ~/acm_dev/automation-capi/scripts/mce-env-aliases.sh

AUTOMATION_CAPI_DIR="${HOME}/acm_dev/automation-capi"

# Quick environment setup
alias mce-env="${AUTOMATION_CAPI_DIR}/scripts/quick-env-setup.sh"

# Environment selector (history)
alias mce-select="python3 ${AUTOMATION_CAPI_DIR}/scripts/mce_env_manager.py --select"

# List environment history
alias mce-list="python3 ${AUTOMATION_CAPI_DIR}/scripts/mce_env_manager.py --list"

# Environment statistics
alias mce-stats="python3 ${AUTOMATION_CAPI_DIR}/scripts/mce_env_manager.py --stats"

# Search environments
alias mce-search="python3 ${AUTOMATION_CAPI_DIR}/scripts/mce_env_manager.py --search"

# Health check all environments
alias mce-health="${AUTOMATION_CAPI_DIR}/scripts/check-mce-health.sh"

# Quick CAPI check (run after logging in)
alias capi-check='echo "=== CAPI Status ===" && \
  echo "CAPI Deployments:" && oc get deployment -n multicluster-engine | grep capi && \
  echo "" && echo "CAPI CRDs:" && oc get crd | grep cluster.x-k8s.io | wc -l && \
  echo "" && echo "ROSA CRDs:" && oc get crd | grep rosa'

# Quick CAPI logs
alias capi-logs='oc logs -n multicluster-engine deployment/capi-controller-manager --tail=50'

# Check CAPI controller errors
alias capi-errors='oc logs -n multicluster-engine deployment/capi-controller-manager --tail=200 | grep -i "error\|fail" | tail -20'

# Check MCE components
alias mce-components='oc get mce multiclusterengine -o jsonpath="{.spec.overrides.components}" | jq'

# Quick cluster info
alias mce-info='echo "=== MCE Environment ===" && \
  echo "MCE Version:" && oc get mce multiclusterengine -o jsonpath="{.status.currentVersion}" && echo && \
  echo "OCP Version:" && oc version --short && \
  echo "Architecture:" && oc get node -o jsonpath="{.items[0].status.nodeInfo.architecture}"'

echo "MCE Environment aliases loaded!"
echo ""
echo "Available commands:"
echo "  Environment Management:"
echo "    mce-env        - Parse notification and setup new environment"
echo "    mce-select     - Select from saved environments (interactive)"
echo "    mce-list       - List all environment history"
echo "    mce-stats      - Show environment statistics"
echo "    mce-search     - Search environments by keyword"
echo "    mce-health     - Check all environments for known issues"
echo ""
echo "  CAPI Tools (after login):"
echo "    capi-check     - Quick CAPI status check"
echo "    capi-logs      - View CAPI controller logs"
echo "    capi-errors    - Show CAPI controller errors"
echo ""
echo "  Cluster Info:"
echo "    mce-components - Show MCE enabled components"
echo "    mce-info       - Show MCE/OCP version info"
echo ""
