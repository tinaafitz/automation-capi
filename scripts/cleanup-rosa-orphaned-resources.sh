#!/bin/bash
# ============================================================================
# Cleanup Orphaned AWS Resources for ROSA HCP Cluster
# ============================================================================
# This script finds and removes AWS resources that CloudFormation failed to
# delete, such as stuck VPCs, ENIs, security groups, etc.
#
# Usage: ./cleanup-rosa-orphaned-resources.sh <cluster-name> [aws-region]
#
# Example: ./cleanup-rosa-orphaned-resources.sh jen-rosa-hcp us-west-2
# ============================================================================

set -e

CLUSTER_NAME=$1
AWS_REGION=${2:-us-west-2}

if [ -z "$CLUSTER_NAME" ]; then
    echo "❌ Error: Cluster name required"
    echo ""
    echo "Usage: $0 <cluster-name> [aws-region]"
    echo ""
    echo "Example:"
    echo "  $0 jen-rosa-hcp us-west-2"
    exit 1
fi

echo "========================================"
echo "ROSA HCP Orphaned Resource Cleanup"
echo "========================================"
echo "Cluster: $CLUSTER_NAME"
echo "Region: $AWS_REGION"
echo ""

# Function to check if AWS CLI is configured
check_aws_credentials() {
    if ! aws sts get-caller-identity &>/dev/null; then
        echo "❌ Error: AWS credentials not configured"
        echo "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
        exit 1
    fi
    echo "✅ AWS credentials verified"
}

# Function to find resources by tag
find_vpc_by_name() {
    local stack_name=$1
    # Extract VPC ID from CloudFormation stack resources
    aws cloudformation describe-stack-resources \
        --stack-name "$stack_name" \
        --region "$AWS_REGION" \
        --query 'StackResources[?ResourceType==`AWS::EC2::VPC`].PhysicalResourceId' \
        --output text 2>/dev/null || echo ""
}

# Function to delete ENIs
delete_enis() {
    local vpc_id=$1
    echo ""
    echo "🔍 Checking for ENIs in VPC $vpc_id..."

    local enis=$(aws ec2 describe-network-interfaces \
        --filters "Name=vpc-id,Values=$vpc_id" \
        --region "$AWS_REGION" \
        --query 'NetworkInterfaces[*].NetworkInterfaceId' \
        --output text)

    if [ -z "$enis" ]; then
        echo "  ✅ No ENIs found"
        return 0
    fi

    echo "  Found ENIs: $enis"
    for eni in $enis; do
        echo "  Deleting ENI $eni..."
        aws ec2 delete-network-interface \
            --network-interface-id "$eni" \
            --region "$AWS_REGION" 2>&1 || echo "  ⚠️  Failed (may be attached)"
    done
}

# Function to delete security groups
delete_security_groups() {
    local vpc_id=$1
    echo ""
    echo "🔍 Checking for security groups in VPC $vpc_id..."

    local sgs=$(aws ec2 describe-security-groups \
        --filters "Name=vpc-id,Values=$vpc_id" \
        --region "$AWS_REGION" \
        --query 'SecurityGroups[?GroupName!=`default`].GroupId' \
        --output text)

    if [ -z "$sgs" ]; then
        echo "  ✅ No non-default security groups found"
        return 0
    fi

    echo "  Found security groups: $sgs"
    for sg in $sgs; do
        echo "  Deleting security group $sg..."
        aws ec2 delete-security-group \
            --group-id "$sg" \
            --region "$AWS_REGION" 2>&1 || echo "  ⚠️  Failed (may have dependencies)"
    done
}

