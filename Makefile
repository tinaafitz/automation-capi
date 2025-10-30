.PHONY: help install-hooks lint format test clean

help:
	@echo "Available commands:"
	@echo "  make install-hooks  - Install pre-commit hooks"
	@echo "  make lint          - Run linting on backend and frontend"
	@echo "  make format        - Format code with Black and Prettier"
	@echo "  make test          - Run all tests"
	@echo "  make clean         - Clean build artifacts and cache"

install-hooks:
	@echo "Installing pre-commit hooks..."
	pre-commit install
	@echo "Hooks installed successfully!"

lint:
	@echo "Linting backend..."
	cd ui/backend && source venv/bin/activate && pylint *.py
	@echo "Linting frontend..."
	cd ui/frontend && npm run lint

format:
	@echo "Formatting backend code..."
	cd ui/backend && source venv/bin/activate && black .
	@echo "Formatting frontend code..."
	cd ui/frontend && npm run format

test:
	@echo "Running backend tests..."
	cd ui/backend && source venv/bin/activate && pytest
	@echo "Running frontend tests..."
	cd ui/frontend && npm test -- --watchAll=false

clean:
	@echo "Cleaning backend..."
	find ui/backend -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find ui/backend -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf ui/backend/.pytest_cache ui/backend/htmlcov ui/backend/.coverage
	@echo "Cleaning frontend..."
	rm -rf ui/frontend/node_modules/.cache
	rm -rf ui/frontend/build
	@echo "Clean complete!"
