# Makefile for ROSA HCP Test Automation Framework
# ================================================
#
# Usage:
#   make test-list          - List all available test suites
#   make test-basic         - Run basic ROSA HCP cluster creation test
#   make test-all           - Run all test suites
#   make test-rosa          - Run all ROSA HCP tests (tag filter)
#   make test-clean         - Clean test results directory
#   make help              - Show this help message

.PHONY: help test-list test-basic test-configure test-lifecycle test-all test-rosa test-clean

# Default target
.DEFAULT_GOAL := help

# Color output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m

# Test runner
TEST_RUNNER := ./run-test-suite.py

help: ## Show this help message
	@echo "$(CYAN)ROSA HCP Test Automation - Makefile Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Test Execution:$(NC)"
	@echo "  make test-list         List all available test suites"
	@echo "  make test-configure    Configure MCE environment"
	@echo "  make test-basic        Run basic ROSA HCP cluster creation"
	@echo "  make test-lifecycle    Run full lifecycle test"
	@echo "  make test-all          Run all test suites"
	@echo "  make test-rosa         Run all ROSA HCP tests (tag: rosa-hcp)"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  make test-clean        Clean test results directory"
	@echo "  make test-reports      Open latest HTML test report"
	@echo "  make help              Show this help message"
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make test-basic        # Quick test of basic cluster creation"
	@echo "  make test-all          # Run complete test suite"
	@echo ""

test-list: ## List all available test suites
	@echo "$(CYAN)Available Test Suites:$(NC)"
	@$(TEST_RUNNER) --list

test-configure: ## Configure MCE environment
	@echo "$(CYAN)Running: Configure MCE Environment$(NC)"
	@$(TEST_RUNNER) 01-configure-mce-environment

test-basic: ## Run basic ROSA HCP cluster creation test
	@echo "$(CYAN)Running: Basic ROSA HCP Cluster Creation$(NC)"
	@$(TEST_RUNNER) 02-basic-rosa-hcp-cluster-creation

test-lifecycle: ## Run full ROSA HCP lifecycle test
	@echo "$(CYAN)Running: ROSA HCP Full Lifecycle$(NC)"
	@$(TEST_RUNNER) 03-rosa-hcp-full-lifecycle

test-provision: ## Run ROSA HCP provision test
	@echo "$(CYAN)Running: ROSA HCP Provision$(NC)"
	@$(TEST_RUNNER) 03-rosa-hcp-provision

test-all: ## Run all test suites
	@echo "$(CYAN)Running: All Test Suites$(NC)"
	@$(TEST_RUNNER) --all

test-rosa: ## Run all ROSA HCP tests (tag filter)
	@echo "$(CYAN)Running: All ROSA HCP Tests$(NC)"
	@$(TEST_RUNNER) --tag rosa-hcp

test-clean: ## Clean test results directory
	@echo "$(YELLOW)Cleaning test results...$(NC)"
	@rm -rf test-results/*
	@echo "$(GREEN)Test results cleaned$(NC)"

test-reports: ## Open latest HTML test report
	@if [ -f test-results/latest.html ]; then \
		echo "$(CYAN)Opening latest test report...$(NC)"; \
		open test-results/latest.html || xdg-open test-results/latest.html 2>/dev/null || echo "$(YELLOW)Could not open browser. Report at: test-results/latest.html$(NC)"; \
	else \
		echo "$(YELLOW)No test reports found. Run a test first.$(NC)"; \
	fi

# Development helpers
dev-setup: ## Setup development environment
	@echo "$(CYAN)Setting up development environment...$(NC)"
	@chmod +x $(TEST_RUNNER)
	@mkdir -p test-results
	@echo "$(GREEN)Development environment ready$(NC)"

# CI/CD targets
ci-test: ## Run tests for CI/CD (JSON output only)
	@$(TEST_RUNNER) --all --format json

ci-validate: ## Validate test suite JSON files
	@echo "$(CYAN)Validating test suite definitions...$(NC)"
	@for file in test-suites/*.json; do \
		if python3 -m json.tool "$$file" > /dev/null 2>&1; then \
			echo "$(GREEN)✓ $$(basename $$file)$(NC)"; \
		else \
			echo "$(YELLOW)✗ $$(basename $$file)$(NC)"; \
			exit 1; \
		fi; \
	done
	@echo "$(GREEN)All test suite definitions valid$(NC)"

# Quick test for demo purposes
demo: ## Run a quick demo test
	@echo "$(CYAN)Running Quick Demo Test...$(NC)"
	@echo "This will execute the basic ROSA HCP cluster creation test"
	@$(TEST_RUNNER) 02-basic-rosa-hcp-cluster-creation --format html
	@echo ""
	@echo "$(GREEN)Demo complete! Opening HTML report...$(NC)"
	@make test-reports
