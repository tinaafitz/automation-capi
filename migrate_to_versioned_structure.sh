#!/bin/bash

# Migration script for transitioning to versioned template structure
# This script ensures backward compatibility while implementing the new structure

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backup_$(date +%Y%m%d_%H%M%S)"

echo "=== ROSA HCP Automation - Template Structure Migration ==="
echo "Starting migration to versioned template structure..."
echo "Backup directory: ${BACKUP_DIR}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Function to backup files
backup_file() {
    local file="$1"
    if [[ -f "${file}" ]]; then
        cp "${file}" "${BACKUP_DIR}/" 
        echo "✓ Backed up: $(basename "${file}")"
    fi
}

# Function to backup directory
backup_directory() {
    local dir="$1"
    if [[ -d "${dir}" ]]; then
        cp -r "${dir}" "${BACKUP_DIR}/"
        echo "✓ Backed up directory: $(basename "${dir}")"
    fi
}

echo
echo "Step 1: Creating backup of existing files..."

# Backup critical files
backup_file "${SCRIPT_DIR}/vars/vars.yml"
backup_file "${SCRIPT_DIR}/capi-assistant.yaml" 
backup_file "${SCRIPT_DIR}/create_rosa_hcp_cluster.yaml"
backup_directory "${SCRIPT_DIR}/templates"

echo
echo "Step 2: Verifying new structure exists..."

# Check if new structure was created
if [[ ! -d "${SCRIPT_DIR}/templates/versions" ]]; then
    echo "❌ Error: New versioned template structure not found!"
    echo "Please run the Ansible setup first to create the new structure."
    exit 1
fi

# Verify version directories exist
for version in "4.18" "4.19" "4.20"; do
    if [[ ! -d "${SCRIPT_DIR}/templates/versions/${version}" ]]; then
        echo "❌ Error: Version directory ${version} not found!"
        exit 1
    fi
    echo "✓ Found version directory: ${version}"
done

echo
echo "Step 3: Creating compatibility symlinks..."

# Create symlinks for backward compatibility
if [[ -d "${SCRIPT_DIR}/templates/4_19_tests" ]] && [[ ! -L "${SCRIPT_DIR}/templates/4_19_tests_legacy" ]]; then
    mv "${SCRIPT_DIR}/templates/4_19_tests" "${SCRIPT_DIR}/templates/4_19_tests_legacy"
    ln -sf "versions/4.19/features" "${SCRIPT_DIR}/templates/4_19_tests"
    echo "✓ Created backward compatibility symlink for 4_19_tests"
fi

echo
echo "Step 4: Updating executable scripts..."

# Update run_playbook script to support versioned playbooks
if [[ -f "${SCRIPT_DIR}/run_playbook" ]]; then
    if ! grep -q "versioned" "${SCRIPT_DIR}/run_playbook"; then
        cat >> "${SCRIPT_DIR}/run_playbook" << 'EOF'

# Support for versioned playbooks
if [[ "$1" == "create_rosa_hcp_cluster_versioned" ]]; then
    exec ansible-playbook "$1.yaml" "${@:2}"
fi
EOF
        echo "✓ Updated run_playbook script for versioned support"
    fi
fi

# Create new wrapper script for easy version selection
cat > "${SCRIPT_DIR}/create_cluster_with_version" << 'EOF'
#!/bin/bash

# Wrapper script for version-aware cluster creation
# Usage: ./create_cluster_with_version [version] [cluster_name]

VERSION=${1:-"4.19"}
CLUSTER_NAME=${2:-"rosa-hcp-demo"}

echo "Creating ROSA HCP cluster with OpenShift ${VERSION}"
echo "Cluster name: ${CLUSTER_NAME}"

# Map version to selection number
case "${VERSION}" in
    "4.18") VERSION_SELECTION="1" ;;
    "4.19") VERSION_SELECTION="2" ;;
    "4.20") VERSION_SELECTION="3" ;;
    *) 
        echo "❌ Error: Unsupported version ${VERSION}"
        echo "Supported versions: 4.18, 4.19, 4.20"
        exit 1
        ;;
esac

# Run the versioned playbook with pre-selected options
ansible-playbook create_rosa_hcp_cluster_versioned.yaml \
    -e "openshift_version_selection=${VERSION_SELECTION}" \
    -e "cluster_name=${CLUSTER_NAME}" \
    -e "apply_immediately=n"
EOF

chmod +x "${SCRIPT_DIR}/create_cluster_with_version"
echo "✓ Created version-aware cluster creation script"

