
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
###4. Run one of the following playbooks:

>>####1. prompt-capa-cluster-create-rosa-hcp.yml 
  
The ```prompt-capa-cluster-create-rosa-hcp.yml``` playbook enables CAPI/CAPA and configures ACM to deploy a ROSA-HCP cluster. It prompts the user for all the necessary variables.

The functionality was designed to follow the "Creating a ROSA HCP cluster" directions specified in https://github.com/stolostron/cluster-api-installer/blob/main/doc/Create-rosa-hcp.md.

Important Note *** The OIDC, subnets, account-roles, and operator-roles prerequisites are needed to provision the ROSA-HCP Cluster.  

a. Modify the default values for the vars_prompt section of the ```prompt-capa-cluster-create-rosa-hcp.yml```

```     vars_prompt:
- name: OCP_HUB_API_URL
  prompt: "What is the OCP_HUB_API_URL?"
  default: "aaaaaaaaaaaa"
  private: false
- name: OCP_HUB_CLUSTER_USER
  prompt: "What is the OCP_HUB_CLUSTER_USER?"
  default: "kubeadmin"
  private: false
- name: OCP_HUB_CLUSTER_PASSWORD
  prompt: "What is the OCP_HUB_CLUSTER_PASSWORD?"
  private: true
  default: "aaaaaaaaaaaa"
- name: MCE_NAMESPACE
  prompt: "What is the MCE_NAMESPACE?"
  private: false
  default: "multiclusterengine"
- name: AWS_REGION
  prompt: "What is the AWS_REGION?"
  private: false
  default: "us-east-1"
- name: AWS_ACCESS_KEY_ID
  prompt: "What is the AWS_ACCESS_KEY_ID?"
  private: true
  default: "aaaaaaaaaaaa"
- name: AWS_SECRET_ACCESS_KEY
  prompt: "What is the AWS_SECRET_ACCESS_KEY?"
  private: true
  default: "aaaaaaaaaaaa"
- name: AWS_B64ENCODED_CREDENTIALS
  prompt: "What is the AWS_B64ENCODED_CREDENTIALS?"
  private: true
  default: "AWS_B64ENCODED_CREDENTIALS=aaaaaaaaaaaa"
- name: OCM_CLIENT_ID
  prompt: "What is the OCM_CLIENT_ID"
  private: false
  default: "aaaaaaaaaaaa"
- name: OCM_CLIENT_SECRET
  prompt: "What is the OCM_CLIENT_SECRET"
  private: true
  default: "aaaaaaaaaaaa"
```

b. Execute the ```prompt-run-automation.sh``` shell script providing the ```prompt-capa-cluster-create-rosa-hcp.yml``` playbook name.
```
./prompt-run-automation.sh prompt-capa-cluster-create-rosa-hcp.yml
```  

c. Apply your configured rosa-hcp.yaml file to create the ROSA HCP cluster. 
```
oc apply -f your_configured_rosa_hcp_file_here.yaml 
```  

>>####2. cap-enable-test.yml

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


## Environment Variables

To run other playbooks, you will need to set variables in your ansible-playbook commands by adding -e "variable=value" for example

ansible-playbook playbook.yml -e "variable=value variable2=value2"


