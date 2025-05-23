#!/bin/bash

echo ""
echo "Script Sets env_vars and calls ansible playbook  Make sure to set ocm_user and ocm_password."
echo ""

if [ -z "$1" ]
  then
    echo "Please run script with the ansible playbook name"
  exit 1
fi

echo "Running playbook: $1"
export PLAYBOOK=$1
export OCP_USER=$OCP_HUB_CLUSTER_USER
export OCP_PASSWORD=$OCP_HUB_CLUSTER_PASSWORD
export API_URL=$OCP_HUB_API_URL
export MCE_NAMESPACE="multicluster-engine"

BASE_VARIABLES="skip_ansible_runner=true ocp_user=${OCP_USER} ocp_password=${OCP_PASSWORD} api_url=${API_URL}"
ANSIBLE_VARIABLES="mce_namespace=${MCE_NAMESPACE}"
ansible-playbook ${PLAYBOOK} -e "${BASE_VARIABLES} ${ANSIBLE_VARIABLES}"
