#!/bin/bash
# This script calls an ansible playbook. The playbook name is the only required parameter."
# Use this script only when your playbook prompts for all necessary variables.
# Use run-automation.sh to use environment variables which are setup separately.

if [ -z "$1" ]
  then
    echo "Please run script with the ansible playbook name"
  exit 1
fi

echo "Running playbook: $1"
export PLAYBOOK=$1

BASE_VARIABLES="skip_ansible_runner=true"
ANSIBLE_VARIABLES="mce_namespace=${MCE_NAMESPACE}"

ansible-playbook ${PLAYBOOK} -e "${BASE_VARIABLES} ${ANSIBLE_VARIABLES}"
