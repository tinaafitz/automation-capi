import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useApp, useAppDispatch } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';

const MinikubeTerminalSection = ({ clusterName }) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState(
    `Welcome to Minikube Terminal for cluster: ${clusterName || 'default'}!\nType commands or select from templates.\n`
  );
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('minikube-embedded-terminal-history');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const outputRef = useRef(null);

  // Get collapse state from context
  const isCollapsed = app.collapsedSections?.has('minikube-terminal') || false;

  // Update welcome message when cluster changes
  useEffect(() => {
    if (clusterName) {
      setOutput(
        `Welcome to Minikube Terminal for cluster: ${clusterName}!\nType commands or select from templates.\n`
      );
    }
  }, [clusterName]);

  // Scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Save terminal history to localStorage
  useEffect(() => {
    localStorage.setItem('minikube-embedded-terminal-history', JSON.stringify(history));
  }, [history]);

  // Command execution
  const executeCommand = async () => {
    if (!command.trim() || executing) return;

    setExecuting(true);
    const timestamp = new Date().toLocaleTimeString();

    setOutput((prev) => `${prev}\n$ ${command}\n`);

    const newHistoryItem = {
      command: command.trim(),
      timestamp: new Date().toISOString(),
      timestampFormatted: timestamp,
    };
    setHistory((prev) => [newHistoryItem, ...prev].slice(0, 100));
    setHistoryIndex(-1);

    try {
      const response = await fetch('http://localhost:8000/api/minikube/execute-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: command.trim(),
          cluster_name: clusterName || 'minikube',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOutput((prev) => `${prev}${data.output}\n`);
      } else {
        setOutput(
          (prev) => `${prev}Error: ${data.error || 'Command failed'}\n${data.output || ''}\n`
        );
      }
    } catch (err) {
      setOutput((prev) => `${prev}Error: Failed to execute command - ${err.message}\n`);
    } finally {
      setExecuting(false);
      setCommand('');
    }
  };

  // Keyboard handler for history navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setCommand(history[newIndex].command);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex].command);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const toggleSection = () => {
    dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: 'minikube-terminal' });
  };

  // Command templates for Minikube
  const commandTemplates = [
    {
      category: 'Cluster Info',
      commands: [
        { name: 'Cluster Status', cmd: 'minikube status' },
        { name: 'Cluster Info', cmd: 'kubectl cluster-info' },
        { name: 'List Nodes', cmd: 'kubectl get nodes' },
      ],
    },
    {
      category: 'CAPI/CAPA',
      commands: [
        { name: 'CAPI Controllers', cmd: 'kubectl get deploy -n capi-system' },
        { name: 'CAPA Controllers', cmd: 'kubectl get deploy -n capa-system' },
        { name: 'Provider Status', cmd: 'kubectl get providers -A' },
      ],
    },
    {
      category: 'ROSA Resources',
      commands: [
        { name: 'ROSA Clusters', cmd: 'kubectl get rosacluster -A' },
        { name: 'Control Planes', cmd: 'kubectl get rosacontrolplane -A' },
        { name: 'ROSA Networks', cmd: 'kubectl get rosanetwork -A' },
      ],
    },
    {
      category: 'Cluster API',
      commands: [
        { name: 'All Clusters', cmd: 'kubectl get cluster -A' },
        { name: 'Machines', cmd: 'kubectl get machine -A' },
        { name: 'MachineSets', cmd: 'kubectl get machineset -A' },
      ],
    },
    {
      category: 'Troubleshooting',
      commands: [
        {
          name: 'Recent Events',
          cmd: 'kubectl get events -A --sort-by=".lastTimestamp" | tail -20',
        },
        {
          name: 'Non-Running Pods',
          cmd: 'kubectl get pods -A | grep -v Running | grep -v Completed',
        },
        {
          name: 'CAPI Controller Logs',
          cmd: 'kubectl logs -n capi-system -l control-plane=controller-manager',
        },
      ],
    },
  ];

  return (
    <div className="mt-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-md border border-purple-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Terminal Header - Click anywhere to toggle */}
      <div
        className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-6 py-4 flex items-center justify-between cursor-pointer hover:from-purple-700 hover:to-violet-700 transition-colors"
        onClick={toggleSection}
        title={isCollapsed ? 'Click to expand Terminal' : 'Click to collapse Terminal'}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <h3 className="text-xl font-bold">Terminal</h3>
          {clusterName && <span className="text-purple-200 text-sm">({clusterName})</span>}
        </div>
        <div className="p-2">
          {isCollapsed ? (
            <ChevronDownIcon className="w-5 h-5" />
          ) : (
            <ChevronUpIcon className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Terminal Content */}
      {!isCollapsed && (
        <div className="p-6 max-h-96 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Command Templates Sidebar - Scrollable */}
            <div className="lg:col-span-1 max-h-80 overflow-y-auto">
              <h4 className="font-medium text-gray-700 mb-3 sticky top-0 bg-purple-50 py-1">
                Quick Commands
              </h4>
              <div className="space-y-3">
                {commandTemplates.map((category, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-medium text-gray-600 mb-1 px-2">
                      {category.category}
                    </div>
                    <div className="space-y-1">
                      {category.commands.slice(0, 3).map((cmdTemplate, cmdIdx) => (
                        <button
                          key={cmdIdx}
                          onClick={() => setCommand(cmdTemplate.cmd)}
                          className="w-full text-left px-3 py-2 text-sm bg-white hover:bg-purple-50 border border-gray-200 rounded-lg transition-colors"
                        >
                          {cmdTemplate.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terminal Output and Input */}
            <div className="lg:col-span-3 flex flex-col">
              {/* Terminal Output */}
              <div
                ref={outputRef}
                className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto mb-4 flex-shrink-0"
                style={{ fontFamily: 'Monaco, Courier, monospace' }}
              >
                <pre className="whitespace-pre-wrap">{output}</pre>
              </div>

              {/* Command Input */}
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-mono">
                    $
                  </span>
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter command... (↑/↓ for history)"
                    disabled={executing}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm disabled:bg-gray-100"
                  />
                </div>
                <button
                  onClick={executeCommand}
                  disabled={executing || !command.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {executing ? 'Running...' : 'Execute'}
                </button>
                <button
                  onClick={() => {
                    setOutput(
                      `Terminal cleared.\nWelcome to Minikube Terminal for cluster: ${clusterName || 'default'}!\n`
                    );
                    setCommand('');
                  }}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  title="Clear Terminal"
                >
                  🗑️ Clear
                </button>
              </div>

              {/* Command History */}
              {history.length > 0 && (
                <div className="mt-4">
                  <details className="bg-gray-50 rounded-lg p-4">
                    <summary className="cursor-pointer font-medium text-sm text-gray-700">
                      Command History ({history.length})
                    </summary>
                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                      {history.slice(0, 10).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-gray-50"
                          onClick={() => setCommand(item.command)}
                        >
                          <span className="font-mono text-xs text-gray-800 truncate">
                            {item.command}
                          </span>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {item.timestampFormatted}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

MinikubeTerminalSection.propTypes = {
  clusterName: PropTypes.string,
};

export default MinikubeTerminalSection;
