#!/usr/bin/env python3
"""
ROSA Automation UI Backend
FastAPI-based backend for the ROSA cluster automation interface
"""

from fastapi import FastAPI, HTTPException, WebSocket, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import asyncio
import json
import subprocess
import uuid
from datetime import datetime
import os
import yaml

app = FastAPI(title="ROSA Automation API", version="1.0.0")

# Add production endpoints (health checks, metrics, monitoring)
try:
    from app_extensions import add_production_endpoints

    add_production_endpoints(app)
except ImportError:
    print("⚠️  app_extensions not available - production endpoints not loaded")

# CORS middleware for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo (use Redis/DB in production)
jobs: Dict[str, dict] = {}
clusters: Dict[str, dict] = {}

# Simple cache for ROSA status to avoid repeated subprocess calls
rosa_status_cache = {"data": None, "timestamp": 0, "ttl": 30}  # Cache for 30 seconds

# Simple cache for OCP connection status to avoid repeated subprocess calls
ocp_status_cache = {
    "data": None,
    "timestamp": 0,
    "ttl": 60,  # Cache for 60 seconds (longer since connection tests are slower)
}

# Store last used YAML file path for ROSA HCP provisioning
last_rosa_yaml_path = {"path": None}


# Pydantic models
class ClusterConfig(BaseModel):
    name: str
    version: str = "4.20.0"
    region: str = "us-west-2"
    instance_type: str = "m5.xlarge"
    min_replicas: int = 2
    max_replicas: int = 3
    network_automation: bool = True
    role_automation: bool = False
    availability_zones: List[str] = ["us-west-2a", "us-west-2b"]
    cidr_block: str = "10.0.0.0/16"
    tags: Dict[str, str] = {}

    # Manual network configuration (used when network_automation=False)
    subnets: Optional[List[str]] = None
    vpc_id: Optional[str] = None

    # Manual IAM role configuration (used when role_automation=False)
    installer_role_arn: Optional[str] = None
    support_role_arn: Optional[str] = None
    worker_role_arn: Optional[str] = None
    oidc_id: Optional[str] = None

    # Operator roles
    ingress_arn: Optional[str] = None
    image_registry_arn: Optional[str] = None
    storage_arn: Optional[str] = None
    network_arn: Optional[str] = None
    kube_cloud_controller_arn: Optional[str] = None
    node_pool_management_arn: Optional[str] = None
    control_plane_operator_arn: Optional[str] = None
    kms_provider_arn: Optional[str] = None


class JobStatus(BaseModel):
    id: str
    status: str  # pending, running, completed, failed
    progress: int  # 0-100
    message: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    logs: List[str] = []


# Helper functions
def run_ansible_playbook(playbook: str, config: dict, job_id: str):
    """Run ansible playbook asynchronously"""
    try:
        jobs[job_id]["status"] = "running"
        jobs[job_id]["progress"] = 10
        jobs[job_id]["message"] = f"Starting {playbook} execution"

        # Prepare ansible command
        cmd = [
            "ansible-playbook",
            playbook,
            "-e",
            f"cluster_name={config['name']}",
            "-e",
            f"openshift_version={config['version']}",
            "-e",
            f"aws_region={config['region']}",
            "-e",
            "skip_ansible_runner=true",
        ]

        # Add network automation flag or manual network values
        if config.get("network_automation"):
            cmd.extend(["-e", "enable_network_automation=true"])
        else:
            # Pass manual network configuration
            if config.get("subnets"):
                subnets_str = ",".join(config["subnets"])
                cmd.extend(["-e", f"manual_subnets={subnets_str}"])
            if config.get("vpc_id"):
                cmd.extend(["-e", f"manual_vpc_id={config['vpc_id']}"])

        # Add role automation flag or manual role values
        if config.get("role_automation"):
            cmd.extend(["-e", "enable_role_automation=true"])
        else:
            # Pass manual IAM role configuration
            if config.get("installer_role_arn"):
                cmd.extend(["-e", f"manual_installer_role_arn={config['installer_role_arn']}"])
            if config.get("support_role_arn"):
                cmd.extend(["-e", f"manual_support_role_arn={config['support_role_arn']}"])
            if config.get("worker_role_arn"):
                cmd.extend(["-e", f"manual_worker_role_arn={config['worker_role_arn']}"])
            if config.get("oidc_id"):
                cmd.extend(["-e", f"manual_oidc_id={config['oidc_id']}"])

            # Pass operator role ARNs
            if config.get("ingress_arn"):
                cmd.extend(["-e", f"manual_ingress_arn={config['ingress_arn']}"])
            if config.get("image_registry_arn"):
                cmd.extend(["-e", f"manual_image_registry_arn={config['image_registry_arn']}"])
            if config.get("storage_arn"):
                cmd.extend(["-e", f"manual_storage_arn={config['storage_arn']}"])
            if config.get("network_arn"):
                cmd.extend(["-e", f"manual_network_arn={config['network_arn']}"])
            if config.get("kube_cloud_controller_arn"):
                cmd.extend(
                    [
                        "-e",
                        f"manual_kube_cloud_controller_arn={config['kube_cloud_controller_arn']}",
                    ]
                )
            if config.get("node_pool_management_arn"):
                cmd.extend(
                    ["-e", f"manual_node_pool_management_arn={config['node_pool_management_arn']}"]
                )
            if config.get("control_plane_operator_arn"):
                cmd.extend(
                    [
                        "-e",
                        f"manual_control_plane_operator_arn={config['control_plane_operator_arn']}",
                    ]
                )
            if config.get("kms_provider_arn"):
                cmd.extend(["-e", f"manual_kms_provider_arn={config['kms_provider_arn']}"])

        jobs[job_id]["progress"] = 30
        jobs[job_id]["message"] = "Executing ansible playbook"

        # Run the command (use parent directory of ui/ as working directory)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        result = subprocess.run(
            cmd,
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=1800,  # 30 minutes timeout
        )

        if result.returncode == 0:
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["progress"] = 100
            jobs[job_id]["message"] = "Cluster creation completed successfully"
        else:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["message"] = f"Playbook failed: {result.stderr}"

        jobs[job_id]["logs"].extend(result.stdout.split("\n"))
        jobs[job_id]["completed_at"] = datetime.now()

    except subprocess.TimeoutExpired:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["message"] = "Job timed out after 30 minutes"
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["message"] = f"Error: {str(e)}"


# API Routes
@app.get("/")
async def root():
    return {"message": "ROSA Automation API", "version": "1.0.0"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now()}


@app.get("/api/versions")
async def get_supported_versions():
    """Get supported OpenShift versions"""
    return {
        "supported_versions": ["4.18", "4.19", "4.20"],
        "default_version": "4.20",
        "recommended_version": "4.20.0",
    }


@app.get("/api/templates")
async def get_templates():
    """Get available cluster templates"""
    return {
        "templates": [
            {
                "id": "rosa-network-basic",
                "name": "ROSA with Network Automation",
                "description": "Basic ROSA HCP cluster with automated VPC/subnet creation",
                "features": ["network_automation"],
                "version": "4.20",
            },
            {
                "id": "rosa-full-automation",
                "name": "ROSA Full Automation",
                "description": "ROSA HCP cluster with network and role automation",
                "features": ["network_automation", "role_automation"],
                "version": "4.20",
            },
        ]
    }


@app.post("/api/analyze-yaml")
async def analyze_yaml(request: Request):
    """Analyze uploaded YAML to detect network and IAM configuration intent"""
    try:
        body = await request.json()
        yaml_content = body.get("yaml_content")

        if not yaml_content:
            raise HTTPException(status_code=400, detail="No YAML content provided")

        # Parse YAML documents
        documents = list(yaml.safe_load_all(yaml_content))

        # Initialize detection results
        has_rosa_network = False
        has_rosa_role_config = False
        has_manual_subnets = False
        has_manual_roles = False
        has_availability_zones = False

        rosa_control_plane = None

        # Analyze each document
        for doc in documents:
            if not doc:
                continue

            kind = doc.get("kind", "")

            # Check for ROSANetwork resource
            if kind == "ROSANetwork":
                has_rosa_network = True

            # Check for RosaRoleConfig resource
            if kind == "RosaRoleConfig":
                has_rosa_role_config = True

            # Check for ROSAControlPlane with manual configuration
            if kind == "ROSAControlPlane":
                rosa_control_plane = doc
                spec = doc.get("spec", {})

                # Check for manual network config
                if spec.get("subnets"):
                    has_manual_subnets = True
                if spec.get("availabilityZones"):
                    has_availability_zones = True

                # Check for manual IAM roles
                if spec.get("installerRoleARN") or spec.get("rolesRef"):
                    has_manual_roles = True

        # Determine intent
        network_intent = None
        role_intent = None

        if has_rosa_network:
            network_intent = "automated"
        elif has_manual_subnets and has_availability_zones:
            network_intent = "manual"

        if has_rosa_role_config:
            role_intent = "automated"
        elif has_manual_roles:
            role_intent = "manual"

        # Generate user-friendly messages
        messages = []

        if network_intent == "manual":
            messages.append(
                "✓ Detected manual network configuration: You've specified subnets and availability zones. These will be used for your cluster."
            )
        elif network_intent == "automated":
            messages.append(
                "✓ Detected ROSANetwork automation: VPC and subnets will be created automatically using CloudFormation."
            )

        if role_intent == "manual":
            messages.append(
                "✓ Detected manual IAM roles: You've specified custom IAM roles. These will be used for your cluster."
            )
        elif role_intent == "automated":
            messages.append(
                "✓ Detected RosaRoleConfig automation: IAM roles and OIDC provider will be created automatically."
            )

        # Extract configuration values if manual
        config_values = {}
        if rosa_control_plane and network_intent == "manual":
            spec = rosa_control_plane.get("spec", {})
            config_values["subnets"] = spec.get("subnets", [])
            config_values["availability_zones"] = spec.get("availabilityZones", [])

        if rosa_control_plane and role_intent == "manual":
            spec = rosa_control_plane.get("spec", {})
            config_values["installer_role_arn"] = spec.get("installerRoleARN")
            config_values["support_role_arn"] = spec.get("supportRoleARN")
            config_values["worker_role_arn"] = spec.get("workerRoleARN")
            config_values["oidc_id"] = spec.get("oidcID")

            roles_ref = spec.get("rolesRef", {})
            config_values["ingress_arn"] = roles_ref.get("ingressARN")
            config_values["image_registry_arn"] = roles_ref.get("imageRegistryARN")
            config_values["storage_arn"] = roles_ref.get("storageARN")
            config_values["network_arn"] = roles_ref.get("networkARN")
            config_values["kube_cloud_controller_arn"] = roles_ref.get("kubeCloudControllerARN")
            config_values["node_pool_management_arn"] = roles_ref.get("nodePoolManagementARN")
            config_values["control_plane_operator_arn"] = roles_ref.get("controlPlaneOperatorARN")
            config_values["kms_provider_arn"] = roles_ref.get("kmsProviderARN")

        return {
            "network_intent": network_intent,
            "role_intent": role_intent,
            "messages": messages,
            "config_values": config_values,
            "has_rosa_control_plane": rosa_control_plane is not None,
        }

    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing YAML: {str(e)}")


@app.post("/api/clusters")
async def create_cluster(config: ClusterConfig, background_tasks: BackgroundTasks):
    """Create a new ROSA cluster"""

    # Generate unique IDs
    cluster_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    # Store cluster config
    clusters[cluster_id] = {
        "id": cluster_id,
        "config": config.dict(),
        "job_id": job_id,
        "created_at": datetime.now(),
        "status": "creating",
    }

    # Create job
    jobs[job_id] = {
        "id": job_id,
        "cluster_id": cluster_id,
        "status": "pending",
        "progress": 0,
        "message": "Job queued for execution",
        "started_at": datetime.now(),
        "logs": [],
    }

    # Use the new automated ROSA HCP playbook
    playbook = "create_rosa_hcp_automated.yaml"

    # Map frontend config to playbook extra_vars
    extra_vars = {
        "cluster_name": config.name,
        "openshift_version": config.version,
        "aws_region": config.region,
        "create_rosa_roles": config.role_automation,
        "create_rosa_network": config.network_automation,
        "network_cidr": config.cidr_block,
        "availability_zone_count": len(config.availability_zones),
    }

    # Start background task
    background_tasks.add_task(run_ansible_playbook, playbook, extra_vars, job_id)

    return {
        "cluster_id": cluster_id,
        "job_id": job_id,
        "message": "Cluster creation started",
        "status": "pending",
    }


@app.get("/api/clusters/{cluster_id}")
async def get_cluster(cluster_id: str):
    """Get cluster information"""
    if cluster_id not in clusters:
        raise HTTPException(status_code=404, detail="Cluster not found")

    cluster = clusters[cluster_id]
    job_id = cluster["job_id"]

    # Get job status
    job_status = jobs.get(job_id, {})

    return {"cluster": cluster, "job": job_status}


@app.delete("/api/clusters/{cluster_id}")
async def delete_cluster(cluster_id: str, background_tasks: BackgroundTasks):
    """Delete a ROSA cluster"""
    if cluster_id not in clusters:
        raise HTTPException(status_code=404, detail="Cluster not found")

    cluster = clusters[cluster_id]
    job_id = str(uuid.uuid4())

    # Create deletion job
    jobs[job_id] = {
        "id": job_id,
        "cluster_id": cluster_id,
        "status": "pending",
        "progress": 0,
        "message": "Cluster deletion queued",
        "started_at": datetime.now(),
        "logs": [],
    }

    # Start deletion task
    background_tasks.add_task(
        run_ansible_playbook, "delete_rosa_hcp_cluster.yaml", cluster["config"], job_id
    )

    return {"job_id": job_id, "message": "Cluster deletion started"}


@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return jobs[job_id]


@app.get("/api/jobs/{job_id}/logs")
async def get_job_logs(job_id: str):
    """Get job logs"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"logs": jobs[job_id].get("logs", [])}


@app.websocket("/ws/jobs/{job_id}")
async def websocket_job_updates(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time job updates"""
    await websocket.accept()

    if job_id not in jobs:
        await websocket.close(code=1003, reason="Job not found")
        return

    try:
        last_progress = -1
        while True:
            job = jobs.get(job_id, {})
            current_progress = job.get("progress", 0)

            # Send update if progress changed
            if current_progress != last_progress:
                await websocket.send_json(
                    {
                        "job_id": job_id,
                        "status": job.get("status", "unknown"),
                        "progress": current_progress,
                        "message": job.get("message", ""),
                        "timestamp": datetime.now().isoformat(),
                    }
                )
                last_progress = current_progress

            # Close connection if job completed
            if job.get("status") in ["completed", "failed"]:
                break

            await asyncio.sleep(2)  # Update every 2 seconds

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()


# User Journey APIs
@app.get("/api/onboarding/tour")
async def get_onboarding_tour():
    """Get guided onboarding tour steps"""
    return {
        "steps": [
            {
                "id": 1,
                "title": "Welcome to ROSA Automation",
                "content": "ROSA (Red Hat OpenShift Service on AWS) lets you run OpenShift clusters on AWS with full automation.",
                "duration": "2 minutes",
                "video_url": None,
            },
            {
                "id": 2,
                "title": "What You'll Need",
                "content": "To get started, you'll need an AWS account and the ROSA CLI installed.",
                "checklist": [
                    {"item": "AWS Account with appropriate permissions", "checked": False},
                    {"item": "ROSA CLI installed and authenticated", "checked": False},
                    {"item": "OpenShift Cluster Manager account", "checked": False},
                ],
            },
            {
                "id": 3,
                "title": "Automation Features",
                "content": "Our automation can handle network setup (VPCs, subnets) and AWS role configuration automatically.",
                "features": [
                    {
                        "name": "ROSANetwork (ACM-21174)",
                        "description": "Automated VPC and subnet creation",
                    },
                    {
                        "name": "ROSARoleConfig (ACM-21162)",
                        "description": "Automated AWS IAM role setup",
                    },
                ],
            },
        ]
    }


@app.get("/api/diagnostics/checks")
async def get_available_diagnostic_checks():
    """Get list of available diagnostic checks"""
    return {
        "checks": [
            {
                "id": "aws_credentials",
                "name": "AWS Credentials",
                "description": "Verify AWS CLI configuration",
            },
            {
                "id": "rosa_auth",
                "name": "ROSA Authentication",
                "description": "Check ROSA CLI login status",
            },
            {
                "id": "openshift_version",
                "name": "OpenShift Version Support",
                "description": "Verify supported versions",
            },
            {
                "id": "network_connectivity",
                "name": "Network Connectivity",
                "description": "Test AWS API connectivity",
            },
            {
                "id": "permissions",
                "name": "IAM Permissions",
                "description": "Verify required AWS permissions",
            },
        ]
    }


