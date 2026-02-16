#!/usr/bin/env python3
"""
Fix json_query filter usage by converting to native Ansible filters.
This eliminates the jmespath dependency which doesn't work in Jenkins.
"""

import re
import sys
from pathlib import Path

def fix_metadata_name(content):
    """Replace json_query('metadata.name') with .metadata.name"""
    pattern = r'\|\s*json_query\([\'"]metadata\.name[\'"]\)\s*\|\s*default\((.*?)\)'
    replacement = r'.metadata.name | default(\1)'
    content = re.sub(pattern, replacement, content)

    # Handle cases without default
    pattern = r'\|\s*json_query\([\'"]metadata\.name[\'"]\)'
    replacement = r'.metadata.name'
    content = re.sub(pattern, replacement, content)

    return content

def fix_items_query(content):
    """Replace json_query('items') with .items"""
    pattern = r'\|\s*json_query\([\'"]items[\'"]\)\s*\|\s*default\((.*?)\)'
    replacement = r'.items | default(\1)'
    content = re.sub(pattern, replacement, content)

    # Handle cases without default
    pattern = r'\|\s*json_query\([\'"]items[\'"]\)'
    replacement = r'.items'
    content = re.sub(pattern, replacement, content)

    return content

def fix_status_subnets(content):
    """Replace json_query('status.subnets') with .status.subnets"""
    pattern = r'\|\s*json_query\([\'"]status\.subnets[\'"]\)\s*\|\s*default\((.*?)\)'
    replacement = r'.status.subnets | default(\1)'
    content = re.sub(pattern, replacement, content)

    return content

def fix_status_resources(content):
    """Replace json_query('status.resources') with .status.resources"""
    pattern = r'\|\s*json_query\([\'"]status\.resources[\'"]\)\s*\|\s*default\((.*?)\)'
    replacement = r'.status.resources | default(\1)'
    content = re.sub(pattern, replacement, content)

    return content

def fix_status_conditions(content):
    """Replace json_query('status.conditions') with .status.conditions"""
    pattern = r'\|\s*json_query\([\'"]status\.conditions[\'"]\)\s*\|\s*default\((.*?)\)'
    replacement = r'.status.conditions | default(\1)'
    content = re.sub(pattern, replacement, content)

    return content

def fix_status_arn_queries(content):
    """Replace json_query('status.*Arn') with .status.*Arn"""
    arns = ['installerRoleArn', 'supportRoleArn', 'workerRoleArn', 'oidcProviderArn']
    for arn in arns:
        pattern = rf'\|\s*json_query\([\'"]status\.{arn}[\'"]\)\s*\|\s*default\((.*?)\)'
        replacement = rf'.status.{arn} | default(\1)'
        content = re.sub(pattern, replacement, content)

    return content

def fix_ready_condition_query(content):
    """
    Replace json_query('status.conditions[?type==`Ready` && status==`True`]')
    with selectattr filters
    """
    # Pattern for Ready condition
    pattern = r'\|\s*json_query\([\'"]status\.conditions\[\?type==`Ready`\s+&&\s+status==`True`\][\'"]\)\s*\|\s*default\((.*?)\)'
    replacement = r'.status.conditions | default(\1) | selectattr(\'type\', \'equalto\', \'Ready\') | selectattr(\'status\', \'equalto\', \'True\') | list'
    content = re.sub(pattern, replacement, content)

    # Pattern for ROSANetworkReady condition
    pattern = r'\|\s*json_query\([\'"]status\.conditions\[\?type==`ROSANetworkReady`\s+&&\s+status==`True`\][\'"]\)\s*\|\s*default\((.*?)\)'
    replacement = r'.status.conditions | default(\1) | selectattr(\'type\', \'equalto\', \'ROSANetworkReady\') | selectattr(\'status\', \'equalto\', \'True\') | list'
    content = re.sub(pattern, replacement, content)

    return content

def fix_file(file_path):
    """Fix all json_query usage in a file"""
    print(f"Processing {file_path}...")

    with open(file_path, 'r') as f:
        content = f.read()

    original_content = content

    # Apply all fixes
    content = fix_metadata_name(content)
    content = fix_items_query(content)
    content = fix_status_subnets(content)
    content = fix_status_resources(content)
    content = fix_status_conditions(content)
    content = fix_status_arn_queries(content)
    content = fix_ready_condition_query(content)

    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"  ✓ Fixed {file_path}")
        return True
    else:
        print(f"  - No changes needed for {file_path}")
        return False

def main():
    tasks_dir = Path("/Users/tinafitzgerald/acm_dev/test-automation-capa/tasks")

    # Find all YAML files with json_query
    yaml_files = list(tasks_dir.glob("*.yml"))

    fixed_count = 0
    for yaml_file in yaml_files:
        # Check if file contains json_query
        with open(yaml_file, 'r') as f:
            if 'json_query' in f.read():
                if fix_file(yaml_file):
                    fixed_count += 1

    print(f"\nSummary: Fixed {fixed_count} files")

    # Check for any remaining json_query usage
    remaining = []
    for yaml_file in yaml_files:
        with open(yaml_file, 'r') as f:
            if 'json_query' in f.read():
                remaining.append(yaml_file)

    if remaining:
        print(f"\n⚠️  Warning: {len(remaining)} files still have json_query:")
        for f in remaining:
            print(f"  - {f}")
        return 1
    else:
        print("\n✓ All json_query usage removed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
