
# CAPI/CAPA Test Automation

Central place for CAPI/CAPA Ansible automation tests.

## Run Locally

### Prerequisites:
1. A running ocp environment with ACM and/or MCE installed.
2. Your AWS, OCP, and OCM credentials available.
3. Logged into the ROSA stage environment.
4. Valid OIDC, subnets, account-roles, and operator-roles.
5. A rosa-hcp.yaml file configured to provision the ROSA-HCP cluster.
### Steps

###1. Clone the project.

```bash
git clone https://github.com/tinaafitz/automation-capi
```

###2. Install Ansible. 

```bash
https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html#pipx-install
```

###3. Verify you're logged into the ROSA stage environment. 

```bash
rosa whoami
```
###4. Run automated tests

The ```cap-enable-test.yml``` playbook tests the basic functionality of enabling/disabling CAPI/CAPA. 

The playbook runs nightly in the Jenkins test runs and uses environment variables.

1. Modify the ```create_OCP_vars.sh``` shell script to provide values for the following OCP environment variables.
```bash
 export OCP_HUB_API_URL=""
 export OCP_HUB_CLUSTER_USER=""
 export OCP_HUB_CLUSTER_PASSWORD=""
 ```
2. Execute the ```create_OCP_vars.sh``` shell script to set the OCP environment variables.
   
```bash
source create_OCP_vars.sh  
```
3. Execute the ```run-automation.sh``` shell script providing the ```cap-enable-test.yml``` playbook name.

```bash
./run-automation.sh cap-enable-test.yml  
```

###5. Use the ```capi_assistant```

Use the ```capi_assistant``` to interact with the MCE ACM environment without having to remember the details.

The ```capi_assistant``` is designed to be used interactively as shown below: 
```
~/acm_dev/automation-capi (update_readme_capi_assistant) $ ./capi_assistant 
Running playbook: capi-assistant.yaml
Choose one of the following:
   1 - Verify MCE CAPI/CAPA environment.
   2 - Configure MCE CAPI/CAPA environment for ROSA_HCP cluster creation.
   3 - Check CAPA/CAPA enabled status.
   4 - Enable CAPA/CAPA.
   5 - Enable ClusterManager auto-import (Add the registrationConfiguration section).
   6 - Apply ClusterRoleBinding changes (cluster-manager-registration-capi).
   7 - Create capa-manager-bootstrap-credentials.
   8 - Restart capa-controller-manager deployment.
   9 - Create rosa-creds-secret.
  10 - Show the ROSAControlPlane "ready" status.
  11 - Create the ROSA_HCP cluster or other resource. (oc apply -f <filename>)
  12 - Delete the ROSA_HCP cluster or other resource. (oc delete -f <filename>)
```
Configuring the ```capi_assistant```.

a. Update the ```vars/user_vars.yaml``` file providing values for the following  attributes:
```
# user stuff
OCP_HUB_API_URL: ""
OCP_HUB_CLUSTER_USER: ""
OCP_HUB_CLUSTER_PASSWORD: ""
MCE_NAMESPACE: "multiclusterengine"
AWS_REGION: ""
AWS_ACCESS_KEY_ID: ""
AWS_SECRET_ACCESS_KEY: ""
OCM_CLIENT_ID: ""
OCM_CLIENT_SECRET: ""
```

b. Execute the ```./capi_assistant``` shell script.
```
Choose one of the following:
1 - Verify MCE CAPI/CAPA environment.
2 - Configure MCE CAPI/CAPA environment for ROSA_HCP cluster creation.
3 - Check CAPA/CAPA enabled status.
4 - Enable CAPA/CAPA.
5 - Enable ClusterManager auto-import (Add the registrationConfiguration section).
6 - Apply ClusterRoleBinding changes (cluster-manager-registration-capi).
7 - Create capa-manager-bootstrap-credentials.
8 - Restart capa-controller-manager deployment.
9 - Create rosa-creds-secret.
10 - Show the ROSAControlPlane "ready" status.
11 - Create the ROSA_HCP cluster or other resource. (oc apply -f <filename>)
12 - Delete the ROSA_HCP cluster or other resource. (oc delete -f <filename>)
```

## Environment Variables

To run other playbooks, you will need to set variables in your ansible-playbook commands by adding -e "variable=value" for example

ansible-playbook playbook.yml -e "variable=value variable2=value2"


