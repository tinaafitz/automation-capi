import requests
import json
from typing import Optional, Dict, Any
import yaml
import os
from datetime import datetime

class SlackNotificationService:
    """Service for sending Slack notifications for provisioning jobs"""

    def __init__(self):
        self.config = self._load_config()
        self.webhook_url = self.config.get('slack_webhook_url')

    def _load_config(self) -> Dict[str, Any]:
        """Load notification config from vars/notification_config.yml"""
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'vars',
            'notification_config.yml'
        )

        try:
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    return yaml.safe_load(f) or {}
            else:
                # Return default config if file doesn't exist
                return {
                    'slack_enabled': False,
                    'slack_webhook_url': '',
                    'app_url': 'http://localhost:3000'
                }
        except Exception as e:
            print(f"Error loading notification config: {e}")
            return {
                'slack_enabled': False,
                'slack_webhook_url': '',
                'app_url': 'http://localhost:3000'
            }

    def reload_config(self):
        """Reload configuration from file"""
        self.config = self._load_config()
        self.webhook_url = self.config.get('slack_webhook_url')

    def send_provisioning_notification(self, job_data: dict, status: str) -> bool:
        """
        Send Slack notification for provisioning job

        Args:
            job_data: Dictionary containing job information
            status: Job status ('started', 'completed', 'failed')

        Returns:
            bool: True if notification sent successfully, False otherwise
        """
        if not self.config.get('slack_enabled') or not self.webhook_url:
            print("Slack notifications disabled or webhook URL not configured")
            return False

        message = self._build_slack_message(job_data, status)
        return self._post_to_slack(message)

    def _build_slack_message(self, job_data: dict, status: str) -> dict:
        """Build Slack message using Block Kit"""
        cluster_name = job_data.get('cluster_name', 'Unknown')
        region = job_data.get('region', 'N/A')
        version = job_data.get('version', 'N/A')
        job_id = job_data.get('job_id', 'N/A')

        if status == 'completed':
            return self._build_success_message(cluster_name, region, version, job_id)
        elif status == 'failed':
            return self._build_failure_message(cluster_name, region, job_data, job_id)
        elif status == 'started':
            return self._build_started_message(cluster_name, region, version, job_id)
        else:
            return self._build_generic_message(cluster_name, status, job_data)

    def _build_success_message(self, cluster_name: str, region: str, version: str, job_id: str) -> dict:
        """Build success notification message"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        return {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": ":white_check_mark: ROSA Cluster Provisioned Successfully",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Cluster:*\n`{cluster_name}`"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Region:*\n{region}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Version:*\n{version}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Status:*\nReady :white_check_mark:"
                        }
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Next Steps:*\n• Access via OpenShift Console\n• Configure cluster-admin access\n• Deploy your applications"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Job ID: `{job_id}` | Completed: {timestamp}"
                        }
                    ]
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "View Dashboard"
                            },
                            "url": self.config.get('app_url', 'http://localhost:3000'),
                            "style": "primary"
                        }
                    ]
                }
            ]
        }

    def _build_failure_message(self, cluster_name: str, region: str, job_data: dict, job_id: str) -> dict:
        """Build failure notification message"""
        error = job_data.get('error', 'Unknown error')
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Truncate error if too long
        if len(error) > 500:
            error = error[:497] + "..."

        return {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": ":x: ROSA Cluster Provisioning Failed",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Cluster:*\n`{cluster_name}`"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Region:*\n{region}"
                        }
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Error:*\n```{error}```"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Troubleshooting:*\n• Check task logs for details\n• Verify AWS credentials and permissions\n• Ensure subnet and VPC configuration\n• Check OpenShift Cluster Manager quota limits"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Job ID: `{job_id}` | Failed: {timestamp}"
                        }
                    ]
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "View Logs"
                            },
                            "url": self.config.get('app_url', 'http://localhost:3000'),
                            "style": "danger"
                        }
                    ]
                }
            ]
        }

    def _build_started_message(self, cluster_name: str, region: str, version: str, job_id: str) -> dict:
        """Build started notification message"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        return {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": ":rocket: ROSA Cluster Provisioning Started",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Cluster:*\n`{cluster_name}`"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Region:*\n{region}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Version:*\n{version}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*Status:*\nProvisioning :hourglass_flowing_sand:"
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Job ID: `{job_id}` | Started: {timestamp}"
                        }
                    ]
                }
            ]
        }

    def _build_generic_message(self, cluster_name: str, status: str, job_data: dict) -> dict:
        """Build generic notification message for other statuses"""
        return {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*ROSA Cluster Update*\nCluster `{cluster_name}` status: *{status}*"
                    }
                }
            ]
        }

    def _post_to_slack(self, message: dict) -> bool:
        """
        Post message to Slack webhook

        Args:
            message: Slack message payload

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            response = requests.post(
                self.webhook_url,
                json=message,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code == 200:
                print("Slack notification sent successfully")
                return True
            else:
                print(f"Failed to send Slack notification: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"Error posting to Slack: {e}")
            return False

    def test_connection(self) -> dict:
        """
        Test Slack webhook connection

        Returns:
            dict: Result with success status and message
        """
        if not self.webhook_url:
            return {
                'success': False,
                'message': 'Webhook URL not configured'
            }

        test_message = {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":white_check_mark: *Slack Notification Test*\nYour Slack integration is working correctly!"
                    }
                }
            ]
        }

        success = self._post_to_slack(test_message)

        return {
            'success': success,
            'message': 'Test notification sent successfully' if success else 'Failed to send test notification'
        }
