"""
Error monitoring and performance tracking setup.
"""

import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from config import get_settings


def init_sentry():
    """
    Initialize Sentry error monitoring.

    Only initializes if SENTRY_DSN is configured in environment.
    """
    settings = get_settings()
    sentry_dsn = os.getenv("SENTRY_DSN")

    if sentry_dsn:
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=settings.APP_ENV,
            traces_sample_rate=0.1 if settings.APP_ENV == "production" else 1.0,
            profiles_sample_rate=0.1 if settings.APP_ENV == "production" else 1.0,
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(transaction_style="endpoint"),
            ],
            # Set release version if available
            release=os.getenv("APP_VERSION", "1.0.0"),
            # Custom tags
            _experiments={
                "profiles_sample_rate": 0.1 if settings.APP_ENV == "production" else 1.0,
            },
        )
        return True
    return False


def capture_exception(error: Exception, context: dict = None):
    """
    Capture an exception with optional context.

    Args:
        error: The exception to capture
        context: Additional context to include
    """
    if context:
        with sentry_sdk.configure_scope() as scope:
            for key, value in context.items():
                scope.set_context(key, value)

    sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", context: dict = None):
    """
    Capture a message with optional context.

    Args:
        message: The message to capture
        level: Log level (debug, info, warning, error, fatal)
        context: Additional context to include
    """
    if context:
        with sentry_sdk.configure_scope() as scope:
            for key, value in context.items():
                scope.set_context(key, value)

    sentry_sdk.capture_message(message, level=level)


def set_user(user_id: str, email: str = None, username: str = None):
    """
    Set user context for error tracking.

    Args:
        user_id: User identifier
        email: User email (optional)
        username: Username (optional)
    """
    sentry_sdk.set_user({"id": user_id, "email": email, "username": username})


def add_breadcrumb(message: str, category: str = "default", level: str = "info", data: dict = None):
    """
    Add a breadcrumb for debugging context.

    Args:
        message: Breadcrumb message
        category: Category (auth, api, ui, etc.)
        level: Log level
        data: Additional data
    """
    sentry_sdk.add_breadcrumb(message=message, category=category, level=level, data=data or {})
