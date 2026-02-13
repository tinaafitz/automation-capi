#!/bin/bash

# MCE Environment Health Check Wrapper Script
# Runs systematic health checks on all MCE environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        MCE Environment Health Check Tool                   ║"
echo "║  Systematically detect known issues across environments    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if MCE environments database exists
if [ ! -f "$HOME/.mce-environments.json" ]; then
    echo "❌ Error: MCE environments database not found"
    echo "   Expected: $HOME/.mce-environments.json"
    echo ""
    echo "   Run 'mce-env' to add environments first, or"
    echo "   Run 'mce-list' to verify environments exist"
    exit 1
fi

# Count environments
TOTAL_ENVS=$(jq '.environments | length' "$HOME/.mce-environments.json")
RUNNING_ENVS=$(jq '[.environments[] | select(.data.cluster.status == "Running")] | length' "$HOME/.mce-environments.json")

echo "📊 Environment Summary:"
echo "   Total environments: $TOTAL_ENVS"
echo "   Running (will check): $RUNNING_ENVS"
echo "   Stopped (will skip): $((TOTAL_ENVS - RUNNING_ENVS))"
echo ""

if [ "$RUNNING_ENVS" -eq 0 ]; then
    echo "⚠️  No running environments to check"
    echo "   All environments appear to be stopped"
    exit 0
fi

echo "🔍 Checking for known issues:"
echo "   • RosaNetwork resources stuck in Deleting status"
echo "   • RosaControlPlane deletion issues"
echo "   • CRD v1beta2 compatibility problems"
echo "   • OCP version correlations with known issues"
echo ""

read -p "Press Enter to start health check, or Ctrl+C to cancel..."
echo ""

# Change to project directory
cd "$PROJECT_DIR"

# Run the playbook
echo "🚀 Running health checks..."
echo ""

if ansible-playbook verify_environment_health.yml; then
    echo ""
    echo "✅ Health check completed successfully!"
    echo ""

    # Find the generated report
    REPORT=$(ls -t MCE_Environment_Health_Report_*.html 2>/dev/null | head -1)

    if [ -n "$REPORT" ]; then
        echo "📄 Report generated: $REPORT"
        echo ""

        # Offer to open the report
        if [[ "$OSTYPE" == "darwin"* ]]; then
            read -p "Open report in browser? (y/n) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                open "$REPORT"
            else
                echo "   You can open it manually with: open $REPORT"
            fi
        else
            echo "   Open the report with: xdg-open $REPORT"
        fi
    fi
else
    echo ""
    echo "❌ Health check failed"
    echo "   Check the error messages above for details"
    exit 1
fi
