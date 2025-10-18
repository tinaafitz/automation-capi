"""
Configuration management for the ROSA automation backend.

This module provides environment-based configuration using pydantic-settings
following 12-factor app principles.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "ROSA Automation"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # File paths
    USER_VARS_PATH: str = "../../vars/user_vars.yml"
    ANSIBLE_PATH: str = "../../playbooks"

    # Security
    SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    class Config:
        """Pydantic configuration."""

        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @property
    def cors_origins_list(self) -> list[str]:
        """Convert CORS origins string to list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


# Create global settings instance
settings = Settings()


def get_settings() -> Settings:
    """
    Get application settings.

    Returns:
        Settings instance

    Example:
        >>> from config import get_settings
        >>> settings = get_settings()
        >>> print(settings.LOG_LEVEL)
    """
    return settings
