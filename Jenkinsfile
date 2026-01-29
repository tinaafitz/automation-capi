
@Library('ci-shared-lib') _

// ============================================================================
// CAPI/CAPA Test Pipeline - Supports Both Test Systems
// ============================================================================
// Old System: ./run-automation.sh cap-enable-test.yml → results/
// New System: ./run-test-suite.py <suite-id> → test-results/
//
// Available Test Suites (New System):
//   10-configure-mce-environment  - Configure CAPI/CAPA (RHACM4K-61722)
//   20-rosa-hcp-provision         - Provision ROSA HCP cluster
//   30-rosa-hcp-delete            - Delete ROSA HCP cluster
//   05-verify-mce-environment     - Verify MCE environment
//
// Credentials Required (set as environment variables or in vars/user_vars.yml):
//   - OCP_HUB_API_URL           : OpenShift cluster API URL
//   - OCP_HUB_CLUSTER_USER      : OpenShift username (default: kubeadmin)
//   - OCP_HUB_CLUSTER_PASSWORD  : OpenShift password
//   - AWS_ACCESS_KEY_ID         : AWS access key (from Jenkins credentials)
//   - AWS_SECRET_ACCESS_KEY     : AWS secret key (from Jenkins credentials)
//   - OCM_CLIENT_ID             : OCM client ID (from Jenkins credentials)
//   - OCM_CLIENT_SECRET         : OCM client secret (from Jenkins credentials)
//   - MCE_NAMESPACE             : MCE namespace (default: multicluster-engine)
//
// Example Usage in Stage (with environment variables):
//   sh """
//     export OCP_HUB_API_URL=${params.OCP_HUB_API_URL}
//     export OCP_HUB_CLUSTER_USER=${params.OCP_HUB_CLUSTER_USER}
//     export OCP_HUB_CLUSTER_PASSWORD=${params.OCP_HUB_CLUSTER_PASSWORD}
//     export AWS_ACCESS_KEY_ID=${CAPI_AWS_ACCESS_KEY_ID}
//     export AWS_SECRET_ACCESS_KEY=${CAPI_AWS_SECRET_ACCESS_KEY}
//     export MCE_NAMESPACE=${params.MCE_NAMESPACE}
//     ./run-test-suite.py 10-configure-mce-environment
//   """
// ============================================================================

pipeline {
    options {
        buildDiscarder(logRotator(daysToKeepStr: '30'))
        // This stops the automatic, failing checkout
        // skipDefaultCheckout()
    }
    // agent {
    //     docker {
    //         // image 'quay.io/stolostron/acm-qe:python3'
    //         // registryUrl 'https://quay.io/stolostron/acm-qe'
    //         // registryCredentialsId '0089f10c-7a3a-4d16-b5b0-3a2c9abedaa2'
    //         // args '--network host -u 0:0'
    //         alwaysPull true
    //         image 'quay.io/vboulos/acmqe-automation/python3:python-3.9-ansible'
    //         args '--network host -u 0:0'
    //     }
    // }
    agent {
        kubernetes {
            defaultContainer 'capa-container'
            yamlFile 'picsAgentPod_capa.yaml'
            // ITUP Prod
            cloud 'remote-ocp-cluster-itup-prod'
            // ITUP PreProd
            // cloud 'remote-ocp-cluster-itup-pre-prod'
        }
    }

    environment {
        CI = 'true'
        // CAPI_AWS_ROLE_ARN = "arn:aws:iam::xxxxxxxx:role/capi-role"
        CAPI_AWS_ACCESS_KEY_ID = credentials('CAPI_AWS_ACCESS_KEY_ID')
        CAPI_AWS_SECRET_ACCESS_KEY = credentials('CAPI_AWS_SECRET_ACCESS_KEY')
    }
    parameters {
        string(name:'OCP_HUB_API_URL', defaultValue: '', description: 'Hub OCP API url')
        string(name:'OCP_HUB_CLUSTER_USER', defaultValue: 'kubeadmin', description: 'Hub OCP username')
        string(name:'OCP_HUB_CLUSTER_PASSWORD', defaultValue: '', description: 'Hub cluster password')
        string(name:'MCE_NAMESPACE', defaultValue: 'multicluster-engine', description: 'The Namespace where MCE is installed')
        string(name:'TEST_GIT_BRANCH', defaultValue: 'main', description: 'CAPI test Git branch')
    }
    stages {
        stage ('Build: Ensure required variables are set') {
            when {
                expression {
                    return (params.OCP_HUB_CLUSTER_API_URL == '' || params.OCP_HUB_CLUSTER_PASSWORD == '')
                }
            }
            steps {
                error ('OCP_HUB_CLUSTER_API_URL, OCP_HUB_CLUSTER_PASSWORD must be set to run the pipeline!')
            }
        }
        stage('Run CAPI Tests') {
            environment {
                OCP_HUB_API_URL = "${params.OCP_HUB_API_URL}"
                OCP_HUB_CLUSTER_USER = "${params.OCP_HUB_CLUSTER_USER}"
                OCP_HUB_CLUSTER_PASSWORD = "${params.OCP_HUB_CLUSTER_PASSWORD}"
                MCE_NAMESPACE = "${params.MCE_NAMESPACE}"
            }
            steps {
                script {
                    try {
                        withCredentials([
                            string(credentialsId: 'CAPI_AWS_ACCESS_KEY_ID', variable: 'AWS_ACCESS_KEY_ID'),
                            string(credentialsId: 'CAPI_AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY')
                        ]) {
                            sh '''
                                pwd
                                ls
                                # Execute the CAPI/CAPA configuration test suite (RHACM4K-61722)
                                ./run-test-suite.py 10-configure-mce-environment --format junit
                            '''
                        }
                        // Archive results from both old and new test systems
                        archiveArtifacts artifacts: 'results/**/*.xml, test-results/**/*.xml', allowEmptyArchive: true, followSymlinks: false, fingerprint: true
                    }
                    catch (ex) {
                        echo 'CAPI Tests failed ... Continuing with the pipeline'
                        currentBuild.result = 'FAILURE'
                    }
                }
            }
        }
        stage('Archive CAPI artifacts') {
            steps {
                script {
                   // Archive artifacts from both old (results/) and new (test-results/) systems
                   archiveArtifacts artifacts: 'results/**/*.xml, test-results/**/*.xml', allowEmptyArchive: true, followSymlinks: false

                   // Publish JUnit test results from both systems
                   junit allowEmptyResults: true, testResults: 'results/**/*.xml, test-results/**/*.xml'
                }
            }
        }
    }
}
