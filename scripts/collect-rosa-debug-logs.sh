#!/bin/bash

################################################################################
# ROSA Cluster Debug Log Collection Script
#
# Collects comprehensive logs when there's an issue with ROSA cluster
# provisioning or deletion
#
# Usage: ./collect-rosa-debug-logs.sh <cluster-name> [namespace]
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CLUSTER_NAME="${1:-}"
NAMESPACE="${2:-ns-rosa-hcp}"
TIMESTAMP=$(date '+%Y-%m-%d-%H-%M-%S')
OUTPUT_DIR="rosa-debug-logs-${CLUSTER_NAME}-${TIMESTAMP}"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ -z "$CLUSTER_NAME" ]; then
        log_error "Cluster name is required!"
        echo "Usage: $0 <cluster-name> [namespace]"
        exit 1
    fi

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Create output directory
setup_output_dir() {
    log_info "Creating output directory: $OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR"
    cd "$OUTPUT_DIR"
    log_success "Output directory created"
}

# Collect cluster resource YAMLs
collect_cluster_resources() {
    log_info "Collecting cluster resource YAMLs..."

    # Cluster
    kubectl get cluster.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o yaml > cluster.yaml 2>&1 || echo "Cluster not found" > cluster.yaml

    # ROSACluster
    kubectl get rosacluster.infrastructure.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o yaml > rosacluster.yaml 2>&1 || echo "ROSACluster not found" > rosacluster.yaml

    # ROSAControlPlane
    kubectl get rosacontrolplane.controlplane.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o yaml > rosacontrolplane.yaml 2>&1 || echo "ROSAControlPlane not found" > rosacontrolplane.yaml

    # MachinePool
    kubectl get machinepool.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o yaml > machinepool.yaml 2>&1 || echo "MachinePool not found" > machinepool.yaml

    # ROSAMachinePool
    kubectl get rosamachinepool.infrastructure.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o yaml > rosamachinepool.yaml 2>&1 || echo "ROSAMachinePool not found" > rosamachinepool.yaml

    # ROSANetwork
    kubectl get rosanetwork.infrastructure.cluster.x-k8s.io "${CLUSTER_NAME}-network" -n "$NAMESPACE" -o yaml > rosanetwork.yaml 2>&1 || echo "ROSANetwork not found" > rosanetwork.yaml

    # ROSARoleConfig
    kubectl get rosaroleconfig.infrastructure.cluster.x-k8s.io "${CLUSTER_NAME}-roles" -n "$NAMESPACE" -o yaml > rosaroleconfig.yaml 2>&1 || echo "ROSARoleConfig not found" > rosaroleconfig.yaml

    # ManagedCluster
    kubectl get managedcluster "$CLUSTER_NAME" -o yaml > managedcluster.yaml 2>&1 || echo "ManagedCluster not found" > managedcluster.yaml

    log_success "Cluster resource YAMLs collected"
}

# Collect resource status summaries
collect_status_summaries() {
    log_info "Collecting resource status summaries..."

    cat > status-summary.txt <<EOF
================================================================================
ROSA Cluster Status Summary
================================================================================
Cluster Name: $CLUSTER_NAME
Namespace: $NAMESPACE
Collection Time: $(date)
================================================================================

=== Cluster Phase ===
EOF
    kubectl get cluster.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.status.phase}' >> status-summary.txt 2>&1 || echo "N/A" >> status-summary.txt

    cat >> status-summary.txt <<EOF


=== ROSAControlPlane Ready ===
EOF
    kubectl get rosacontrolplane.controlplane.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.status.ready}' >> status-summary.txt 2>&1 || echo "N/A" >> status-summary.txt

    cat >> status-summary.txt <<EOF


=== ROSAControlPlane Conditions ===
EOF
    kubectl get rosacontrolplane.controlplane.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.status.conditions}' >> status-summary.txt 2>&1 || echo "N/A" >> status-summary.txt

    cat >> status-summary.txt <<EOF


