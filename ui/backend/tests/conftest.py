"""
Pytest configuration and shared fixtures.

This file is automatically loaded by pytest and provides
fixtures available to all test files.
"""

import pytest
from typing import Generator


@pytest.fixture
def mock_cluster_config() -> dict:
    """Provide a sample cluster configuration for testing."""
    return {
        "cluster_name": "test-cluster",
        "region": "us-east-1",
        "version": "4.14.0",
        "replicas": 3,
        "machine_type": "m5.xlarge",
    }


@pytest.fixture
def mock_user_vars() -> dict:
    """Provide mock user variables for testing."""
    return {
        "ocp_hub_cluster_url": "https://test.example.com",
        "ocp_hub_username": "test-user",
        "ocp_hub_password": "test-password",
        "aws_access_key_id": "TEST_ACCESS_KEY",
        "aws_secret_access_key": "TEST_SECRET_KEY",
        "ocm_token": "test-token",
    }


@pytest.fixture(autouse=True)
def reset_environment(monkeypatch) -> Generator:
    """
    Automatically reset environment variables for each test.

    This prevents tests from affecting each other through
    environment variable modifications.
    """
    # Store original environment
    import os

    original_env = os.environ.copy()

    yield

    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)
