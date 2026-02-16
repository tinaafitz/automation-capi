#!/bin/bash
# Quick environment setup from test notification
# Usage: ./quick-env-setup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARSER="${SCRIPT_DIR}/parse-test-env.py"

echo "=================================================="
echo "Quick MCE Environment Setup"
echo "=================================================="
echo ""
echo "This tool helps you quickly connect to MCE test environments"
echo "from test notification messages."
echo ""
echo "You'll need:"
echo "  1. The test notification message (title, versions, components)"
echo "  2. The spreadsheet row (platform, cluster, password, etc.)"
echo ""
echo "=================================================="
echo ""

python3 "$PARSER" --interactive
