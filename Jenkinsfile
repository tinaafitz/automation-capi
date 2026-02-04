
@Library('ci-shared-lib') _

// ============================================================================
// CAPI/CAPA Test Pipeline - E2E ROSA HCP Testing
// ============================================================================
// Pipeline Flow:
//   1. Configure MCE Environment (suite 10) - Enable CAPI/CAPA
//   2. Provision ROSA HCP Cluster (suite 20) - Only runs if configuration passes
//
// Test Suites:
//   10-configure-mce-environment  - Configure CAPI/CAPA (RHACM4K-61722)
//   20-rosa-hcp-provision         - Provision ROSA HCP cluster (runs if 10 passes)
//   30-rosa-hcp-delete            - Delete ROSA HCP cluster (manual/separate)
//   05-verify-mce-environment     - Verify MCE environment (manual/separate)
//
// Credentials Required:
//   Parameters (passed when running job):
//   - OCP_HUB_API_URL           : OpenShift cluster API URL
//   - OCP_HUB_CLUSTER_USER      : OpenShift username (default: kubeadmin)
//   - OCP_HUB_CLUSTER_PASSWORD  : OpenShift password
//   - OCM_CLIENT_ID             : OCM client ID (optional, uses vault if not provided)
//   - OCM_CLIENT_SECRET         : OCM client secret (optional, uses vault if not provided)
//   - MCE_NAMESPACE             : MCE namespace (default: multicluster-engine)
//   - TEST_GIT_BRANCH           : Git branch to test (default: main)
//
//   Jenkins Credentials (configured in Jenkins):
//   - CAPI_AWS_ACCESS_KEY_ID    : AWS access key
//   - CAPI_AWS_SECRET_ACCESS_KEY: AWS secret key
//   - CAPI_AWS_ACCOUNT_ID       : AWS account ID
//   - CAPI_OCM_CLIENT_ID        : OCM client ID for ROSA provisioning
//   - CAPI_OCM_CLIENT_SECRET    : OCM client secret for ROSA provisioning
//
// Pipeline Behavior:
//   - Stage 1 (Configure): If fails → pipeline stops
//   - Stage 2 (Provision): Only runs if Stage 1 succeeds
//   - All test results archived as JUnit XML for Jenkins reporting
//
// Test Results:
//   - JUnit XML: capa/test-results/**/*.xml
//   - HTML Reports: capa/test-results/**/*.html
//   - JSON Results: capa/test-results/**/*.json
// ============================================================================

pipeline {
    options {
        // This rotates the logs evry month
        buildDiscarder(logRotator(daysToKeepStr: '30'))
        // This stops the automatic, failing checkout
        skipDefaultCheckout()
    }
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
        string(name:'OCM_CLIENT_ID', defaultValue: '', description: 'OCM client ID for ROSA provisioning')
        string(name:'OCM_CLIENT_SECRET', defaultValue: '', description: 'OCM client secret for ROSA provisioning')
        string(name:'TEST_GIT_BRANCH', defaultValue: 'main', description: 'CAPI test Git branch')
    }
    stages {
        stage('Clone the capi/capa repo') {
            steps {
                retry(count: 3) {
                    script{
                        def capa_repo = "tinaafitz/automation-capi.git"
                        def git_branch = params.TEST_GIT_BRANCH
                        withCredentials([string(credentialsId: 'vincent-github-token', variable: 'GITHUB_TOKEN')]) {
                            sh '''
                                rm -rf capa

                                # Configure Git to use the token for this command only via a secure header.
                                git -c http.https://github.com/.extraheader="AUTHORIZATION: basic $(echo -n x-oauth-basic:${GITHUB_TOKEN} | base64)" \
                                    -c http.sslVerify=false \
                                    clone \
                                    -b "''' + git_branch + '''" \
                                    "https://github.com/''' + capa_repo + '''" \
                                    capa/
                            '''
                        }
                    }
                }
            }
        }
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
        stage('Run CAPI Configuration Tests') {
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
                            string(credentialsId: 'CAPI_AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY'),
                            string(credentialsId: 'CAPI_AWS_ACCOUNT_ID', variable: 'AWS_ACCOUNT_ID')
                        ]) {
                            sh '''
                                cd capa
                                # Execute the CAPI/CAPA configuration test suite (RHACM4K-61722) with maximum verbosity
                                # Pass AWS credentials and account ID as Ansible extra vars
                                ./run-test-suite.py 10-configure-mce-environment --format all -vvv \
                                  -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
                                  -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
                                  -e aws_account_id="${AWS_ACCOUNT_ID}"
                            '''
                        }
                        // Archive results from both old and new test systems
                        archiveArtifacts artifacts: 'capa/results/**/*.xml, capa/test-results/**/*.xml', allowEmptyArchive: true, followSymlinks: false, fingerprint: true
                    }
                    catch (ex) {
                        echo 'CAPI Configuration Tests failed ... Marking build as FAILURE'
                        currentBuild.result = 'FAILURE'
                        error('Configuration test suite failed - stopping pipeline')
                    }
                }
            }
        }
        stage('Run ROSA HCP Provisioning Tests') {
            when {
                expression { currentBuild.result != 'FAILURE' }
            }
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
                            string(credentialsId: 'CAPI_AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY'),
                            string(credentialsId: 'CAPI_AWS_ACCOUNT_ID', variable: 'AWS_ACCOUNT_ID'),
                            string(credentialsId: 'CAPI_OCM_CLIENT_ID', variable: 'OCM_CLIENT_ID'),
                            string(credentialsId: 'CAPI_OCM_CLIENT_SECRET', variable: 'OCM_CLIENT_SECRET')
                        ]) {
                            sh '''
                                cd capa
                                # Execute the ROSA HCP provisioning test suite with maximum verbosity
                                # Pass Jenkins parameters and credentials as Ansible extra vars
                                ./run-test-suite.py 20-rosa-hcp-provision --format all -vvv \
                                  -e OCP_HUB_API_URL="${OCP_HUB_API_URL}" \
                                  -e OCP_HUB_CLUSTER_USER="${OCP_HUB_CLUSTER_USER}" \
                                  -e OCP_HUB_CLUSTER_PASSWORD="${OCP_HUB_CLUSTER_PASSWORD}" \
                                  -e MCE_NAMESPACE="${MCE_NAMESPACE}" \
                                  -e OCM_CLIENT_ID="${OCM_CLIENT_ID}" \
                                  -e OCM_CLIENT_SECRET="${OCM_CLIENT_SECRET}" \
                                  -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
                                  -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
                                  -e aws_account_id="${AWS_ACCOUNT_ID}" \
                                  -e name_prefix="tst"
                            '''
                        }
                        // Archive provisioning test results
                        archiveArtifacts artifacts: 'capa/test-results/**/*.xml, capa/test-results/**/*.html, capa/test-results/**/*.json', allowEmptyArchive: true, followSymlinks: false, fingerprint: true
                    }
                    catch (ex) {
                        echo 'ROSA HCP Provisioning Tests failed'
                        currentBuild.result = 'FAILURE'
                    }
                }
            }
        }
        stage('Archive CAPI artifacts') {
            steps {
                script {
                   // Archive artifacts from both old (results/) and new (test-results/) systems
                   archiveArtifacts artifacts: 'capa/results/**/*.xml, capa/test-results/**/*.xml', allowEmptyArchive: true, followSymlinks: false

                   // Publish JUnit test results from both systems
                   junit allowEmptyResults: true, testResults: 'capa/results/**/*.xml, capa/test-results/**/*.xml'
                }
            }
        }
    }
}
