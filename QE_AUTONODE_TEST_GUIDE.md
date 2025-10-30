# AutoNode Test Guide

## Overview
This guide provides step-by-step instructions for testing the AutoNode feature for ROSA HCP clusters using CAPI/CAPA.

**Reference Documentation**: https://gitlab.cee.redhat.com/service/uhc-clusters-service/-/blob/master/docs/rosa_hcp/autonode.md

---

## Prerequisites
- ROSA HCP cluster already created
- AWS CLI configured with appropriate credentials
- `rosa` CLI installed and authenticated
- `oc` or `kubectl` CLI installed
- `jq` installed for JSON parsing

---

## Setup Steps

### Step 1: Create AutoNode IAM Policy

**Create the Policy File:**
```bash
cat > ~/acm_dev/automation-capi/autonode-private-preview-policy.json <<'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowScopedEC2InstanceAccessActions",
            "Effect": "Allow",
            "Resource": [
                "arn:*:ec2:*::image/*",
                "arn:*:ec2:*::snapshot/*",
                "arn:*:ec2:*:*:security-group/*",
                "arn:*:ec2:*:*:subnet/*"
            ],
            "Action": [
                "ec2:RunInstances",
                "ec2:CreateFleet"
            ]
        },
        {
            "Sid": "AllowScopedEC2LaunchTemplateAccessActions",
            "Effect": "Allow",
            "Resource": "arn:*:ec2:*:*:launch-template/*",
            "Action": [
                "ec2:RunInstances",
                "ec2:CreateFleet"
            ]
        },
        {
            "Sid": "AllowScopedEC2InstanceActionsWithTags",
            "Effect": "Allow",
            "Resource": [
                "arn:*:ec2:*:*:fleet/*",
                "arn:*:ec2:*:*:instance/*",
                "arn:*:ec2:*:*:volume/*",
                "arn:*:ec2:*:*:network-interface/*",
                "arn:*:ec2:*:*:launch-template/*",
                "arn:*:ec2:*:*:spot-instances-request/*"
            ],
            "Action": [
                "ec2:RunInstances",
                "ec2:CreateFleet",
                "ec2:CreateLaunchTemplate"
            ],
            "Condition": {
                "StringLike": {
                    "aws:RequestTag/karpenter.sh/nodepool": "*"
                }
            }
        },
        {
            "Sid": "AllowScopedResourceCreationTagging",
            "Effect": "Allow",
            "Resource": [
                "arn:*:ec2:*:*:fleet/*",
                "arn:*:ec2:*:*:instance/*",
                "arn:*:ec2:*:*:volume/*",
                "arn:*:ec2:*:*:network-interface/*",
                "arn:*:ec2:*:*:launch-template/*",
                "arn:*:ec2:*:*:spot-instances-request/*"
            ],
            "Action": "ec2:CreateTags",
            "Condition": {
                "StringEquals": {
                    "ec2:CreateAction": [
                        "RunInstances",
                        "CreateFleet",
                        "CreateLaunchTemplate"
                    ]
                },
                "StringLike": {
                    "aws:RequestTag/karpenter.sh/nodepool": "*"
                }
            }
        },
        {
            "Sid": "AllowScopedResourceTagging",
            "Effect": "Allow",
            "Resource": "arn:*:ec2:*:*:instance/*",
            "Action": "ec2:CreateTags",
            "Condition": {
                "StringLike": {
                    "aws:ResourceTag/karpenter.sh/nodepool": "*"
                }
            }
        },
        {
            "Sid": "AllowScopedDeletion",
            "Effect": "Allow",
            "Resource": [
                "arn:*:ec2:*:*:instance/*",
                "arn:*:ec2:*:*:launch-template/*"
            ],
            "Action": [
                "ec2:TerminateInstances",
                "ec2:DeleteLaunchTemplate"
            ],
            "Condition": {
                "StringLike": {
                    "aws:ResourceTag/karpenter.sh/nodepool": "*"
                }
            }
        },
        {
            "Sid": "AllowRegionalReadActions",
            "Effect": "Allow",
            "Resource": "*",
            "Action": [
                "ec2:DescribeImages",
                "ec2:DescribeInstances",
                "ec2:DescribeInstanceTypeOfferings",
                "ec2:DescribeInstanceTypes",
                "ec2:DescribeLaunchTemplates",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeSpotPriceHistory",
                "ec2:DescribeSubnets"
            ]
        },
        {
            "Sid": "AllowSSMReadActions",
            "Effect": "Allow",
            "Resource": "arn:*:ssm:*::parameter/aws/service/*",
            "Action": "ssm:GetParameter"
        },
        {
            "Sid": "AllowPricingReadActions",
            "Effect": "Allow",
            "Resource": "*",
            "Action": "pricing:GetProducts"
        },
        {
            "Sid": "AllowInterruptionQueueActions",
            "Effect": "Allow",
            "Resource": "*",
            "Action": [
                "sqs:DeleteMessage",
                "sqs:GetQueueUrl",
                "sqs:ReceiveMessage"
            ]
        },
        {
            "Sid": "AllowPassingInstanceRole",
            "Effect": "Allow",
            "Resource": "arn:*:iam::*:role/*",
            "Action": "iam:PassRole",
            "Condition": {
                "StringEquals": {
                    "iam:PassedToService": [
                        "ec2.amazonaws.com",
                        "ec2.amazonaws.com.cn"
                    ]
                }
            }
        },
        {
            "Sid": "AllowScopedInstanceProfileCreationActions",
            "Effect": "Allow",
            "Resource": "arn:*:iam::*:instance-profile/*",
            "Action": [
                "iam:CreateInstanceProfile"
            ],
            "Condition": {
                "StringLike": {
                    "aws:RequestTag/karpenter.k8s.aws/ec2nodeclass": "*"
                }
            }
        },
        {
            "Sid": "AllowScopedInstanceProfileTagActions",
            "Effect": "Allow",
            "Resource": "arn:*:iam::*:instance-profile/*",
            "Action": [
                "iam:TagInstanceProfile"
            ],
            "Condition": {
                "StringLike": {
                    "aws:ResourceTag/karpenter.k8s.aws/ec2nodeclass": "*",
                    "aws:RequestTag/karpenter.k8s.aws/ec2nodeclass": "*"
                }
            }
        },
        {
            "Sid": "AllowScopedInstanceProfileActions",
            "Effect": "Allow",
            "Resource": "arn:*:iam::*:instance-profile/*",
            "Action": [
                "iam:AddRoleToInstanceProfile",
                "iam:RemoveRoleFromInstanceProfile",
                "iam:DeleteInstanceProfile"
            ],
            "Condition": {
                "StringLike": {
                    "aws:ResourceTag/karpenter.k8s.aws/ec2nodeclass": "*"
                }
            }
        },
        {
            "Sid": "AllowInstanceProfileReadActions",
            "Effect": "Allow",
            "Resource": "arn:*:iam::*:instance-profile/*",
            "Action": "iam:GetInstanceProfile"
        }
    ]
}
EOF
```

