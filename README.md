
# CAPI/CAPA Test Automation

Automation CAPI provides Ansible playbooks and scripts to automate working with Cluster API (CAPI) and ROSA HCP clusters.
It enables you to create, upgrade, delete, and verify clusters and environments in multiple ways depending on your workflow.

## Run Locally

### Prerequisites:
1. A running OCP environment with ACM and/or MCE installed.
2. Your AWS, OCP, and OCM credentials available.
3. Logged into the ROSA stage environment.
4. Valid OIDC, subnets, account-roles, and operator-roles.
5. A ```capi-demo.yaml``` file configured to provision the ROSA-HCP cluster.
### Steps

1. Clone the project.

```bash
git clone https://github.com/tinaafitz/automation-capi
```

2. Install Ansible. 

```bash
https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html#pipx-install
```

3. Verify you're logged into the ROSA stage environment. 

```bash
rosa whoami
```
4. Update the vars/user_var.yml file.
```bash
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


There are three ways to use capi_automation:
1. CAPI Interactive Assistant
   
   Use the ```capi_assistant``` script and interactive playbook to work directly with your management environment.
   It provides a guided interface to:

    * Configure MCE environment
    * Verify MCE evironment
    * Create ROSA HCP cluster
    * Upgrade a ROSA HCP cluster
    * Delete a ROSA HCP cluster
    * and more....

Run:
```bash
./capi_assistant  
```


2. End-to-End Tests
   
   Use the ```end2end_test```script and playbook to automatically create, upgrade, and delete a ROSA HCP cluster in a single flow.
   This is useful for continuous testing and validation of the full cluster lifecycle.

   Run:
    ```
     ./end2end_tests  
     ```

3. Direct Playbook Execution
   
   Use the ```run_playbook``` script to execute a specific playbook directly.
   This is ideal when you want to perform one action without going through the interactive assistant.
    Available playbooks include:

    * create_rosa_hcp_cluster
    * upgrade_rosa_hcp_cluster
    * delete_rosa_hcp_cluster
    * configure_mce_environment
    * verify_mce_environment


   Example usage:
   ```./run_playbook.sh create_rosa_hcp_cluster
   ./run_playbook.sh upgrade_rosa_hcp_cluster
   ./run_playbook.sh delete_rosa_hcp_cluster
   ./run_playbook.sh configure_mce_environment
   ./run_playbook.sh verify_mce_environment
   ```


Run automated tests

The ```cap-enable-test.yml``` playbook tests the basic functionality of enabling/disabling CAPI/CAPA. 

The playbook runs nightly in the Jenkins test runs and uses environment variables.



