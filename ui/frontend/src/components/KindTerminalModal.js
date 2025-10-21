import React, { useState, useEffect, useRef } from 'react';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  CommandLineIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export function KindTerminalModal({ isOpen, onClose, clusterName, namespace }) {
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [executing, setExecuting] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const outputEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load command history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(`kind-terminal-history-${clusterName}`);
    if (savedHistory) {
      try {
        setCommandHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load command history:', e);
      }
    }
  }, [clusterName]);

  // Save command history to localStorage whenever it changes
  useEffect(() => {
    if (commandHistory.length > 0) {
      localStorage.setItem(`kind-terminal-history-${clusterName}`, JSON.stringify(commandHistory));
    }
  }, [commandHistory, clusterName]);

  // Pre-built command templates
  const commandTemplates = [
    {
      category: 'Cluster Info',
      commands: [
        { label: 'Get Pods', cmd: 'kubectl get pods -A', description: 'List all pods across all namespaces' },
        { label: 'Get Nodes', cmd: 'kubectl get nodes', description: 'List all nodes in the cluster' },
        { label: 'Cluster Info', cmd: 'kubectl cluster-info', description: 'Display cluster information' },
        { label: 'Get Namespaces', cmd: 'kubectl get namespaces', description: 'List all namespaces' },
      ],
    },
    {
      category: 'CAPI/CAPA Components',
      commands: [
        { label: 'CAPI Pods', cmd: `kubectl get pods -n capi-system`, description: 'Check CAPI controller pods' },
        { label: 'CAPA Pods', cmd: `kubectl get pods -n capa-system`, description: 'Check CAPA controller pods' },
        { label: 'CAPI Controllers', cmd: 'kubectl get deployment -n capi-system', description: 'List CAPI deployments' },
        { label: 'CAPA Controllers', cmd: 'kubectl get deployment -n capa-system', description: 'List CAPA deployments' },
      ],
    },
    {
      category: 'ROSA Resources',
      commands: [
        { label: 'ROSA Clusters', cmd: `kubectl get rosaclusters -n ${namespace || 'default'}`, description: 'List ROSA clusters' },
        { label: 'ROSA Networks', cmd: `kubectl get rosanetworks -n ${namespace || 'default'}`, description: 'List ROSA network resources' },
        { label: 'ROSA Roles', cmd: `kubectl get rosaroleconfigs -n ${namespace || 'default'}`, description: 'List ROSA role configurations' },
        { label: 'Control Planes', cmd: `kubectl get rosacontrolplanes -n ${namespace || 'default'}`, description: 'List ROSA control planes' },
      ],
    },
    {
      category: 'OpenShift (oc)',
      commands: [
        { label: 'OC Projects', cmd: 'oc projects', description: 'List all projects (namespaces)' },
        { label: 'OC Status', cmd: 'oc status', description: 'Show overview of current project' },
        { label: 'OC Get Routes', cmd: 'oc get routes -A', description: 'List all routes' },
        { label: 'OC Get Operators', cmd: 'oc get operators', description: 'List installed operators' },
      ],
    },
    {
      category: 'Common Aliases',
      commands: [
        { label: 'gap', cmd: 'gap', description: 'Get all pods (oc get pods -A)' },
        { label: 'gcp', cmd: 'gcp', description: 'Get CAPA pods in multicluster-engine' },
        { label: 'gccp', cmd: 'gccp', description: 'Get CAPA pods in capa-system' },
        { label: 'gmce', cmd: 'gmce', description: 'Get MultiClusterEngine' },
        { label: 'grcp', cmd: 'grcp', description: 'Get ROSAControlPlane resources' },
        { label: 'rlc', cmd: 'rlc', description: 'ROSA list clusters' },
        { label: 'kgc', cmd: 'kgc', description: 'Kind get clusters' },
      ],
    },
    {
      category: 'ROSA CLI',
      commands: [
        { label: 'ROSA Version', cmd: 'rosa version', description: 'Show ROSA CLI version' },
        { label: 'ROSA List Clusters', cmd: 'rosa list clusters', description: 'List all ROSA clusters' },
        { label: 'ROSA Whoami', cmd: 'rosa whoami', description: 'Display current AWS account info' },
        { label: 'ROSA Verify Quota', cmd: 'rosa verify quota', description: 'Verify AWS quota for ROSA' },
      ],
    },
    {
      category: 'Debugging',
      commands: [
        { label: 'Recent Events', cmd: 'kubectl get events --sort-by=.metadata.creationTimestamp -A', description: 'Show recent cluster events' },
        { label: 'Failed Pods', cmd: 'kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded', description: 'List pods not running' },
        { label: 'Pod Logs', cmd: 'kubectl logs -n <namespace> <pod-name>', description: 'View pod logs (replace placeholders)' },
        { label: 'Describe Pod', cmd: 'kubectl describe pod -n <namespace> <pod-name>', description: 'Get detailed pod info' },
      ],
    },
  ];

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commandHistory]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const cancelCommand = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setCommandHistory((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].status === 'executing') {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            status: 'error',
            output: 'Command cancelled by user',
          };
        }
        return updated;
      });
      setExecuting(false);
    }
  };

  const executeCommand = async () => {
    if (!command.trim()) return;

    const commandToExecute = command.trim();
    setExecuting(true);

    // Add command to history
    const newEntry = {
      command: commandToExecute,
      timestamp: new Date().toISOString(),
      status: 'executing',
      output: '',
    };

    setCommandHistory((prev) => [...prev, newEntry]);
    setCommand('');
    setHistoryIndex(-1);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('http://localhost:8000/api/kind/execute-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cluster_name: clusterName,
          command: commandToExecute,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      // Update the last entry with results
      setCommandHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          status: data.success ? 'success' : 'error',
          output: data.output || data.error || 'No output',
          exitCode: data.exit_code,
        };
        return updated;
      });
    } catch (err) {
      console.error('Failed to execute command:', err);
      // Only update if not already cancelled
      if (err.name !== 'AbortError') {
        setCommandHistory((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            status: 'error',
            output: `Failed to execute command: ${err.message}`,
          };
          return updated;
        });
      }
    } finally {
      setExecuting(false);
      // Keep focus on input after command execution
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Navigate command history up
      const commandsOnly = commandHistory.map((h) => h.command);
      if (commandsOnly.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandsOnly.length) {
          setHistoryIndex(newIndex);
          setCommand(commandsOnly[commandsOnly.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Navigate command history down
      const commandsOnly = commandHistory.map((h) => h.command);
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandsOnly[commandsOnly.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const applyTemplate = (cmd) => {
    setCommand(cmd);
    setShowTemplates(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const copyOutput = (output, index) => {
    navigator.clipboard.writeText(output);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearHistory = () => {
    setCommandHistory([]);
    localStorage.removeItem(`kind-terminal-history-${clusterName}`);
  };

  // Filter command history based on search term
  const filteredHistory = searchTerm
    ? commandHistory.filter(
        (entry) =>
          entry.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.output.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : commandHistory;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[80vh] my-8 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center">
            <CommandLineIcon className="h-6 w-6 mr-3" />
            <div>
              <h2 className="text-xl font-bold">Kind Cluster Terminal</h2>
              <p className="text-gray-300 text-sm">
                Cluster: <span className="font-mono">{clusterName}</span>
                {namespace && (
                  <>
                    {' '}
                    | Namespace: <span className="font-mono">{namespace}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              {showTemplates ? 'Hide' : 'Show'} Templates
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
              title="Search history"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
            <button
              onClick={clearHistory}
              disabled={commandHistory.length === 0}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear history"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search command history..."
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="text-xs text-gray-400 mt-2">
                Found {filteredHistory.length} of {commandHistory.length} commands
              </div>
            )}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Command Templates Sidebar */}
          {showTemplates && (
            <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <CommandLineIcon className="h-4 w-4 mr-2" />
                Quick Commands
              </h3>
              <div className="space-y-4">
                {commandTemplates.map((category, idx) => (
                  <div key={idx}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      {category.category}
                    </h4>
                    <div className="space-y-1">
                      {category.commands.map((cmd, cmdIdx) => (
                        <button
                          key={cmdIdx}
                          onClick={() => applyTemplate(cmd.cmd)}
                          className="w-full text-left p-2 rounded-lg hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-all group"
                        >
                          <div className="font-medium text-sm text-gray-900 group-hover:text-cyan-700">
                            {cmd.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{cmd.description}</div>
                          <div className="text-xs font-mono text-gray-600 mt-1 bg-white rounded px-2 py-1">
                            {cmd.cmd}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Terminal Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Command Output */}
            <div className="flex-1 bg-gray-900 text-gray-100 p-4 overflow-y-auto font-mono text-sm min-h-[300px] max-h-[400px]">
              {commandHistory.length === 0 ? (
                <div className="text-gray-500 text-center mt-8">
                  <CommandLineIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No commands executed yet</p>
                  <p className="text-xs mt-1">
                    Type a kubectl, oc, or rosa command below or use a template from the sidebar
                  </p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-gray-500 text-center mt-8">
                  <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No commands match your search</p>
                  <p className="text-xs mt-1">
                    Try a different search term or clear the search
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistory.map((entry, index) => (
                    <div key={index} className="border-b border-gray-700 pb-4">
                      {/* Command Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-cyan-400">$</span>
                          <span className="text-white">{entry.command}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400 flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          {entry.status === 'executing' ? (
                            <ArrowPathIcon className="h-4 w-4 text-yellow-400 animate-spin" />
                          ) : entry.status === 'success' ? (
                            <CheckIcon className="h-4 w-4 text-green-400" />
                          ) : (
                            <span className="text-xs text-red-400">✗</span>
                          )}
                        </div>
                      </div>

                      {/* Command Output */}
                      {entry.output && (
                        <div className="mt-2 relative group">
                          <pre className="text-gray-300 whitespace-pre-wrap break-words bg-black/30 rounded p-2 text-xs">
                            {entry.output}
                          </pre>
                          <button
                            onClick={() => copyOutput(entry.output, index)}
                            className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy output"
                          >
                            {copiedIndex === index ? (
                              <CheckIcon className="h-3 w-3 text-green-400" />
                            ) : (
                              <DocumentDuplicateIcon className="h-3 w-3 text-gray-300" />
                            )}
                          </button>
                        </div>
                      )}

                      {entry.exitCode !== undefined && entry.exitCode !== 0 && (
                        <div className="text-xs text-red-400 mt-1">Exit code: {entry.exitCode}</div>
                      )}
                    </div>
                  ))}
                  <div ref={outputEndRef} />
                </div>
              )}
            </div>

            {/* Command Input */}
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="flex items-center space-x-2">
                <span className="text-cyan-400 font-mono">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter command (kubectl, oc, rosa, aliases supported)... (↑↓ for history, Enter to execute)"
                  disabled={executing}
                  className="flex-1 bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 font-mono text-sm"
                />
                {executing ? (
                  <button
                    onClick={cancelCommand}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={executeCommand}
                    disabled={!command.trim()}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Execute
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                <span>Tip: Use arrow keys to navigate command history</span>
                <span>Commands executed: {commandHistory.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
