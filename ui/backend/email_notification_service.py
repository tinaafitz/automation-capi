import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
import yaml
import os
from datetime import datetime

class EmailNotificationService:
    """Service for sending email notifications for provisioning jobs"""

    def __init__(self):
        self.config = self._load_config()
        self.smtp_server = self.config.get('smtp_server', '')
        self.smtp_port = self.config.get('smtp_port', 587)
        self.smtp_username = self.config.get('smtp_username', '')
        self.smtp_password = self.config.get('smtp_password', '')
        self.from_email = self.config.get('from_email', '')
        self.to_emails = self.config.get('to_emails', [])
        self.use_tls = self.config.get('use_tls', True)

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
                return self._default_config()
        except Exception as e:
            print(f"Error loading notification config: {e}")
            return self._default_config()

    def _default_config(self) -> Dict[str, Any]:
        """Return default email configuration"""
        return {
            'email_enabled': False,
            'smtp_server': '',
            'smtp_port': 587,
            'smtp_username': '',
            'smtp_password': '',
            'from_email': '',
            'to_emails': [],
            'use_tls': True
        }

    def reload_config(self):
        """Reload configuration from file"""
        self.config = self._load_config()
        self.smtp_server = self.config.get('smtp_server', '')
        self.smtp_port = self.config.get('smtp_port', 587)
        self.smtp_username = self.config.get('smtp_username', '')
        self.smtp_password = self.config.get('smtp_password', '')
        self.from_email = self.config.get('from_email', '')
        self.to_emails = self.config.get('to_emails', [])
        self.use_tls = self.config.get('use_tls', True)

    def send_provisioning_notification(self, job_data: dict, status: str) -> bool:
        """
        Send email notification for provisioning job

        Args:
            job_data: Dictionary containing job information
            status: Job status ('started', 'completed', 'failed')

        Returns:
            bool: True if notification sent successfully, False otherwise
        """
        if not self.config.get('email_enabled') or not self.smtp_server:
            print("Email notifications disabled or SMTP not configured")
            return False

        if not self.to_emails:
            print("No recipient email addresses configured")
            return False

        subject, html_body, text_body = self._build_email_content(job_data, status)
        return self._send_email(subject, html_body, text_body)

    def _build_email_content(self, job_data: dict, status: str) -> tuple:
        """Build email subject and body content"""
        cluster_name = job_data.get('cluster_name', 'Unknown')
        region = job_data.get('region', 'N/A')
        version = job_data.get('version', 'N/A')
        job_id = job_data.get('job_id', 'N/A')

        if status == 'completed':
            return self._build_success_email(cluster_name, region, version, job_id)
        elif status == 'failed':
            return self._build_failure_email(cluster_name, region, job_data, job_id)
        elif status == 'started':
            return self._build_started_email(cluster_name, region, version, job_id)
        else:
            return self._build_generic_email(cluster_name, status, job_data)

    def _build_success_email(self, cluster_name: str, region: str, version: str, job_id: str) -> tuple:
        """Build success notification email"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        subject = f"✅ ROSA Cluster Provisioned Successfully - {cluster_name}"

        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981; border-bottom: 3px solid #10b981; padding-bottom: 10px;">
                ✅ ROSA Cluster Provisioned Successfully
              </h2>

              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px; font-weight: bold; width: 120px;">Cluster:</td>
                    <td style="padding: 8px; font-family: monospace;">{cluster_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold;">Region:</td>
                    <td style="padding: 8px;">{region}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold;">Version:</td>
                    <td style="padding: 8px;">{version}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold;">Status:</td>
                    <td style="padding: 8px; color: #10b981;">Ready ✅</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1e40af;">Next Steps:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Access via OpenShift Console</li>
                  <li>Configure cluster-admin access</li>
                  <li>Deploy your applications</li>
                </ul>
              </div>

              <div style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                Job ID: {job_id} | Completed: {timestamp}
              </div>
            </div>
          </body>
        </html>
        """

        text_body = f"""
ROSA Cluster Provisioned Successfully

Cluster: {cluster_name}
Region: {region}
Version: {version}
Status: Ready ✅

Next Steps:
• Access via OpenShift Console
• Configure cluster-admin access
• Deploy your applications

Job ID: {job_id} | Completed: {timestamp}
        """

        return subject, html_body, text_body

    def _build_failure_email(self, cluster_name: str, region: str, job_data: dict, job_id: str) -> tuple:
        """Build failure notification email"""
        error = job_data.get('error', 'Unknown error')
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Truncate error if too long
        if len(error) > 500:
            error = error[:497] + "..."

        subject = f"❌ ROSA Cluster Provisioning Failed - {cluster_name}"

        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #ef4444; border-bottom: 3px solid #ef4444; padding-bottom: 10px;">
                ❌ ROSA Cluster Provisioning Failed
              </h2>

              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px; font-weight: bold; width: 120px;">Cluster:</td>
                    <td style="padding: 8px; font-family: monospace;">{cluster_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold;">Region:</td>
                    <td style="padding: 8px;">{region}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #991b1b;">Error:</h3>
                <pre style="background-color: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">{error}</pre>
              </div>

              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #92400e;">Troubleshooting:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Check task logs for details</li>
                  <li>Verify AWS credentials and permissions</li>
                  <li>Ensure subnet and VPC configuration</li>
                  <li>Check OpenShift Cluster Manager quota limits</li>
                </ul>
              </div>

              <div style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                Job ID: {job_id} | Failed: {timestamp}
              </div>
            </div>
          </body>
        </html>
        """

        text_body = f"""
ROSA Cluster Provisioning Failed

Cluster: {cluster_name}
Region: {region}

Error:
{error}

Troubleshooting:
• Check task logs for details
• Verify AWS credentials and permissions
• Ensure subnet and VPC configuration
• Check OpenShift Cluster Manager quota limits

Job ID: {job_id} | Failed: {timestamp}
        """

        return subject, html_body, text_body

    def _build_started_email(self, cluster_name: str, region: str, version: str, job_id: str) -> tuple:
        """Build started notification email"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        subject = f"🚀 ROSA Cluster Provisioning Started - {cluster_name}"

        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #0891b2; border-bottom: 3px solid #0891b2; padding-bottom: 10px;">
                🚀 ROSA Cluster Provisioning Started
              </h2>

              <div style="background-color: #ecfeff; border-left: 4px solid #0891b2; padding: 15px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px; font-weight: bold; width: 120px;">Cluster:</td>
                    <td style="padding: 8px; font-family: monospace;">{cluster_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold;">Region:</td>
                    <td style="padding: 8px;">{region}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold;">Version:</td>
                    <td style="padding: 8px;">{version}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold;">Status:</td>
                    <td style="padding: 8px; color: #0891b2;">Provisioning ⏳</td>
                  </tr>
                </table>
              </div>

              <div style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                Job ID: {job_id} | Started: {timestamp}
              </div>
            </div>
          </body>
        </html>
        """

        text_body = f"""
ROSA Cluster Provisioning Started

Cluster: {cluster_name}
Region: {region}
Version: {version}
Status: Provisioning ⏳

Job ID: {job_id} | Started: {timestamp}
        """

        return subject, html_body, text_body

    def _build_generic_email(self, cluster_name: str, status: str, job_data: dict) -> tuple:
        """Build generic notification email for other statuses"""
        subject = f"ROSA Cluster Update - {cluster_name}"

        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>ROSA Cluster Update</h2>
              <p>Cluster <strong>{cluster_name}</strong> status: <strong>{status}</strong></p>
            </div>
          </body>
        </html>
        """

        text_body = f"ROSA Cluster Update\n\nCluster {cluster_name} status: {status}"

        return subject, html_body, text_body

    def _send_email(self, subject: str, html_body: str, text_body: str) -> bool:
        """
        Send email via SMTP

        Args:
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = ', '.join(self.to_emails)

            # Attach both plain text and HTML versions
            part1 = MIMEText(text_body, 'plain')
            part2 = MIMEText(html_body, 'html')
            msg.attach(part1)
            msg.attach(part2)

            # Connect to SMTP server and send
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10)
                server.starttls()
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10)

            if self.smtp_username and self.smtp_password:
                server.login(self.smtp_username, self.smtp_password)

            server.sendmail(self.from_email, self.to_emails, msg.as_string())
            server.quit()

            print("Email notification sent successfully")
            return True

        except Exception as e:
            print(f"Error sending email: {e}")
            return False

    def test_connection(self) -> dict:
        """
        Test SMTP connection

        Returns:
            dict: Result with success status and message
        """
        if not self.smtp_server:
            return {
                'success': False,
                'message': 'SMTP server not configured'
            }

        if not self.to_emails:
            return {
                'success': False,
                'message': 'No recipient email addresses configured'
            }

        try:
            # Test connection
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10)
                server.starttls()
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10)

            if self.smtp_username and self.smtp_password:
                server.login(self.smtp_username, self.smtp_password)

            # Send test email
            subject = "Test Email - ROSA Automation"
            html_body = """
            <html>
              <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #10b981;">✅ Email Notification Test</h2>
                  <p>Your email integration is working correctly!</p>
                </div>
              </body>
            </html>
            """
            text_body = "✅ Email Notification Test\n\nYour email integration is working correctly!"

            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = ', '.join(self.to_emails)
            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))

            server.sendmail(self.from_email, self.to_emails, msg.as_string())
            server.quit()

            return {
                'success': True,
                'message': 'Test email sent successfully'
            }

        except Exception as e:
            return {
                'success': False,
                'message': f'Failed to send test email: {str(e)}'
            }
