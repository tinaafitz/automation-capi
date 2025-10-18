"""
Health check and readiness endpoints for production monitoring.
"""

import os
import subprocess
from datetime import datetime
from typing import Dict, Any
import yaml


async def check_system_health() -> Dict[str, Any]:
    """
    Comprehensive system health check.

    Returns status of critical system components.
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "checks": {}
    }

    all_healthy = True

    # Check 1: Configuration file exists
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config_path = os.path.join(project_root, "vars", "user_vars.yml")

        if os.path.exists(config_path):
            health_status["checks"]["config_file"] = {
                "status": "healthy",
                "message": "Configuration file found"
            }
        else:
            health_status["checks"]["config_file"] = {
                "status": "warning",
                "message": "Configuration file not found"
            }
            all_healthy = False
    except Exception as e:
        health_status["checks"]["config_file"] = {
            "status": "unhealthy",
            "message": f"Error checking config: {str(e)}"
        }
        all_healthy = False

    # Check 2: ROSA CLI availability
    try:
        result = subprocess.run(
            ["rosa", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            health_status["checks"]["rosa_cli"] = {
                "status": "healthy",
                "message": "ROSA CLI available",
                "version": result.stdout.strip()
            }
        else:
            health_status["checks"]["rosa_cli"] = {
                "status": "warning",
                "message": "ROSA CLI not responding"
            }
    except subprocess.TimeoutExpired:
        health_status["checks"]["rosa_cli"] = {
            "status": "warning",
            "message": "ROSA CLI timeout"
        }
    except FileNotFoundError:
        health_status["checks"]["rosa_cli"] = {
            "status": "warning",
            "message": "ROSA CLI not installed"
        }
    except Exception as e:
        health_status["checks"]["rosa_cli"] = {
            "status": "unhealthy",
            "message": f"Error: {str(e)}"
        }

    # Check 3: Ansible availability
    try:
        result = subprocess.run(
            ["ansible", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            health_status["checks"]["ansible"] = {
                "status": "healthy",
                "message": "Ansible available",
                "version": version_line
            }
        else:
            health_status["checks"]["ansible"] = {
                "status": "unhealthy",
                "message": "Ansible not responding"
            }
            all_healthy = False
    except FileNotFoundError:
        health_status["checks"]["ansible"] = {
            "status": "unhealthy",
            "message": "Ansible not installed"
        }
        all_healthy = False
    except Exception as e:
        health_status["checks"]["ansible"] = {
            "status": "unhealthy",
            "message": f"Error: {str(e)}"
        }
        all_healthy = False

    # Check 4: Disk space
    try:
        import shutil
        total, used, free = shutil.disk_usage("/")
        free_gb = free // (2**30)

        if free_gb > 10:
            health_status["checks"]["disk_space"] = {
                "status": "healthy",
                "message": f"{free_gb}GB free",
                "free_gb": free_gb
            }
        elif free_gb > 5:
            health_status["checks"]["disk_space"] = {
                "status": "warning",
                "message": f"Low disk space: {free_gb}GB free",
                "free_gb": free_gb
            }
        else:
            health_status["checks"]["disk_space"] = {
                "status": "unhealthy",
                "message": f"Critical: {free_gb}GB free",
                "free_gb": free_gb
            }
            all_healthy = False
    except Exception as e:
        health_status["checks"]["disk_space"] = {
            "status": "warning",
            "message": f"Could not check disk space: {str(e)}"
        }

    # Set overall status
    if not all_healthy:
        health_status["status"] = "degraded"

    # Check if any component is unhealthy
    for check in health_status["checks"].values():
        if check["status"] == "unhealthy":
            health_status["status"] = "unhealthy"
            break

    return health_status


async def check_readiness() -> Dict[str, Any]:
    """
    Readiness check for load balancer / orchestration.

    Returns whether the service is ready to accept traffic.
    """
    readiness_status = {
        "ready": True,
        "timestamp": datetime.now().isoformat(),
        "checks": {}
    }

    # Check 1: Critical dependencies
    try:
        # Check Ansible
        result = subprocess.run(
            ["ansible", "--version"],
            capture_output=True,
            text=True,
            timeout=3
        )
        if result.returncode == 0:
            readiness_status["checks"]["ansible"] = {"ready": True}
        else:
            readiness_status["checks"]["ansible"] = {"ready": False}
            readiness_status["ready"] = False
    except:
        readiness_status["checks"]["ansible"] = {"ready": False}
        readiness_status["ready"] = False

    # Check 2: Configuration
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config_path = os.path.join(project_root, "vars", "user_vars.yml")

        if os.path.exists(config_path):
            readiness_status["checks"]["config"] = {"ready": True}
        else:
            readiness_status["checks"]["config"] = {"ready": False}
            readiness_status["ready"] = False
    except:
        readiness_status["checks"]["config"] = {"ready": False}
        readiness_status["ready"] = False

    return readiness_status


async def check_liveness() -> Dict[str, Any]:
    """
    Liveness check for container orchestration.

    Returns whether the service is alive (basic ping).
    """
    return {
        "alive": True,
        "timestamp": datetime.now().isoformat()
    }


async def get_metrics() -> Dict[str, Any]:
    """
    Get application metrics for monitoring.
    """
    import psutil

    try:
        process = psutil.Process()

        return {
            "timestamp": datetime.now().isoformat(),
            "process": {
                "cpu_percent": process.cpu_percent(interval=0.1),
                "memory_mb": process.memory_info().rss / 1024 / 1024,
                "threads": process.num_threads(),
                "open_files": len(process.open_files()),
            },
            "system": {
                "cpu_percent": psutil.cpu_percent(interval=0.1),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage('/').percent,
            }
        }
    except Exception as e:
        return {
            "error": f"Could not gather metrics: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }
