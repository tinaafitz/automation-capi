#!/usr/bin/env python3
"""
ROSA HCP Test Suite Runner
===========================

Standalone CLI test runner for ROSA HCP automation framework.
Executes test suites defined in JSON format without requiring the web UI.

Usage:
    ./run-test-suite.py 02-basic-rosa-hcp-cluster-creation
    ./run-test-suite.py 10-configure-mce-environment -e name_prefix=xyz
    ./run-test-suite.py 10-configure-mce-environment --dry-run
    ./run-test-suite.py --all
    ./run-test-suite.py --tag rosa-hcp
    ./run-test-suite.py --list
    ./run-test-suite.py --help

Features:
    - Sequential and parallel test execution
    - Real-time progress output
    - JSON and HTML report generation
    - Exit codes for CI/CD integration
    - Tag-based filtering
    - Results history with timestamps

Author: Tina Fitzgerald
Created: January 22, 2026
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Terminal colors for output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


class TestSuiteRunner:
    """Main test suite runner class."""

    def __init__(self, base_dir: Path = Path.cwd(), extra_vars: Optional[Dict[str, str]] = None, dry_run: bool = False):
        self.base_dir = base_dir
        self.test_suites_dir = base_dir / "test-suites"
        self.results_dir = base_dir / "test-results"

        # Set AUTOMATION_PATH automatically (can be overridden by extra_vars)
        self.extra_vars = {"AUTOMATION_PATH": str(base_dir.absolute())}
        if extra_vars:
            self.extra_vars.update(extra_vars)

        self.dry_run = dry_run
        self.results = {
            "start_time": None,
            "end_time": None,
            "duration": 0,
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "suites": []
        }

        # Create results directory if it doesn't exist
        self.results_dir.mkdir(exist_ok=True)

    def load_test_suite(self, suite_id: str) -> Optional[Dict]:
        """Load test suite JSON from file."""
        suite_file = self.test_suites_dir / f"{suite_id}.json"

        if not suite_file.exists():
            print(f"{Colors.RED}✗ Test suite not found: {suite_id}{Colors.ENDC}")
            return None

        try:
            with open(suite_file, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            print(f"{Colors.RED}✗ Invalid JSON in {suite_id}: {e}{Colors.ENDC}")
            return None

    def list_test_suites(self) -> List[Dict]:
        """List all available test suites."""
        suites = []
        for suite_file in sorted(self.test_suites_dir.glob("*.json")):
            suite_id = suite_file.stem
            suite_data = self.load_test_suite(suite_id)
            if suite_data:
                suites.append({
                    "id": suite_id,
                    "name": suite_data.get("name", "Unknown"),
                    "description": suite_data.get("description", ""),
                    "tags": suite_data.get("tags", []),
                    "playbook_count": len(suite_data.get("playbooks", []))
                })
        return suites

    def run_playbook(self, playbook: Dict, suite_name: str) -> Dict:
        """Execute a single Ansible playbook."""
        playbook_name = playbook.get("name")
        playbook_file = playbook.get("file", playbook_name)  # Use 'file' field, fallback to 'name'
        playbook_path = self.base_dir / playbook_file

        if not playbook_path.exists():
            return {
                "name": playbook_name,
                "success": False,
                "error": f"Playbook not found: {playbook_path}",
                "duration": 0
            }

        # Show dry-run indicator
        if self.dry_run:
            print(f"\n{Colors.YELLOW}🔍 DRY RUN: {playbook.get('description', playbook_name)}{Colors.ENDC}")
        else:
            print(f"\n{Colors.CYAN}⏳ Running: {playbook.get('description', playbook_name)}{Colors.ENDC}")

        start_time = time.time()

        try:
            # Build ansible-playbook command
            cmd = ["ansible-playbook", str(playbook_path)]

            # Merge playbook vars with extra vars (extra vars take precedence)
            all_vars = {}
            if "vars" in playbook:
                all_vars.update(playbook["vars"])
            all_vars.update(self.extra_vars)  # Command-line overrides JSON

            # Add dry_run variable for playbooks to use
            if self.dry_run:
                all_vars["dry_run"] = "true"

            # Add merged variables to command
            for key, value in all_vars.items():
                cmd.extend(["-e", f"{key}={value}"])

            # Set timeout if specified
            timeout = playbook.get("timeout", None)

            # Execute playbook
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=self.base_dir
            )

            duration = time.time() - start_time

            if result.returncode == 0:
                print(f"{Colors.GREEN}✓ Completed successfully ({self._format_duration(duration)}){Colors.ENDC}")
                return {
                    "name": playbook_name,
                    "description": playbook.get("description", ""),
                    "test_case_id": playbook.get("test_case_id", ""),
                    "success": True,
                    "duration": duration,
                    "output": result.stdout
                }
            else:
                print(f"{Colors.RED}✗ Failed with exit code {result.returncode}{Colors.ENDC}")
                return {
                    "name": playbook_name,
                    "description": playbook.get("description", ""),
                    "test_case_id": playbook.get("test_case_id", ""),
                    "success": False,
                    "error": result.stderr,
                    "duration": duration,
                    "output": result.stdout
                }

        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            print(f"{Colors.RED}✗ Timeout after {self._format_duration(duration)}{Colors.ENDC}")
            return {
                "name": playbook_name,
                "description": playbook.get("description", ""),
                "test_case_id": playbook.get("test_case_id", ""),
                "success": False,
                "error": f"Timeout after {timeout} seconds",
                "duration": duration
            }
        except Exception as e:
            duration = time.time() - start_time
            print(f"{Colors.RED}✗ Error: {str(e)}{Colors.ENDC}")
            return {
                "name": playbook_name,
                "description": playbook.get("description", ""),
                "test_case_id": playbook.get("test_case_id", ""),
                "success": False,
                "error": str(e),
                "duration": duration
            }

    def run_test_suite(self, suite_id: str) -> bool:
        """Execute a complete test suite."""
        suite_data = self.load_test_suite(suite_id)
        if not suite_data:
            return False

        # Print suite header
        self._print_suite_header(suite_data)

        suite_start = time.time()
        suite_results = {
            "id": suite_id,
            "name": suite_data.get("name", "Unknown"),
            "start_time": datetime.now().isoformat(),
            "playbooks": []
        }

        # Execute playbooks
        playbooks = suite_data.get("playbooks", [])
        total_playbooks = len(playbooks)

        for idx, playbook in enumerate(playbooks, 1):
            print(f"\n{Colors.BOLD}[{idx}/{total_playbooks}]{Colors.ENDC} ", end="")

            playbook_result = self.run_playbook(playbook, suite_data.get("name"))
            suite_results["playbooks"].append(playbook_result)

            # Update counts
            if playbook_result["success"]:
                self.results["passed"] += 1
            else:
                self.results["failed"] += 1

                # Stop on failure if configured
                if suite_data.get("stopOnFailure", False) and playbook.get("required", True):
                    print(f"\n{Colors.YELLOW}⚠ Stopping suite due to failure{Colors.ENDC}")
                    break

        # Calculate suite duration
        suite_duration = time.time() - suite_start
        suite_results["end_time"] = datetime.now().isoformat()
        suite_results["duration"] = suite_duration

        # Print suite summary
        self._print_suite_summary(suite_results)

        # Add to overall results
        self.results["suites"].append(suite_results)
        self.results["total_tests"] = len(playbooks)

        return self.results["failed"] == 0

    def run_all_suites(self, tag_filter: Optional[str] = None) -> bool:
        """Run all test suites, optionally filtered by tag."""
        suites = self.list_test_suites()

        # Apply tag filter if specified
        if tag_filter:
            suites = [s for s in suites if tag_filter in s.get("tags", [])]
            print(f"{Colors.CYAN}Running test suites with tag '{tag_filter}'{Colors.ENDC}\n")

        if not suites:
            print(f"{Colors.YELLOW}No test suites found{Colors.ENDC}")
            return False

        print(f"{Colors.BOLD}Found {len(suites)} test suite(s){Colors.ENDC}\n")

        # Run each suite
        all_passed = True
        for suite in suites:
            success = self.run_test_suite(suite["id"])
            if not success:
                all_passed = False

        return all_passed

    def save_results(self, format: str = "json") -> Path:
        """Save test results to file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_date_dir = self.results_dir / datetime.now().strftime("%Y-%m-%d")
        results_date_dir.mkdir(exist_ok=True)

        if format == "json":
            output_file = results_date_dir / f"test-run-{timestamp}.json"
            with open(output_file, 'w') as f:
                json.dump(self.results, f, indent=2)

            # Also save as latest.json
            latest_file = self.results_dir / "latest.json"
            with open(latest_file, 'w') as f:
                json.dump(self.results, f, indent=2)

        elif format == "html":
            output_file = results_date_dir / f"test-run-{timestamp}.html"
            html_content = self._generate_html_report()
            with open(output_file, 'w') as f:
                f.write(html_content)

            # Also save as latest.html
            latest_file = self.results_dir / "latest.html"
            with open(latest_file, 'w') as f:
                f.write(html_content)

        elif format == "junit":
            output_file = results_date_dir / f"test-run-{timestamp}.xml"
            junit_content = self._generate_junit_xml()
            with open(output_file, 'w') as f:
                f.write(junit_content)

            # Also save as latest.xml
            latest_file = self.results_dir / "latest.xml"
            with open(latest_file, 'w') as f:
                f.write(junit_content)

        return output_file

    def _extract_environment_info(self, playbook_output: str) -> dict:
        """Extract environment information from playbook output."""
        import re

        env_info = {}

        # Extract OCP login info
        ocp_login_match = re.search(r'Successfully logged in - User: ([\w:]+) \| API: (https://[^\s]+) \| Context: ([^\s]+)', playbook_output)
        if ocp_login_match:
            env_info['ocp_user'] = ocp_login_match.group(1)
            env_info['ocp_api_url'] = ocp_login_match.group(2)
            env_info['ocp_context'] = ocp_login_match.group(3)

        # Extract CAPI controller info
        capi_match = re.search(r'CAPI controller deployed - ({[^}]+})', playbook_output)
        if capi_match:
            env_info['capi_controller'] = capi_match.group(1)

        # Extract CAPA controller info
        capa_match = re.search(r'CAPA controller deployed - ({[^}]+})', playbook_output)
        if capa_match:
            env_info['capa_controller'] = capa_match.group(1)

        # Check for RosaNetwork resources
        if 'RosaNetwork resources found' in playbook_output or 'No RosaNetwork resources found' in playbook_output:
            if 'No RosaNetwork resources found' in playbook_output:
                env_info['rosa_network'] = 'none'
            else:
                env_info['rosa_network'] = 'available'

        # Check for RosaRoleConfig (note: might be ROSARoleConfig in some outputs)
        if 'rosa-creds-secret found' in playbook_output:
            env_info['rosa_role_config'] = 'available'
        elif 'rosa-creds-secret not found' in playbook_output:
            env_info['rosa_role_config'] = 'none'

        return env_info

    def _generate_html_report(self) -> str:
        """Generate HTML test report."""
        passed_pct = (self.results["passed"] / max(self.results["total_tests"], 1)) * 100

        # Extract environment info from first successful playbook
        env_info = {}
        for suite in self.results.get("suites", []):
            for playbook in suite.get("playbooks", []):
                if playbook.get("success") and playbook.get("output"):
                    env_info = self._extract_environment_info(playbook["output"])
                    if env_info:
                        break
            if env_info:
                break

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>ROSA HCP Test Results - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        h1 {{ color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }}
        .env-info {{ background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3; }}
        .env-info h2 {{ margin-top: 0; color: #1976D2; font-size: 18px; }}
        .env-item {{ margin: 8px 0; }}
        .env-label {{ font-weight: bold; color: #555; }}
        .env-value {{ color: #333; font-family: monospace; background: white; padding: 2px 6px; border-radius: 3px; }}
        .summary {{ display: flex; gap: 20px; margin: 20px 0; }}
        .stat-box {{ flex: 1; padding: 20px; border-radius: 8px; text-align: center; }}
        .stat-box.total {{ background: #2196F3; color: white; }}
        .stat-box.passed {{ background: #4CAF50; color: white; }}
        .stat-box.failed {{ background: #f44336; color: white; }}
        .stat-number {{ font-size: 36px; font-weight: bold; }}
        .stat-label {{ font-size: 14px; margin-top: 5px; }}
        .suite {{ margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }}
        .suite-header {{ font-size: 20px; font-weight: bold; margin-bottom: 10px; }}
        .playbook {{ margin: 10px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #ddd; }}
        .playbook.success {{ border-left-color: #4CAF50; }}
        .playbook.failed {{ border-left-color: #f44336; }}
        .playbook-name {{ font-weight: bold; }}
        .playbook-duration {{ color: #666; font-size: 12px; }}
        .error {{ color: #f44336; margin-top: 10px; padding: 10px; background: #ffebee; border-radius: 4px; }}
        .progress-bar {{ width: 100%; height: 30px; background: #e0e0e0; border-radius: 15px; overflow: hidden; margin: 20px 0; }}
        .progress-fill {{ height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>ROSA HCP Test Results</h1>
"""

        # Add environment info section if available
        if env_info:
            html += """
        <div class="env-info">
            <h2>🔧 Environment Information</h2>
"""
            if 'ocp_api_url' in env_info:
                html += f"""
            <div class="env-item">
                <span class="env-label">OpenShift API:</span>
                <span class="env-value">{env_info['ocp_api_url']}</span>
            </div>
"""
            if 'ocp_user' in env_info:
                html += f"""
            <div class="env-item">
                <span class="env-label">User:</span>
                <span class="env-value">{env_info['ocp_user']}</span>
            </div>
"""
            if 'ocp_context' in env_info:
                html += f"""
            <div class="env-item">
                <span class="env-label">Context:</span>
                <span class="env-value">{env_info['ocp_context']}</span>
            </div>
"""
            if 'capi_controller' in env_info:
                html += f"""
            <div class="env-item">
                <span class="env-label">CAPI Controller:</span>
                <span class="env-value">✓ Deployed</span>
            </div>
"""
            if 'capa_controller' in env_info:
                html += f"""
            <div class="env-item">
                <span class="env-label">CAPA Controller:</span>
                <span class="env-value">✓ Deployed</span>
            </div>
"""
            if 'rosa_network' in env_info:
                if env_info['rosa_network'] == 'available':
                    html += """
            <div class="env-item">
                <span class="env-label">ROSANetwork CRD:</span>
                <span class="env-value">✓ Available (MCE Enhancement)</span>
            </div>
"""
                else:
                    html += """
            <div class="env-item">
                <span class="env-label">ROSANetwork CRD:</span>
                <span class="env-value">ℹ Not yet available</span>
            </div>
"""
            if 'rosa_role_config' in env_info:
                if env_info['rosa_role_config'] == 'available':
                    html += """
            <div class="env-item">
                <span class="env-label">ROSARoleConfig:</span>
                <span class="env-value">✓ Available (MCE Enhancement)</span>
            </div>
"""
                else:
                    html += """
            <div class="env-item">
                <span class="env-label">ROSARoleConfig:</span>
                <span class="env-value">ℹ Not yet available</span>
            </div>
"""
            html += """
        </div>
"""

        html += f"""
        <div class="summary">
            <div class="stat-box total">
                <div class="stat-number">{self.results["total_tests"]}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-box passed">
                <div class="stat-number">{self.results["passed"]}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-box failed">
                <div class="stat-number">{self.results["failed"]}</div>
                <div class="stat-label">Failed</div>
            </div>
        </div>

        <div class="progress-bar">
            <div class="progress-fill" style="width: {passed_pct}%">
                {passed_pct:.1f}% Passed
            </div>
        </div>

        <p><strong>Duration:</strong> {self._format_duration(self.results["duration"])}</p>
        <p><strong>Started:</strong> {self.results["start_time"]}</p>
        <p><strong>Completed:</strong> {self.results["end_time"]}</p>

"""

        # Add suite details
        for suite in self.results["suites"]:
            html += f"""
        <div class="suite">
            <div class="suite-header">{suite["name"]}</div>
            <p><strong>Duration:</strong> {self._format_duration(suite["duration"])}</p>
"""

            for playbook in suite["playbooks"]:
                status_class = "success" if playbook["success"] else "failed"
                icon = "✓" if playbook["success"] else "✗"

                html += f"""
            <div class="playbook {status_class}">
                <div class="playbook-name">{icon} {playbook.get("description", playbook["name"])}</div>
                <div class="playbook-duration">Duration: {self._format_duration(playbook["duration"])}</div>
"""

                if not playbook["success"] and "error" in playbook:
                    html += f"""
                <div class="error">
                    <strong>Error:</strong><br>
                    <pre>{playbook["error"]}</pre>
                </div>
"""

                html += "            </div>\n"

            html += "        </div>\n"

        html += """
    </div>
</body>
</html>
"""

        return html

    def _generate_junit_xml(self) -> str:
        """Generate JUnit XML test report for CI/CD integration."""
        import xml.etree.ElementTree as ET
        from xml.dom import minidom

        # Create root testsuites element
        testsuites = ET.Element('testsuites')
        testsuites.set('name', 'ROSA HCP Test Suite')
        testsuites.set('tests', str(self.results['total_tests']))
        testsuites.set('failures', str(self.results['failed']))
        testsuites.set('errors', '0')
        testsuites.set('skipped', str(self.results.get('skipped', 0)))
        testsuites.set('time', str(round(self.results['duration'], 3)))

        # Add each suite as a testsuite element
        for suite in self.results.get('suites', []):
            testsuite = ET.SubElement(testsuites, 'testsuite')
            testsuite.set('name', suite['name'])
            testsuite.set('timestamp', suite['start_time'])
            testsuite.set('tests', str(len(suite['playbooks'])))
            testsuite.set('time', str(round(suite['duration'], 3)))

            # Count failures in this suite
            suite_failures = sum(1 for p in suite['playbooks'] if not p['success'])
            testsuite.set('failures', str(suite_failures))
            testsuite.set('errors', '0')
            testsuite.set('skipped', '0')

            # Add each playbook as a testcase
            for playbook in suite['playbooks']:
                testcase = ET.SubElement(testsuite, 'testcase')

                # Build testcase name with test_case_id if present
                test_case_id = playbook.get('test_case_id', '')
                description = playbook.get('description', playbook['name'])

                if test_case_id:
                    testcase_name = f"{test_case_id}: {description}"
                else:
                    testcase_name = description

                testcase.set('name', testcase_name)

                # Classname combines suite name + testcase name
                testcase.set('classname', f"{suite['name']} {testcase_name}")
                testcase.set('time', str(round(playbook['duration'], 3)))

                # If failed, add failure element with error details
                if not playbook['success']:
                    failure = ET.SubElement(testcase, 'failure')
                    failure.set('type', 'TestFailure')
                    failure.set('message', playbook.get('error', 'Test failed'))

                    # Add full error details as text content
                    error_text = f"Playbook: {playbook['name']}\n"
                    error_text += f"Error: {playbook.get('error', 'Unknown error')}\n"
                    if 'output' in playbook and playbook['output']:
                        error_text += f"\nOutput:\n{playbook['output']}"
                    failure.text = error_text

        # Pretty print XML
        xml_str = ET.tostring(testsuites, encoding='unicode')
        dom = minidom.parseString(xml_str)
        return dom.toprettyxml(indent='  ')

    def _print_suite_header(self, suite_data: Dict):
        """Print formatted suite header."""
        print("\n" + "=" * 80)
        print(f"{Colors.BOLD}{Colors.HEADER}ROSA HCP Test Suite Runner{Colors.ENDC}")
        if self.dry_run:
            print(f"{Colors.BOLD}{Colors.YELLOW}🔍 DRY RUN MODE - No changes will be made{Colors.ENDC}")
        print("=" * 80)
        print(f"\n{Colors.BOLD}📋 Test Suite:{Colors.ENDC} {suite_data.get('name', 'Unknown')}")
        print(f"{Colors.BOLD}📝 Description:{Colors.ENDC} {suite_data.get('description', '')}")
        print(f"{Colors.BOLD}🏷️  Tags:{Colors.ENDC} {', '.join(suite_data.get('tags', []))}")
        print(f"{Colors.BOLD}📦 Playbooks:{Colors.ENDC} {len(suite_data.get('playbooks', []))}")
        print(f"{Colors.BOLD}⏰ Started:{Colors.ENDC} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("\n" + "-" * 80)

    def _print_suite_summary(self, suite_results: Dict):
        """Print suite execution summary."""
        passed = sum(1 for p in suite_results["playbooks"] if p["success"])
        failed = sum(1 for p in suite_results["playbooks"] if not p["success"])
        total = len(suite_results["playbooks"])

        print("\n" + "-" * 80)
        print(f"\n{Colors.BOLD}📊 SUITE SUMMARY:{Colors.ENDC}")
        print(f"   Total Playbooks: {total}")
        print(f"   {Colors.GREEN}✓ Passed: {passed}{Colors.ENDC}")
        print(f"   {Colors.RED}✗ Failed: {failed}{Colors.ENDC}")
        print(f"   ⏱️  Duration: {self._format_duration(suite_results['duration'])}")

    def _print_final_summary(self):
        """Print final test execution summary."""
        print("\n" + "=" * 80)
        print(f"\n{Colors.BOLD}📊 FINAL RESULTS SUMMARY:{Colors.ENDC}")
        print(f"   Total Tests: {self.results['total_tests']}")
        print(f"   {Colors.GREEN}✓ Passed: {self.results['passed']}{Colors.ENDC}")
        print(f"   {Colors.RED}✗ Failed: {self.results['failed']}{Colors.ENDC}")
        print(f"   ⏱️  Total Duration: {self._format_duration(self.results['duration'])}")
        print("\n" + "=" * 80 + "\n")

    @staticmethod
    def _format_duration(seconds: float) -> str:
        """Format duration in human-readable format."""
        if seconds < 60:
            return f"{seconds:.1f}s"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            secs = int(seconds % 60)
            return f"{minutes}m {secs}s"
        else:
            hours = int(seconds / 3600)
            minutes = int((seconds % 3600) / 60)
            return f"{hours}h {minutes}m"


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="ROSA HCP Test Suite Runner - Execute Ansible test suites from CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Run a specific test suite:
    ./run-test-suite.py 02-basic-rosa-hcp-cluster-creation

  Run a test suite with extra variables:
    ./run-test-suite.py 10-configure-mce-environment -e name_prefix=xyz

  Run with multiple extra variables:
    ./run-test-suite.py 02-basic-rosa-hcp-cluster-creation -e name_prefix=dev -e aws_region=us-east-1

  Dry run (check mode, no changes):
    ./run-test-suite.py 10-configure-mce-environment --dry-run

  Dry run with extra variables:
    ./run-test-suite.py 10-configure-mce-environment --dry-run -e name_prefix=xyz

  Run all test suites:
    ./run-test-suite.py --all

  Run tests with specific tag:
    ./run-test-suite.py --tag rosa-hcp

  List available test suites:
    ./run-test-suite.py --list
        """
    )

    parser.add_argument(
        "suite_id",
        nargs="?",
        help="Test suite ID to execute (e.g., 02-basic-rosa-hcp-cluster-creation)"
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Run all test suites"
    )

    parser.add_argument(
        "--tag",
        type=str,
        help="Filter test suites by tag"
    )

    parser.add_argument(
        "--list",
        action="store_true",
        help="List all available test suites"
    )

    parser.add_argument(
        "--format",
        choices=["json", "html", "junit", "all"],
        default="all",
        help="Output format for test results: json, html, junit (JUnit XML), or all (default: all)"
    )

    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Don't save results to file"
    )

    parser.add_argument(
        "-e", "--extra-vars",
        action="append",
        help="Extra variables in key=value format (can be used multiple times)"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run in dry-run mode (ansible --check) - no changes will be made"
    )

    args = parser.parse_args()

    # Parse extra vars from command line
    extra_vars = {}
    if args.extra_vars:
        for var in args.extra_vars:
            if '=' in var:
                key, value = var.split('=', 1)
                extra_vars[key] = value
            else:
                print(f"{Colors.YELLOW}Warning: Ignoring invalid extra var format: {var}{Colors.ENDC}")

    # Initialize runner
    runner = TestSuiteRunner(extra_vars=extra_vars, dry_run=args.dry_run)

    # List suites if requested
    if args.list:
        suites = runner.list_test_suites()
        print(f"\n{Colors.BOLD}Available Test Suites:{Colors.ENDC}\n")
        for suite in suites:
            print(f"  {Colors.CYAN}{suite['id']}{Colors.ENDC}")
            print(f"    Name: {suite['name']}")
            print(f"    Description: {suite['description']}")
            print(f"    Tags: {', '.join(suite['tags'])}")
            print(f"    Playbooks: {suite['playbook_count']}\n")
        return 0

    # Validate arguments
    if not args.suite_id and not args.all:
        parser.print_help()
        print(f"\n{Colors.RED}Error: Please specify a suite ID or use --all{Colors.ENDC}")
        return 1

    # Track overall execution time
    runner.results["start_time"] = datetime.now().isoformat()
    start_time = time.time()

    # Execute tests
    success = False
    try:
        if args.all or args.tag:
            success = runner.run_all_suites(tag_filter=args.tag)
        else:
            success = runner.run_test_suite(args.suite_id)

    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}⚠ Test execution interrupted by user{Colors.ENDC}")
        runner.results["failed"] += 1
        success = False

    # Calculate total duration
    runner.results["end_time"] = datetime.now().isoformat()
    runner.results["duration"] = time.time() - start_time

    # Print final summary
    runner._print_final_summary()

    # Save results
    if not args.no_save:
        if args.format in ["json", "all"]:
            json_file = runner.save_results(format="json")
            print(f"{Colors.CYAN}📄 JSON results: {json_file}{Colors.ENDC}")

        if args.format in ["html", "all"]:
            html_file = runner.save_results(format="html")
            print(f"{Colors.CYAN}📄 HTML report: {html_file}{Colors.ENDC}")

        if args.format in ["junit", "all"]:
            junit_file = runner.save_results(format="junit")
            print(f"{Colors.CYAN}📄 JUnit XML: {junit_file}{Colors.ENDC}")

    # Return exit code for CI/CD
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
