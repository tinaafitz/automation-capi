import React, { useState, useEffect, useRef } from 'react';
import {
  XMarkIcon,
  CommandLineIcon,
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

export function MCETerminalModal({ isOpen, onClose }) {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [copiedCommand, setCopiedCommand] = useState(null);
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  // Load command history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('mce-terminal-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load command history:', e);
      }
    }
  }, []);

  // Save command history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('mce-terminal-history', JSON.stringify(history));
    }
  }, [history]);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const executeCommand = async () => {
    if (!command.trim() || executing) return;

    setExecuting(true);
    const timestamp = new Date().toLocaleTimeString();

    // Add to output
    setOutput((prev) => `${prev}\n$ ${command}\n`);

    // Add to history
    const newHistoryItem = {
      command: command.trim(),
      timestamp: new Date().toISOString(),
      timestampFormatted: timestamp,
    };
    setHistory((prev) => [newHistoryItem, ...prev].slice(0, 100)); // Keep last 100 commands
    setHistoryIndex(-1);

    try {
      const response = await fetch('http://localhost:8000/api/ocp/execute-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: command.trim(),
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
      console.error('Failed to execute command:', err);
      setOutput((prev) => `${prev}Error: Failed to execute command - ${err.message}\n`);
    } finally {
      setExecuting(false);
      setCommand('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
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

  const clearOutput = () => {
    setOutput('');
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('mce-terminal-history');
    setShowHistory(false);
  };

  const selectHistoryCommand = (cmd) => {
    setCommand(cmd);
    setShowHistory(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const copyCommand = async (cmd) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCommand(cmd);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (err) {
      console.error('Failed to copy command:', err);
    }
  };

  const filteredHistory = history.filter((item) =>
    item.command.toLowerCase().includes(historySearch.toLowerCase())
  );

  // Command templates organized by category
  const commandTemplates = {
    'Cluster Info': [
      { label: 'Get cluster version', cmd: 'oc version' },
      { label: 'Get nodes', cmd: 'oc get nodes' },
      { label: 'Get all pods', cmd: 'oc get pods --all-namespaces' },
      { label: 'Get all deployments', cmd: 'oc get deployments --all-namespaces' },
      { label: 'Get namespaces', cmd: 'oc get namespaces' },
    ],
    'MCE/CAPI/CAPA': [
      { label: 'Get ClusterManager', cmd: 'oc get clustermanager -n multicluster-engine' },
      {
        label: 'Get CAPI controller deployment',
        cmd: 'oc get deploy capi-controller-manager -n multicluster-engine',
      },
      {
        label: 'Get CAPA controller deployment',
        cmd: 'oc get deploy capa-controller-manager -n multicluster-engine',
      },
      {
        label: 'Get CAPI/CAPA pods',
        cmd: 'oc get pods -n multicluster-engine | grep -E "capi|capa"',
      },
      {
        label: 'Watch CAPA controller logs',
        cmd: 'oc logs -n multicluster-engine -l cluster.x-k8s.io/provider=infrastructure-aws --tail=50 -f',
      },
      {
        label: 'Get AWSClusterControllerIdentity',
        cmd: 'oc get awsclustercontrolleridentity default',
      },
    ],
    'ROSA Resources': [
      { label: 'Get ROSA clusters', cmd: 'oc get rosacluster --all-namespaces' },
      { label: 'Get ROSA control planes', cmd: 'oc get rosacontrolplane --all-namespaces' },
      { label: 'Get ROSA networks', cmd: 'oc get rosanetwork --all-namespaces' },
      { label: 'Get ROSA role configs', cmd: 'oc get rosaroleconfig --all-namespaces' },
      { label: 'Describe ROSA cluster', cmd: 'oc describe rosacluster --all-namespaces' },
      {
        label: 'Patch RosaControlPlane version gate',
        cmd: 'oc patch rosacontrolplane <name> -n <namespace> --type=merge -p \'{"spec":{"versionGate":"Acknowledge"}}\'',
      },
    ],
    'Secrets & Config': [
      {
        label: 'Get AWS credentials secret',
        cmd: 'oc get secret capa-manager-bootstrap-credentials -n multicluster-engine',
      },
      {
        label: 'Get ROSA credentials secret',
        cmd: 'oc get secret rosa-creds-secret -n multicluster-engine',
      },
      {
        label: 'Get ClusterRoleBinding',
        cmd: 'oc get clusterrolebinding cluster-manager-registration-capi',
      },
      { label: 'List all secrets in MCE', cmd: 'oc get secrets -n multicluster-engine' },
      { label: 'List all configmaps in MCE', cmd: 'oc get configmaps -n multicluster-engine' },
    ],
    Troubleshooting: [
      {
        label: 'Get events in MCE',
        cmd: 'oc get events -n multicluster-engine --sort-by=.lastTimestamp',
      },
      {
        label: 'Get all events',
        cmd: 'oc get events --all-namespaces --sort-by=.lastTimestamp',
      },
      {
        label: 'Describe failed pods in MCE',
        cmd: 'oc get pods -n multicluster-engine --field-selector=status.phase!=Running,status.phase!=Succeeded',
      },
      {
        label: 'Check CAPA controller logs',
        cmd: 'oc logs -n multicluster-engine -l cluster.x-k8s.io/provider=infrastructure-aws --tail=100',
      },
      {
        label: 'Check CAPI controller logs',
        cmd: 'oc logs -n multicluster-engine deploy/capi-controller-manager --tail=100',
      },
    ],
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center">
            <CommandLineIcon className="h-8 w-8 mr-3" />
            <div>
              <h2 className="text-2xl font-bold">MCE Test Environment Terminal</h2>
              <p className="text-cyan-100 text-sm mt-1">
                Connected to OpenShift Hub Cluster (MCE Environment)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Command Templates Sidebar */}
          <div className="w-[500px] bg-gray-50 border-r border-gray-200 overflow-y-auto p-4 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <CommandLineIcon className="h-4 w-4 mr-2 text-cyan-600" />
              Command Templates
            </h3>
            <div className="space-y-4">
              {Object.entries(commandTemplates).map(([category, commands]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {commands.map((template, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectHistoryCommand(template.cmd)}
                        className="w-full text-left p-2 rounded-lg hover:bg-cyan-50 transition-colors group"
                      >
                        <p className="text-xs font-medium text-gray-900 group-hover:text-cyan-700">
                          {template.label}
                        </p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5 whitespace-pre-wrap break-words group-hover:text-cyan-600">
                          {template.cmd}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal Output */}
          <div className="flex-1 flex flex-col">
            {/* Output Area */}
            <div
              ref={outputRef}
              className="flex-1 bg-gray-900 text-green-400 font-mono text-sm p-4 overflow-y-auto whitespace-pre-wrap"
            >
              {output ||
                '# Ready to execute commands. Type a command below or select from templates.\n# Press Enter to execute, Up/Down arrows to navigate history.\n# Commands will be executed in the context of your logged-in OCP cluster.\n'}
            </div>

            {/* Command Input Area */}
            <div className="bg-gray-800 p-4 border-t border-gray-700">
              <div className="flex items-center mb-2">
                <span className="text-green-400 font-mono text-sm mr-2">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={executing}
                  placeholder="Enter oc command..."
                  className="flex-1 bg-gray-900 text-green-400 font-mono text-sm px-3 py-2 rounded-lg border border-gray-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={executeCommand}
                  disabled={executing || !command.trim()}
                  className="ml-2 bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {executing ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    'Execute'
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center"
                  >
                    <ClockIcon className="h-4 w-4 mr-1" />
                    History ({history.length})
                  </button>
                  <button onClick={clearOutput} className="text-cyan-400 hover:text-cyan-300">
                    Clear Output
                  </button>
                </div>
                <div className="text-gray-500">
                  {historyIndex >= 0 && (
                    <span className="flex items-center">
                      <ChevronUpIcon className="h-3 w-3 mr-1" />
                      History: {historyIndex + 1}/{history.length}
                      <ChevronDownIcon className="h-3 w-3 ml-1" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Command History Panel */}
        {showHistory && (
          <div className="border-t border-gray-200 bg-gray-50 max-h-80 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2 text-cyan-600" />
                  Command History
                </h3>
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All History
                </button>
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search command history..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {historySearch ? 'No matching commands found' : 'No command history yet'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 hover:bg-cyan-50 transition-colors group cursor-pointer"
                      onClick={() => selectHistoryCommand(item.command)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-gray-900 truncate group-hover:text-cyan-700">
                            {item.command}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{item.timestampFormatted}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyCommand(item.command);
                          }}
                          className="ml-2 text-gray-400 hover:text-cyan-600 transition-colors"
                        >
                          {copiedCommand === item.command ? (
                            <CheckIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
