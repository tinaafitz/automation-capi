#!/usr/bin/env python3
"""
MCE Environment History Manager
Tracks, searches, and manages MCE test environments
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
import subprocess
import re


class MCEEnvManager:
    def __init__(self, db_path=None):
        if db_path is None:
            db_path = os.path.expanduser("~/.mce-environments.json")
        self.db_path = db_path
        self.environments = self.load_db()

    def load_db(self):
        """Load environment database"""
        if os.path.exists(self.db_path):
            with open(self.db_path, 'r') as f:
                return json.load(f)
        return {"environments": [], "version": "1.0"}

    def save_db(self):
        """Save environment database"""
        with open(self.db_path, 'w') as f:
            json.dump(self.environments, f, indent=2)

    def add_environment(self, env_data, status="unknown", notes=""):
        """Add or update an environment"""
        cluster_name = env_data.get('cluster', {}).get('hub_cluster', 'unknown')
        platform = env_data.get('cluster', {}).get('platform', 'unknown')

        # Check if environment already exists
        existing_idx = None
        for idx, env in enumerate(self.environments.get('environments', [])):
            if env.get('cluster_name') == cluster_name:
                existing_idx = idx
                break

        env_record = {
            'cluster_name': cluster_name,
            'platform': platform,
            'added_date': datetime.now().isoformat(),
            'last_accessed': datetime.now().isoformat(),
            'status': status,
            'notes': notes,
            'data': env_data
        }

        if existing_idx is not None:
            # Update existing
            env_record['added_date'] = self.environments['environments'][existing_idx].get('added_date')
            self.environments['environments'][existing_idx] = env_record
        else:
            # Add new
            if 'environments' not in self.environments:
                self.environments['environments'] = []
            self.environments['environments'].append(env_record)

        self.save_db()
        return cluster_name

    def update_status(self, cluster_name, status, notes=None):
        """Update environment test status"""
        for env in self.environments.get('environments', []):
            if env.get('cluster_name') == cluster_name:
                env['status'] = status
                env['last_accessed'] = datetime.now().isoformat()
                if notes:
                    env['notes'] = notes
                self.save_db()
                return True
        return False

    def get_environment(self, cluster_name):
        """Get environment by cluster name"""
        for env in self.environments.get('environments', []):
            if env.get('cluster_name') == cluster_name:
                env['last_accessed'] = datetime.now().isoformat()
                self.save_db()
                return env
        return None

    def list_environments(self, platform_filter=None, status_filter=None):
        """List all environments with optional filters"""
        envs = self.environments.get('environments', [])

        if platform_filter:
            envs = [e for e in envs if platform_filter.lower() in e.get('platform', '').lower()]

        if status_filter:
            envs = [e for e in envs if e.get('status') == status_filter]

        # Sort by last accessed (most recent first)
        envs.sort(key=lambda x: x.get('last_accessed', ''), reverse=True)

        return envs

    def search_environments(self, query):
        """Search environments by cluster name, platform, or notes"""
        query = query.lower()
        results = []

        for env in self.environments.get('environments', []):
            if (query in env.get('cluster_name', '').lower() or
                query in env.get('platform', '').lower() or
                query in env.get('notes', '').lower() or
                query in env.get('data', {}).get('notification', {}).get('jira', '').lower() or
                query in env.get('data', {}).get('notification', {}).get('polarion', '').lower()):
                results.append(env)

        return results

    def delete_environment(self, cluster_name):
        """Delete an environment"""
        self.environments['environments'] = [
            e for e in self.environments.get('environments', [])
            if e.get('cluster_name') != cluster_name
        ]
        self.save_db()

    def get_stats(self):
        """Get environment statistics"""
        envs = self.environments.get('environments', [])

        stats = {
            'total': len(envs),
            'by_platform': {},
            'by_status': {},
            'recent': []
        }

        for env in envs:
            platform = env.get('platform', 'Unknown')
            status = env.get('status', 'unknown')

            stats['by_platform'][platform] = stats['by_platform'].get(platform, 0) + 1
            stats['by_status'][status] = stats['by_status'].get(status, 0) + 1

        # Get 5 most recent
        recent = sorted(envs, key=lambda x: x.get('last_accessed', ''), reverse=True)[:5]
        stats['recent'] = recent

        return stats


def format_env_line(env, index=None, show_details=False):
    """Format environment as a display line"""
    cluster = env.get('cluster_name', 'Unknown')
    platform = env.get('platform', 'Unknown')
    status = env.get('status', 'unknown')

    # Status emoji
    status_emoji = {
        'pass': '✅',
        'fail': '❌',
        'blocked': '🚫',
        'in_progress': '⏳',
        'unknown': '❓'
    }.get(status, '❓')

    # Get dates
    added = env.get('added_date', '')
    accessed = env.get('last_accessed', '')

    # Format dates
    try:
        added_date = datetime.fromisoformat(added).strftime('%Y-%m-%d')
        accessed_date = datetime.fromisoformat(accessed).strftime('%Y-%m-%d')
    except:
        added_date = 'Unknown'
        accessed_date = 'Unknown'

    # Get test info
    data = env.get('data', {})
    notification = data.get('notification', {})
    cluster_data = data.get('cluster', {})

    jira = notification.get('jira', 'N/A')
    polarion = notification.get('polarion', 'N/A')
    ocp_version = cluster_data.get('ocp_version', 'N/A')
    cluster_status = cluster_data.get('status', 'N/A')

    if show_details:
        lines = []
        lines.append(f"\n{'='*80}")
        if index is not None:
            lines.append(f"[{index}] {cluster}")
        else:
            lines.append(f"{cluster}")
        lines.append(f"{'='*80}")
        lines.append(f"  Platform:        {platform}")
        lines.append(f"  Test Status:     {status_emoji} {status.upper()}")
        lines.append(f"  Cluster Status:  {cluster_status}")
        lines.append(f"  OCP Version:     {ocp_version}")
        lines.append(f"  Jira:            {jira}")
        lines.append(f"  Polarion:        {polarion}")
        lines.append(f"  Added:           {added_date}")
        lines.append(f"  Last Accessed:   {accessed_date}")

        notes = env.get('notes', '')
        if notes:
            lines.append(f"  Notes:           {notes}")

        # Component failures
        components = notification.get('components', {})
        if components:
            total_failures = sum(c.get('failures', 0) for c in components.values())
            lines.append(f"  Total Failures:  {total_failures}")

        return '\n'.join(lines)
    else:
        # Compact format
        prefix = f"[{index:2d}] " if index is not None else ""
        return f"{prefix}{status_emoji} {cluster:30s} {platform:15s} {status:12s} {accessed_date}"


def interactive_select():
    """Interactive environment selector"""
    manager = MCEEnvManager()

    print("\n" + "="*80)
    print("MCE ENVIRONMENT SELECTOR")
    print("="*80)
    print()

    # Show filter options
    print("Filter by:")
    print("  1. All environments")
    print("  2. IBM Power only")
    print("  3. AWS/ARM only")
    print("  4. Passed tests only")
    print("  5. Failed tests only")
    print("  6. Search by keyword")
    print()

    choice = input("Select filter (1-6, default=1): ").strip() or "1"

    platform_filter = None
    status_filter = None
    envs = []

    if choice == "2":
        platform_filter = "Power"
    elif choice == "3":
        platform_filter = "ARM"
    elif choice == "4":
        status_filter = "pass"
    elif choice == "5":
        status_filter = "fail"
    elif choice == "6":
        query = input("Enter search keyword: ").strip()
        envs = manager.search_environments(query)

    if choice != "6":
        envs = manager.list_environments(platform_filter, status_filter)

    if not envs:
        print("\n❌ No environments found matching your criteria.")
        return

    print(f"\n📋 Found {len(envs)} environment(s):")
    print("-"*80)
    print(f"{'#':3s} {'Status':2s} {'Cluster Name':30s} {'Platform':15s} {'Test Status':12s} {'Last Used'}")
    print("-"*80)

    for idx, env in enumerate(envs, 1):
        print(format_env_line(env, idx, show_details=False))

    print("-"*80)
    print()
    print("Options:")
    print("  [number]  - View details and connect")
    print("  s [num]   - Update status")
    print("  d [num]   - Delete environment")
    print("  q         - Quit")
    print()

    selection = input("Select an option: ").strip()

    # Handle delete
    if selection.startswith('d '):
        try:
            idx = int(selection.split()[1]) - 1
            if 0 <= idx < len(envs):
                cluster = envs[idx].get('cluster_name')
                confirm = input(f"Delete {cluster}? (y/n): ").strip().lower()
                if confirm == 'y':
                    manager.delete_environment(cluster)
                    print(f"✅ Deleted {cluster}")
            return
        except (ValueError, IndexError):
            print("❌ Invalid selection")
            return

    # Handle status update
    if selection.startswith('s '):
        try:
            idx = int(selection.split()[1]) - 1
            if 0 <= idx < len(envs):
                cluster = envs[idx].get('cluster_name')
                print("\nUpdate status:")
                print("  1. Pass ✅")
                print("  2. Fail ❌")
                print("  3. Blocked 🚫")
                print("  4. In Progress ⏳")
                status_choice = input("Select (1-4): ").strip()
                status_map = {'1': 'pass', '2': 'fail', '3': 'blocked', '4': 'in_progress'}
                new_status = status_map.get(status_choice)

                if new_status:
                    notes = input("Add notes (optional): ").strip()
                    manager.update_status(cluster, new_status, notes or None)
                    print(f"✅ Updated {cluster} to {new_status}")
            return
        except (ValueError, IndexError):
            print("❌ Invalid selection")
            return

    # Handle quit
    if selection.lower() == 'q':
        return

    # Handle environment selection
    try:
        idx = int(selection) - 1
        if 0 <= idx < len(envs):
            selected_env = envs[idx]

            # Show details
            print(format_env_line(selected_env, show_details=True))

            # Get connection info
            data = selected_env.get('data', {})
            cluster_data = data.get('cluster', {})

            cluster_name = cluster_data.get('hub_cluster')
            platform = cluster_data.get('platform', '')
            password = cluster_data.get('password')
            cluster_status = cluster_data.get('status', 'Unknown')

            # Build API URL
            if 'IBM' in platform or 'Power' in platform:
                api_url = f"https://api.{cluster_name}.rdr-ppcloud.sandbox.cis.ibm.net:6443"
            elif 'ARM' in platform or 'AWS' in platform:
                api_url = f"https://api.{cluster_name}.dev09.red-chesterfield.com:6443"
            else:
                api_url = f"https://api.{cluster_name}:6443"

            print("\n" + "="*80)
            print("CONNECTION COMMAND:")
            print("="*80)
            login_cmd = f"oc login {api_url} -u kubeadmin -p {password} --insecure-skip-tls-verify"
            print(login_cmd)
            print("="*80)

            if cluster_status.lower() != 'running':
                print(f"\n⚠️  WARNING: Cluster status is '{cluster_status}' (not Running)")
                print("You may not be able to connect to this cluster.")

            print()
            print("Options:")
            print("  c - Copy login command to clipboard")
            print("  l - Login now")
            print("  u - Update test status")
            print("  q - Quit")
            print()

            action = input("Select action: ").strip().lower()

            if action == 'c':
                # Copy to clipboard (macOS)
                try:
                    subprocess.run(['pbcopy'], input=login_cmd.encode(), check=True)
                    print("✅ Login command copied to clipboard!")
                except:
                    print("❌ Could not copy to clipboard")

            elif action == 'l':
                print("\n🔐 Logging in...")
                subprocess.run(login_cmd.split())

            elif action == 'u':
                print("\nUpdate test status:")
                print("  1. Pass ✅")
                print("  2. Fail ❌")
                print("  3. Blocked 🚫")
                print("  4. In Progress ⏳")
                status_choice = input("Select (1-4): ").strip()
                status_map = {'1': 'pass', '2': 'fail', '3': 'blocked', '4': 'in_progress'}
                new_status = status_map.get(status_choice)

                if new_status:
                    notes = input("Add notes (optional): ").strip()
                    manager.update_status(cluster_name, new_status, notes or None)
                    print(f"✅ Updated {cluster_name} to {new_status}")
        else:
            print("❌ Invalid selection")
    except ValueError:
        print("❌ Invalid input")


def show_stats():
    """Show environment statistics"""
    manager = MCEEnvManager()
    stats = manager.get_stats()

    print("\n" + "="*80)
    print("MCE ENVIRONMENT STATISTICS")
    print("="*80)
    print()
    print(f"Total Environments: {stats['total']}")
    print()

    print("By Platform:")
    for platform, count in sorted(stats['by_platform'].items()):
        print(f"  {platform:20s} {count:3d}")
    print()

    print("By Test Status:")
    status_emoji = {
        'pass': '✅', 'fail': '❌', 'blocked': '🚫',
        'in_progress': '⏳', 'unknown': '❓'
    }
    for status, count in sorted(stats['by_status'].items()):
        emoji = status_emoji.get(status, '❓')
        print(f"  {emoji} {status:15s} {count:3d}")
    print()

    if stats['recent']:
        print("Recently Accessed:")
        for env in stats['recent']:
            cluster = env.get('cluster_name', 'Unknown')
            accessed = env.get('last_accessed', '')
            try:
                accessed_date = datetime.fromisoformat(accessed).strftime('%Y-%m-%d %H:%M')
            except:
                accessed_date = 'Unknown'
            status = env.get('status', 'unknown')
            emoji = status_emoji.get(status, '❓')
            print(f"  {emoji} {cluster:30s} {accessed_date}")

    print("="*80)


def main():
    import argparse

    parser = argparse.ArgumentParser(description='MCE Environment History Manager')
    parser.add_argument('--select', '-s', action='store_true',
                       help='Interactive environment selector')
    parser.add_argument('--list', '-l', action='store_true',
                       help='List all environments')
    parser.add_argument('--stats', action='store_true',
                       help='Show environment statistics')
    parser.add_argument('--search', help='Search environments by keyword')
    parser.add_argument('--update-status', nargs=2, metavar=('CLUSTER', 'STATUS'),
                       help='Update environment status (pass/fail/blocked/in_progress)')
    parser.add_argument('--delete', metavar='CLUSTER',
                       help='Delete an environment')
    parser.add_argument('--add-notes', nargs=2, metavar=('CLUSTER', 'NOTES'),
                       help='Add notes to an environment')

    args = parser.parse_args()

    manager = MCEEnvManager()

    if args.select or len(sys.argv) == 1:
        interactive_select()

    elif args.list:
        envs = manager.list_environments()
        print(f"\n📋 Total: {len(envs)} environments")
        print("-"*80)
        for idx, env in enumerate(envs, 1):
            print(format_env_line(env, idx))
        print("-"*80)

    elif args.stats:
        show_stats()

    elif args.search:
        results = manager.search_environments(args.search)
        print(f"\n🔍 Found {len(results)} results for '{args.search}':")
        print("-"*80)
        for idx, env in enumerate(results, 1):
            print(format_env_line(env, idx))
        print("-"*80)

    elif args.update_status:
        cluster, status = args.update_status
        if manager.update_status(cluster, status):
            print(f"✅ Updated {cluster} to {status}")
        else:
            print(f"❌ Environment {cluster} not found")

    elif args.delete:
        manager.delete_environment(args.delete)
        print(f"✅ Deleted {args.delete}")

    elif args.add_notes:
        cluster, notes = args.add_notes
        if manager.update_status(cluster, None, notes):
            print(f"✅ Added notes to {cluster}")
        else:
            print(f"❌ Environment {cluster} not found")


if __name__ == '__main__':
    main()
