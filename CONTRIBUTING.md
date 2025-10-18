# Contributing to ROSA Automation

Thank you for your interest in contributing to the ROSA Automation project! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Code Review](#code-review)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the project
- Show empathy towards other community members

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. **Required Tools:**
   - Python 3.12+
   - Node.js 16+
   - Git
   - Code editor (VS Code recommended)

2. **Account Setup:**
   - GitHub account
   - Git configured with your name and email

### Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/automation-capi.git
cd automation-capi

# Add upstream remote
git remote add upstream https://github.com/tinaafitz/automation-capi.git
```

### Install Development Dependencies

#### Backend

```bash
cd ui/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Frontend

```bash
cd ui/frontend
npm install
```

#### Pre-commit Hooks

```bash
# From project root
make install-hooks
```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### Branch Naming Conventions

- **Features:** `feature/short-description`
- **Bug fixes:** `fix/short-description`
- **Documentation:** `docs/short-description`
- **Refactoring:** `refactor/short-description`
- **Tests:** `test/short-description`

### 2. Make Changes

- Write clear, readable code
- Follow the coding standards (see below)
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
make test

# Run linters
make lint

# Format code
make format
```

### 4. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "Add feature: description of what you did"
```

Pre-commit hooks will automatically run to check your code.

### 5. Push and Create PR

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

## Coding Standards

### Python (Backend)

#### Style Guide

- Follow [PEP 8](https://pep8.org/)
- Use [Black](https://github.com/psf/black) for formatting (line length: 100)
- Use [Pylint](https://www.pylint.org/) for linting

#### Code Organization

```python
# Good: Clear function with docstring
def calculate_cluster_cost(instance_type: str, count: int) -> float:
    """
    Calculate the total cost for cluster instances.

    Args:
        instance_type: AWS instance type (e.g., 'm5.xlarge')
        count: Number of instances

    Returns:
        Total monthly cost in USD
    """
    pricing = get_instance_pricing(instance_type)
    return pricing * count * 730  # hours per month
```

#### Best Practices

- Use type hints
- Write docstrings for functions and classes
- Keep functions small and focused
- Use meaningful variable names
- Handle errors appropriately

### JavaScript/TypeScript (Frontend)

#### Style Guide

- Follow [Airbnb React Style Guide](https://github.com/airbnb/javascript/tree/master/react)
- Use [Prettier](https://prettier.io/) for formatting
- Use [ESLint](https://eslint.org/) for linting

#### Component Structure

```javascript
// Good: Well-structured React component
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * ClusterCard component displays cluster information
 */
const ClusterCard = ({ clusterId, onUpdate }) => {
  const [cluster, setCluster] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCluster(clusterId).then((data) => {
      setCluster(data);
      setLoading(false);
    });
  }, [clusterId]);

  if (loading) return <Spinner />;

  return (
    <div className="cluster-card">
      <h3>{cluster.name}</h3>
      <p>Status: {cluster.status}</p>
    </div>
  );
};

ClusterCard.propTypes = {
  clusterId: PropTypes.string.isRequired,
  onUpdate: PropTypes.func,
};

export default ClusterCard;
```

#### Best Practices

- Use functional components with hooks
- Implement proper prop types validation
- Use meaningful component and variable names
- Keep components small and focused
- Use CSS modules or Tailwind CSS for styling

## Testing Guidelines

### Backend Testing

#### Writing Tests

```python
import pytest
from httpx import AsyncClient

def test_cluster_validation():
    """Test cluster name validation."""
    assert validate_cluster_name("valid-cluster-123") is True
    assert validate_cluster_name("invalid cluster") is False

@pytest.mark.asyncio
async def test_create_cluster_endpoint(client: AsyncClient):
    """Test cluster creation endpoint."""
    response = await client.post(
        "/api/cluster/create",
        json={"name": "test-cluster", "version": "4.14.0"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "created"
```

#### Test Requirements

- Write tests for all new functionality
- Maintain >80% code coverage
- Use descriptive test names
- Include both positive and negative test cases
- Mock external dependencies

### Frontend Testing

#### Writing Tests

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClusterForm from './ClusterForm';

describe('ClusterForm', () => {
  it('submits form with valid data', async () => {
    const handleSubmit = jest.fn();
    render(<ClusterForm onSubmit={handleSubmit} />);

    await userEvent.type(screen.getByLabelText('Cluster Name'), 'test-cluster');
    await userEvent.click(screen.getByText('Create'));

    expect(handleSubmit).toHaveBeenCalledWith({
      clusterName: 'test-cluster',
    });
  });

  it('shows error for invalid input', async () => {
    render(<ClusterForm onSubmit={jest.fn()} />);

    await userEvent.click(screen.getByText('Create'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Cluster name is required'
    );
  });
});
```

#### Test Requirements

- Test component rendering
- Test user interactions
- Test error states
- Test async operations
- Use React Testing Library best practices

## Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```
feat(ui): add cluster creation form

Implement new cluster creation form with validation
for cluster name, region, and version selection.

Closes #123
```

```
fix(backend): resolve authentication timeout issue

Fix timeout issue when authenticating with ROSA CLI
by increasing the default timeout to 30 seconds.

Fixes #456
```

### Guidelines

- Use present tense ("add feature" not "added feature")
- Keep subject line under 50 characters
- Capitalize the subject line
- Don't end subject with a period
- Separate subject from body with blank line
- Wrap body at 72 characters
- Reference issues and PRs in footer

## Pull Request Process

### Before Submitting

1. **Update your branch:**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Run all checks:**
   ```bash
   make test
   make lint
   make format
   ```

3. **Update documentation:**
   - Update README if needed
   - Add/update docstrings
   - Update UI_README for UI changes

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed the code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Added tests
- [ ] All tests pass
```

### PR Guidelines

- Keep PRs focused and small
- Link related issues
- Provide clear description
- Add screenshots for UI changes
- Respond to review comments promptly

## Code Review

### For Authors

- Be responsive to feedback
- Don't take criticism personally
- Ask questions if unclear
- Make requested changes promptly
- Thank reviewers for their time

### For Reviewers

- Be respectful and constructive
- Explain the "why" behind suggestions
- Approve when satisfied
- Use "Request Changes" sparingly
- Recognize good work

### Review Focus Areas

- **Correctness:** Does the code work as intended?
- **Testing:** Are there adequate tests?
- **Readability:** Is the code easy to understand?
- **Security:** Are there security concerns?
- **Performance:** Are there performance issues?
- **Documentation:** Is it well documented?

## Additional Resources

- [Main README](README.md)
- [UI README](UI_README.md)
- [Security Improvements](SECURITY_IMPROVEMENTS.md)
- [Python PEP 8](https://pep8.org/)
- [React Testing Library](https://testing-library.com/react)

## Questions?

If you have questions:
1. Check existing documentation
2. Search closed issues/PRs
3. Open a new issue with the `question` label
4. Ask in pull request comments

## Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!