=== ROSANetwork Status ===
EOF
    kubectl get rosanetwork.infrastructure.cluster.x-k8s.io "${CLUSTER_NAME}-network" -n "$NAMESPACE" -o jsonpath='{.status}' >> status-summary.txt 2>&1 || echo "N/A" >> status-summary.txt

    cat >> status-summary.txt <<EOF


=== ROSARoleConfig Status ===
EOF
    kubectl get rosaroleconfig.infrastructure.cluster.x-k8s.io "${CLUSTER_NAME}-roles" -n "$NAMESPACE" -o jsonpath='{.status}' >> status-summary.txt 2>&1 || echo "N/A" >> status-summary.txt

    cat >> status-summary.txt <<EOF


=== MachinePool Status ===
EOF
    kubectl get machinepool.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.status}' >> status-summary.txt 2>&1 || echo "N/A" >> status-summary.txt

    cat >> status-summary.txt <<EOF


=== ROSA Cluster External ID ===
EOF
    kubectl get rosacontrolplane.controlplane.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.status.externalID}' >> status-summary.txt 2>&1 || echo "N/A" >> status-summary.txt

    cat >> status-summary.txt <<EOF


=== CloudFormation Stack Status ===
EOF
    kubectl get rosanetwork.infrastructure.cluster.x-k8s.io "${CLUSTER_NAME}-network" -n "$NAMESPACE" -o jsonpath='{.status.stackStatus}' >> status-summary.txt 2>&1 || echo "N/A" >> status-summary.txt

    echo -e "\n\n================================================================================\n" >> status-summary.txt

    log_success "Status summaries collected"
}

# Collect controller logs
collect_controller_logs() {
    log_info "Collecting controller logs..."

    mkdir -p logs

    # CAPA Controller logs
    log_info "  - CAPA controller logs..."
    kubectl logs -n multicluster-engine deployment/capa-controller-manager --tail=500 > logs/capa-controller.log 2>&1 || echo "CAPA controller logs not available" > logs/capa-controller.log

    # CAPI Controller logs
    log_info "  - CAPI controller logs..."
    kubectl logs -n multicluster-engine deployment/cluster-api-controller-manager --tail=500 > logs/capi-controller.log 2>&1 || echo "CAPI controller logs not available" > logs/capi-controller.log

    # CAPI ROSA Controller logs
    log_info "  - CAPI ROSA controller logs..."
    kubectl logs -n multicluster-engine deployment/rosa-controlplane-capi-controller-manager --tail=500 > logs/rosa-capi-controller.log 2>&1 || echo "ROSA CAPI controller logs not available" > logs/rosa-capi-controller.log

    # MCE Operator logs
    log_info "  - MCE operator logs..."
    kubectl logs -n multicluster-engine deployment/multicluster-engine-operator --tail=500 > logs/mce-operator.log 2>&1 || echo "MCE operator logs not available" > logs/mce-operator.log

    log_success "Controller logs collected"
}

# Collect events
collect_events() {
    log_info "Collecting events..."

    # Namespace events
    kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' > events-namespace.txt 2>&1 || echo "Events not available" > events-namespace.txt

    # Cluster-specific events
    kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$CLUSTER_NAME" --sort-by='.lastTimestamp' > events-cluster.txt 2>&1 || echo "Cluster events not available" > events-cluster.txt

    log_success "Events collected"
}

# Check for stuck finalizers
check_finalizers() {
    log_info "Checking for stuck finalizers..."

    cat > finalizers-check.txt <<EOF
================================================================================
Finalizer Status Check
================================================================================
Collection Time: $(date)
================================================================================

=== Cluster Finalizers ===
EOF
    kubectl get cluster.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.finalizers}' >> finalizers-check.txt 2>&1 || echo "N/A" >> finalizers-check.txt

    cat >> finalizers-check.txt <<EOF


