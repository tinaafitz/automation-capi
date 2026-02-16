#!/usr/bin/env python3
"""
MCE Test Environment Parser
Extracts connection details from test notification messages and spreadsheet data
"""

import sys
import re
import json
import argparse
from datetime import datetime
import os

# Import environment manager if available
try:
    from pathlib import Path
    script_dir = Path(__file__).parent
    sys.path.insert(0, str(script_dir))
    from mce_env_manager import MCEEnvManager
    HAS_ENV_MANAGER = True
except ImportError:
    HAS_ENV_MANAGER = False


class TestEnvParser:
    def __init__(self):
        self.env_data = {}

    def parse_notification(self, notification_text):
        """Parse test notification message"""
        lines = notification_text.strip().split('\n')

        # Extract title (first non-empty line with dashes)
        title = None
        for line in lines:
            if '---' in line:
                continue
            if line.strip():
                title = line.strip()
                break

        # Extract versions
        mce_match = re.search(r'MCE:\s*([^\n]+)', notification_text)
        acm_match = re.search(r'ACM:\s*([^\n]+)', notification_text)

        # Extract hub credentials
        hub_creds_match = re.search(r'Hub creds:\s*(\S+)', notification_text)

        # Extract Polarion test plan
        polarion_match = re.search(r'Polarion:\s*(\S+)', notification_text)

        # Extract Jira ticket
        jira_match = re.search(r'Jira ticket:\s*(\S+)', notification_text)

        # Extract component failures
        components = {}
        component_pattern = r'(\w+)\((\d+)\):\s*@?([^-]+)\s*-->\s*Jenkins Job'
        for match in re.finditer(component_pattern, notification_text):
            component_name = match.group(1)
            failure_count = int(match.group(2))
            owner = match.group(3).strip()
            components[component_name] = {
                'failures': failure_count,
                'owner': owner
            }

        self.env_data['notification'] = {
            'title': title,
            'mce_version': mce_match.group(1).strip() if mce_match else None,
            'acm_version': acm_match.group(1).strip() if acm_match else None,
            'hub_cluster': hub_creds_match.group(1) if hub_creds_match else None,
            'polarion': polarion_match.group(1) if polarion_match else None,
            'jira': jira_match.group(1) if jira_match else None,
            'components': components,
            'total_failures': sum(c['failures'] for c in components.values())
        }

        return self.env_data['notification']

    def parse_spreadsheet_row(self, row_data):
        """Parse spreadsheet row data (tab or space separated)"""
        # Expected format: Platform | Hub | OCP | Versions | Status | Password | Console URL
        parts = re.split(r'\t+|\s{4,}', row_data.strip())

        if len(parts) >= 6:
            platform = parts[0].strip()
            hub_cluster = parts[1].strip()
            ocp_version = parts[2].strip()
            versions = parts[3].strip()
            status = parts[4].strip()
            password = parts[5].strip()
            console_url = parts[6].strip() if len(parts) > 6 else ""

            # Extract MCE/ACM versions from versions field
            mce_match = re.search(r'MCE:\s*([^\n"]+)', versions)
            acm_match = re.search(r'ACM:\s*([^\n"]+)', versions)

            self.env_data['cluster'] = {
                'platform': platform,
                'hub_cluster': hub_cluster,
                'ocp_version': ocp_version,
                'mce_version': mce_match.group(1).strip() if mce_match else None,
                'acm_version': acm_match.group(1).strip() if acm_match else None,
                'status': status,
                'password': password,
                'console_url': console_url
            }

        return self.env_data.get('cluster', {})

    def generate_connection_info(self):
        """Generate connection commands and info"""
        if 'cluster' not in self.env_data:
            return "No cluster data available"

        cluster = self.env_data['cluster']
        notification = self.env_data.get('notification', {})

        # Determine API URL from cluster name
        hub_name = cluster['hub_cluster']
        platform = cluster['platform']

        # Build API URL based on platform
        if 'IBM' in platform or 'Power' in platform:
            api_url = f"https://api.{hub_name}.rdr-ppcloud.sandbox.cis.ibm.net:6443"
        elif 'ARM' in platform or 'AWS' in platform:
            api_url = f"https://api.{hub_name}.dev09.red-chesterfield.com:6443"
        else:
            api_url = f"https://api.{hub_name}:6443"

        output = []
        output.append("=" * 80)
        output.append("MCE TEST ENVIRONMENT - CONNECTION INFO")
        output.append("=" * 80)
        output.append("")

        # Environment Details
        output.append("ENVIRONMENT DETAILS:")
        output.append(f"  Platform:        {cluster['platform']}")
        output.append(f"  Hub Cluster:     {hub_name}")
        output.append(f"  Status:          {cluster['status']}")
        output.append(f"  OCP Version:     {cluster['ocp_version']}")
        output.append(f"  MCE Version:     {cluster.get('mce_version', 'N/A')}")
        output.append(f"  ACM Version:     {cluster.get('acm_version', 'N/A')}")
        output.append("")

        # Test Run Info
        if notification:
            output.append("TEST RUN INFO:")
            output.append(f"  Title:           {notification.get('title', 'N/A')}")
            output.append(f"  Jira Ticket:     {notification.get('jira', 'N/A')}")
            output.append(f"  Polarion:        {notification.get('polarion', 'N/A')}")
            output.append(f"  Total Failures:  {notification.get('total_failures', 0)}")
            output.append("")

            if notification.get('components'):
                output.append("COMPONENT FAILURES:")
                for comp, data in sorted(notification['components'].items(),
                                        key=lambda x: x[1]['failures'], reverse=True):
                    output.append(f"  {comp:20s} {data['failures']:3d} failures  ({data['owner']})")
                output.append("")

        # Connection Info
        output.append("CONNECTION DETAILS:")
        output.append(f"  API URL:         {api_url}")
        output.append(f"  Username:        kubeadmin")
        output.append(f"  Password:        {cluster['password']}")
        if cluster.get('console_url'):
            output.append(f"  Console:         {cluster['console_url']}")
        output.append("")

        # Login Command
        output.append("QUICK LOGIN:")
        output.append(f"  oc login {api_url} -u kubeadmin -p {cluster['password']} --insecure-skip-tls-verify")
        output.append("")

        # CAPI Verification Commands
        output.append("CAPI VERIFICATION COMMANDS:")
        output.append("  # Check CAPI installation")
        output.append("  oc get deployment -n multicluster-engine | grep capi")
        output.append("")
        output.append("  # Check CAPI CRDs")
        output.append("  oc get crd | grep cluster.x-k8s.io | wc -l")
        output.append("")
        output.append("  # Check for ROSA CRDs")
        output.append("  oc get crd | grep rosa")
        output.append("")
        output.append("  # Check CAPI controller logs")
        output.append("  oc logs -n multicluster-engine deployment/capi-controller-manager --tail=50")
        output.append("")
        output.append("  # Check MCE components")
        output.append("  oc get mce multiclusterengine -o jsonpath='{.spec.overrides.components}' | jq")
        output.append("")

        # Save to file option
        output.append("SAVE THIS CONFIG:")
        config_file = f"/tmp/mce-env-{hub_name}.json"
        output.append(f"  python3 scripts/parse-test-env.py --save {config_file}")
        output.append("")

        output.append("=" * 80)

        return "\n".join(output)

    def save_to_file(self, filename):
        """Save environment data to JSON file"""
        with open(filename, 'w') as f:
            json.dump(self.env_data, f, indent=2)
        print(f"Environment data saved to: {filename}")

    def load_from_file(self, filename):
        """Load environment data from JSON file"""
        with open(filename, 'r') as f:
            self.env_data = json.load(f)
        return self.env_data


