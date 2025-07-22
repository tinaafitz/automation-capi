#!/bin/bash

echo ""
echo "Script calls an ansible playbook. The playbook name is the only required parameter."
echo ""

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
