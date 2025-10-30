"""
Extended health and monitoring endpoints for production.

Add these to your main app.py:

from app_extensions import add_production_endpoints
add_production_endpoints(app)
"""

from fastapi import FastAPI, Response
from health import check_system_health, check_readiness, check_liveness, get_metrics
from monitoring import init_sentry


def add_production_endpoints(app: FastAPI):
    """
    Add production-ready health check and monitoring endpoints.

    Args:
        app: FastAPI application instance
    """

    @app.on_event("startup")
    async def startup_event():
        """Initialize monitoring on startup."""
        sentry_initialized = init_sentry()
        if sentry_initialized:
            print("✅ Sentry monitoring initialized")
        else:
            print("⚠️  Sentry monitoring not configured (set SENTRY_DSN to enable)")

    @app.get("/health")
    async def health():
        """
        Basic health check endpoint.

        Returns 200 if service is running.
        """
        return {"status": "healthy"}

    @app.get("/health/detailed")
    async def health_detailed():
        """
        Detailed health check with component status.

        Checks:
        - Configuration files
        - External dependencies (ROSA CLI, Ansible)
        - System resources (disk space)

        Returns:
        - 200: All components healthy
        - 200: Some components degraded (status: degraded)
        - 503: Critical components unhealthy
        """
        health_status = await check_system_health()

        status_code = 200
        if health_status["status"] == "unhealthy":
            status_code = 503

        return Response(
            content=str(health_status), status_code=status_code, media_type="application/json"
        )

    @app.get("/health/ready")
    async def readiness():
        """
        Kubernetes readiness probe endpoint.

        Checks if service is ready to accept traffic.
        Used by load balancers and orchestrators.

        Returns:
        - 200: Service is ready
        - 503: Service is not ready
        """
        readiness_status = await check_readiness()

        if readiness_status["ready"]:
            return readiness_status
        else:
            return Response(
                content=str(readiness_status), status_code=503, media_type="application/json"
            )

    @app.get("/health/live")
    async def liveness():
        """
        Kubernetes liveness probe endpoint.

        Simple check that service is alive.
        Used by orchestrators to restart unhealthy containers.

        Always returns 200 unless service is completely dead.
        """
        return await check_liveness()

    @app.get("/metrics")
    async def metrics():
        """
        Application metrics endpoint.

        Returns process and system metrics for monitoring.
        Can be scraped by Prometheus or other monitoring tools.
        """
        return await get_metrics()

    @app.get("/api/version")
    async def version():
        """
        Get application version information.
        """
        import os

        return {
            "version": os.getenv("APP_VERSION", "1.0.0"),
            "environment": os.getenv("APP_ENV", "development"),
            "build_date": os.getenv("BUILD_DATE", "unknown"),
        }

    return app