### Step 2: Create the IAM Policy in AWS

```bash
export POLICY_ARN=$(aws iam create-policy --policy-name autonode-private-preview \
  --policy-document file://~/acm_dev/automation-capi/autonode-private-preview-policy.json \
  --query 'Policy.Arn' \
  --output text)

echo "Policy ARN: $POLICY_ARN"
```

### Step 3: Get Cluster Information

**Replace `<your-cluster-name>` With Your Actual Cluster Name:**
```bash
rosa describe cluster --cluster <your-cluster-name>
```

**Export the Cluster ID (Replace With Your Actual Cluster ID):**
```bash
export CLUSTER_ID=<your-cluster-id>
```

### Step 4: Get OIDC Provider Information

**Export the OIDC Provider ID and OIDC Provider URL (Replace With Your Actual Values):**
```bash
export OIDC_CONFIG_ID=<your-oidc-config-id>
export OIDC_PROVIDER_URL=<your-oidc-provider-url>
```

### Step 5: Create Trust Policy Template

**Create the Trust Policy Template:**
```bash
cat > ~/acm_dev/automation-capi/trust-policy-template.json <<'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:oidc-provider/{OIDC_PROVIDER_URL}"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "{OIDC_PROVIDER_URL}:sub": "system:serviceaccount:kube-system:karpenter"
                }
            }
        }
    ]
}
EOF
```