@app.post("/api/diagnostics/run")
async def run_diagnostics(request: dict):
    """Run diagnostic checks"""
    checks_to_run = request.get("checks", [])

    # Run actual diagnostic checks
    results = []
    for check_id in checks_to_run:
        if check_id == "aws_credentials":
            # Mock AWS check for now
            results.append(
                {
                    "check": "aws_credentials",
                    "name": "AWS Credentials",
                    "status": "pass",
                    "message": "✅ AWS credentials are valid",
                    "details": "Account: 123456789012, Region: us-west-2",
                }
            )
        elif check_id == "rosa_auth":
            # Get actual ROSA status
            rosa_status = await get_rosa_status()
            if rosa_status["authenticated"]:
                user_display = rosa_status.get("user_info", {}).get("aws_account_id", "Unknown")
                results.append(
                    {
                        "check": "rosa_auth",
                        "name": "ROSA Authentication",
                        "status": "pass",
                        "message": f"✅ ROSA CLI authenticated",
                        "details": f"Account: {user_display}",
                        "raw_output": rosa_status.get("raw_output", ""),
                    }
                )
            else:
                results.append(
                    {
                        "check": "rosa_auth",
                        "name": "ROSA Authentication",
                        "status": "fail",
                        "message": f"❌ {rosa_status['message']}",
                        "fix": rosa_status.get(
                            "suggestion",
                            "Run 'rosa login --env staging --use-auth-code' to authenticate",
                        ),
                        "command": rosa_status.get(
                            "fix_command", "rosa login --env staging --use-auth-code"
                        ),
                        "error": rosa_status.get("error", ""),
                    }
                )
        elif check_id == "openshift_version":
            results.append(
                {
                    "check": "openshift_version",
                    "name": "OpenShift Version Support",
                    "status": "pass",
                    "message": "✅ OpenShift 4.20 is supported",
                    "details": "Available versions: 4.18, 4.19, 4.20",
                }
            )

    return {"results": results}


@app.get("/api/environment/overview")
async def get_environment_overview():
    """Get comprehensive environment overview"""
    return {
        "aws": {
            "account_id": "123456789012",
            "region": "us-west-2",
            "credentials_status": "valid",
            "last_verified": datetime.now().isoformat(),
        },
        "rosa": {
            "authenticated": True,
            "organization": "Red Hat",
            "subscription_status": "active",
            "console_url": "https://console.redhat.com/openshift",
        },
        "clusters": [
            {
                "name": "tfitzger-rosa-hcp-capi-test",
                "status": "error",
                "version": "4.18.9",
                "region": "us-west-2",
                "node_count": 0,
                "created": "2025-08-11T00:00:00Z",
                "error_message": "Cluster provisioning failed - check AWS permissions",
                "upgrade_available": "4.20.0",
                "automation_used": False,
            }
        ],
        "automation_status": {
            "network_automation_available": True,
            "role_automation_available": True,
            "templates_count": 2,
            "could_have_prevented_issues": True,
        },
        "recommendations": [
            "🚨 Your cluster 'tfitzger-rosa-hcp-capi-test' is in error state - run diagnostics",
            "⬆️ Consider upgrading from OpenShift 4.18.9 to 4.20.0 for better stability",
            "🔧 Use ROSANetwork automation to prevent networking issues in future clusters",
            "📋 Review our troubleshooting guide for cluster error resolution",
        ],
        "alerts": [
            {
                "type": "error",
                "message": "1 cluster in error state requires attention",
                "action": "Run diagnostics",
                "severity": "high",
            },
            {
                "type": "info",
                "message": "Automation features available to improve reliability",
                "action": "Learn about automation",
                "severity": "medium",
            },
        ],
    }


@app.get("/api/rosa/status")
async def get_rosa_status():
    """Check ROSA CLI authentication status"""
    import time

    # Check if we have cached data that's still valid
    current_time = time.time()
    if (
        rosa_status_cache["data"] is not None
        and current_time - rosa_status_cache["timestamp"] < rosa_status_cache["ttl"]
    ):
        return rosa_status_cache["data"]

    try:
        # Use synchronous subprocess with very short timeout for better reliability
        result = subprocess.run(
            ["rosa", "whoami"], capture_output=True, text=True, timeout=5  # Very short timeout
        )

        if result.returncode == 0:
            # Parse rosa whoami output
            output_lines = result.stdout.split("\n")
            user_info = {}

            for line in output_lines:
                if ":" in line:
                    key, value = line.split(":", 1)
                    user_info[key.strip().lower().replace(" ", "_")] = value.strip()

            response_data = {
                "authenticated": True,
                "status": "success",
                "message": "ROSA CLI is authenticated and ready",
                "user_info": user_info,
                "raw_output": result.stdout,
                "command": "rosa whoami",
                "last_checked": datetime.now().isoformat(),
            }

            # Cache the successful response
            rosa_status_cache["data"] = response_data
            rosa_status_cache["timestamp"] = current_time

            return response_data
        else:
            # Parse error to provide helpful guidance
            error_msg = result.stderr if result.stderr else "Unknown error"

            if "not logged in" in error_msg.lower() or "authentication" in error_msg.lower():
                fix_command = "rosa login --env staging --use-auth-code"
                suggestion = "Run 'rosa login --env staging --use-auth-code' to authenticate with the ROSA staging environment"
            elif "command not found" in error_msg.lower():
                fix_command = "Install ROSA CLI"
                suggestion = (
                    "Install the ROSA CLI from https://console.redhat.com/openshift/downloads"
                )
            else:
                fix_command = "rosa whoami"
                suggestion = "Check your ROSA CLI installation and network connectivity"

            return {
                "authenticated": False,
                "status": "error",
                "message": f"ROSA CLI authentication failed: {error_msg}",
                "error": error_msg,
                "fix_command": fix_command,
                "suggestion": suggestion,
                "last_checked": datetime.now().isoformat(),
            }

    except subprocess.TimeoutExpired:
        return {
            "authenticated": False,
            "status": "timeout",
            "message": "ROSA CLI command timed out after 5 seconds",
            "error": "Command execution timed out",
            "fix_command": "rosa whoami",
            "suggestion": "Check your network connectivity and try again",
            "last_checked": datetime.now().isoformat(),
        }
    except FileNotFoundError:
        return {
            "authenticated": False,
            "status": "not_installed",
            "message": "ROSA CLI is not installed",
            "error": "ROSA CLI not found in PATH",
            "fix_command": "Install ROSA CLI",
            "suggestion": "Install the ROSA CLI from https://console.redhat.com/openshift/downloads",
            "last_checked": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "authenticated": False,
            "status": "error",
            "message": f"Unexpected error checking ROSA status: {str(e)}",
            "error": str(e),
            "fix_command": "rosa whoami",
            "suggestion": "Check your ROSA CLI installation and try again",
            "last_checked": datetime.now().isoformat(),
        }


@app.get("/api/config/status")
async def get_config_status():
    """Check if vars/user_vars.yml has been properly configured"""
    try:
        # Path to user_vars.yml relative to the project root
        # Go up from ui/backend/app.py -> ui/backend -> ui -> automation-capi (project root)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        config_path = os.path.join(project_root, "vars", "user_vars.yml")

        if not os.path.exists(config_path):
            return {
                "configured": False,
                "status": "missing",
                "message": "vars/user_vars.yml file not found",
                "missing_fields": [],
                "empty_fields": [],
                "suggestion": "Create vars/user_vars.yml from the template",
                "last_checked": datetime.now().isoformat(),
            }

        # Read and parse the YAML file
        with open(config_path, "r") as file:
            config = yaml.safe_load(file) or {}

        # Required fields that must be configured
        required_fields = {
            "OCP_HUB_API_URL": "OpenShift Hub API URL",
            "OCP_HUB_CLUSTER_USER": "OpenShift Hub Username",
            "OCP_HUB_CLUSTER_PASSWORD": "OpenShift Hub Password",
            "AWS_REGION": "AWS Region",
            "AWS_ACCESS_KEY_ID": "AWS Access Key ID",
            "AWS_SECRET_ACCESS_KEY": "AWS Secret Access Key",
            "OCM_CLIENT_ID": "OpenShift Cluster Manager Client ID",
            "OCM_CLIENT_SECRET": "OpenShift Cluster Manager Client Secret",
        }

        # Check which fields are missing or empty
        missing_fields = []
        empty_fields = []
        configured_fields = []

        for field, description in required_fields.items():
            if field not in config:
                missing_fields.append({"field": field, "description": description})
            elif not config[field] or str(config[field]).strip() == "":
                empty_fields.append({"field": field, "description": description})
            else:
                configured_fields.append({"field": field, "description": description})

        # Determine overall status
        total_required = len(required_fields)
        total_configured = len(configured_fields)

        if total_configured == total_required:
            status = "fully_configured"
            message = "All required credentials are configured"
        elif total_configured > 0:
            status = "partially_configured"
            message = f"{total_configured}/{total_required} credentials configured"
        else:
            status = "not_configured"
            message = "No credentials have been configured"

        return {
            "configured": total_configured == total_required,
            "status": status,
            "message": message,
            "total_required": total_required,
            "total_configured": total_configured,
            "configured_fields": configured_fields,
            "missing_fields": missing_fields,
            "empty_fields": empty_fields,
            "suggestion": "Configure the missing credentials in vars/user_vars.yml",
            "config_file_path": "vars/user_vars.yml",
            "last_checked": datetime.now().isoformat(),
        }

    except yaml.YAMLError as e:
        return {
            "configured": False,
            "status": "invalid_yaml",
            "message": f"Invalid YAML format in vars/user_vars.yml: {str(e)}",
            "missing_fields": [],
            "empty_fields": [],
            "suggestion": "Fix the YAML syntax errors in vars/user_vars.yml",
            "last_checked": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "configured": False,
            "status": "error",
            "message": f"Error reading configuration: {str(e)}",
            "missing_fields": [],
            "empty_fields": [],
            "suggestion": "Check file permissions and try again",
            "last_checked": datetime.now().isoformat(),
        }