# Function to check VPC dependencies
check_vpc_dependencies() {
    local vpc_id=$1
    echo ""
    echo "🔍 Checking VPC dependencies for $vpc_id..."

    # Check for subnets
    local subnets=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$vpc_id" \
        --region "$AWS_REGION" \
        --query 'Subnets[*].SubnetId' \
        --output text)

    # Check for internet gateways
    local igws=$(aws ec2 describe-internet-gateways \
        --filters "Name=attachment.vpc-id,Values=$vpc_id" \
        --region "$AWS_REGION" \
        --query 'InternetGateways[*].InternetGatewayId' \
        --output text)

    # Check for route tables
    local rtbs=$(aws ec2 describe-route-tables \
        --filters "Name=vpc-id,Values=$vpc_id" \
        --region "$AWS_REGION" \
        --query 'RouteTables[?Associations[0].Main!=`true`].RouteTableId' \
        --output text)

    # Check for network ACLs
    local acls=$(aws ec2 describe-network-acls \
        --filters "Name=vpc-id,Values=$vpc_id" \
        --region "$AWS_REGION" \
        --query 'NetworkAcls[?IsDefault!=`true`].NetworkAclId' \
        --output text)

    # Display findings
    echo "  Subnets: ${subnets:-none}"
    echo "  Internet Gateways: ${igws:-none}"
    echo "  Route Tables (non-main): ${rtbs:-none}"
    echo "  Network ACLs (non-default): ${acls:-none}"

    # Return 0 if no dependencies, 1 if dependencies found
    if [ -z "$subnets" ] && [ -z "$igws" ] && [ -z "$rtbs" ] && [ -z "$acls" ]; then
        return 0
    else
        return 1
    fi
}

# Function to delete VPC
delete_vpc() {
    local vpc_id=$1
    echo ""
    echo "🗑️  Attempting to delete VPC $vpc_id..."

    if check_vpc_dependencies "$vpc_id"; then
        echo "  ✅ No dependencies found, safe to delete"
    else
        echo "  ⚠️  WARNING: Dependencies still exist"
        echo "  VPC deletion may fail"
    fi

    if aws ec2 delete-vpc --vpc-id "$vpc_id" --region "$AWS_REGION" 2>&1; then
        echo "  ✅ VPC deleted successfully"
        return 0
    else
        echo "  ❌ VPC deletion failed"
        return 1
    fi
}

# Main execution
main() {
    check_aws_credentials

    # Determine stack name
    STACK_NAME="${CLUSTER_NAME}-network-stack"

    echo ""
    echo "🔍 Looking for CloudFormation stack: $STACK_NAME"

    # Check if stack exists
    if ! aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" &>/dev/null; then
        echo "⚠️  Stack not found: $STACK_NAME"
        echo ""
        echo "Searching for VPC by cluster name tag..."

        VPC_ID=$(aws ec2 describe-vpcs \
            --filters "Name=tag:cluster.x-k8s.io/cluster-name,Values=$CLUSTER_NAME" \
            --region "$AWS_REGION" \
            --query 'Vpcs[0].VpcId' \
            --output text 2>/dev/null)

        if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
            echo "✅ No orphaned VPC found for cluster $CLUSTER_NAME"
            echo "All resources appear to be cleaned up!"
            exit 0
        fi
    else
        echo "✅ Found CloudFormation stack"

        # Get stack status
        STACK_STATUS=$(aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --region "$AWS_REGION" \
            --query 'Stacks[0].StackStatus' \
            --output text)

        echo "Stack Status: $STACK_STATUS"

        # Get VPC ID from stack
        VPC_ID=$(find_vpc_by_name "$STACK_NAME")
    fi

    if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
        echo "✅ No VPC found in stack"
        exit 0
    fi

    echo ""
    echo "Found VPC: $VPC_ID"

    # Clean up resources in order
    delete_enis "$VPC_ID"
    delete_security_groups "$VPC_ID"

    # Attempt VPC deletion
    if delete_vpc "$VPC_ID"; then
        echo ""
        echo "========================================"
        echo "✅ CLEANUP COMPLETE!"
        echo "========================================"
        echo "VPC $VPC_ID has been deleted"
        echo ""

        # If stack exists and is in DELETE_FAILED, retry deletion
        if [ "$STACK_STATUS" = "DELETE_FAILED" ]; then
            echo "Retrying CloudFormation stack deletion..."
            if aws cloudformation delete-stack \
                --stack-name "$STACK_NAME" \
                --region "$AWS_REGION" 2>&1; then
                echo "✅ Stack deletion initiated"
            else
                echo "⚠️  Stack deletion failed, may need manual cleanup"
            fi
        fi
    else
        echo ""
        echo "========================================"
        echo "⚠️  CLEANUP INCOMPLETE"
        echo "========================================"
        echo "VPC $VPC_ID could not be deleted"
        echo ""
        echo "Next steps:"
        echo "1. Check VPC in AWS Console for remaining dependencies"
        echo "2. Manually delete blocking resources"
        echo "3. Run this script again"
    fi
}

# Run main function
main
