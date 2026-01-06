import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useApp, useAppDispatch } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';

const MCETerminalSection = ({ theme = 'mce' }) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState(
    'Welcome to MCE Terminal! Type commands or select from templates.\n'
  );
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('mce-embedded-terminal-history');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const outputRef = useRef(null);

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'minikube':
        return {
          headerGradient: 'from-purple-600 to-violet-600',
          hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
          border: 'border-purple-200',
          lightBg: 'from-purple-50 to-violet-50',
        };
      case 'mce':
      default:
        return {
          headerGradient: 'from-cyan-600 to-blue-600',
          hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
          border: 'border-cyan-200',
          lightBg: 'from-cyan-50 to-blue-50',
        };
    }
  };

  const colors = getThemeColors();

  // Get collapse state from context
  const isCollapsed = app.collapsedSections?.has('mce-terminal') || false;

  // Scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Save terminal history to localStorage
  useEffect(() => {
    localStorage.setItem('mce-embedded-terminal-history', JSON.stringify(history));
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
      const response = await fetch('http://localhost:8000/api/ocp/execute-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: command.trim() }),
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
    dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: 'mce-terminal' });
  };

  // Command templates
  const commandTemplates = [
    {
      category: 'Cluster Info',
      commands: [
        { name: 'Cluster Info', cmd: 'oc cluster-info' },
        { name: 'OpenShift Version', cmd: 'oc version' },
        { name: 'List Nodes', cmd: 'oc get nodes' },
      ],
    },
    {
      category: 'CAPI/CAPA',
      commands: [
        {
          name: 'CAPA Pod Log',
          cmd: "oc logs -n multicluster-engine $(oc get pod -n multicluster-engine | grep capa | awk '{print $1}')",
        },
        { name: 'Get MCE', cmd: 'oc get mce -A' },
        { name: 'CAPI Deployments', cmd: 'oc get deploy -n capi-system' },
        { name: 'CAPA Deployments', cmd: 'oc get deploy -n capa-system' },
      ],
    },
    {
      category: 'ROSA Resources',
      commands: [
        { name: 'ROSA Clusters', cmd: 'oc get rosacluster -A' },
        { name: 'Control Planes', cmd: 'oc get rosacontrolplane -A' },
        { name: 'ROSA Networks', cmd: 'oc get rosanetwork -A' },
      ],
    },
    {
      category: 'Diagnostics',
      commands: [
        { name: 'Describe Control Planes', cmd: 'oc describe rosacontrolplane -A' },
        { name: 'CAPI Clusters Status', cmd: 'oc get cluster.cluster.x-k8s.io -A' },
        { name: 'ROSA CLI List', cmd: 'rosa list clusters' },
        { name: 'Watch Provisioning', cmd: 'watch "oc get rosacontrolplane -A -o wide"' },
      ],
    },
    {
      category: 'Security & Config',
      commands: [
        { name: 'CAPA Secrets', cmd: 'oc get secret -n capa-system' },
        { name: 'AWS Controller Identity', cmd: 'oc get awsclustercontrolleridentity' },
      ],
    },
    {
      category: 'Troubleshooting',
      commands: [
        { name: 'Recent Events', cmd: 'oc get events -A --sort-by=".lastTimestamp" | tail -20' },
        { name: 'Non-Running Pods', cmd: 'oc get pods -A | grep -v Running | grep -v Completed' },
      ],
    },
  ];

  return (
    <div
      className={`mt-6 bg-gradient-to-br ${colors.lightBg} rounded-2xl shadow-md border ${colors.border} overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300`}
    >
      {/* Terminal Header - Click anywhere to toggle */}
      <div
        className={`bg-gradient-to-r ${colors.headerGradient} text-white px-6 py-4 flex items-center justify-between cursor-pointer ${colors.hoverGradient} transition-colors`}
        onClick={toggleSection}
        title={isCollapsed ? 'Click to expand Terminal' : 'Click to collapse Terminal'}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">💻</span>
          <h3 className="text-xl font-bold">Terminal</h3>
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
              <h4 className="font-medium text-gray-700 mb-3 sticky top-0 bg-cyan-50 py-1">
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
                          className="w-full text-left px-3 py-2 text-sm bg-white hover:bg-cyan-50 border border-gray-200 rounded-lg transition-colors"
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
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm disabled:bg-gray-100"
                  />
                </div>
                <button
                  onClick={executeCommand}
                  disabled={executing || !command.trim()}
                  className={`px-6 py-3 bg-gradient-to-r ${colors.headerGradient} text-white rounded-lg ${colors.hoverGradient} transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
                >
                  {executing ? 'Running...' : 'Execute'}
                </button>
                <button
                  onClick={() => {
                    setOutput('Terminal cleared.\n');
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

MCETerminalSection.propTypes = {
  theme: PropTypes.string,
};

export default MCETerminalSection;