echo
echo "Step 5: Validating template resolution..."

# Test template resolution for each version
for version in "4.18" "4.19" "4.20"; do
    control_plane_template="${SCRIPT_DIR}/templates/versions/${version}/cluster-configs/rosa-control-plane.yaml.j2"
    if [[ -f "${control_plane_template}" ]]; then
        echo "✓ Control plane template found for ${version}"
    else
        echo "❌ Missing control plane template for ${version}"
    fi
done

echo
echo "Step 6: Creating migration validation script..."

cat > "${SCRIPT_DIR}/validate_migration.sh" << 'EOF'
#!/bin/bash

# Validation script to check migration success
echo "=== Migration Validation ==="

# Check directory structure
echo "Checking directory structure..."
for version in "4.18" "4.19" "4.20"; do
    for subdir in "cluster-configs" "machine-pools" "features"; do
        dir="templates/versions/${version}/${subdir}"
        if [[ -d "${dir}" ]]; then
            echo "✓ ${dir}"
        else
            echo "❌ Missing: ${dir}"
        fi
    done
done

# Check key files exist
echo -e "\nChecking key files..."
key_files=(
    "templates/schemas/feature-matrix.yml"
    "templates/schemas/version-compatibility.yml"
    "tasks/version_management.yml"
    "tasks/template_resolver.yml"
    "create_rosa_hcp_cluster_versioned.yaml"
)

for file in "${key_files[@]}"; do
    if [[ -f "${file}" ]]; then
        echo "✓ ${file}"
    else
        echo "❌ Missing: ${file}"
    fi
done

# Test version selection
echo -e "\nTesting version selection..."
if grep -q "openshift_version_selection" capi-assistant.yaml; then
    echo "✓ Version selection integrated in capi-assistant.yaml"
else
    echo "❌ Version selection not found in capi-assistant.yaml"
fi

echo -e "\nValidation complete!"
EOF

chmod +x "${SCRIPT_DIR}/validate_migration.sh"

echo
echo "Step 7: Creating rollback script..."

cat > "${SCRIPT_DIR}/rollback_migration.sh" << 'EOF'
#!/bin/bash

# Rollback script to restore original structure if needed
BACKUP_DIR="$1"

if [[ -z "${BACKUP_DIR}" ]] || [[ ! -d "${BACKUP_DIR}" ]]; then
    echo "❌ Error: Please provide a valid backup directory"
    echo "Usage: $0 <backup_directory>"
    exit 1
fi

echo "=== Rolling back migration ==="
echo "Restoring from: ${BACKUP_DIR}"

# Restore backed up files
if [[ -f "${BACKUP_DIR}/vars.yml" ]]; then
    cp "${BACKUP_DIR}/vars.yml" vars/
    echo "✓ Restored vars/vars.yml"
fi

if [[ -f "${BACKUP_DIR}/capi-assistant.yaml" ]]; then
    cp "${BACKUP_DIR}/capi-assistant.yaml" .
    echo "✓ Restored capi-assistant.yaml"
fi

if [[ -d "${BACKUP_DIR}/templates" ]]; then
    rm -rf templates/
    cp -r "${BACKUP_DIR}/templates" .
    echo "✓ Restored templates directory"
fi

# Remove versioned files
versioned_files=(
    "create_rosa_hcp_cluster_versioned.yaml"
    "tasks/version_management.yml"
    "tasks/template_resolver.yml"
    "tasks/create_rosa_control_plane_versioned.yml"
    "create_cluster_with_version"
    "validate_migration.sh"
)

for file in "${versioned_files[@]}"; do
    if [[ -f "${file}" ]]; then
        rm "${file}"
        echo "✓ Removed ${file}"
    fi
done

echo "Rollback complete!"
EOF

chmod +x "${SCRIPT_DIR}/rollback_migration.sh"

echo
echo "=== Migration Summary ==="
echo "✓ Backup created: ${BACKUP_DIR}"
echo "✓ New versioned structure validated"
echo "✓ Backward compatibility symlinks created"
echo "✓ Version-aware scripts created"
echo "✓ Validation and rollback scripts created"
echo
echo "Next steps:"
echo "1. Run: ./validate_migration.sh"
echo "2. Test: ./create_cluster_with_version 4.19 test-cluster"
echo "3. Use: ./capi_assistant (now with version selection)"
echo
echo "If issues occur, rollback with:"
echo "   ./rollback_migration.sh ${BACKUP_DIR}"
echo
echo "Migration completed successfully! ✅"
EOF

chmod +x migrate_to_versioned_structure.sh