
# CAPI/CAPA Test Automation

Central place for CAPI/CAPA Ansible automation tests.

## Run Locally

### Prerequisite
Have a running ocp environment with acm and/or mce installed

### Steps

Clone the project

```bash
  git clone https://github.com/stolostron/automation-capi
```

Install Ansible on your machine 

```bash
  https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html#pipx-install
```

Modify the ```run-automation.sh``` shell script to provide values for the following environment variables.  

```bash
export OCP_USER=""
export OCP_PASSWORD=""
export API_URL=""
export MCE_NAMESPACE=""
export ACM_RELEASE_VERSION=""
```

Execute the ```run-automation.sh``` shell script providing the playbook name.

```bash
  ./run-automation.sh capi-tests.yaml 
  ./run-automation.sh capa-tests.yaml 
```

## Environment Variables

To run other playbooks, you will need to set variables in your ansible-playbook commands by adding -e "variable=value" for example

ansible-playbook mce.yml -e "variable=value variable2=value2"


