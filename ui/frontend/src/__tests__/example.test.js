/**
 * Example test file demonstrating React testing patterns.
 *
 * This file shows how to:
 * - Test React components
 * - Use React Testing Library
 * - Test user interactions
 * - Mock API calls
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PropTypes from 'prop-types';

// Example: Simple component for testing
function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}

Button.propTypes = {
  onClick: PropTypes.func,
  children: PropTypes.node,
};

function Counter() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}

function ClusterForm({ onSubmit }) {
  const [clusterName, setClusterName] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!clusterName) {
      setError('Cluster name is required');
      return;
    }

    if (!/^[a-zA-Z0-9-]+$/.test(clusterName)) {
      setError('Cluster name can only contain alphanumeric characters and hyphens');
      return;
    }

    setError('');
    onSubmit({ clusterName });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="cluster-name">Cluster Name</label>
      <input
        id="cluster-name"
        type="text"
        value={clusterName}
        onChange={(e) => setClusterName(e.target.value)}
        placeholder="Enter cluster name"
      />
      {error && <div role="alert">{error}</div>}
      <button type="submit">Create Cluster</button>
    </form>
  );
}

ClusterForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
};

// Import React for JSX
import React from 'react';

// Tests
describe('Button Component', () => {
  test('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('Counter Component', () => {
  test('renders initial count of 0', () => {
    render(<Counter />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });

  test('increments count when increment button is clicked', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    await user.click(screen.getByText('Increment'));
    expect(screen.getByText('Count: 1')).toBeInTheDocument();

    await user.click(screen.getByText('Increment'));
    expect(screen.getByText('Count: 2')).toBeInTheDocument();
  });

  test('decrements count when decrement button is clicked', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    await user.click(screen.getByText('Decrement'));
    expect(screen.getByText('Count: -1')).toBeInTheDocument();
  });

  test('resets count to 0 when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    await user.click(screen.getByText('Increment'));
    await user.click(screen.getByText('Increment'));
    expect(screen.getByText('Count: 2')).toBeInTheDocument();

    await user.click(screen.getByText('Reset'));
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });
});

describe('ClusterForm Component', () => {
  test('renders form with input and submit button', () => {
    const handleSubmit = jest.fn();
    render(<ClusterForm onSubmit={handleSubmit} />);

    expect(screen.getByLabelText('Cluster Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter cluster name')).toBeInTheDocument();
    expect(screen.getByText('Create Cluster')).toBeInTheDocument();
  });

  test('shows error when submitting empty form', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();
    render(<ClusterForm onSubmit={handleSubmit} />);

    await user.click(screen.getByText('Create Cluster'));

    expect(screen.getByRole('alert')).toHaveTextContent('Cluster name is required');
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  test('shows error for invalid cluster name', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();
    render(<ClusterForm onSubmit={handleSubmit} />);

    const input = screen.getByLabelText('Cluster Name');
    await user.type(input, 'invalid cluster name!');
    await user.click(screen.getByText('Create Cluster'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Cluster name can only contain alphanumeric characters and hyphens'
    );
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  test('submits form with valid cluster name', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();
    render(<ClusterForm onSubmit={handleSubmit} />);

    const input = screen.getByLabelText('Cluster Name');
    await user.type(input, 'valid-cluster-123');
    await user.click(screen.getByText('Create Cluster'));

    expect(handleSubmit).toHaveBeenCalledWith({
      clusterName: 'valid-cluster-123',
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// Example: Testing async operations and API calls
describe('Async Operations', () => {
  test('loads and displays data', async () => {
    function DataComponent() {
      const [data, setData] = React.useState(null);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        // Simulate API call
        setTimeout(() => {
          setData({ message: 'Data loaded' });
          setLoading(false);
        }, 100);
      }, []);

      if (loading) return <div>Loading...</div>;
      return <div>{data.message}</div>;
    }

    render(<DataComponent />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });
  });
});

// Example: Testing with mocked fetch
describe('API Calls', () => {
  test('fetches cluster data successfully', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ cluster: 'test-cluster', status: 'ready' }),
      })
    );

    function ClusterStatus() {
      const [cluster, setCluster] = React.useState(null);

      React.useEffect(() => {
        fetch('/api/cluster')
          .then((res) => res.json())
          .then((data) => setCluster(data));
      }, []);

      if (!cluster) return <div>Loading...</div>;
      return (
        <div>
          Cluster: {cluster.cluster} - {cluster.status}
        </div>
      );
    }

    render(<ClusterStatus />);

    await waitFor(() => {
      expect(screen.getByText('Cluster: test-cluster - ready')).toBeInTheDocument();
    });

    global.fetch.mockClear();
  });
});