def interactive_mode():
    """Interactive mode to gather information"""
    parser = TestEnvParser()

    print("=" * 80)
    print("MCE TEST ENVIRONMENT PARSER - Interactive Mode")
    print("=" * 80)
    print()

    # Get notification message
    print("Paste the test notification message (end with empty line or Ctrl+D):")
    notification_lines = []
    try:
        while True:
            line = input()
            if not line:
                break
            notification_lines.append(line)
    except EOFError:
        pass

    notification_text = "\n".join(notification_lines)

    if notification_text:
        parser.parse_notification(notification_text)
        print("\n✓ Notification parsed")

    print()
    print("Paste the spreadsheet row data (all fields tab/space separated):")
    row_data = input().strip()

    if row_data:
        parser.parse_spreadsheet_row(row_data)
        print("✓ Spreadsheet data parsed")

    print()
    print(parser.generate_connection_info())

    # Auto-save to environment manager
    if HAS_ENV_MANAGER and parser.env_data.get('cluster'):
        try:
            manager = MCEEnvManager()
            cluster_name = manager.add_environment(parser.env_data, status="unknown")
            print(f"\n✅ Environment saved to history: {cluster_name}")
            print(f"   View later with: mce-select")
        except Exception as e:
            print(f"\n⚠️  Could not save to environment history: {e}")

    # Ask to save JSON file
    save = input("\nSave JSON file? (y/n): ").strip().lower()
    if save == 'y':
        hub_name = parser.env_data.get('cluster', {}).get('hub_cluster', 'unknown')
        filename = f"/tmp/mce-env-{hub_name}-{datetime.now().strftime('%Y%m%d')}.json"
        parser.save_to_file(filename)


def main():
    argparser = argparse.ArgumentParser(
        description='Parse MCE test environment notifications and generate connection info'
    )
    argparser.add_argument('--notification', '-n', help='Path to notification message file')
    argparser.add_argument('--row', '-r', help='Spreadsheet row data (quoted string)')
    argparser.add_argument('--load', '-l', help='Load from saved JSON file')
    argparser.add_argument('--save', '-s', help='Save to JSON file')
    argparser.add_argument('--interactive', '-i', action='store_true',
                          help='Interactive mode')
    argparser.add_argument('--login', action='store_true',
                          help='Execute login command automatically')

    args = argparser.parse_args()

    if args.interactive or len(sys.argv) == 1:
        interactive_mode()
        return

    parser = TestEnvParser()

    # Load from file
    if args.load:
        parser.load_from_file(args.load)
        print(parser.generate_connection_info())
        return

    # Parse notification
    if args.notification:
        with open(args.notification, 'r') as f:
            parser.parse_notification(f.read())

    # Parse row
    if args.row:
        parser.parse_spreadsheet_row(args.row)

    # Generate output
    output = parser.generate_connection_info()
    print(output)

    # Save if requested
    if args.save:
        parser.save_to_file(args.save)

    # Auto-login if requested
    if args.login and 'cluster' in parser.env_data:
        import subprocess
        cluster = parser.env_data['cluster']
        hub_name = cluster['hub_cluster']
        platform = cluster['platform']

        if 'IBM' in platform or 'Power' in platform:
            api_url = f"https://api.{hub_name}.rdr-ppcloud.sandbox.cis.ibm.net:6443"
        else:
            api_url = f"https://api.{hub_name}.dev09.red-chesterfield.com:6443"

        cmd = [
            'oc', 'login', api_url,
            '-u', 'kubeadmin',
            '-p', cluster['password'],
            '--insecure-skip-tls-verify'
        ]

        print("\nExecuting login...")
        subprocess.run(cmd)


if __name__ == '__main__':
    main()