=== Cluster DeletionTimestamp ===
EOF
    kubectl get cluster.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.deletionTimestamp}' >> finalizers-check.txt 2>&1 || echo "N/A" >> finalizers-check.txt

    cat >> finalizers-check.txt <<EOF


=== ROSAControlPlane Finalizers ===
EOF
    kubectl get rosacontrolplane.controlplane.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.finalizers}' >> finalizers-check.txt 2>&1 || echo "N/A" >> finalizers-check.txt

    cat >> finalizers-check.txt <<EOF


=== ROSAControlPlane DeletionTimestamp ===
EOF
    kubectl get rosacontrolplane.controlplane.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.deletionTimestamp}' >> finalizers-check.txt 2>&1 || echo "N/A" >> finalizers-check.txt

    cat >> finalizers-check.txt <<EOF


=== MachinePool Finalizers ===
EOF
    kubectl get machinepool.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.finalizers}' >> finalizers-check.txt 2>&1 || echo "N/A" >> finalizers-check.txt

    cat >> finalizers-check.txt <<EOF


=== MachinePool DeletionTimestamp ===
EOF
    kubectl get machinepool.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.deletionTimestamp}' >> finalizers-check.txt 2>&1 || echo "N/A" >> finalizers-check.txt

    echo -e "\n\n================================================================================\n" >> finalizers-check.txt

    log_success "Finalizer check completed"
}

# Check RBAC permissions
check_rbac() {
    log_info "Checking RBAC permissions..."

    cat > rbac-check.txt <<EOF
================================================================================
RBAC Permissions Check
================================================================================
Collection Time: $(date)
================================================================================

=== CAPA Controller Service Account ===
EOF
    kubectl get serviceaccount capa-controller-manager -n multicluster-engine -o yaml >> rbac-check.txt 2>&1 || echo "N/A" >> rbac-check.txt

    cat >> rbac-check.txt <<EOF


=== Can CAPA Controller Delete MachinePools? ===
EOF
    kubectl auth can-i delete machinepools.cluster.x-k8s.io -n "$NAMESPACE" --as=system:serviceaccount:multicluster-engine:capa-controller-manager >> rbac-check.txt 2>&1 || echo "N/A" >> rbac-check.txt

    cat >> rbac-check.txt <<EOF


=== Can CAPA Controller Delete ROSAMachinePools? ===
EOF
    kubectl auth can-i delete rosamachinepools.infrastructure.cluster.x-k8s.io -n "$NAMESPACE" --as=system:serviceaccount:multicluster-engine:capa-controller-manager >> rbac-check.txt 2>&1 || echo "N/A" >> rbac-check.txt

    echo -e "\n\n================================================================================\n" >> rbac-check.txt

    log_success "RBAC check completed"
}

# Collect AWS resource info (if rosa CLI available)
collect_aws_info() {
    if command -v rosa &> /dev/null; then
        log_info "Collecting AWS/ROSA information..."

        # Get ROSA cluster external ID
        EXTERNAL_ID=$(kubectl get rosacontrolplane.controlplane.cluster.x-k8s.io "$CLUSTER_NAME" -n "$NAMESPACE" -o jsonpath='{.status.externalID}' 2>/dev/null || echo "")

        if [ -n "$EXTERNAL_ID" ]; then
            log_info "  - ROSA cluster details..."
            rosa describe cluster --cluster="$EXTERNAL_ID" > rosa-cluster-details.txt 2>&1 || echo "ROSA cluster not found" > rosa-cluster-details.txt

            log_info "  - ROSA cluster logs..."
            rosa logs install --cluster="$EXTERNAL_ID" --tail=100 > rosa-install-logs.txt 2>&1 || echo "ROSA install logs not available" > rosa-install-logs.txt
        else
            log_warning "No ROSA cluster external ID found, skipping AWS info collection"
        fi

        log_success "AWS/ROSA information collected"
    else
        log_warning "rosa CLI not found, skipping AWS info collection"
    fi
}

