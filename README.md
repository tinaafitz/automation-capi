
# CAPI/CAPA Test Automation

Central place for CAPI/CAPA Ansible automation tests.

## Run Locally

### Prerequisite
Have a running ocp environment with acm and/or mce installed

### Steps

1. Clone the project.

   ```bash
   git clone https://github.com/tinaafitz/automation-capi
   ```

2. Install Ansible on your machine. 

   ```bash
   https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html#pipx-install
   ```

3. Modify the ```create_OCP_vars.sh``` shell script to provide values for the following OCP environment variables. 

   ```bash
   export OCP_HUB_API_URL=""
   export OCP_HUB_CLUSTER_USER=""
   export OCP_HUB_CLUSTER_PASSWORD=""
   ```

   The ```run-automation.sh``` shell script snippet below shows the OCP values provided above.  

   ```bash
   export OCP_USER=$OCP_HUB_CLUSTER_USER
   export OCP_PASSWORD=$OCP_HUB_CLUSTER_PASSWORD
   export API_URL=$OCP_HUB_API_URL
   export MCE_NAMESPACE="multicluster-engine"
   ```

4. Execute the ```run-automation.sh``` shell script providing the playbook name.

   ```bash
   ./run-automation.sh cap-enable-test.yml  
   ```
   The ```cap-enable-test.yml``` playbook specified above validates that CAPI and CAPA can be enabled and disabled properly. 
   Since CAPI and CAPA are not enabled by default, the playbook will enable, then disable CAPI and CAPA them leaving them disabled.

## Environment Variables

To run other playbooks, you will need to set variables in your ansible-playbook commands by adding -e "variable=value" for example

ansible-playbook playbook.yml -e "variable=value variable2=value2"