@app.post("/api/kind/verify-cluster")
async def verify_kind_cluster(request: dict):
    """Verify if a Kind cluster exists and is accessible"""
    cluster_name = request.get("cluster_name", "").strip()

    if not cluster_name:
        return {
            "exists": False,
            "accessible": False,
            "message": "Cluster name is required",
            "suggestion": "Please provide a valid Kind cluster name",
        }

    try:
        # Check if Kind is installed
        kind_check = subprocess.run(
            ["kind", "--version"], capture_output=True, text=True, timeout=10
        )

        if kind_check.returncode != 0:
            return {
                "exists": False,
                "accessible": False,
                "message": "Kind is not installed",
                "suggestion": "Install Kind first: brew install kind (macOS) or download from https://kind.sigs.k8s.io/",
                "cluster_name": cluster_name,
            }

        # Check if Kind cluster context exists in kubeconfig
        # This works even when cluster was created on host (not in container)
        context_name = f"kind-{cluster_name}"
        context_check = subprocess.run(
            ["kubectl", "config", "get-contexts", context_name],
            capture_output=True,
            text=True,
            timeout=10,
        )

        cluster_exists = context_check.returncode == 0

        if not cluster_exists:
            # List available Kind contexts for suggestion
            contexts_result = subprocess.run(
                ["kubectl", "config", "get-contexts", "-o", "name"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            all_contexts = (
                contexts_result.stdout.strip().split("\n")
                if contexts_result.returncode == 0
                else []
            )
            available_kind_clusters = [
                ctx.replace("kind-", "") for ctx in all_contexts if ctx.startswith("kind-")
            ]

            return {
                "exists": False,
                "accessible": False,
                "message": f"Kind cluster '{cluster_name}' does not exist",
                "suggestion": f"Create the cluster with: kind create cluster --name {cluster_name}",
                "cluster_name": cluster_name,
                "available_clusters": available_kind_clusters,
            }

        # Test cluster accessibility with kubectl
        try:
            # Get cluster context name
            context_name = f"kind-{cluster_name}"

            # Test kubectl access
            kubectl_test = subprocess.run(
                ["kubectl", "cluster-info", "--context", context_name],
                capture_output=True,
                text=True,
                timeout=15,
            )

            if kubectl_test.returncode == 0:
                # Get cluster info
                cluster_info = {}
                if "Kubernetes control plane" in kubectl_test.stdout:
                    for line in kubectl_test.stdout.split("\n"):
                        if "Kubernetes control plane" in line:
                            # Extract API URL
                            import re

                            url_match = re.search(r"https?://[^\s]+", line)
                            if url_match:
                                cluster_info["api_url"] = url_match.group()

                # Check for components in the cluster
                components = {"checks_passed": 0, "warnings": 0, "failed": 0, "details": []}

                # Check AWS credentials secret
                aws_creds_check = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        "secret",
                        "capa-manager-bootstrap-credentials",
                        "-n",
                        "capa-system",
                        "--context",
                        context_name,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if aws_creds_check.returncode == 0:
                    components["checks_passed"] += 1
                    components["details"].append(
                        {
                            "name": "AWS Credentials",
                            "status": "configured",
                            "message": "AWS credentials secret found",
                        }
                    )
                else:
                    components["warnings"] += 1
                    components["details"].append(
                        {
                            "name": "AWS Credentials",
                            "status": "not_configured",
                            "message": "AWS credentials secret not found in capa-system namespace",
                        }
                    )

                # Check OCM Client Secret (rosa-creds-secret)
                ocm_secret_check = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        "secret",
                        "rosa-creds-secret",
                        "-n",
                        "ns-rosa-hcp",
                        "--context",
                        context_name,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if ocm_secret_check.returncode == 0:
                    components["checks_passed"] += 1
                    components["details"].append(
                        {
                            "name": "OCM Client Secret",
                            "status": "configured",
                            "message": "ROSA credentials secret found",
                        }
                    )
                else:
                    components["failed"] += 1
                    components["details"].append(
                        {
                            "name": "OCM Client Secret",
                            "status": "missing",
                            "message": "ROSA credentials secret not found in ns-rosa-hcp namespace",
                        }
                    )

                cluster_info["components"] = components

                return {
                    "exists": True,
                    "accessible": True,
                    "message": f"Kind cluster '{cluster_name}' is running and accessible",
                    "cluster_name": cluster_name,
                    "context_name": context_name,
                    "cluster_info": cluster_info,
                    "suggestion": f"You can use this cluster for testing. Update your vars/user_vars.yml with the cluster details.",
                }
            else:
                return {
                    "exists": True,
                    "accessible": False,
                    "message": f"Kind cluster '{cluster_name}' exists but is not accessible",
                    "suggestion": f"The cluster may be stopped. Try: kind delete cluster --name {cluster_name} && kind create cluster --name {cluster_name}",
                    "cluster_name": cluster_name,
                    "error_details": kubectl_test.stderr,
                }

        except subprocess.TimeoutExpired:
            return {
                "exists": True,
                "accessible": False,
                "message": f"Kind cluster '{cluster_name}' exists but connection timed out",
                "suggestion": "The cluster may be unresponsive. Try recreating it.",
                "cluster_name": cluster_name,
            }

    except subprocess.TimeoutExpired:
        return {
            "exists": False,
            "accessible": False,
            "message": "Kind command timed out",
            "suggestion": "Check Kind installation and system performance",
            "cluster_name": cluster_name,
        }
    except Exception as e:
        return {
            "exists": False,
            "accessible": False,
            "message": f"Error checking Kind cluster: {str(e)}",
            "suggestion": "Check Kind installation and permissions",
            "cluster_name": cluster_name,
        }


@app.get("/api/kind/list-clusters")
async def list_kind_clusters():
    """List available Kind clusters"""
    try:
        # Check if Kind is installed
        kind_check = subprocess.run(
            ["kind", "--version"], capture_output=True, text=True, timeout=10
        )

        if kind_check.returncode != 0:
            return {
                "clusters": [],
                "kind_installed": False,
                "message": "Kind is not installed",
                "suggestion": "Install Kind first: brew install kind (macOS) or download from https://kind.sigs.k8s.io/",
            }

        # List Kind clusters from kubeconfig contexts
        # This works even when clusters were created on host (not in container)
        list_result = subprocess.run(
            ["kubectl", "config", "get-contexts", "-o", "name"],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if list_result.returncode != 0:
            return {
                "clusters": [],
                "kind_installed": True,
                "message": "Failed to list kubeconfig contexts",
                "suggestion": "Check kubectl installation and kubeconfig",
            }

        # Extract Kind cluster names from contexts (kind-* pattern)
        all_contexts = [
            line.strip() for line in list_result.stdout.strip().split("\n") if line.strip()
        ]
        clusters = [ctx.replace("kind-", "") for ctx in all_contexts if ctx.startswith("kind-")]

        return {
            "clusters": clusters,
            "kind_installed": True,
            "message": (
                f"Found {len(clusters)} Kind cluster(s)" if clusters else "No Kind clusters found"
            ),
            "suggestion": (
                "Create a cluster with: kind create cluster --name <cluster-name>"
                if not clusters
                else None
            ),
        }

    except Exception as e:
        return {
            "clusters": [],
            "kind_installed": False,
            "message": f"Error listing Kind clusters: {str(e)}",
            "suggestion": "Check Kind installation and permissions",
        }


@app.post("/api/kind/create-cluster")
async def create_kind_cluster(request: Request):
    """Create a new Kind cluster"""
    try:
        # Parse request body
        body = await request.json()
        cluster_name = body.get("cluster_name", "").strip()

        if not cluster_name:
            return {
                "success": False,
                "message": "Cluster name is required",
                "suggestion": "Provide a valid cluster name",
            }

        # Validate cluster name (Kubernetes naming conventions)
        import re

        name_pattern = re.compile(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$")
        if not name_pattern.match(cluster_name):
            return {
                "success": False,
                "message": "Invalid cluster name format",
                "suggestion": "Use lowercase letters, numbers, and hyphens only. Must start and end with alphanumeric character.",
            }

        # Check if Kind is installed
        kind_check = subprocess.run(
            ["kind", "--version"], capture_output=True, text=True, timeout=10
        )

        if kind_check.returncode != 0:
            return {
                "success": False,
                "message": "Kind is not installed",
                "suggestion": "Install Kind first: brew install kind (macOS) or download from https://kind.sigs.k8s.io/",
            }

        # Check if cluster already exists
        list_result = subprocess.run(
            ["kind", "get", "clusters"], capture_output=True, text=True, timeout=10
        )

        if list_result.returncode == 0:
            existing_clusters = [
                line.strip() for line in list_result.stdout.strip().split("\n") if line.strip()
            ]
            if cluster_name in existing_clusters:
                return {
                    "success": False,
                    "message": f"Cluster '{cluster_name}' already exists",
                    "suggestion": "Choose a different name or delete the existing cluster",
                }

        # Create the cluster
        create_result = subprocess.run(
            ["kind", "create", "cluster", "--name", cluster_name],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minutes timeout for cluster creation
        )

        if create_result.returncode != 0:
            return {
                "success": False,
                "message": f"Failed to create cluster: {create_result.stderr}",
                "suggestion": "Check Docker is running and you have sufficient resources",
            }

        # Verify the cluster was created and is accessible
        kubectl_test = subprocess.run(
            [
                "kubectl",
                "cluster-info",
                "--context",
                f"kind-{cluster_name}",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if kubectl_test.returncode == 0:
            return {
                "success": True,
                "message": f"Cluster '{cluster_name}' created successfully",
                "cluster_name": cluster_name,
                "context_name": f"kind-{cluster_name}",
                "output": create_result.stdout,
            }
        else:
            return {
                "success": True,
                "message": f"Cluster '{cluster_name}' created but verification failed",
                "cluster_name": cluster_name,
                "warning": "Cluster may need a moment to initialize",
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "message": "Cluster creation timed out",
            "suggestion": "This may take a while. Check 'kind get clusters' to see if it completed.",
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error creating Kind cluster: {str(e)}",
            "suggestion": "Check Kind installation and Docker daemon status",
        }


@app.post("/api/kind/create-ocm-secret")
async def create_ocm_secret(request: Request):
    """Create OCM client secret by running the create-ocmclient-secret.sh script"""
    try:
        # Parse request body
        body = await request.json()
        cluster_name = body.get("cluster_name", "").strip()

        if not cluster_name:
            return {
                "success": False,
                "message": "Cluster name is required",
            }

        # Script path - look in project root or home directory
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        script_paths = [
            os.path.join(project_root, "scripts", "create-ocmclient-secret.sh"),
            os.path.expanduser("~/create-ocmclient-secret.sh"),
        ]

        script_path = None
        for path in script_paths:
            if os.path.exists(path):
                script_path = path
                break

        if not script_path:
            return {
                "success": False,
                "message": f"Script not found. Looked in: {', '.join(script_paths)}",
                "suggestion": "Please create the script at one of the expected locations",
            }

        # Set the kubectl context for the script
        context_name = f"kind-{cluster_name}"

        # Run the script with the appropriate context
        # First, ensure the namespace exists
        ns_create = subprocess.run(
            ["kubectl", "create", "namespace", "ns-rosa-hcp", "--context", context_name],
            capture_output=True,
            text=True,
            timeout=30,
        )
        # Ignore error if namespace already exists

        # Run the script
        result = subprocess.run(
            ["bash", script_path],
            capture_output=True,
            text=True,
            timeout=60,
            env={
                **os.environ,
                "KUBECONFIG": os.environ.get("KUBECONFIG", os.path.expanduser("~/.kube/config")),
            },
        )

        if result.returncode == 0:
            return {
                "success": True,
                "message": "OCM client secret created successfully",
                "output": result.stdout,
            }
        else:
            return {
                "success": False,
                "message": f"Failed to create secret: {result.stderr}",
                "output": result.stdout,
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "message": "Script execution timed out",
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error creating OCM secret: {str(e)}",
        }


@app.post("/api/kind/execute-command")
async def execute_kind_command(request: Request):
    """Execute a kubectl command in the context of a Kind cluster"""
    try:
        # Parse request body
        body = await request.json()
        cluster_name = body.get("cluster_name", "").strip()
        command = body.get("command", "").strip()

        if not cluster_name:
            return {
                "success": False,
                "error": "Cluster name is required",
                "output": "",
            }

        if not command:
            return {
                "success": False,
                "error": "Command is required",
                "output": "",
            }

        # Security check: Only block truly dangerous file system and system commands
        # Allow kubectl/oc/rosa commands and aliases (which will be resolved by shell)

        # Only block destructive file system operations and system commands
        # Note: We allow 'oc delete' and 'kubectl delete' for Kubernetes resources
        dangerous_patterns = [
            r"\brm\s+-rf\s+/",  # rm -rf / or similar
            r"\bmkfs\b",  # format filesystem
            r"\bdd\b.*of=/dev",  # dd to device
            r"\bshutdown\b",
            r"\breboot\b",
            r"\bkillall\b",
            r":\(\)",  # fork bomb
        ]

        import re

        for pattern in dangerous_patterns:
            if re.search(pattern, command, re.IGNORECASE):
                return {
                    "success": False,
                    "error": "This command is not allowed for security reasons",
                    "output": "",
                }

        # Get kubeconfig for the Kind cluster
        kubeconfig_result = subprocess.run(
            ["kind", "get", "kubeconfig", "--name", cluster_name],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if kubeconfig_result.returncode != 0:
            return {
                "success": False,
                "error": f"Failed to get kubeconfig: {kubeconfig_result.stderr}",
                "output": "",
            }

        # Write kubeconfig to a temporary file
        import tempfile

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".kubeconfig") as f:
            f.write(kubeconfig_result.stdout)
            temp_kubeconfig = f.name

        try:
            # Use bash login shell with alias expansion
            user_shell = os.environ.get("SHELL", "/bin/bash")

            # Build a command that sources profile and runs the user command
            # Redirect stderr from sourcing to suppress "Restored session" messages
            wrapper_command = f"""
                # Source profile files silently
                [ -f ~/.profile ] && source ~/.profile 2>/dev/null
                [ -f ~/.bashrc ] && source ~/.bashrc 2>/dev/null
                [ -f ~/.bash_profile ] && source ~/.bash_profile 2>/dev/null
                # Enable alias expansion
                shopt -s expand_aliases 2>/dev/null || true
                # Run the actual command
                {command}
            """

            result = subprocess.run(
                [user_shell, "-c", wrapper_command],
                capture_output=True,
                text=True,
                timeout=60,
                env={**os.environ, "KUBECONFIG": temp_kubeconfig},
            )

            return {
                "success": result.returncode == 0,
                "output": result.stdout if result.stdout else result.stderr,
                "exit_code": result.returncode,
            }

        finally:
            # Clean up temporary kubeconfig
            if os.path.exists(temp_kubeconfig):
                os.unlink(temp_kubeconfig)

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Command execution timed out (60s limit)",
            "output": "",
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error executing command: {str(e)}",
            "output": "",
        }


@app.post("/api/kind/get-active-resources")
async def get_active_resources(request: Request):
    """Get active CAPI/ROSA resources from the Kind cluster"""
    try:
        body = await request.json()
        cluster_name = body.get("cluster_name", "").strip()
        namespace = body.get("namespace", "ns-rosa-hcp").strip()

        if not cluster_name:
            return {"success": False, "message": "Cluster name is required", "resources": []}

        context_name = f"kind-{cluster_name}"
        resources = []

        # Helper function to calculate age from creation timestamp
        def calculate_age(creation_timestamp):
            from datetime import datetime, timezone

            try:
                # Parse the Kubernetes timestamp
                created = datetime.fromisoformat(creation_timestamp.replace("Z", "+00:00"))
                now = datetime.now(timezone.utc)
                delta = now - created

                # Calculate human-readable duration
                days = delta.days
                hours, remainder = divmod(delta.seconds, 3600)
                minutes, seconds = divmod(remainder, 60)

                if days > 0:
                    return f"{days}d{hours}h"
                elif hours > 0:
                    return f"{hours}h{minutes}m"
                elif minutes > 0:
                    return f"{minutes}m{seconds}s"
                else:
                    return f"{seconds}s"
            except Exception:
                return "unknown"

        # Fetch CAPI Clusters
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "clusters.cluster.x-k8s.io",
                    "-n",
                    namespace,
                    "--context",
                    context_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    spec = item.get("spec", {})
                    status = item.get("status", {})
                    resources.append(
                        {
                            "type": "CAPI Clusters",
                            "name": metadata.get("name", "unknown"),
                            "version": spec.get("topology", {}).get("version", "v1.5.3"),
                            "status": (
                                "Ready"
                                if status.get("phase") == "Provisioned"
                                else status.get("phase", "Active")
                            ),
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        # Fetch ROSACluster
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "rosacluster",
                    "-n",
                    namespace,
                    "--context",
                    context_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    spec = item.get("spec", {})
                    status = item.get("status", {})

                    # Check for ready status - could be in status.ready field or in conditions
                    is_ready = False

                    # First check if there's a direct ready field
                    if status.get("ready") == True or status.get("ready") == "true":
                        is_ready = True
                    else:
                        # Check conditions for various ready condition types
                        conditions = status.get("conditions", [])
                        for condition in conditions:
                            condition_type = condition.get("type", "")
                            # Check for various possible ready condition types
                            if condition.get("status") == "True" and (
                                condition_type == "Ready"
                                or condition_type == "ROSAClusterReady"
                                or condition_type == "RosaClusterReady"
                            ):
                                is_ready = True
                                break

                    resources.append(
                        {
                            "type": "ROSACluster",
                            "name": metadata.get("name", "unknown"),
                            "version": spec.get("version", "v4.20"),
                            "status": "Ready" if is_ready else "Provisioning",
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        # Fetch RosaControlPlane
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "rosacontrolplane",
                    "-n",
                    namespace,
                    "--context",
                    context_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    spec = item.get("spec", {})
                    status = item.get("status", {})

                    # Check for ready status - could be in status.ready field or in conditions
                    is_ready = False

                    # First check if there's a direct ready field
                    if status.get("ready") == True or status.get("ready") == "true":
                        is_ready = True
                    else:
                        # Check conditions for various ready condition types
                        conditions = status.get("conditions", [])
                        for condition in conditions:
                            condition_type = condition.get("type", "")
                            # Check for various possible ready condition types
                            if condition.get("status") == "True" and (
                                condition_type == "Ready"
                                or condition_type == "ROSAControlPlaneReady"
                                or condition_type == "RosaControlPlaneReady"
                            ):
                                is_ready = True
                                break

                    resources.append(
                        {
                            "type": "RosaControlPlane",
                            "name": metadata.get("name", "unknown"),
                            "version": spec.get("version", "v4.20"),
                            "status": "Ready" if is_ready else "Provisioning",
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        # Fetch RosaNetwork
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "rosanetwork",
                    "-n",
                    namespace,
                    "--context",
                    context_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    spec = item.get("spec", {})
                    status = item.get("status", {})

                    # Check conditions for RosaNetwork ready state
                    # Could be ROSANetworkReady, RosaNetworkReady, or just Ready
                    is_ready = False
                    conditions = status.get("conditions", [])
                    for condition in conditions:
                        condition_type = condition.get("type", "")
                        # Check for various possible ready condition types
                        if condition.get("status") == "True" and (
                            condition_type == "ROSANetworkReady"
                            or condition_type == "RosaNetworkReady"
                            or condition_type == "Ready"
                        ):
                            is_ready = True
                            break

                    resources.append(
                        {
                            "type": "RosaNetwork",
                            "name": metadata.get("name", "unknown"),
                            "version": spec.get("version", "v4.20"),
                            "status": "Ready" if is_ready else "Configuring",
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        # Fetch RosaRoleConfig
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "rosaroleconfig",
                    "-n",
                    namespace,
                    "--context",
                    context_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    spec = item.get("spec", {})
                    status = item.get("status", {})

                    # Check conditions for RosaRoleConfig ready state
                    # Could be ROSARoleConfigReady, RosaRoleConfigReady, or just Ready
                    is_ready = False
                    conditions = status.get("conditions", [])
                    for condition in conditions:
                        condition_type = condition.get("type", "")
                        # Check for various possible ready condition types
                        if condition.get("status") == "True" and (
                            condition_type == "ROSARoleConfigReady"
                            or condition_type == "RosaRoleConfigReady"
                            or condition_type == "Ready"
                        ):
                            is_ready = True
                            break

                    resources.append(
                        {
                            "type": "RosaRoleConfig",
                            "name": metadata.get("name", "unknown"),
                            "version": spec.get("version", "v4.20"),
                            "status": "Ready" if is_ready else "Configuring",
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        return {
            "success": True,
            "resources": resources,
            "message": f"Found {len(resources)} active resource(s)",
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Error fetching active resources: {str(e)}",
            "resources": [],
        }


@app.post("/api/kind/get-resource-detail")
async def get_resource_detail(request: Request):
    """Get full YAML details of a specific resource from the Kind cluster"""
    try:
        body = await request.json()
        cluster_name = body.get("cluster_name", "").strip()
        resource_type = body.get("resource_type", "").strip()
        resource_name = body.get("resource_name", "").strip()
        namespace = body.get("namespace", "ns-rosa-hcp").strip()

        if not cluster_name or not resource_type or not resource_name:
            return {
                "success": False,
                "message": "cluster_name, resource_type, and resource_name are required",
                "data": None,
            }

        context_name = f"kind-{cluster_name}"

        # Map friendly resource types to kubectl resource types
        resource_type_map = {
            "CAPI Clusters": "clusters.cluster.x-k8s.io",
            "ROSACluster": "rosacluster",
            "RosaControlPlane": "rosacontrolplane",
            "RosaNetwork": "rosanetwork",
            "RosaRoleConfig": "rosaroleconfig",
        }

        kubectl_resource_type = resource_type_map.get(resource_type, resource_type.lower())

        # Fetch the resource details in YAML format
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    kubectl_resource_type,
                    resource_name,
                    "-n",
                    namespace,
                    "--context",
                    context_name,
                    "-o",
                    "yaml",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode == 0:
                return {
                    "success": True,
                    "data": result.stdout,
                    "resource_type": resource_type,
                    "resource_name": resource_name,
                    "namespace": namespace,
                    "message": f"Successfully fetched {resource_type} '{resource_name}'",
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to fetch resource: {result.stderr}",
                    "data": None,
                }

        except subprocess.TimeoutExpired:
            return {"success": False, "message": "Request timed out", "data": None}

    except Exception as e:
        return {
            "success": False,
            "message": f"Error fetching resource detail: {str(e)}",
            "data": None,
        }


@app.get("/api/ocp/connection-status")
async def get_ocp_connection_status():
    """Test OpenShift Hub connection using OCP_HUB variables from user_vars.yml"""
    import time

    # Check if we have cached data that's still valid
    current_time = time.time()
    if (
        ocp_status_cache["data"] is not None
        and current_time - ocp_status_cache["timestamp"] < ocp_status_cache["ttl"]
    ):
        return ocp_status_cache["data"]

    try:
        # Path to user_vars.yml
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        config_path = os.path.join(project_root, "vars", "user_vars.yml")

        if not os.path.exists(config_path):
            return {
                "connected": False,
                "status": "config_missing",
                "message": "vars/user_vars.yml file not found",
                "suggestion": "Create and configure vars/user_vars.yml with OCP Hub credentials",
                "last_checked": datetime.now().isoformat(),
            }

        # Read and parse the YAML file
        with open(config_path, "r") as file:
            config = yaml.safe_load(file) or {}

        # Check if OCP Hub variables are configured
        ocp_api_url = config.get("OCP_HUB_API_URL", "").strip()
        ocp_user = config.get("OCP_HUB_CLUSTER_USER", "").strip()
        ocp_password = config.get("OCP_HUB_CLUSTER_PASSWORD", "").strip()

        # Check for placeholder values
        placeholder_values = [
            "your-username",
            "your-password",
            "https://api.your-cluster.example.com:6443",
            "api.your-cluster.example.com",
        ]

        is_placeholder = (
            ocp_user in placeholder_values
            or ocp_password in placeholder_values
            or ocp_api_url in placeholder_values
            or "your-cluster.example.com" in ocp_api_url
        )

        if is_placeholder:
            return {
                "connected": False,
                "status": "placeholder_credentials",
                "message": "⚠️ OCP Hub credentials contain placeholder values",
                "suggestion": (
                    "❌ CREDENTIAL CONFIGURATION REQUIRED\n\n"
                    "Your vars/user_vars.yml file contains placeholder values:\n"
                    f"  • OCP_HUB_CLUSTER_USER: {ocp_user}\n"
                    f"  • OCP_HUB_API_URL: {ocp_api_url}\n\n"
                    "✅ REQUIRED STEPS:\n"
                    "1. Open vars/user_vars.yml\n"
                    "2. Replace placeholder values with your actual OpenShift Hub credentials\n"
                    "3. Get credentials from your OpenShift console → Copy login command\n"
                    "4. Save the file and refresh this page\n\n"
                    "📝 Note: This file is in .gitignore and will not be committed."
                ),
                "detected_values": {
                    "username": ocp_user,
                    "api_url": ocp_api_url,
                },
                "last_checked": datetime.now().isoformat(),
            }

        if not ocp_api_url:
            return {
                "connected": False,
                "status": "missing_api_url",
                "message": "OCP_HUB_API_URL not configured",
                "suggestion": "Configure OCP_HUB_API_URL in vars/user_vars.yml",
                "last_checked": datetime.now().isoformat(),
            }

        if not ocp_user or not ocp_password:
            return {
                "connected": False,
                "status": "missing_credentials",
                "message": "OCP Hub username or password not configured",
                "suggestion": "Configure OCP_HUB_CLUSTER_USER and OCP_HUB_CLUSTER_PASSWORD in vars/user_vars.yml",
                "configured_url": ocp_api_url,
                "last_checked": datetime.now().isoformat(),
            }

        # Test the connection using oc login
        login_cmd = [
            "oc",
            "login",
            ocp_api_url,
            "--username",
            ocp_user,
            "--password",
            ocp_password,
            "--insecure-skip-tls-verify=true",
        ]

        # Run oc login command
        result = subprocess.run(login_cmd, capture_output=True, text=True, timeout=30)

        if result.returncode == 0:
            # Login successful, now get cluster info
            try:
                # Get cluster version
                version_result = subprocess.run(
                    ["oc", "version", "--short"], capture_output=True, text=True, timeout=10
                )

                # Get current user context
                whoami_result = subprocess.run(
                    ["oc", "whoami"], capture_output=True, text=True, timeout=10
                )

                # Get cluster info
                cluster_result = subprocess.run(
                    ["oc", "cluster-info"], capture_output=True, text=True, timeout=10
                )

                cluster_info = {}
                if version_result.returncode == 0:
                    cluster_info["version"] = version_result.stdout.strip()
                if whoami_result.returncode == 0:
                    cluster_info["current_user"] = whoami_result.stdout.strip()
                if cluster_result.returncode == 0:
                    cluster_info["cluster_info"] = cluster_result.stdout.strip()

                response_data = {
                    "connected": True,
                    "status": "connected",
                    "message": "Successfully connected to OpenShift Hub cluster",
                    "api_url": ocp_api_url,
                    "username": ocp_user,
                    "cluster_info": cluster_info,
                    "connection_test_output": result.stdout.strip(),
                    "last_checked": datetime.now().isoformat(),
                }

                # Cache the successful response
                ocp_status_cache["data"] = response_data
                ocp_status_cache["timestamp"] = current_time

                return response_data

            except subprocess.TimeoutExpired:
                return {
                    "connected": True,
                    "status": "connected_limited",
                    "message": "Connected to OpenShift, but cluster info retrieval timed out",
                    "api_url": ocp_api_url,
                    "username": ocp_user,
                    "last_checked": datetime.now().isoformat(),
                }

        else:
            # Login failed
            error_msg = result.stderr.strip() if result.stderr else result.stdout.strip()

            if (
                "unauthorized" in error_msg.lower()
                or "invalid username or password" in error_msg.lower()
                or "401" in error_msg
                or "login failed" in error_msg.lower()
            ):
                status = "invalid_credentials"
                message = "❌ Authentication Failed (401 Unauthorized)"
                suggestion = (
                    "❌ AUTHENTICATION FAILED\n\n"
                    "Login to OpenShift Hub cluster failed with 401 Unauthorized.\n\n"
                    f"Cluster: {ocp_api_url}\n"
                    f"Username: {ocp_user}\n\n"
                    "⚠️  POSSIBLE CAUSES:\n\n"
                    "1. ❌ Incorrect Password\n"
                    "   - The password in vars/user_vars.yml may be wrong or outdated\n"
                    "   - Passwords may have been rotated by your cluster administrator\n\n"
                    "2. ❌ Account Disabled/Expired\n"
                    "   - The user account may be disabled or expired\n"
                    "   - Contact your cluster administrator to verify account status\n\n"
                    "3. ❌ Wrong Username\n"
                    "   - The username may be incorrect\n"
                    "   - Verify the username is correct for this cluster\n\n"
                    "✅ REQUIRED ACTIONS:\n\n"
                    "1. Get fresh credentials from your OpenShift cluster:\n"
                    f"   - Log in to OpenShift Console: {ocp_api_url.replace(':6443', '')}\n"
                    "   - Click on your username in the top right\n"
                    "   - Select 'Copy login command'\n"
                    "   - Click 'Display Token'\n"
                    "   - Copy the login command to get current credentials\n\n"
                    "2. Update vars/user_vars.yml with the correct credentials:\n"
                    f'   OCP_HUB_API_URL: "{ocp_api_url}"\n'
                    '   OCP_HUB_CLUSTER_USER: "your-correct-username"\n'
                    '   OCP_HUB_CLUSTER_PASSWORD: "your-correct-password"\n\n'
                    "3. Save the file and refresh this page to retry\n\n"
                    f"📝 Original Error: {error_msg}"
                )
            elif (
                "network" in error_msg.lower()
                or "connection" in error_msg.lower()
                or "timeout" in error_msg.lower()
            ):
                status = "connection_failed"
                message = "Network connection failed"
                suggestion = "Check your network connection and OCP_HUB_API_URL"
            elif "certificate" in error_msg.lower() or "tls" in error_msg.lower():
                status = "tls_error"
                message = "TLS/Certificate error"
                suggestion = "Check the API URL or certificate configuration"
            else:
                status = "login_failed"
                message = f"Login failed: {error_msg}"
                suggestion = "Check your OCP Hub configuration and network connectivity"

            response_data = {
                "connected": False,
                "status": status,
                "message": message,
                "suggestion": suggestion,
                "api_url": ocp_api_url,
                "username": ocp_user,
                "error_details": error_msg,
                "last_checked": datetime.now().isoformat(),
            }

            # Clear cache on failure - don't cache failed login attempts
            ocp_status_cache["data"] = None
            ocp_status_cache["timestamp"] = 0

            return response_data

    except subprocess.TimeoutExpired:
        # Get API URL from config even if timeout occurred
        try:
            project_root = os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            )
            config_path = os.path.join(project_root, "vars", "user_vars.yml")
            if os.path.exists(config_path):
                with open(config_path, "r") as file:
                    config = yaml.safe_load(file) or {}
                ocp_api_url = config.get("OCP_HUB_API_URL", "").strip()
            else:
                ocp_api_url = None
        except:
            ocp_api_url = None

        return {
            "connected": False,
            "status": "timeout",
            "message": "Connection test timed out after 30 seconds",
            "suggestion": "Check network connectivity and API URL",
            "api_url": ocp_api_url,
            "last_checked": datetime.now().isoformat(),
        }
    except FileNotFoundError:
        return {
            "connected": False,
            "status": "oc_not_found",
            "message": "OpenShift CLI (oc) not found",
            "suggestion": "Install the OpenShift CLI (oc) command",
            "last_checked": datetime.now().isoformat(),
        }
    except yaml.YAMLError as e:
        return {
            "connected": False,
            "status": "invalid_yaml",
            "message": f"Invalid YAML format in vars/user_vars.yml: {str(e)}",
            "suggestion": "Fix the YAML syntax errors in vars/user_vars.yml",
            "last_checked": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "connected": False,
            "status": "error",
            "message": f"Error testing OCP connection: {str(e)}",
            "suggestion": "Check configuration and try again",
            "last_checked": datetime.now().isoformat(),
        }


@app.get("/api/aws/credentials-status")
async def get_aws_credentials_status():
    """Check AWS credentials validity and provide detailed guidance"""
    try:
        # Path to user_vars.yml
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        config_path = os.path.join(project_root, "vars", "user_vars.yml")

        if not os.path.exists(config_path):
            return {
                "valid": False,
                "status": "config_missing",
                "message": "Configuration file not found",
                "credentials_configured": False,
                "suggestion": "Create vars/user_vars.yml and configure AWS credentials",
                "setup_guide": "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in vars/user_vars.yml",
                "last_checked": datetime.now().isoformat(),
            }

        # Read configuration
        with open(config_path, "r") as file:
            config = yaml.safe_load(file) or {}

        aws_access_key = config.get("AWS_ACCESS_KEY_ID", "").strip()
        aws_secret_key = config.get("AWS_SECRET_ACCESS_KEY", "").strip()
        aws_region = config.get("AWS_REGION", "us-west-2").strip()

        # Check if credentials are configured
        if not aws_access_key or not aws_secret_key:
            return {
                "valid": False,
                "status": "empty_credentials",
                "message": "AWS credentials not configured",
                "credentials_configured": False,
                "aws_region": aws_region if aws_region else "us-west-2",
                "suggestion": "Configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in vars/user_vars.yml",
                "setup_guide": "1. Get AWS credentials from AWS Console → IAM → Users → Your User → Security Credentials\n2. Add to vars/user_vars.yml:\nAWS_ACCESS_KEY_ID: your_access_key\nAWS_SECRET_ACCESS_KEY: your_secret_key",
                "last_checked": datetime.now().isoformat(),
            }

        # Test AWS credentials by calling AWS STS get-caller-identity
        try:
            test_cmd = ["aws", "sts", "get-caller-identity", "--region", aws_region]

            # Set environment variables for the test
            env = os.environ.copy()
            env["AWS_ACCESS_KEY_ID"] = aws_access_key
            env["AWS_SECRET_ACCESS_KEY"] = aws_secret_key
            env["AWS_DEFAULT_REGION"] = aws_region

            result = subprocess.run(test_cmd, capture_output=True, text=True, timeout=15, env=env)

            if result.returncode == 0:
                # Parse the response to get account info
                import json

                try:
                    identity = json.loads(result.stdout)
                    return {
                        "valid": True,
                        "status": "valid",
                        "message": "AWS credentials are valid and working",
                        "credentials_configured": True,
                        "aws_region": aws_region,
                        "account_info": {
                            "account_id": identity.get("Account", "Unknown"),
                            "user_arn": identity.get("Arn", "Unknown"),
                            "user_id": identity.get("UserId", "Unknown"),
                        },
                        "last_checked": datetime.now().isoformat(),
                    }
                except json.JSONDecodeError:
                    return {
                        "valid": True,
                        "status": "valid_no_details",
                        "message": "AWS credentials are valid",
                        "credentials_configured": True,
                        "aws_region": aws_region,
                        "last_checked": datetime.now().isoformat(),
                    }
            else:
                # Credentials are invalid
                error_msg = result.stderr.strip()

                if "InvalidUserID.NotFound" in error_msg or "does not exist" in error_msg:
                    status = "invalid_user"
                    message = "AWS Access Key ID not found"
                    suggestion = "Verify your AWS_ACCESS_KEY_ID is correct"
                elif "SignatureDoesNotMatch" in error_msg or "invalid" in error_msg.lower():
                    status = "invalid_secret"
                    message = "AWS Secret Access Key is invalid"
                    suggestion = "Verify your AWS_SECRET_ACCESS_KEY is correct"
                elif "credentials" in error_msg.lower():
                    status = "invalid_credentials"
                    message = "AWS credentials are invalid"
                    suggestion = "Check both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
                else:
                    status = "aws_error"
                    message = f"AWS API error: {error_msg}"
                    suggestion = "Check your AWS credentials and network connectivity"

                return {
                    "valid": False,
                    "status": status,
                    "message": message,
                    "credentials_configured": True,
                    "aws_region": aws_region,
                    "suggestion": suggestion,
                    "troubleshooting": "1. Verify credentials in AWS Console\n2. Check IAM user has required permissions\n3. Ensure credentials are active",
                    "error_details": error_msg,
                    "last_checked": datetime.now().isoformat(),
                }

        except subprocess.TimeoutExpired:
            return {
                "valid": False,
                "status": "timeout",
                "message": "AWS credential validation timed out",
                "credentials_configured": True,
                "aws_region": aws_region,
                "suggestion": "Check your network connectivity to AWS",
                "last_checked": datetime.now().isoformat(),
            }
        except FileNotFoundError:
            return {
                "valid": False,
                "status": "aws_cli_missing",
                "message": "AWS CLI not found",
                "credentials_configured": True,
                "aws_region": aws_region,
                "suggestion": "Install AWS CLI: 'pip install awscli' or 'brew install awscli'",
                "last_checked": datetime.now().isoformat(),
            }

    except yaml.YAMLError as e:
        return {
            "valid": False,
            "status": "invalid_yaml",
            "message": f"Invalid YAML in configuration file: {str(e)}",
            "credentials_configured": False,
            "suggestion": "Fix YAML syntax in vars/user_vars.yml",
            "last_checked": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "valid": False,
            "status": "error",
            "message": f"Error checking AWS credentials: {str(e)}",
            "credentials_configured": False,
            "suggestion": "Check configuration and try again",
            "last_checked": datetime.now().isoformat(),
        }


@app.get("/api/guided-setup/status")
async def get_guided_setup_status():
    """Get comprehensive guided setup status for sequential onboarding"""
    try:
        # Get all prerequisite statuses
        rosa_status = await get_rosa_status()
        config_status = await get_config_status()
        aws_status = await get_aws_credentials_status()
        ocp_status = await get_ocp_connection_status()

        # Determine current step and next actions
        current_step = 1
        next_action = "rosa_login"
        all_prerequisites_met = True

        if not rosa_status["authenticated"]:
            current_step = 1
            next_action = "rosa_login"
            all_prerequisites_met = False
        elif config_status.get("is_new_user", False) or not config_status["configured"]:
            current_step = 2
            next_action = "configure_vars"
            all_prerequisites_met = False
        elif not aws_status["credentials_configured"] or not aws_status["valid"]:
            current_step = 3
            next_action = "aws_credentials"
            all_prerequisites_met = False
        elif not ocp_status["connected"]:
            current_step = 4
            next_action = "ocp_connection"
            all_prerequisites_met = False
            # Check if user has chosen Kind cluster alternative
            # For now, Step 5 is only reachable when OCP connection is successful
            # TODO: Add Kind cluster preference tracking
        else:
            current_step = 5
            next_action = "ready"

        return {
            "current_step": current_step,
            "next_action": next_action,
            "all_prerequisites_met": all_prerequisites_met,
            "steps": {
                1: {
                    "name": "ROSA Staging Authentication",
                    "status": (
                        "completed"
                        if rosa_status["authenticated"]
                        else "current" if current_step == 1 else "pending"
                    ),
                    "required": True,
                    "data": rosa_status,
                },
                2: {
                    "name": "Configuration Setup",
                    "status": (
                        "completed"
                        if config_status["configured"]
                        else "current" if current_step == 2 else "pending"
                    ),
                    "required": True,
                    "data": config_status,
                },
                3: {
                    "name": "AWS Credentials",
                    "status": (
                        "completed"
                        if aws_status["valid"]
                        else "current" if current_step == 3 else "pending"
                    ),
                    "required": True,
                    "data": aws_status,
                },
                4: {
                    "name": "OpenShift Hub Connection",
                    "status": (
                        "completed"
                        if ocp_status["connected"]
                        else "current" if current_step == 4 else "pending"
                    ),
                    "required": True,  # Required until user chooses Kind alternative
                    "description": "Connect to OpenShift Hub or choose Kind cluster for testing",
                    "data": ocp_status,
                },
                5: {
                    "name": "Ready for Automation",
                    "status": "completed" if all_prerequisites_met else "pending",
                    "required": False,
                    "description": "All prerequisites met - ready to create and manage ROSA clusters",
                    "data": {
                        "cluster_connection_ready": ocp_status["connected"],
                        "automation_enabled": all_prerequisites_met,
                    },
                },
            },
            "last_checked": datetime.now().isoformat(),
        }

    except Exception as e:
        return {
            "current_step": 1,
            "next_action": "error",
            "all_prerequisites_met": False,
            "error": f"Error checking guided setup status: {str(e)}",
            "last_checked": datetime.now().isoformat(),
        }


@app.get("/api/user/profile")
async def get_user_profile():
    """Get user profile and permissions"""
    return {
        "identity": {
            "username": "user@example.com",
            "account_id": "123456789012",
            "organization": "My Organization",
            "last_login": datetime.now().isoformat(),
        },
        "permissions": {
            "cluster_create": True,
            "cluster_delete": True,
            "network_manage": True,
            "role_manage": False,
            "admin_access": False,
        },
        "quotas": {
            "clusters": {"used": 2, "limit": 10},
            "vcpus": {"used": 12, "limit": 100},
            "storage": {"used": "500GB", "limit": "5TB"},
        },
        "recent_activity": [
            {"action": "Created cluster 'test-cluster'", "timestamp": "2024-01-16T10:00:00Z"},
            {"action": "Updated automation settings", "timestamp": "2024-01-15T15:30:00Z"},
            {"action": "Ran environment diagnostics", "timestamp": "2024-01-15T09:15:00Z"},
        ],
    }


@app.get("/api/build/templates")
async def get_build_templates():
    """Get project templates for building"""
    return {
        "templates": [
            {
                "id": "development",
                "name": "Development Environment",
                "description": "Perfect for development and testing with cost optimization",
                "icon": "🧪",
                "specs": {
                    "instance_type": "m5.large",
                    "min_nodes": 1,
                    "max_nodes": 3,
                    "features": ["network_automation"],
                },
                "estimated_cost": "$200-400/month",
            },
            {
                "id": "production",
                "name": "Production Application",
                "description": "High availability setup for production workloads",
                "icon": "🚀",
                "specs": {
                    "instance_type": "m5.xlarge",
                    "min_nodes": 3,
                    "max_nodes": 10,
                    "features": ["network_automation", "role_automation"],
                },
                "estimated_cost": "$800-2000/month",
            },
            {
                "id": "learning",
                "name": "Learning & Testing",
                "description": "Minimal setup for learning OpenShift",
                "icon": "📚",
                "specs": {
                    "instance_type": "m5.large",
                    "min_nodes": 1,
                    "max_nodes": 2,
                    "features": ["network_automation"],
                },
                "estimated_cost": "$150-250/month",
            },
        ]
    }


@app.post("/api/validate")
async def validate_config(config: ClusterConfig):
    """Validate cluster configuration"""
    errors = []
    warnings = []

    # Basic validation
    if not config.name.replace("-", "").isalnum():
        errors.append("Cluster name must contain only alphanumeric characters and hyphens")

    if len(config.name) > 15:
        warnings.append("Cluster name longer than 15 characters may cause issues")

    if config.min_replicas > config.max_replicas:
        errors.append("Min replicas cannot be greater than max replicas")

    # Version validation
    if not config.version.startswith("4.20"):
        warnings.append("Only OpenShift 4.20 is fully supported by this automation")

    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}


@app.post("/api/ansible/run-task")
async def run_ansible_task(request: dict):
    """Run a specific ansible task"""
    import tempfile

    try:
        task_file = request.get("task_file")
        description = request.get("description", "Running ansible task")
        kube_context = request.get("kube_context")  # Optional cluster context
        extra_vars = request.get("extra_vars", {})  # Optional extra variables

        if not task_file:
            raise HTTPException(status_code=400, detail="task_file is required")

        # Ensure the task file exists
        # Use AUTOMATION_PATH environment variable if set, otherwise calculate from file path
        project_root = os.environ.get("AUTOMATION_PATH") or os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        task_path = os.path.join(project_root, task_file)
        if not os.path.exists(task_path):
            raise HTTPException(status_code=404, detail=f"Task file not found: {task_file}")

        # Create a temporary playbook that includes the task file
        # For MCE validation tasks, we need to login to OCP first to set the context
        tasks = []

        # Check if this is an MCE task that needs OCP login
        mce_tasks = [
            "validate-capa-environment",
            "validate-mce",
            "enable_capi_capa",
            "get_capi_capa_status",
            "get_mce_component_status",
        ]
        if any(task in task_file for task in mce_tasks):
            # Add OCP login and variable setup tasks first
            tasks.extend(
                [
                    {
                        "name": "Set OCP credentials",
                        "set_fact": {
                            "ocp_user": "{{ OCP_HUB_CLUSTER_USER }}",
                            "ocp_password": "{{ OCP_HUB_CLUSTER_PASSWORD }}",
                            "api_url": "{{ OCP_HUB_API_URL }}",
                        },
                    },
                    {
                        "name": "Login to OCP",
                        "include_tasks": f"{project_root}/tasks/login_ocp.yml",
                    },
                ]
            )

        # Set AUTOMATION_PATH as a fact to ensure it's available to all included tasks
        tasks.append(
            {
                "name": "Set AUTOMATION_PATH",
                "set_fact": {"AUTOMATION_PATH": project_root},
            }
        )

        # Add the main task (use absolute path)
        tasks.append({"name": "Include task file", "include_tasks": f"{project_root}/{task_file}"})

        playbook_content = [
            {
                "name": f"Run task: {description}",
                "hosts": "localhost",
                "connection": "local",
                "gather_facts": False,
                "vars": {
                    "AUTOMATION_PATH": project_root,
                    "playbook_dir": project_root,
                },
                "vars_files": [
                    f"{project_root}/vars/vars.yml",
                    f"{project_root}/vars/user_vars.yml",
                ],
                "tasks": tasks,
            }
        ]

        # Write temporary playbook
        # Use AUTOMATION_PATH environment variable if set, otherwise calculate from file path
        project_root = os.environ.get("AUTOMATION_PATH") or os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        # Write temp file to /tmp since project_root might be read-only
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False, dir="/tmp") as f:
            yaml.dump(playbook_content, f, default_flow_style=False)
            temp_playbook = f.name

        try:
            # Prepare ansible command
            cmd = [
                "ansible-playbook",
                temp_playbook,
                "-i",
                "localhost,",  # Inline inventory with localhost
                "-e",
                "skip_ansible_runner=true",
                "-e",
                f"AUTOMATION_PATH={project_root}",
                "-e",
                f"playbook_dir={project_root}",  # Set playbook dir for relative includes
                "-v",  # Verbose output
            ]

            # Add cluster context if provided
            if kube_context:
                cmd.extend(["-e", f"KUBE_CONTEXT={kube_context}"])
                print(f"Using cluster context: {kube_context}")

            # Add extra vars if provided
            for key, value in extra_vars.items():
                cmd.extend(["-e", f"{key}={value}"])

            print(f"Running ansible task: {' '.join(cmd)}")

            # Set environment variables for Ansible
            import os as os_module

            env = os_module.environ.copy()
            env["ANSIBLE_PLAYBOOK_DIR"] = project_root

            # Run the command with Popen to avoid pipe buffer issues
            process = subprocess.Popen(
                cmd,
                cwd=project_root,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            try:
                stdout, stderr = process.communicate(timeout=300)  # 5 minutes timeout
                result = type(
                    "obj",
                    (object,),
                    {"returncode": process.returncode, "stdout": stdout, "stderr": stderr},
                )()
            except subprocess.TimeoutExpired:
                process.kill()
                raise

            # Parse the output
            stdout_lines = result.stdout.split("\n") if result.stdout else []
            stderr_lines = result.stderr.split("\n") if result.stderr else []

            print(f"Ansible task completed with return code: {result.returncode}")
            print(f"STDOUT: {result.stdout}")
            if result.stderr:
                print(f"STDERR: {result.stderr}")

            # Extract detailed error messages from Ansible output
            detailed_error = ""
            if result.returncode != 0 and result.stdout:
                # Look for [ERROR]: Task failed: messages
                import re

                error_match = re.search(
                    r"\[ERROR\]:\s*Task failed:\s*(.+?)(?=\nOrigin:|$)", result.stdout, re.DOTALL
                )
                if error_match:
                    detailed_error = error_match.group(1).strip()
                    # Clean up the error message - extract the main error content
                    # Look for the actual error message after "Action failed:"
                    action_match = re.search(r"Action failed:\s*(.+)", detailed_error, re.DOTALL)
                    if action_match:
                        detailed_error = action_match.group(1).strip()

            # Only treat stderr as an error if returncode is non-zero
            # Ansible warnings go to stderr but don't indicate failure
            error_message = (
                detailed_error
                if detailed_error
                else (result.stderr if result.returncode != 0 else "")
            )

            return {
                "success": result.returncode == 0,
                "return_code": result.returncode,
                "output": result.stdout,
                "error": error_message,
                "warning": result.stderr if result.returncode == 0 else "",
                "message": (
                    "Task completed successfully" if result.returncode == 0 else "Task failed"
                ),
                "task_file": task_file,
                "description": description,
                "stdout_lines": stdout_lines,
                "stderr_lines": stderr_lines,
            }

        finally:
            # Clean up temporary playbook file
            try:
                os.unlink(temp_playbook)
            except OSError:
                pass

    except subprocess.TimeoutExpired:
        error_msg = f"Task {task_file} timed out after 5 minutes"
        print(error_msg)
        return {
            "success": False,
            "error": error_msg,
            "message": "Task timed out",
            "task_file": task_file,
            "description": description,
        }
    except Exception as e:
        import traceback

        error_msg = f"Error running task {task_file}: {str(e)}"
        print(error_msg)
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)


@app.get("/api/mce/features")
async def get_mce_features():
    """Get all MCE features and their enablement status"""
    try:
        # Run oc command to get MCE resource
        result = subprocess.run(
            ["oc", "get", "mce", "-o", "json"], capture_output=True, text=True, timeout=30
        )

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Failed to get MCE: {result.stderr}")

        import json

        mce_data = json.loads(result.stdout)

        features = []
        mce_info = None

        # Parse MCE components
        if mce_data.get("items") and len(mce_data["items"]) > 0:
            mce = mce_data["items"][0]

            # Extract MCE info separately (not in features list)
            mce_status = mce.get("status", {}).get("phase", "Unknown")
            mce_name = mce.get("metadata", {}).get("name", "multiclusterengine")
            mce_version = mce.get("status", {}).get("currentVersion", "Unknown")

            mce_info = {
                "name": mce_name,
                "version": mce_version,
                "status": mce_status,
                "available": mce_status == "Available",
            }

            components = mce.get("spec", {}).get("overrides", {}).get("components", [])

            # Feature descriptions
            feature_descriptions = {
                "cluster-api": "Core Cluster API for cluster lifecycle management",
                "cluster-api-provider-aws": "AWS infrastructure provider for Cluster API",
                "hypershift": "HyperShift operator for hosted control planes",
                "hypershift-local-hosting": "Local hosting support for HyperShift",
                "managedserviceaccount": "Managed service account addon",
                "managedserviceaccount-preview": "Preview features for managed service accounts",
                "console-mce": "Multicluster Engine console plugin",
                "discovery": "Cluster discovery service",
                "hive": "Hive operator for cluster provisioning",
                "assisted-service": "Assisted installer service",
                "cluster-lifecycle": "Cluster lifecycle management",
                "cluster-manager": "Cluster manager service",
                "clusterproxy-addon": "Cluster proxy addon",
                "search-v2": "Search v2 service for cluster indexing",
            }

            for component in components:
                name = component.get("name", "Unknown")
                enabled = component.get("enabled", False)

                features.append(
                    {
                        "name": name,
                        "enabled": enabled,
                        "description": feature_descriptions.get(name, ""),
                    }
                )

        return {"features": features, "count": len(features), "mce_info": mce_info}

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Request to OpenShift timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching MCE features: {str(e)}")


@app.post("/api/ansible/run-role")
async def run_ansible_role(request: dict):
    """Run a specific ansible role"""
    try:
        role_name = request.get("role_name")
        description = request.get("description", "Running ansible role")
        extra_vars = request.get("extra_vars", {})

        if not role_name:
            raise HTTPException(status_code=400, detail="role_name is required")

        # Check if role exists
        # Use AUTOMATION_PATH environment variable if set, otherwise calculate from file path
        project_root = os.environ.get("AUTOMATION_PATH") or os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        role_path = os.path.join(project_root, "roles", role_name)
        if not os.path.exists(role_path):
            raise HTTPException(status_code=404, detail=f"Role not found: {role_name}")

        # Create a temporary playbook to run the role
        import tempfile
        import yaml

        # Add OCP login and variable setup tasks first for MCE roles
        tasks = []
        mce_roles = ["configure-capa-environment"]
        if role_name in mce_roles:
            tasks.extend(
                [
                    {
                        "name": "Set OCP credentials",
                        "set_fact": {
                            "ocp_user": "{{ OCP_HUB_CLUSTER_USER }}",
                            "ocp_password": "{{ OCP_HUB_CLUSTER_PASSWORD }}",
                            "api_url": "{{ OCP_HUB_API_URL }}",
                        },
                    },
                    {
                        "name": "Login to OCP",
                        "include_tasks": f"{project_root}/tasks/login_ocp.yml",
                    },
                ]
            )

        # Set AUTOMATION_PATH as a fact to ensure it's available to all included tasks
        tasks.append(
            {
                "name": "Set AUTOMATION_PATH",
                "set_fact": {"AUTOMATION_PATH": project_root},
            }
        )

        # Add the main role task
        tasks.append(
            {
                "name": f"Configure the MCE CAPI/CAPA environment",
                "include_role": {"name": role_name},
                "vars": {
                    "ocm_client_id": "{{ OCM_CLIENT_ID }}",
                    "ocm_client_secret": "{{ OCM_CLIENT_SECRET }}",
                },
            }
        )

        playbook_content = {
            "name": f"Run {role_name} role",
            "hosts": "localhost",
            "connection": "local",
            "gather_facts": False,
            "vars": {
                "AUTOMATION_PATH": project_root,
                "playbook_dir": project_root,
            },
            "vars_files": [f"{project_root}/vars/vars.yml", f"{project_root}/vars/user_vars.yml"],
            "tasks": tasks,
        }

        # Write temporary playbook
        # Use AUTOMATION_PATH environment variable if set, otherwise calculate from file path
        project_root = os.environ.get("AUTOMATION_PATH") or os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        # Write temp file to /tmp since project_root might be read-only
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False, dir="/tmp") as f:
            yaml.dump([playbook_content], f, default_flow_style=False)
            temp_playbook = f.name

        try:
            # Prepare ansible command
            cmd = [
                "ansible-playbook",
                temp_playbook,
                "-i",
                "localhost,",  # Inline inventory with localhost
                "-e",
                "skip_ansible_runner=true",
                "-e",
                f"AUTOMATION_PATH={project_root}",
                "-e",
                f"playbook_dir={project_root}",
                "-v",  # Verbose output
            ]

            # Add extra vars if provided
            for key, value in extra_vars.items():
                cmd.extend(["-e", f"{key}={value}"])

            print(f"Running ansible role: {' '.join(cmd)}")

            # Set environment variables for Ansible
            import os as os_module

            env = os_module.environ.copy()
            env["ANSIBLE_ROLES_PATH"] = f"{project_root}/roles"
            env["ANSIBLE_PLAYBOOK_DIR"] = project_root

            # Run the command
            result = subprocess.run(
                cmd,
                cwd=project_root,
                env=env,
                capture_output=True,
                text=True,
                timeout=600,  # 10 minutes timeout for roles
            )

            # Parse the output
            stdout_lines = result.stdout.split("\n") if result.stdout else []
            stderr_lines = result.stderr.split("\n") if result.stderr else []

            print(f"Ansible role completed with return code: {result.returncode}")
            print(f"STDOUT: {result.stdout}")
            if result.stderr:
                print(f"STDERR: {result.stderr}")

            return {
                "success": result.returncode == 0,
                "return_code": result.returncode,
                "output": result.stdout,
                "error": result.stderr,
                "message": (
                    "Role completed successfully" if result.returncode == 0 else "Role failed"
                ),
                "role_name": role_name,
                "description": description,
                "stdout_lines": stdout_lines,
                "stderr_lines": stderr_lines,
            }

        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_playbook)
            except OSError:
                pass

    except subprocess.TimeoutExpired:
        error_msg = f"Role {role_name} timed out after 10 minutes"
        print(error_msg)
        return {
            "success": False,
            "error": error_msg,
            "message": "Role timed out",
            "role_name": role_name,
            "description": description,
        }
    except Exception as e:
        error_msg = f"Error running role {role_name}: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


def run_playbook_background(playbook: str, extra_vars: dict, job_id: str, description: str):
    """Run ansible playbook asynchronously in background"""
    try:
        jobs[job_id]["status"] = "running"
        jobs[job_id]["progress"] = 10
        jobs[job_id]["message"] = f"Starting playbook: {playbook}"

        # Ensure the playbook file exists
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        playbook_path = os.path.join(project_root, playbook)

        # Prepare ansible command
        cmd = [
            "ansible-playbook",
            playbook_path,
            "-v",  # Verbose output
        ]

        # Add extra vars if provided
        for key, value in extra_vars.items():
            cmd.extend(["-e", f"{key}={value}"])

        print(f"Running ansible playbook: {' '.join(cmd)}")
        jobs[job_id]["progress"] = 30
        jobs[job_id]["message"] = "Executing ansible playbook"

        # Prepare environment with KUBECONFIG
        env = os.environ.copy()
        # Ensure KUBECONFIG is set (use default if not already set)
        if "KUBECONFIG" not in env:
            env["KUBECONFIG"] = os.path.expanduser("~/.kube/config")

        print(f"Using KUBECONFIG: {env.get('KUBECONFIG')}")

        # Run the command
        result = subprocess.run(
            cmd,
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=1800,  # 30 minutes timeout for playbooks (AutoNode can take a while)
            env=env,
        )

        print(f"Ansible playbook completed with return code: {result.returncode}")
        print(f"STDOUT: {result.stdout}")
        if result.stderr:
            print(f"STDERR: {result.stderr}")

        if result.returncode == 0:
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["progress"] = 100
            jobs[job_id]["message"] = "Playbook completed successfully"
        else:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["message"] = f"Playbook failed with return code {result.returncode}"

        jobs[job_id]["logs"].extend(result.stdout.split("\n") if result.stdout else [])
        if result.stderr:
            jobs[job_id]["logs"].extend(["", "STDERR:", *result.stderr.split("\n")])
        jobs[job_id]["completed_at"] = datetime.now()
        jobs[job_id]["return_code"] = result.returncode

    except subprocess.TimeoutExpired:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["message"] = "Playbook timed out after 30 minutes"
        jobs[job_id]["completed_at"] = datetime.now()
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["message"] = f"Error: {str(e)}"
        jobs[job_id]["completed_at"] = datetime.now()


@app.post("/api/ansible/run-playbook")
async def run_ansible_playbook_endpoint(request: dict, background_tasks: BackgroundTasks):
    """Run an existing ansible playbook asynchronously"""
    try:
        playbook = request.get("playbook")
        description = request.get("description", "Running ansible playbook")
        extra_vars = request.get("extra_vars", {})

        if not playbook:
            raise HTTPException(status_code=400, detail="playbook is required")

        # Ensure the playbook file exists
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        playbook_path = os.path.join(project_root, playbook)
        if not os.path.exists(playbook_path):
            raise HTTPException(status_code=404, detail=f"Playbook not found: {playbook}")

        # Generate job ID
        job_id = str(uuid.uuid4())

        # Create job
        jobs[job_id] = {
            "id": job_id,
            "status": "pending",
            "progress": 0,
            "message": f"Queued: {description}",
            "logs": [],
            "created_at": datetime.now(),
            "playbook": playbook,
            "description": description,
        }

        # Run playbook in background
        background_tasks.add_task(
            run_playbook_background, playbook, extra_vars, job_id, description
        )

        return {
            "job_id": job_id,
            "status": "pending",
            "message": f"Playbook {playbook} queued for execution",
            "playbook": playbook,
            "description": description,
        }

    except Exception as e:
        error_msg = f"Error queuing playbook {playbook}: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


# ===========================
# Minikube API Endpoints
# ===========================


@app.get("/api/minikube/list-clusters")
async def list_minikube_clusters():
    """List available Minikube profiles"""
    try:
        # Check if Minikube is installed
        minikube_check = subprocess.run(
            ["minikube", "version"], capture_output=True, text=True, timeout=30
        )

        if minikube_check.returncode != 0:
            return {
                "clusters": [],
                "minikube_installed": False,
                "message": "Minikube is not installed",
                "suggestion": "Install Minikube first: brew install minikube",
            }

        # List Minikube profiles
        list_result = subprocess.run(
            ["minikube", "profile", "list", "-o", "json"],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if list_result.returncode != 0:
            # No profiles exist yet
            return {
                "clusters": [],
                "minikube_installed": True,
                "message": "No Minikube clusters found",
                "suggestion": "Create a cluster with: minikube start --profile <cluster-name>",
            }

        # Parse JSON output
        import json

        try:
            profiles_data = json.loads(list_result.stdout)
            clusters = []

            if "valid" in profiles_data:
                for profile in profiles_data["valid"]:
                    clusters.append(profile["Name"])

            return {
                "clusters": clusters,
                "minikube_installed": True,
                "message": (
                    f"Found {len(clusters)} Minikube cluster(s)"
                    if clusters
                    else "No Minikube clusters found"
                ),
                "suggestion": (
                    "Create a cluster with: minikube start --profile <cluster-name>"
                    if not clusters
                    else None
                ),
            }
        except json.JSONDecodeError:
            return {
                "clusters": [],
                "minikube_installed": True,
                "message": "Failed to parse minikube profile list",
                "suggestion": "Check minikube installation",
            }

    except Exception as e:
        return {
            "clusters": [],
            "minikube_installed": False,
            "message": f"Error listing Minikube clusters: {str(e)}",
            "suggestion": "Check Minikube installation and permissions",
        }


@app.post("/api/minikube/verify-cluster")
async def verify_minikube_cluster(request: dict):
    """Verify if a Minikube cluster exists and is accessible"""
    cluster_name = request.get("cluster_name", "").strip()

    if not cluster_name:
        return {
            "exists": False,
            "accessible": False,
            "message": "Cluster name is required",
            "suggestion": "Please provide a valid Minikube profile name",
        }

    try:
        # Check if Minikube is installed
        minikube_check = subprocess.run(
            ["minikube", "version"], capture_output=True, text=True, timeout=30
        )

        if minikube_check.returncode != 0:
            return {
                "exists": False,
                "accessible": False,
                "message": "Minikube is not installed",
                "suggestion": "Install Minikube first: brew install minikube",
                "cluster_name": cluster_name,
            }

        # Check if profile exists
        status_result = subprocess.run(
            ["minikube", "status", "-p", cluster_name, "-o", "json"],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if status_result.returncode != 0:
            return {
                "exists": False,
                "accessible": False,
                "message": f"Minikube cluster '{cluster_name}' does not exist",
                "suggestion": f"Create the cluster with: minikube start --profile {cluster_name}",
                "cluster_name": cluster_name,
            }

        # Parse status to check if running
        import json

        try:
            status_data = json.loads(status_result.stdout)
            is_running = status_data.get("Host", "") == "Running"

            if not is_running:
                return {
                    "exists": True,
                    "accessible": False,
                    "message": f"Minikube cluster '{cluster_name}' exists but is not running",
                    "suggestion": f"Start the cluster with: minikube start --profile {cluster_name}",
                    "cluster_name": cluster_name,
                }

            # Test kubectl access
            context_name = cluster_name
            kubectl_test = subprocess.run(
                ["kubectl", "cluster-info", "--context", context_name],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if kubectl_test.returncode == 0:
                # Get cluster version using JSON output
                version_result = subprocess.run(
                    ["kubectl", "version", "-o", "json", "--context", context_name],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )

                # Extract server version from JSON
                version = "v1.32.0"  # Default fallback
                if version_result.returncode == 0:
                    try:
                        import json as json_module

                        version_data = json_module.loads(version_result.stdout)
                        version = version_data.get("serverVersion", {}).get("gitVersion", "v1.32.0")
                    except:
                        version = "v1.32.0"

                cluster_info = {
                    "status": "running",
                    "version": version,
                }

                # Fetch creationTimestamp for key components
                component_timestamps = {}

                # Get namespace timestamp (for Minikube Cluster)
                namespace_timestamp = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        "namespace",
                        "ns-rosa-hcp",
                        "-ojson",
                        "--context",
                        context_name,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if namespace_timestamp.returncode == 0:
                    try:
                        import json

                        ns_data = json.loads(namespace_timestamp.stdout)
                        component_timestamps["namespace"] = ns_data.get("metadata", {}).get(
                            "creationTimestamp", ""
                        )
                    except:
                        pass

                # Get cert-manager deployment timestamp
                cert_manager_timestamp = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        "deployment",
                        "cert-manager",
                        "-n",
                        "cert-manager",
                        "-ojson",
                        "--context",
                        context_name,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if cert_manager_timestamp.returncode == 0:
                    try:
                        import json

                        cm_data = json.loads(cert_manager_timestamp.stdout)
                        component_timestamps["cert-manager"] = cm_data.get("metadata", {}).get(
                            "creationTimestamp", ""
                        )
                    except:
                        pass

                # Get CAPI controller timestamp
                capi_timestamp = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        "deployment",
                        "capi-controller-manager",
                        "-n",
                        "capi-system",
                        "-ojson",
                        "--context",
                        context_name,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if capi_timestamp.returncode == 0:
                    try:
                        import json

                        capi_data = json.loads(capi_timestamp.stdout)
                        component_timestamps["capi-controller"] = capi_data.get("metadata", {}).get(
                            "creationTimestamp", ""
                        )
                    except:
                        pass

                # Get CAPA controller timestamp
                capa_timestamp = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        "deployment",
                        "capa-controller-manager",
                        "-n",
                        "capa-system",
                        "-ojson",
                        "--context",
                        context_name,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if capa_timestamp.returncode == 0:
                    try:
                        import json

                        capa_data = json.loads(capa_timestamp.stdout)
                        component_timestamps["capa-controller"] = capa_data.get("metadata", {}).get(
                            "creationTimestamp", ""
                        )
                    except:
                        pass

                # Get ROSA CRD timestamp
                rosa_crd_timestamp = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        "crd",
                        "rosacontrolplanes.controlplane.cluster.x-k8s.io",
                        "-ojson",
                        "--context",
                        context_name,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if rosa_crd_timestamp.returncode == 0:
                    try:
                        import json

                        crd_data = json.loads(rosa_crd_timestamp.stdout)
                        component_timestamps["rosa-crd"] = crd_data.get("metadata", {}).get(
                            "creationTimestamp", ""
                        )
                    except:
                        pass

                cluster_info["component_timestamps"] = component_timestamps

                # Check for CAPI/CAPA components
                components = {"checks_passed": 0, "warnings": 0, "failed": 0, "details": []}

                # Check AWS credentials secret
                aws_creds_check = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        "secret",
                        "capa-manager-bootstrap-credentials",
                        "-n",
                        "capa-system",
                        "--context",
                        context_name,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if aws_creds_check.returncode == 0:
                    components["checks_passed"] += 1
                    components["details"].append(
                        {
                            "name": "AWS Credentials",
                            "status": "configured",
                            "message": "AWS credentials secret found",
                        }
                    )
                else:
                    components["warnings"] += 1
                    components["details"].append(
                        {
                            "name": "AWS Credentials",
                            "status": "not_configured",
                            "message": "AWS credentials secret not found in capa-system namespace",
                        }
                    )

                # Check OCM Client Secret
                ocm_secret_check = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        "secret",
                        "rosa-creds-secret",
                        "-n",
                        "ns-rosa-hcp",
                        "--context",
                        context_name,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if ocm_secret_check.returncode == 0:
                    components["checks_passed"] += 1
                    components["details"].append(
                        {
                            "name": "OCM Client Secret",
                            "status": "configured",
                            "message": "ROSA credentials secret found",
                        }
                    )
                else:
                    components["failed"] += 1
                    components["details"].append(
                        {
                            "name": "OCM Client Secret",
                            "status": "missing",
                            "message": "ROSA credentials secret not found in ns-rosa-hcp namespace",
                        }
                    )

                cluster_info["components"] = components

                return {
                    "exists": True,
                    "accessible": True,
                    "message": f"Minikube cluster '{cluster_name}' is running and accessible",
                    "cluster_name": cluster_name,
                    "context_name": context_name,
                    "cluster_info": cluster_info,
                    "suggestion": f"You can use this cluster for testing. Update your vars/user_vars.yml with the cluster details.",
                }
            else:
                return {
                    "exists": True,
                    "accessible": False,
                    "message": f"Minikube cluster '{cluster_name}' is running but kubectl access failed",
                    "suggestion": f"Try: minikube delete --profile {cluster_name} && minikube start --profile {cluster_name}",
                    "cluster_name": cluster_name,
                    "error_details": kubectl_test.stderr,
                }

        except json.JSONDecodeError:
            return {
                "exists": False,
                "accessible": False,
                "message": "Failed to parse minikube status",
                "suggestion": "Check minikube installation",
                "cluster_name": cluster_name,
            }

    except subprocess.TimeoutExpired:
        return {
            "exists": False,
            "accessible": False,
            "message": "Minikube command timed out",
            "suggestion": "Check Minikube installation and system performance",
            "cluster_name": cluster_name,
        }
    except Exception as e:
        return {
            "exists": False,
            "accessible": False,
            "message": f"Error checking Minikube cluster: {str(e)}",
            "suggestion": "Check Minikube installation and permissions",
            "cluster_name": cluster_name,
        }


@app.post("/api/minikube/initialize-capi")
async def initialize_minikube_capi(request: Request):
    """Initialize Minikube cluster with CAPI/CAPA support"""
    try:
        body = await request.json()
        cluster_name = body.get("cluster_name", "").strip()

        if not cluster_name:
            return {
                "success": False,
                "message": "Cluster name is required",
            }

        # Path to initialization playbook
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        playbook_path = os.path.join(project_root, "initialize-minikube-capi.yml")

        if not os.path.exists(playbook_path):
            return {
                "success": False,
                "message": f"Initialization playbook not found at: {playbook_path}",
                "suggestion": "Ensure initialize-minikube-capi.yml exists in the project root",
            }

        # Prepare environment with Minikube profile
        env = os.environ.copy()
        env["MINIKUBE_PROFILE"] = cluster_name
        env["KUBECONFIG"] = os.path.expanduser("~/.kube/config")

        # Run the initialization playbook
        result = subprocess.run(
            ["ansible-playbook", playbook_path, "-v"],
            capture_output=True,
            text=True,
            timeout=600,  # 10 minutes timeout for initialization
            cwd=project_root,
            env=env,
        )

        if result.returncode == 0:
            return {
                "success": True,
                "message": f"Minikube cluster '{cluster_name}' initialized successfully with CAPI/CAPA",
                "output": result.stdout,
            }
        else:
            return {
                "success": False,
                "message": f"Failed to initialize cluster: {result.stderr}",
                "output": result.stdout,
                "error": result.stderr,
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "message": "Initialization timed out after 10 minutes",
            "suggestion": "Check if the cluster is running and accessible",
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error initializing cluster: {str(e)}",
            "suggestion": "Check the playbook and cluster configuration",
        }


@app.post("/api/minikube/create-cluster")
async def create_minikube_cluster(request: Request):
    """Create a new Minikube cluster"""
    try:
        body = await request.json()
        cluster_name = body.get("cluster_name", "").strip()

        if not cluster_name:
            return {
                "success": False,
                "message": "Cluster name is required",
                "suggestion": "Provide a valid cluster name",
            }

        # Validate cluster name
        import re

        name_pattern = re.compile(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$")
        if not name_pattern.match(cluster_name):
            return {
                "success": False,
                "message": "Invalid cluster name format",
                "suggestion": "Use lowercase letters, numbers, and hyphens only",
            }

        # Check if Minikube is installed
        minikube_check = subprocess.run(
            ["minikube", "version"], capture_output=True, text=True, timeout=30
        )

        if minikube_check.returncode != 0:
            return {
                "success": False,
                "message": "Minikube is not installed",
                "suggestion": "Install Minikube first: brew install minikube",
            }

        # Check if cluster already exists
        status_result = subprocess.run(
            ["minikube", "status", "-p", cluster_name], capture_output=True, text=True, timeout=30
        )

        if status_result.returncode == 0:
            return {
                "success": False,
                "message": f"Cluster '{cluster_name}' already exists",
                "suggestion": "Choose a different name or delete the existing cluster",
            }

        # Create the cluster
        create_result = subprocess.run(
            ["minikube", "start", "--profile", cluster_name, "--cpus=2", "--memory=4096"],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if create_result.returncode != 0:
            return {
                "success": False,
                "message": f"Failed to create cluster: {create_result.stderr}",
                "suggestion": "Check Podman is running and you have sufficient resources",
            }

        # Verify the cluster was created
        kubectl_test = subprocess.run(
            ["kubectl", "cluster-info", "--context", cluster_name],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if kubectl_test.returncode == 0:
            return {
                "success": True,
                "message": f"Cluster '{cluster_name}' created successfully",
                "cluster_name": cluster_name,
                "context_name": cluster_name,
                "output": create_result.stdout,
            }
        else:
            return {
                "success": True,
                "message": f"Cluster '{cluster_name}' created but verification failed",
                "cluster_name": cluster_name,
                "warning": "Cluster may need a moment to initialize",
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "message": "Cluster creation timed out",
            "suggestion": "This may take a while. Check 'minikube profile list' to see if it completed.",
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error creating Minikube cluster: {str(e)}",
            "suggestion": "Check Minikube installation and Podman daemon status",
        }


@app.post("/api/minikube/execute-command")
async def execute_minikube_command(request: Request):
    """Execute a kubectl command in the context of a Minikube cluster"""
    try:
        body = await request.json()
        cluster_name = body.get("cluster_name", "").strip()
        command = body.get("command", "").strip()

        if not cluster_name:
            return {
                "success": False,
                "error": "Cluster name is required",
                "output": "",
            }

        if not command:
            return {
                "success": False,
                "error": "Command is required",
                "output": "",
            }

        # Security check: block dangerous commands
        dangerous_patterns = [
            r"\brm\s+-rf\s+/",
            r"\bmkfs\b",
            r"\bdd\b.*of=/dev",
            r"\bshutdown\b",
            r"\breboot\b",
            r"\bkillall\b",
            r":\(\)",
        ]

        import re

        for pattern in dangerous_patterns:
            if re.search(pattern, command, re.IGNORECASE):
                return {
                    "success": False,
                    "error": "This command is not allowed for security reasons",
                    "output": "",
                }

        # Use bash login shell with alias expansion
        user_shell = os.environ.get("SHELL", "/bin/bash")

        wrapper_command = f"""
            # Source profile files silently
            [ -f ~/.profile ] && source ~/.profile 2>/dev/null
            [ -f ~/.bashrc ] && source ~/.bashrc 2>/dev/null
            [ -f ~/.bash_profile ] && source ~/.bash_profile 2>/dev/null
            # Enable alias expansion
            shopt -s expand_aliases 2>/dev/null || true
            # Set kubectl context
            export KUBECONFIG=~/.kube/config
            # Run the actual command
            {command}
        """

        result = subprocess.run(
            [user_shell, "-c", wrapper_command],
            capture_output=True,
            text=True,
            timeout=60,
        )

        return {
            "success": result.returncode == 0,
            "output": result.stdout if result.stdout else result.stderr,
            "exit_code": result.returncode,
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Command execution timed out (60s limit)",
            "output": "",
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error executing command: {str(e)}",
            "output": "",
        }


@app.post("/api/ocp/execute-command")
async def execute_ocp_command(request: Request):
    """Execute a command in the context of the OpenShift/MCE cluster"""
    try:
        body = await request.json()
        command = body.get("command", "").strip()

        if not command:
            return {
                "success": False,
                "error": "Command is required",
                "output": "",
            }

        # Security check: block dangerous commands
        dangerous_patterns = [
            r"\brm\s+-rf\s+/",
            r"\bmkfs\b",
            r"\bdd\b.*of=/dev",
            r"\bshutdown\b",
            r"\breboot\b",
            r"\bkillall\b",
            r":\(\)",
        ]

        import re

        for pattern in dangerous_patterns:
            if re.search(pattern, command, re.IGNORECASE):
                return {
                    "success": False,
                    "error": "This command is not allowed for security reasons",
                    "output": "",
                }

        # Use bash login shell with alias expansion
        user_shell = os.environ.get("SHELL", "/bin/bash")

        # Get project root (automation-capi directory)
        project_root = os.environ.get("AUTOMATION_PATH") or os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )

        wrapper_command = f"""
            # Source profile files silently
            [ -f ~/.profile ] && source ~/.profile 2>/dev/null
            [ -f ~/.bashrc ] && source ~/.bashrc 2>/dev/null
            [ -f ~/.bash_profile ] && source ~/.bash_profile 2>/dev/null
            # Enable alias expansion
            shopt -s expand_aliases 2>/dev/null || true
            # Change to automation-capi project directory
            cd "{project_root}"
            # Run the actual command (oc commands use current cluster context)
            {command}
        """

        result = subprocess.run(
            [user_shell, "-c", wrapper_command],
            capture_output=True,
            text=True,
            timeout=60,
        )

        return {
            "success": result.returncode == 0,
            "output": result.stdout if result.stdout else result.stderr,
            "exit_code": result.returncode,
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Command execution timed out (60s limit)",
            "output": "",
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error executing command: {str(e)}",
            "output": "",
        }


# Re-use the same get-active-resources and get-resource-detail endpoints for Minikube
# since they work with kubectl and are provider-agnostic
@app.post("/api/minikube/get-active-resources")
async def get_minikube_active_resources(request: Request):
    """Get active CAPI/ROSA resources from the Minikube cluster"""
    # This endpoint is identical to Kind's version, just uses Minikube context
    body = await request.json()
    cluster_name = body.get("cluster_name", "").strip()

    # For Minikube, the context name is just the cluster name (not "kind-{name}")
    # So we temporarily modify the request to work with the shared logic
    modified_request = {
        "cluster_name": cluster_name,
        "namespace": body.get("namespace", "ns-rosa-hcp"),
    }

    # Call the shared implementation (we'll extract it to a helper function)
    return await _get_active_resources_impl(cluster_name, body.get("namespace", "ns-rosa-hcp"))


async def _get_active_resources_impl(cluster_name: str, namespace: str = "ns-rosa-hcp"):
    """Shared implementation for getting active resources"""
    try:
        if not cluster_name:
            return {"success": False, "message": "Cluster name is required", "resources": []}

        resources = []

        def calculate_age(creation_timestamp):
            from datetime import datetime, timezone

            try:
                created = datetime.fromisoformat(creation_timestamp.replace("Z", "+00:00"))
                now = datetime.now(timezone.utc)
                delta = now - created

                days = delta.days
                hours, remainder = divmod(delta.seconds, 3600)
                minutes, seconds = divmod(remainder, 60)

                if days > 0:
                    return f"{days}d{hours}h"
                elif hours > 0:
                    return f"{hours}h{minutes}m"
                elif minutes > 0:
                    return f"{minutes}m{seconds}s"
                else:
                    return f"{seconds}s"
            except Exception:
                return "unknown"

        # Fetch ns-rosa-hcp namespace
        try:
            result = subprocess.run(
                ["kubectl", "get", "namespace", namespace, "--context", cluster_name, "-o", "json"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                metadata = data.get("metadata", {})
                status = data.get("status", {})
                phase = status.get("phase", "Active")
                resources.append(
                    {
                        "type": "Namespace",
                        "name": metadata.get("name", "unknown"),
                        "version": "",
                        "status": phase,
                        "age": calculate_age(metadata.get("creationTimestamp", "")),
                    }
                )
        except Exception:
            pass

        # Fetch AWSClusterControllerIdentity (infrastructure resource)
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "awsclustercontrolleridentity",
                    "--context",
                    cluster_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    resources.append(
                        {
                            "type": "AWSClusterControllerIdentity",
                            "name": metadata.get("name", "unknown"),
                            "version": "",
                            "status": "Configured",
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        # Fetch ROSA credentials secret in capa-system
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "secret",
                    "rosa-creds-secret",
                    "-n",
                    "capa-system",
                    "--context",
                    cluster_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                metadata = data.get("metadata", {})
                resources.append(
                    {
                        "type": "Secret (ROSA Creds)",
                        "name": f"{metadata.get('name', 'unknown')} (capa-system)",
                        "version": "",
                        "status": "Configured",
                        "age": calculate_age(metadata.get("creationTimestamp", "")),
                    }
                )
        except Exception:
            pass

        # Fetch ROSA credentials secret in ns-rosa-hcp
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "secret",
                    "rosa-creds-secret",
                    "-n",
                    namespace,
                    "--context",
                    cluster_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                metadata = data.get("metadata", {})
                resources.append(
                    {
                        "type": "Secret (ROSA Creds)",
                        "name": f"{metadata.get('name', 'unknown')} ({namespace})",
                        "version": "",
                        "status": "Configured",
                        "age": calculate_age(metadata.get("creationTimestamp", "")),
                    }
                )
        except Exception:
            pass

        # Fetch AWS credentials secret in capa-system
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "secret",
                    "capa-manager-bootstrap-credentials",
                    "-n",
                    "capa-system",
                    "--context",
                    cluster_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                metadata = data.get("metadata", {})
                resources.append(
                    {
                        "type": "Secret (AWS Creds)",
                        "name": f"{metadata.get('name', 'unknown')} (capa-system)",
                        "version": "",
                        "status": "Configured",
                        "age": calculate_age(metadata.get("creationTimestamp", "")),
                    }
                )
        except Exception:
            pass

        # Fetch CAPI Clusters
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "clusters.cluster.x-k8s.io",
                    "-n",
                    namespace,
                    "--context",
                    cluster_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    spec = item.get("spec", {})
                    status = item.get("status", {})
                    resources.append(
                        {
                            "type": "CAPI Clusters",
                            "name": metadata.get("name", "unknown"),
                            "version": spec.get("topology", {}).get("version", "v1.5.3"),
                            "status": (
                                "Ready"
                                if status.get("phase") == "Provisioned"
                                else status.get("phase", "Active")
                            ),
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        # Fetch ROSACluster
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "rosacluster",
                    "-n",
                    namespace,
                    "--context",
                    cluster_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    spec = item.get("spec", {})
                    status = item.get("status", {})

                    # Check for ready status - could be in status.ready field or in conditions
                    is_ready = False

                    # First check if there's a direct ready field
                    if status.get("ready") == True or status.get("ready") == "true":
                        is_ready = True
                    else:
                        # Check conditions for various ready condition types
                        conditions = status.get("conditions", [])
                        for condition in conditions:
                            condition_type = condition.get("type", "")
                            # Check for various possible ready condition types
                            if condition.get("status") == "True" and (
                                condition_type == "Ready"
                                or condition_type == "ROSAClusterReady"
                                or condition_type == "RosaClusterReady"
                            ):
                                is_ready = True
                                break

                    resources.append(
                        {
                            "type": "ROSACluster",
                            "name": metadata.get("name", "unknown"),
                            "version": spec.get("version", "v4.20"),
                            "status": "Ready" if is_ready else "Provisioning",
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        # Fetch RosaControlPlane
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "rosacontrolplane",
                    "-n",
                    namespace,
                    "--context",
                    cluster_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    spec = item.get("spec", {})
                    status = item.get("status", {})

                    # Check for ready status - could be in status.ready field or in conditions
                    is_ready = False

                    # First check if there's a direct ready field
                    if status.get("ready") == True or status.get("ready") == "true":
                        is_ready = True
                    else:
                        # Check conditions for various ready condition types
                        conditions = status.get("conditions", [])
                        for condition in conditions:
                            condition_type = condition.get("type", "")
                            # Check for various possible ready condition types
                            if condition.get("status") == "True" and (
                                condition_type == "Ready"
                                or condition_type == "ROSAControlPlaneReady"
                                or condition_type == "RosaControlPlaneReady"
                            ):
                                is_ready = True
                                break

                    resources.append(
                        {
                            "type": "RosaControlPlane",
                            "name": metadata.get("name", "unknown"),
                            "version": spec.get("version", "v4.20"),
                            "status": "Ready" if is_ready else "Provisioning",
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        # Fetch RosaNetwork
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "rosanetwork",
                    "-n",
                    namespace,
                    "--context",
                    cluster_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    spec = item.get("spec", {})
                    status = item.get("status", {})

                    # Check conditions for RosaNetwork ready state
                    # Could be ROSANetworkReady, RosaNetworkReady, or just Ready
                    is_ready = False
                    conditions = status.get("conditions", [])
                    for condition in conditions:
                        condition_type = condition.get("type", "")
                        # Check for various possible ready condition types
                        if condition.get("status") == "True" and (
                            condition_type == "ROSANetworkReady"
                            or condition_type == "RosaNetworkReady"
                            or condition_type == "Ready"
                        ):
                            is_ready = True
                            break

                    resources.append(
                        {
                            "type": "RosaNetwork",
                            "name": metadata.get("name", "unknown"),
                            "version": spec.get("version", "v4.20"),
                            "status": "Ready" if is_ready else "Configuring",
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        # Fetch RosaRoleConfig
        try:
            result = subprocess.run(
                [
                    "kubectl",
                    "get",
                    "rosaroleconfig",
                    "-n",
                    namespace,
                    "--context",
                    cluster_name,
                    "-o",
                    "json",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                import json as json_module

                data = json_module.loads(result.stdout)
                for item in data.get("items", []):
                    metadata = item.get("metadata", {})
                    spec = item.get("spec", {})
                    status = item.get("status", {})

                    # Check conditions for RosaRoleConfig ready state
                    # Could be ROSARoleConfigReady, RosaRoleConfigReady, or just Ready
                    is_ready = False
                    conditions = status.get("conditions", [])
                    for condition in conditions:
                        condition_type = condition.get("type", "")
                        # Check for various possible ready condition types
                        if condition.get("status") == "True" and (
                            condition_type == "ROSARoleConfigReady"
                            or condition_type == "RosaRoleConfigReady"
                            or condition_type == "Ready"
                        ):
                            is_ready = True
                            break

                    resources.append(
                        {
                            "type": "RosaRoleConfig",
                            "name": metadata.get("name", "unknown"),
                            "version": spec.get("version", "v4.20"),
                            "status": "Ready" if is_ready else "Configuring",
                            "age": calculate_age(metadata.get("creationTimestamp", "")),
                        }
                    )
        except Exception:
            pass

        return {
            "success": True,
            "resources": resources,
            "message": f"Found {len(resources)} active resource(s)",
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Error fetching active resources: {str(e)}",
            "resources": [],
        }


@app.post("/api/minikube/get-resource-detail")
async def get_minikube_resource_detail(request: Request):
    """Get full YAML details of a specific resource from the Minikube cluster"""
    try:
        body = await request.json()
        cluster_name = body.get("cluster_name", "").strip()
        resource_type = body.get("resource_type", "").strip()
        resource_name = body.get("resource_name", "").strip()
        namespace = body.get("namespace", "ns-rosa-hcp").strip()

        if not cluster_name or not resource_type or not resource_name:
            return {
                "success": False,
                "message": "cluster_name, resource_type, and resource_name are required",
                "data": None,
            }

        # For Minikube, context name is just the cluster name (no "kind-" prefix)
        context_name = cluster_name

        # Map friendly resource types to kubectl resource types
        resource_type_map = {
            "CAPI Clusters": "clusters.cluster.x-k8s.io",
            "ROSACluster": "rosacluster",
            "RosaControlPlane": "rosacontrolplane",
            "RosaNetwork": "rosanetwork",
            "RosaRoleConfig": "rosaroleconfig",
            "AWSClusterControllerIdentity": "awsclustercontrolleridentity",
            "Secret (ROSA Creds)": "secret",
            "Secret (AWS Creds)": "secret",
        }

        kubectl_resource_type = resource_type_map.get(resource_type, resource_type.lower())

        # For secrets, extract the actual secret name from the display name
        # e.g., "rosa-creds-secret (capa-system)" -> "rosa-creds-secret"
        if kubectl_resource_type == "secret" and "(" in resource_name:
            # Extract name and namespace from display format
            actual_name = resource_name.split("(")[0].strip()
            # Extract namespace from parentheses if present
            if "(" in resource_name and ")" in resource_name:
                ns_from_name = resource_name.split("(")[1].split(")")[0].strip()
                namespace = ns_from_name
            resource_name = actual_name

        # Fetch the resource details in YAML format
        try:
            # For cluster-scoped resources (like AWSClusterControllerIdentity), don't use namespace
            if kubectl_resource_type == "awsclustercontrolleridentity":
                result = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        kubectl_resource_type,
                        resource_name,
                        "--context",
                        context_name,
                        "-o",
                        "yaml",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
            else:
                result = subprocess.run(
                    [
                        "kubectl",
                        "get",
                        kubectl_resource_type,
                        resource_name,
                        "-n",
                        namespace,
                        "--context",
                        context_name,
                        "-o",
                        "yaml",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )

            if result.returncode == 0:
                return {
                    "success": True,
                    "data": result.stdout,
                    "resource_type": resource_type,
                    "resource_name": resource_name,
                    "namespace": namespace,
                    "message": f"Successfully fetched {resource_type} '{resource_name}'",
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to fetch resource: {result.stderr}",
                    "data": None,
                }

        except subprocess.TimeoutExpired:
            return {"success": False, "message": "Request timed out", "data": None}

    except Exception as e:
        return {
            "success": False,
            "message": f"Error fetching resource detail: {str(e)}",
            "data": None,
        }


@app.post("/api/ocp/get-resource-detail")
async def get_ocp_resource_detail(request: Request):
    """Get full YAML details of a specific resource from the OCP/MCE cluster"""
    try:
        body = await request.json()
        resource_type = body.get("resource_type", "").strip()
        resource_name = body.get("resource_name", "").strip()
        namespace = body.get("namespace", "").strip()

        if not resource_type or not resource_name:
            return {
                "success": False,
                "message": "resource_type and resource_name are required",
                "data": None,
            }

        # Map friendly resource types to oc/kubectl resource types
        resource_type_map = {
            "Deployment": "deployment",
            "ClusterManager": "clustermanager",
            "ClusterRoleBinding": "clusterrolebinding",
            "Secret": "secret",
            "AWSClusterControllerIdentity": "awsclustercontrolleridentity",
            "Namespace": "namespace",
        }

        oc_resource_type = resource_type_map.get(resource_type, resource_type.lower())

        # Fetch the resource details in YAML format using oc
        try:
            # For cluster-scoped resources, don't use namespace
            cluster_scoped_resources = [
                "clusterrolebinding",
                "awsclustercontrolleridentity",
                "namespace",
                "clustermanager",
            ]

            if oc_resource_type in cluster_scoped_resources:
                result = subprocess.run(
                    [
                        "oc",
                        "get",
                        oc_resource_type,
                        resource_name,
                        "-o",
                        "yaml",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
            else:
                # Namespace-scoped resources
                if not namespace:
                    return {
                        "success": False,
                        "message": f"Namespace is required for resource type '{resource_type}'",
                        "data": None,
                    }
                result = subprocess.run(
                    [
                        "oc",
                        "get",
                        oc_resource_type,
                        resource_name,
                        "-n",
                        namespace,
                        "-o",
                        "yaml",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )

            if result.returncode == 0:
                return {
                    "success": True,
                    "data": result.stdout,
                    "resource_type": resource_type,
                    "resource_name": resource_name,
                    "namespace": namespace,
                    "message": f"Successfully fetched {resource_type} '{resource_name}'",
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to fetch resource: {result.stderr}",
                    "data": None,
                }

        except subprocess.TimeoutExpired:
            return {"success": False, "message": "Request timed out", "data": None}

    except Exception as e:
        return {
            "success": False,
            "message": f"Error fetching resource detail: {str(e)}",
            "data": None,
        }


@app.get("/api/rosa/last-yaml-path")
async def get_last_rosa_yaml_path():
    """Get the last used YAML file path for ROSA HCP provisioning"""
    return {
        "success": True,
        "path": last_rosa_yaml_path.get("path"),
    }


@app.post("/api/rosa/save-yaml-path")
async def save_rosa_yaml_path(request: Request):
    """Save the YAML file path used for ROSA HCP provisioning"""
    try:
        body = await request.json()
        path = body.get("path")

        if path:
            last_rosa_yaml_path["path"] = path
            return {
                "success": True,
                "message": f"Saved YAML path: {path}",
                "path": path,
            }
        else:
            return {
                "success": False,
                "message": "No path provided",
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error saving YAML path: {str(e)}",
        }


@app.post("/api/provisioning/generate-yaml")
async def generate_provisioning_yaml(request: Request):
    """Generate provisioning YAML without applying it (preview mode) - Direct Jinja2 rendering"""
    try:
        body = await request.json()
        config = body.get("config", {})

        # Extract configuration
        cluster_name = config.get("clusterName")
        openshift_version = config.get("openShiftVersion", "4.19.10")
        create_rosa_network = config.get("createRosaNetwork", True)
        create_rosa_roles = config.get("createRosaRoleConfig", True)
        vpc_cidr_block = config.get("vpcCidrBlock", "10.0.0.0/16")
        availability_zone_count = config.get("availabilityZoneCount", 1)
        role_prefix = config.get("rolePrefix", cluster_name)
        domain_prefix = config.get("domainPrefix", "")
        channel_group = config.get("channelGroup", "stable")
        aws_region = config.get("awsRegion", "us-west-2")

        if not cluster_name:
            raise HTTPException(status_code=400, detail="cluster_name is required")

        if not domain_prefix:
            raise HTTPException(status_code=400, detail="domain_prefix is required")

        if len(domain_prefix) > 15:
            raise HTTPException(status_code=400, detail="domain_prefix must be 15 characters or less")

        print(f"🔍 [PREVIEW-DIRECT] Rendering templates directly for {cluster_name}")

        project_root = os.environ.get("AUTOMATION_PATH") or os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )

        # Parse version to get major.minor
        version_parts = openshift_version.split(".")
        major_minor = f"{version_parts[0]}.{version_parts[1]}" if len(version_parts) >= 2 else openshift_version

        from jinja2 import Environment, FileSystemLoader, select_autoescape
        import re
        from datetime import datetime

        # Custom Jinja2 filters to match Ansible functionality
        def regex_replace(value, pattern, replacement):
            """Ansible-compatible regex_replace filter"""
            return re.sub(pattern, replacement, str(value))

        def ansible_lookup(lookup_type, command):
            """Ansible-compatible lookup filter - simplified for preview mode"""
            if lookup_type == 'pipe' and 'date' in command:
                # Return current UTC timestamp
                return datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
            return ""

        yaml_contents = []
        yaml_files = []

        # Template variables
        template_vars = {
            "cluster_name": cluster_name,
            "cluster_name_prefix": cluster_name[:32],  # Truncate to 32 chars for AWS limits
            "rcp_version": openshift_version,
            "aws_account_id": "123456789012",  # Placeholder for preview
            "aws_region": aws_region,
            "capi_namespace": "ns-rosa-hcp",
            "rosa_role_config_name": f"{cluster_name}-roles",
            "rosa_role_prefix": role_prefix,
            "rosa_network_name": f"{cluster_name}-network",
            "network_cidr": vpc_cidr_block,
            "vpc_cidr_block": vpc_cidr_block,
            "availability_zone_count": availability_zone_count,
            "aws_availability_zones": [f"{aws_region}a", f"{aws_region}b", f"{aws_region}c"][:availability_zone_count],
            "openshift_version": openshift_version,
            "rosa_creds_secret": "rosa-creds-secret",
            "environment_tag": "test",
            "purpose_tag": "rosa-preview",
            "domain_prefix": domain_prefix if domain_prefix else f"rosa-{cluster_name[:15]}",
            "channel_group": channel_group,
            "cluster_network": {
                "pod_cidr": "10.128.0.0/14",
                "service_cidr": "172.30.0.0/16",
                "machine_cidr": vpc_cidr_block
            },
            "rosa_network_config": {
                "name": f"{cluster_name}-network",
                "cidr_block": vpc_cidr_block,
                "availability_zones": [f"us-west-2a", f"us-west-2b"][:availability_zone_count],
                "identity_name": "default",
                "enabled": create_rosa_network,
                "tags": {"Environment": "test", "CreatedBy": "automation-ui"}
            },
            "rosa_role_config": {
                "prefix": role_prefix[:4],
                "version": openshift_version,
                "identity_name": "default",
                "enabled": create_rosa_roles
            },
            "machine_pool": {
                "instance_type": "m5.xlarge",
                "min_replicas": 2,
                "max_replicas": 3,
                "replicas": 2
            },
        }

        # Determine which template to use based on automation options
        if create_rosa_network and create_rosa_roles:
            # Use combined template that includes everything (ROSARoleConfig, ROSANetwork, and all cluster resources)
            cp_template_name = "rosa-combined-automation.yaml.j2"
            use_combined_template = True
        elif create_rosa_network:
            cp_template_name = "rosa-capi-network-cluster.yaml.j2"
            use_combined_template = True  # Network template also includes ROSANetwork
        elif create_rosa_roles:
            cp_template_name = "rosa-capi-roles-cluster.yaml.j2"
            use_combined_template = True  # Roles template also includes ROSARoleConfig
        else:
            cp_template_name = "rosa-control-plane.yaml.j2"
            use_combined_template = False

        # If NOT using a combined template, render individual resources first
        if not use_combined_template:
            # Render ROSARoleConfig if needed (only for manual mode)
            if create_rosa_roles:
                role_template_path = os.path.join(project_root, f"templates/versions/{major_minor}/features/rosa-role-config.yaml.j2")
                if not os.path.exists(role_template_path):
                    role_template_path = os.path.join(project_root, f"templates/versions/{major_minor}/4.20/features/rosa-role-config.yaml.j2")
                if not os.path.exists(role_template_path):
                    role_template_path = os.path.join(project_root, f"templates/features/rosa-role-config.yaml.j2")

                if os.path.exists(role_template_path):
                    env = Environment(loader=FileSystemLoader(os.path.dirname(role_template_path)))
                    env.filters['regex_replace'] = regex_replace
                    env.globals['lookup'] = ansible_lookup
                    template = env.get_template(os.path.basename(role_template_path))
                    rendered = template.render(**template_vars)
                    yaml_contents.append(rendered)
                    yaml_files.append(role_template_path)

            # Render ROSANetwork if needed (only for manual mode)
            if create_rosa_network:
                network_template_path = os.path.join(project_root, f"templates/versions/{major_minor}/features/rosa-network-config.yaml.j2")
                if not os.path.exists(network_template_path):
                    network_template_path = os.path.join(project_root, f"templates/versions/{major_minor}/4.20/features/rosa-network-config.yaml.j2")
                if not os.path.exists(network_template_path):
                    network_template_path = os.path.join(project_root, f"templates/features/rosa-network-config.yaml.j2")

                if os.path.exists(network_template_path):
                    env = Environment(loader=FileSystemLoader(os.path.dirname(network_template_path)))
                    env.filters['regex_replace'] = regex_replace
                    env.globals['lookup'] = ansible_lookup
                    template = env.get_template(os.path.basename(network_template_path))
                    rendered = template.render(**template_vars)
                    yaml_contents.append(rendered)
                    yaml_files.append(network_template_path)

        # Render main cluster template (combined or control-plane-only)
        cp_template_path = os.path.join(project_root, f"templates/versions/{major_minor}/features/{cp_template_name}")
        if not os.path.exists(cp_template_path):
            # Try version/4.20/features fallback (e.g., 4.19/4.20/features)
            cp_template_path = os.path.join(project_root, f"templates/versions/{major_minor}/4.20/features/{cp_template_name}")
        if not os.path.exists(cp_template_path):
            cp_template_path = os.path.join(project_root, f"templates/versions/{major_minor}/cluster-configs/{cp_template_name}")
        if not os.path.exists(cp_template_path):
            cp_template_path = os.path.join(project_root, f"templates/features/{cp_template_name}")

        if os.path.exists(cp_template_path):
            env = Environment(loader=FileSystemLoader(os.path.dirname(cp_template_path)))
            env.filters['regex_replace'] = regex_replace
            env.globals['lookup'] = ansible_lookup
            template = env.get_template(os.path.basename(cp_template_path))
            rendered = template.render(
                **template_vars,
                rosa_role_config_ref=template_vars["rosa_role_config_name"] if create_rosa_roles else None,
                rosa_network_ref=template_vars["rosa_network_name"] if create_rosa_network else None,
            )
            yaml_contents.append(rendered)
            yaml_files.append(cp_template_path)
            print(f"✅ [PREVIEW-DIRECT] Rendered template: {cp_template_name} (combined={use_combined_template})")
        else:
            print(f"⚠️  Control plane template not found at {cp_template_path}")

        # Combine all YAML documents
        combined_yaml = "\n---\n".join(yaml_contents)

        # Determine feature type for filename
        if create_rosa_network and create_rosa_roles:
            feature_type = "network-roles"
            automation_suffix = "full-automation"  # Complete cluster with automated network and roles
        elif create_rosa_network:
            feature_type = "network"
            automation_suffix = "network-automation"  # Complete cluster with automated network
        elif create_rosa_roles:
            feature_type = "roles"
            automation_suffix = "roles-automation"  # Complete cluster with automated roles
        else:
            feature_type = "manual"
            automation_suffix = "manual-config"  # Complete cluster with manual network and roles

        # Create a meaningful file path for the combined YAML
        # Use the pattern: {cluster-name}-complete-{automation-type}.yaml
        combined_filename = f"{cluster_name}-complete-{automation_suffix}.yaml"
        combined_file_path = f"generated-yamls/{datetime.now().strftime('%Y-%m-%d')}/{combined_filename}"

        print(f"✅ [PREVIEW-DIRECT] Generated {len(yaml_contents)} YAML document(s)")
        print(f"📄 [PREVIEW-DIRECT] File will be saved as: {combined_file_path}")

        return {
            "success": True,
            "yaml_content": combined_yaml,
            "file_paths": [combined_file_path],  # Single combined file path
            "feature_type": feature_type,
            "cluster_name": cluster_name,
            "message": f"Generated YAML for {len(yaml_contents)} resource(s)",
        }

    except Exception as e:
        import traceback
        print(f"❌ [PREVIEW-DIRECT] Error: {str(e)}")
        print(traceback.format_exc())
        return {
            "success": False,
            "message": f"Error generating YAML: {str(e)}",
            "error": traceback.format_exc(),
        }


@app.post("/api/provisioning/apply-yaml")
async def apply_provisioning_yaml(request: Request, background_tasks: BackgroundTasks):
    """Save and apply user-edited provisioning YAML"""
    try:
        body = await request.json()
        yaml_content = body.get("yaml_content")
        cluster_name = body.get("cluster_name")
        feature_type = body.get("feature_type", "manual")

        if not yaml_content or not cluster_name:
            raise HTTPException(status_code=400, detail="yaml_content and cluster_name are required")

        project_root = os.environ.get("AUTOMATION_PATH") or os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )

        # Create dated directory: generated-yamls/YYYY-MM-DD/
        from datetime import date
        today = date.today().strftime("%Y-%m-%d")
        saved_yamls_dir = os.path.join(project_root, "generated-yamls", today)
        os.makedirs(saved_yamls_dir, exist_ok=True)

        # Save to dated directory with feature type naming
        saved_yaml_filename = f"{cluster_name}-{feature_type}.yaml"
        saved_yaml_path = os.path.join(saved_yamls_dir, saved_yaml_filename)

        with open(saved_yaml_path, 'w') as f:
            f.write(yaml_content)

        print(f"💾 [APPLY] Saved edited YAML to: {saved_yaml_path}")

        # Also copy to ~/output for Ansible compatibility
        output_dir = os.path.expanduser("~/output")
        os.makedirs(output_dir, exist_ok=True)
        output_yaml_path = os.path.join(output_dir, f"{cluster_name}-combined.yaml")

        with open(output_yaml_path, 'w') as f:
            f.write(yaml_content)

        # Generate job ID
        job_id = str(uuid.uuid4())

        # Create job
        jobs[job_id] = {
            "id": job_id,
            "status": "pending",
            "progress": 0,
            "message": "Queued: Applying provisioning YAML",
            "logs": [],
            "created_at": datetime.now(),
            "yaml_file": saved_yaml_path,
            "description": f"Apply ROSA provisioning YAML for {cluster_name}",
        }

        # Run application in background
        async def apply_yaml_background():
            try:
                jobs[job_id]["status"] = "running"
                jobs[job_id]["progress"] = 10
                jobs[job_id]["message"] = "Parsing YAML resources"

                # Split multi-document YAML by ---
                import yaml
                yaml_documents = list(yaml.safe_load_all(yaml_content))

                jobs[job_id]["progress"] = 20
                jobs[job_id]["message"] = f"Found {len(yaml_documents)} resource(s) to apply"
                jobs[job_id]["logs"].append(f"📄 Parsed {len(yaml_documents)} YAML document(s)")

                # Apply each resource using oc apply
                progress_increment = 70 / max(len(yaml_documents), 1)
                current_progress = 20

                for idx, doc in enumerate(yaml_documents, 1):
                    if not doc:  # Skip empty documents
                        continue

                    kind = doc.get("kind", "Unknown")
                    name = doc.get("metadata", {}).get("name", "Unknown")

                    jobs[job_id]["logs"].append(f"\n[{idx}/{len(yaml_documents)}] Applying {kind}/{name}...")

                    # Save individual document to temp file
                    import tempfile
                    with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as temp_file:
                        yaml.dump(doc, temp_file)
                        temp_path = temp_file.name

                    try:
                        result = subprocess.run(
                            ["oc", "apply", "-f", temp_path],
                            cwd=project_root,
                            capture_output=True,
                            text=True,
                            timeout=120,
                        )

                        if result.returncode == 0:
                            jobs[job_id]["logs"].append(f"✅ {result.stdout.strip()}")
                        else:
                            jobs[job_id]["logs"].append(f"❌ Failed: {result.stderr.strip()}")
                            raise Exception(f"Failed to apply {kind}/{name}: {result.stderr}")

                    finally:
                        os.unlink(temp_path)

                    current_progress += progress_increment
                    jobs[job_id]["progress"] = int(current_progress)

                jobs[job_id]["status"] = "completed"
                jobs[job_id]["progress"] = 100
                jobs[job_id]["message"] = f"Successfully applied {len(yaml_documents)} resource(s)"
                jobs[job_id]["logs"].append(f"\n✅ All resources applied successfully!")
                jobs[job_id]["completed_at"] = datetime.now()
                jobs[job_id]["return_code"] = 0

            except Exception as e:
                jobs[job_id]["status"] = "failed"
                jobs[job_id]["message"] = f"Error applying YAML: {str(e)}"
                jobs[job_id]["logs"].append(f"\n❌ ERROR: {str(e)}")
                jobs[job_id]["completed_at"] = datetime.now()
                jobs[job_id]["return_code"] = 1

        # Start background task
        background_tasks.add_task(apply_yaml_background)

        return {
            "job_id": job_id,
            "status": "pending",
            "message": "YAML queued for application",
            "saved_path": saved_yaml_path,
        }

    except Exception as e:
        import traceback
        error_msg = f"Error applying YAML: {str(e)}"
        print(f"❌ [APPLY] {error_msg}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_msg)


@app.get("/api/clusters")
async def list_clusters():
    """List all ROSA HCP clusters with their status"""
    try:
        result = subprocess.run(
            ["kubectl", "get", "rosacontrolplane", "-n", "ns-rosa-hcp", "-o", "json"],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "clusters": [],
                "message": f"Error fetching clusters: {result.stderr}",
            }

        import json
        data = json.loads(result.stdout)

        clusters = []
        for item in data.get("items", []):
            metadata = item.get("metadata", {})
            spec = item.get("spec", {})
            status = item.get("status", {})

            # Determine overall status
            ready = status.get("ready", False)
            conditions = status.get("conditions", [])

            # Get error message if any
            error_message = None
            for condition in conditions:
                if condition.get("type") == "Ready" and condition.get("status") == "False":
                    error_message = condition.get("message", "Unknown error")

            # Calculate progress percentage
            progress = 0
            if ready:
                progress = 100
            else:
                # Check sub-resources
                network_ready = any(c.get("type") == "ROSANetworkReady" and c.get("status") == "True" for c in conditions)
                role_ready = any(c.get("type") == "ROSARoleConfigReady" and c.get("status") == "True" for c in conditions)
                cp_valid = any(c.get("type") == "ROSAControlPlaneValid" and c.get("status") == "True" for c in conditions)

                if cp_valid:
                    progress += 25
                if role_ready:
                    progress += 25
                if network_ready:
                    progress += 25
                if ready:
                    progress += 25

            region = spec.get("region", "N/A")
            cluster_info = {
                "name": metadata.get("name"),
                "namespace": metadata.get("namespace", "ns-rosa-hcp"),
                "created_at": metadata.get("creationTimestamp"),
                "domain_prefix": spec.get("domainPrefix", "N/A"),
                "version": spec.get("version", "N/A"),
                "region": region,
                "ready": ready,
                "progress": progress,
                "status": "ready" if ready else ("failed" if error_message else "provisioning"),
                "error_message": error_message,
                "console_url": status.get("consoleURL"),
                "api_url": f"https://api.{spec.get('domainPrefix', 'unknown')}.{region}.openshiftapps.com" if spec.get('domainPrefix') else None,
            }

            clusters.append(cluster_info)

        # Sort by creation time (newest first)
        clusters.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        return {
            "success": True,
            "clusters": clusters,
            "count": len(clusters),
        }

    except Exception as e:
        import traceback
        print(f"❌ [LIST-CLUSTERS] Error: {str(e)}")
        print(traceback.format_exc())
        return {
            "success": False,
            "clusters": [],
            "message": f"Error listing clusters: {str(e)}",
        }


@app.get("/api/clusters/{cluster_name}/status")
async def get_cluster_status(cluster_name: str):
    """Get detailed status for a specific cluster"""
    try:
        # Get ROSAControlPlane
        result = subprocess.run(
            ["kubectl", "get", "rosacontrolplane", cluster_name, "-n", "ns-rosa-hcp", "-o", "json"],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            raise HTTPException(status_code=404, detail=f"Cluster {cluster_name} not found")

        import json
        cp_data = json.loads(result.stdout)

        # Get ROSANetwork if it exists
        network_data = None
        network_result = subprocess.run(
            ["kubectl", "get", "rosanetwork", f"{cluster_name}-network", "-n", "ns-rosa-hcp", "-o", "json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if network_result.returncode == 0:
            network_data = json.loads(network_result.stdout)

        # Get ROSARoleConfig if it exists
        role_data = None
        role_result = subprocess.run(
            ["kubectl", "get", "rosaroleconfig", f"{cluster_name}-roles", "-n", "ns-rosa-hcp", "-o", "json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if role_result.returncode == 0:
            role_data = json.loads(role_result.stdout)

        return {
            "success": True,
            "control_plane": cp_data,
            "network": network_data,
            "roles": role_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"❌ [GET-CLUSTER-STATUS] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error getting cluster status: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