# Create summary report
create_summary_report() {
    log_info "Creating summary report..."

    cat > SUMMARY.txt <<EOF
================================================================================
ROSA Cluster Debug Log Collection Summary
================================================================================
Cluster Name: $CLUSTER_NAME
Namespace: $NAMESPACE
Collection Time: $(date)
Output Directory: $OUTPUT_DIR
================================================================================

FILES COLLECTED:
----------------

Resource YAMLs:
  - cluster.yaml                  (Cluster resource)
  - rosacluster.yaml              (ROSACluster resource)
  - rosacontrolplane.yaml         (ROSAControlPlane resource)
  - machinepool.yaml              (MachinePool resource)
  - rosamachinepool.yaml          (ROSAMachinePool resource)
  - rosanetwork.yaml              (ROSANetwork resource)
  - rosaroleconfig.yaml           (ROSARoleConfig resource)
  - managedcluster.yaml           (ManagedCluster resource)

Status Information:
  - status-summary.txt            (Resource status summaries)
  - finalizers-check.txt          (Finalizer status check)
  - rbac-check.txt                (RBAC permissions check)

Events:
  - events-namespace.txt          (All namespace events)
  - events-cluster.txt            (Cluster-specific events)

Controller Logs:
  - logs/capa-controller.log      (CAPA controller logs)
  - logs/capi-controller.log      (CAPI controller logs)
  - logs/rosa-capi-controller.log (ROSA CAPI controller logs)
  - logs/mce-operator.log         (MCE operator logs)

AWS/ROSA Information (if available):
  - rosa-cluster-details.txt      (ROSA cluster details)
  - rosa-install-logs.txt         (ROSA installation logs)

================================================================================

NEXT STEPS:
-----------

1. Review status-summary.txt for current cluster state
2. Check finalizers-check.txt for stuck finalizers
3. Review rbac-check.txt for permission issues
4. Examine controller logs in logs/ directory for errors
5. Check events-cluster.txt for recent cluster events
6. Review YAML files for misconfigurations

COMMON ISSUES TO CHECK:
-----------------------

- Stuck finalizers (see finalizers-check.txt)
- RBAC permission errors (see rbac-check.txt and logs/capa-controller.log)
- MachinePool deletion issues (check logs/capa-controller.log)
- Network configuration errors (see rosanetwork.yaml and events)
- Role creation failures (see rosaroleconfig.yaml and events)

SHARING LOGS:
-------------

To share these logs:
  1. Archive: tar -czf rosa-debug-logs-${CLUSTER_NAME}-${TIMESTAMP}.tar.gz *
  2. Upload to Slack or attach to JIRA ticket
  3. Include SUMMARY.txt for context

================================================================================
EOF

    log_success "Summary report created"
}

# Compress logs
compress_logs() {
    log_info "Compressing logs..."
    cd ..
    tar -czf "${OUTPUT_DIR}.tar.gz" "$OUTPUT_DIR"
    log_success "Logs compressed to: ${OUTPUT_DIR}.tar.gz"
}

# Main execution
main() {
    echo "================================================================================"
    echo "ROSA Cluster Debug Log Collection"
    echo "================================================================================"
    echo ""

    check_prerequisites
    setup_output_dir
    collect_cluster_resources
    collect_status_summaries
    collect_controller_logs
    collect_events
    check_finalizers
    check_rbac
    collect_aws_info
    create_summary_report

    cd ..

    echo ""
    log_success "Log collection complete!"
    echo ""
    echo "Output directory: $OUTPUT_DIR"
    echo "Review SUMMARY.txt for details and next steps"
    echo ""
    echo "To compress for sharing:"
    echo "  tar -czf ${OUTPUT_DIR}.tar.gz $OUTPUT_DIR"
    echo ""

    # Ask if user wants to compress now
    read -p "Compress logs now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        compress_logs
        echo ""
        log_success "Ready to share: ${OUTPUT_DIR}.tar.gz"
    fi
}

# Run main function
main