### Step 6: Create IAM Role for AutoNode

**Set a Prefix for Your Role Name:**
```bash
export PREFIX=<your-prefix>
```

**Generate the Trust Policy With Your OIDC Provider:**
```bash
sed "s|{OIDC_PROVIDER_URL}|$OIDC_PROVIDER_URL|g" ~/acm_dev/automation-capi/trust-policy-template.json > ~/acm_dev/automation-capi/$PREFIX-trust-policy.json
```

**Create the IAM Role:**
```bash
aws iam create-role --role-name $PREFIX-autonode-operator-role \
  --assume-role-policy-document file://~/acm_dev/automation-capi/$PREFIX-trust-policy.json
```

**Attach the Policy to the Role:**
```bash
aws iam attach-role-policy --role-name $PREFIX-autonode-operator-role --policy-arn $POLICY_ARN
```

### Step 7: Update RosaControlPlane

**Edit the RosaControlPlane to Add the autoNode Section:**

```bash
kubectl edit rosacontrolplane <your-cluster-name> -n ns-rosa-hcp
```

**Add the autoNode Configuration:**

```yaml
apiVersion: controlplane.cluster.x-k8s.io/v1beta2
kind: RosaControlPlane
metadata:
  name: your-cluster-name
  namespace: ns-rosa-hcp
spec:
  # ... existing configuration ...
  autoNode:
    mode: enabled
    roleARN: "arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:role/<PREFIX>-autonode-operator-role"
```

**Note:** Replace `<YOUR_AWS_ACCOUNT_ID>` with your actual AWS account ID and `<PREFIX>` with the prefix you used in Step 6.

### Step 8: Tag AWS Resources for Karpenter Discovery

**Set AWS Region:**
```bash
export AWS_REGION=<your-aws-region>
```

**Get the Security Group ID:**
```bash
export SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=$CLUSTER_ID-default-sg" \
  | jq -r .SecurityGroups[0].GroupId)

echo "Security Group ID: $SECURITY_GROUP_ID"
```

**Get the Private Subnet ID:**
```bash
export PRIVATE_SUBNET_ID=$(aws ec2 describe-subnets \
  --filters "Name=tag:kubernetes.io/role/internal-elb,Values=*" \
            "Name=tag:kubernetes.io/cluster/$CLUSTER_ID,Values=shared" \
  | jq -r .Subnets[0].SubnetId)

echo "Private Subnet ID: $PRIVATE_SUBNET_ID"
```

**Tag the Resources for Karpenter Discovery:**
```bash
aws ec2 create-tags \
  --resources "$SECURITY_GROUP_ID" "$PRIVATE_SUBNET_ID" \
  --tags Key="karpenter.sh/discovery",Value="$CLUSTER_ID"
```

### Step 9: Create Kubeconfig

**Create Admin User and Get Credentials:**
```bash
rosa create admin --cluster <your-cluster-name>
```

**Log in Using the Credentials From the Previous Command:**
```bash
oc login https://api.<cluster-domain>:443 --username cluster-admin --password <password-from-previous-step> --insecure-skip-tls-verify=true
```

**Export the Kubeconfig to a File:**
```bash
oc config view --minify --flatten > ./kubeconfig
```

### Step 10: Create OpenshiftEC2NodeClass

**Create the OpenshiftEC2NodeClass File:**
```bash
cat > ~/acm_dev/automation-capi/openshiftec2nodeclass.yaml <<EOF
apiVersion: karpenter.hypershift.openshift.io/v1beta1
kind: OpenshiftEC2NodeClass
metadata:
  name: default-nodepool
spec:
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: $CLUSTER_ID
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: $CLUSTER_ID
EOF
```

**Apply the OpenshiftEC2NodeClass:**
```bash
oc --kubeconfig=./kubeconfig apply -f ~/acm_dev/automation-capi/openshiftec2nodeclass.yaml
```

**Verify the EC2NodeClass Was Created:**
```bash
oc --kubeconfig=./kubeconfig get EC2NodeClass
```

