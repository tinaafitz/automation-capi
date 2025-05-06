
@Library('ci-shared-lib') _
pipeline {
    options {
        buildDiscarder(logRotator(daysToKeepStr: '30'))
    }
    agent {
        docker {
            // image 'quay.io/stolostron/acm-qe:python3'
            // registryUrl 'https://quay.io/stolostron/acm-qe'
            // registryCredentialsId '0089f10c-7a3a-4d16-b5b0-3a2c9abedaa2'
            // args '--network host -u 0:0'
            alwaysPull true
            image 'quay.io/vboulos/acmqe-automation/python3:python-3.9-ansible'
            args '--network host -u 0:0'
        }
    }
    environment {
        CI = 'true'
        // CAPI_AWS_ROLE_ARN = "arn:aws:iam::xxxxxxxx:role/capi-role"
        // CAPI_AWS_ACCESS_KEY_ID = credentials('CAPI_AWS_ACCESS_KEY_ID')
        // CAPI_AWS_SECRET_ACCESS_KEY = credentials('API_AWS_SECRET_ACCESS_KEY')
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
            steps {
                script {
                    try {
                        sh """
                            export OCP_USER=$OCP_HUB_CLUSTER_USER
                            export OCP_PASSWORD=$OCP_HUB_CLUSTER_PASSWORD
                            export API_URL=$OCP_HUB_API_URL
                            export MCE_NAMESPACE=$MCE_NAMESPACE

                            # Execute the CAPI and CAPA tests
                           ./run-automation.sh capi-tests.yaml 
                           ./run-automation.sh capa-tests.yaml 
                        """
                        archiveArtifacts artifacts: 'ci/ansible/db_info.json', followSymlinks: false, fingerprint: true
                    }
                    catch (ex) {
                        echo 'CAPI Tests failed ... Continuing with the pipeline'
                    }
                }
            }
        }
        stage('Archive CAPI artifacts') {
            steps {
                script {
                   archiveArtifacts artifacts: 'capi/*', followSymlinks: false
                   junit 'capi/*'
                }
            }
        }
    }
}
