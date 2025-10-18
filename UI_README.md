# ROSA Automation UI

Web-based user interface for ROSA cluster automation, providing a modern interface for managing Cluster API (CAPI) and ROSA HCP cluster lifecycles.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Project Structure](#project-structure)
- [Available Commands](#available-commands)
- [Configuration](#configuration)
- [Contributing](#contributing)

## Overview

The ROSA Automation UI consists of:
- **Frontend**: React-based SPA with TypeScript and Tailwind CSS
- **Backend**: FastAPI application with WebSocket support for real-time updates

## Architecture

```
ui/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── __tests__/
│   └── package.json
└── backend/           # FastAPI application
    ├── app.py         # Main application
    ├── logger.py      # Structured logging
    ├── config.py      # Configuration management
    ├── tests/         # Test suite
    └── requirements.txt
```

## Prerequisites

### System Requirements
- **Python**: 3.12 or higher
- **Node.js**: 16.x or higher
- **npm**: 8.x or higher

### External Dependencies
- Running OCP environment with ACM/MCE installed
- AWS credentials
- ROSA CLI access (logged into ROSA stage environment)
- OCM credentials

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/tinaafitz/automation-capi
cd automation-capi
```

### 2. Backend Setup

```bash
cd ui/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run the backend
uvicorn app:app --reload
```

The backend will start at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd ui/frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will start at `http://localhost:3000`

## Development Setup

### Backend Development

#### Virtual Environment

```bash
cd ui/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure the following variables:
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `SECRET_KEY`: Secret key for JWT (generate a strong one for production)

#### Running the Backend

```bash
# Development mode with hot reload
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend Development

#### Install Dependencies

```bash
cd ui/frontend
npm install
```

#### Development Server

```bash
npm start
```

Features:
- Hot reload on file changes
- Automatic browser refresh
- Source maps for debugging

#### Build for Production

```bash
npm run build
```

Creates optimized production build in `build/` directory.

## Testing

### Backend Tests

```bash
cd ui/backend
source venv/bin/activate

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_example.py

# Run specific test
pytest tests/test_example.py::test_addition
```

### Frontend Tests

```bash
cd ui/frontend

# Run all tests
npm test

# Run tests without watch mode
npm test -- --watchAll=false

# Run with coverage
npm test -- --coverage --watchAll=false
```

## Code Quality

### Pre-commit Hooks

Install pre-commit hooks to automatically check code quality:

```bash
# From project root
make install-hooks

# Or manually
pre-commit install
```

Hooks will run automatically on `git commit` and check:
- Code formatting (Black, Prettier)
- Linting (Pylint, ESLint)
- Security (detect-secrets)
- YAML/JSON validation
- Trailing whitespace and EOF

### Manual Code Quality Checks

#### Backend

```bash
cd ui/backend
source venv/bin/activate

# Format code
black .

# Lint code
pylint *.py

# Type checking
mypy .
```

#### Frontend

```bash
cd ui/frontend

# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Using Makefile

Convenient commands from project root:

```bash
# Install pre-commit hooks
make install-hooks

# Lint all code
make lint

# Format all code
make format

# Run all tests
make test

# Clean build artifacts
make clean

# Show all available commands
make help
```

## Project Structure

### Backend Structure

```
backend/
├── app.py              # Main FastAPI application
├── config.py           # Configuration management
├── logger.py           # Structured logging setup
├── requirements.txt    # Python dependencies
├── pytest.ini          # Pytest configuration
├── pyproject.toml      # Black/Pylint configuration
├── .pylintrc           # Pylint rules
├── .coveragerc         # Coverage configuration
└── tests/
    ├── __init__.py
    ├── conftest.py     # Shared test fixtures
    └── test_*.py       # Test files
```

### Frontend Structure

```
frontend/
├── public/             # Static files
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── __tests__/      # Test files
│   ├── App.js          # Main app component
│   └── index.js        # Entry point
├── package.json        # npm dependencies
├── .eslintrc.json      # ESLint configuration
├── .prettierrc         # Prettier configuration
└── tsconfig.json       # TypeScript configuration
```

## Available Commands

### Backend

| Command | Description |
|---------|-------------|
| `uvicorn app:app --reload` | Start development server |
| `pytest` | Run tests |
| `pytest --cov` | Run tests with coverage |
| `black .` | Format code |
| `pylint *.py` | Lint code |
| `mypy .` | Type checking |

### Frontend

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm test` | Run tests in watch mode |
| `npm run build` | Build for production |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Fix linting issues |
| `npm run format` | Format code |
| `npm run format:check` | Check formatting |

### Project Root

| Command | Description |
|---------|-------------|
| `make install-hooks` | Install pre-commit hooks |
| `make lint` | Lint backend and frontend |
| `make format` | Format all code |
| `make test` | Run all tests |
| `make clean` | Clean build artifacts |
| `make help` | Show available commands |

## Configuration

### Backend Configuration

Environment variables (`.env` file):

```bash
# Application
APP_NAME=ROSA Automation
APP_ENV=development
DEBUG=false

# Logging
LOG_LEVEL=INFO
LOG_JSON=true

# Server
HOST=0.0.0.0
PORT=8000

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Security
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
```

### Frontend Configuration

Environment variables (`.env` file in `ui/frontend/`):

```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed contribution guidelines.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `make test`
5. Run linters: `make lint`
6. Commit changes: `git commit -m "Add my feature"`
7. Push to branch: `git push origin feature/my-feature`
8. Create a Pull Request

## Security

See [SECURITY_IMPROVEMENTS.md](../SECURITY_IMPROVEMENTS.md) for security recommendations and planned improvements.

### Reporting Security Issues

Please report security vulnerabilities to the maintainers privately.

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Find process using port 8000
lsof -i :8000
# Kill the process
kill -9 <PID>
```

**Import errors:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate
# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend Issues

**Node modules issues:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Port 3000 in use:**
```bash
# Use different port
PORT=3001 npm start
```

## License

[Add license information]

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact the development team

## Additional Resources

- [Main README](../README.md) - Overall project documentation
- [Security Improvements](../SECURITY_IMPROVEMENTS.md) - Security recommendations
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