Expected output:
```
NAME      READY   AGE
default           112m
```

### Step 11: Create NodePool

**Create the File:**
```bash
cat > ~/acm_dev/automation-capi/test-nodepool.yaml <<'EOF'
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: ondemand-and-spot
spec:
  template:
    metadata:
      labels:
        autonode: "true"
    spec:
      requirements:
      - key: node.kubernetes.io/instance-type
        operator: In
        values:
        - m5.xlarge
        - c5.xlarge
        - t3.large
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["on-demand", "spot"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: example-nodeclass
EOF
```

**Apply the NodePool:**
```bash
oc --kubeconfig=./kubeconfig apply -f ~/acm_dev/automation-capi/test-nodepool.yaml
```

**Verify the NodePool Was Created:**
```bash
oc --kubeconfig=./kubeconfig get nodepools -o yaml
```

---

## Verification

### Check AutoNode Components

**Check Karpenter Pods:**
```bash
oc --kubeconfig=./kubeconfig get pods -n kube-system | grep karpenter
```

**Check NodePools:**
```bash
oc --kubeconfig=./kubeconfig get nodepools
```

**Check EC2NodeClasses:**
```bash
oc --kubeconfig=./kubeconfig get ec2nodeclass
```

### Test AutoNode Scaling

**Create a Test Deployment to Trigger Scaling:**
```bash
cat > test-deployment.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: autonode-test
spec:
  replicas: 5
  selector:
    matchLabels:
      app: autonode-test
  template:
    metadata:
      labels:
        app: autonode-test
    spec:
      containers:
      - name: nginx
        image: nginx
        resources:
          requests:
            cpu: 1
            memory: 1Gi
EOF

oc --kubeconfig=./kubeconfig apply -f test-deployment.yaml
```

**Watch for New Nodes:**
```bash
oc --kubeconfig=./kubeconfig get nodes -w
```

**Check Karpenter Logs:**
```bash
oc --kubeconfig=./kubeconfig logs -n kube-system -l app.kubernetes.io/name=karpenter -f
```

---

## Troubleshooting

### Common Issues

**Issue: Karpenter not creating nodes**
- Verify the IAM role ARN is correct in RosaControlPlane
- Check IAM role trust policy includes correct OIDC provider
- Ensure security groups and subnets are tagged correctly
- Review Karpenter logs for errors

**Issue: Pods not scheduling**
- Check NodePool requirements match pod requirements
- Verify EC2NodeClass references correct resources
- Check for capacity or quota limits in AWS

**Issue: Permission errors**
- Verify IAM policy is attached to the role
- Check trust relationship in IAM role
- Ensure OIDC provider is configured correctly

### Useful Commands

```bash
# Check RosaControlPlane status
oc --kubeconfig=./kubeconfig get rosacontrolplane -o yaml

# View all Karpenter resources
oc --kubeconfig=./kubeconfig get nodepools,ec2nodeclass

# Check events
oc --kubeconfig=./kubeconfig get events --sort-by='.lastTimestamp'

# Describe a specific NodePool
oc --kubeconfig=./kubeconfig describe nodepool ondemand-and-spot
```

---

## Cleanup

**Delete Test Deployment:**
```bash
oc --kubeconfig=./kubeconfig delete deployment autonode-test
```

**Delete NodePool:**
```bash
oc --kubeconfig=./kubeconfig delete -f ~/acm_dev/automation-capi/test-nodepool.yaml
```

**Disable AutoNode (Edit RosaControlPlane):**
```yaml
autoNode:
  mode: disabled
```

**Delete IAM Resources:**
```bash
aws iam detach-role-policy --role-name $PREFIX-autonode-operator-role --policy-arn $POLICY_ARN
aws iam delete-role --role-name $PREFIX-autonode-operator-role
aws iam delete-policy --policy-arn $POLICY_ARN
```

---

## Notes

- Replace all placeholder values (cluster names, IDs, ARNs) with your actual values
- Ensure you have appropriate AWS permissions to create IAM roles and policies
- The OIDC provider configuration is critical for AutoNode to work
- Keep track of all created resources for cleanup
- Test in a non-production environment first
