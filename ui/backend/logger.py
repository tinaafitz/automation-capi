"""
Structured JSON logging configuration for the ROSA automation backend.

This module provides a centralized logging setup with JSON formatting,
context-aware logging, and proper log levels.
"""

import logging
import sys
from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional context."""

    def add_fields(self, log_record, record, message_dict):
        """Add custom fields to log records."""
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)

        # Add standard fields
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno

        # Add timestamp if not present
        if 'timestamp' not in log_record:
            log_record['timestamp'] = self.formatTime(record, self.datefmt)


def setup_logger(
    name: str = "rosa_automation",
    level: str = "INFO",
    use_json: bool = True
) -> logging.Logger:
    """
    Configure and return a logger with JSON formatting.

    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        use_json: Whether to use JSON formatting (True) or plain text (False)

    Returns:
        Configured logger instance

    Example:
        >>> logger = setup_logger("my_module", "DEBUG")
        >>> logger.info("Starting process", extra={"cluster_name": "test-cluster"})
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()

    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, level.upper()))

    # Set formatter based on configuration
    if use_json:
        formatter = CustomJsonFormatter(
            '%(timestamp)s %(level)s %(name)s %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # Prevent propagation to root logger
    logger.propagate = False

    return logger


# Create default logger instance
default_logger = setup_logger()


def get_logger(name: str = None) -> logging.Logger:
    """
    Get a logger instance.

    Args:
        name: Logger name. If None, returns the default logger.

    Returns:
        Logger instance

    Example:
        >>> logger = get_logger("cluster_operations")
        >>> logger.info("Creating cluster")
    """
    if name is None:
        return default_logger
    return logging.getLogger(name)
