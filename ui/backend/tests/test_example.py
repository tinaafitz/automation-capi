"""
Example test file demonstrating testing patterns for the ROSA automation backend.

This file shows how to:
- Test FastAPI endpoints
- Use pytest fixtures
- Test async functions
- Mock external dependencies
"""

import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from fastapi.testclient import TestClient


# Example: Simple unit test
def test_addition():
    """Test basic arithmetic to verify pytest is working."""
    assert 1 + 1 == 2


# Example: Testing with pytest fixtures
@pytest.fixture
def sample_cluster_config():
    """Fixture providing sample cluster configuration."""
    return {
        "cluster_name": "test-cluster",
        "region": "us-east-1",
        "version": "4.14.0",
        "replicas": 3
    }


def test_cluster_config_fixture(sample_cluster_config):
    """Test using a fixture."""
    assert sample_cluster_config["cluster_name"] == "test-cluster"
    assert sample_cluster_config["replicas"] == 3


# Example: Async test
@pytest.mark.asyncio
async def test_async_function():
    """Example of testing an async function."""
    async def fetch_data():
        return {"status": "success"}

    result = await fetch_data()
    assert result["status"] == "success"


# Example: Testing input validation
@pytest.mark.parametrize("cluster_name,expected_valid", [
    ("valid-cluster-123", True),
    ("ValidCluster", True),
    ("invalid cluster", False),  # spaces not allowed
    ("cluster-with-special-@", False),  # special chars not allowed
    ("a" * 100, False),  # too long
])
def test_cluster_name_validation(cluster_name, expected_valid):
    """Test cluster name validation logic."""
    import re

    # Example validation pattern (adjust to match your actual validation)
    pattern = r'^[a-zA-Z0-9-]{1,63}$'
    is_valid = bool(re.match(pattern, cluster_name))

    assert is_valid == expected_valid


# Example: Testing with mock
@pytest.mark.asyncio
async def test_with_mock(mocker):
    """Example of testing with mocked dependencies."""
    # Mock a subprocess call
    mock_subprocess = mocker.patch('subprocess.run')
    mock_subprocess.return_value.returncode = 0
    mock_subprocess.return_value.stdout = "mock output"

    # Your test logic here
    import subprocess
    result = subprocess.run(['echo', 'test'], capture_output=True, text=True)

    assert result.returncode == 0
    assert result.stdout == "mock output"


# Example: FastAPI endpoint test setup
def create_test_app():
    """Create a minimal FastAPI app for testing."""
    app = FastAPI()

    @app.get("/health")
    async def health_check():
        return {"status": "healthy"}

    @app.post("/validate")
    async def validate_config(config: dict):
        if "cluster_name" not in config:
            return {"valid": False, "error": "cluster_name required"}
        return {"valid": True}

    return app


def test_health_endpoint():
    """Test the health check endpoint."""
    app = create_test_app()
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_validate_endpoint_success():
    """Test successful validation."""
    app = create_test_app()
    client = TestClient(app)

    response = client.post(
        "/validate",
        json={"cluster_name": "test-cluster"}
    )

    assert response.status_code == 200
    assert response.json()["valid"] is True


def test_validate_endpoint_missing_field():
    """Test validation with missing required field."""
    app = create_test_app()
    client = TestClient(app)

    response = client.post("/validate", json={})

    assert response.status_code == 200
    assert response.json()["valid"] is False
    assert "cluster_name required" in response.json()["error"]


# Example: Testing error handling
@pytest.mark.asyncio
async def test_error_handling():
    """Test that errors are handled properly."""
    async def function_that_raises():
        raise ValueError("Test error")

    with pytest.raises(ValueError, match="Test error"):
        await function_that_raises()


# Example: Setup and teardown
@pytest.fixture
def temp_config_file(tmp_path):
    """Create a temporary config file for testing."""
    config_file = tmp_path / "config.yml"
    config_file.write_text("cluster_name: test\n")

    yield config_file

    # Cleanup happens automatically with tmp_path


def test_config_file_reading(temp_config_file):
    """Test reading from a config file."""
    content = temp_config_file.read_text()
    assert "cluster_name: test" in content
