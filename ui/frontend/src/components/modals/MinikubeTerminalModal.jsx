import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const MinikubeTerminalModal = ({ isOpen, onClose, clusterName }) => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState(`Welcome to Minikube Terminal for cluster: ${clusterName || 'default'}!\nType commands or select from templates.\n`);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const outputRef = useRef(null);

  // Update welcome message when cluster changes
  useEffect(() => {
    if (clusterName && isOpen) {
      setOutput(`Welcome to Minikube Terminal for cluster: ${clusterName}!\nType commands or select from templates.\n`);
    }
  }, [clusterName, isOpen]);

  // Scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Command execution
  const executeCommand = async () => {
    if (!command.trim() || executing) return;

    setExecuting(true);
    const timestamp = new Date().toLocaleTimeString();

    setOutput(prev => `${prev}\n$ ${command}\n`);

    const newHistoryItem = {
      command: command.trim(),
      timestamp: new Date().toISOString(),
      timestampFormatted: timestamp,
    };
    setHistory(prev => [newHistoryItem, ...prev].slice(0, 100));
    setHistoryIndex(-1);

    try {
      const response = await fetch('http://localhost:8000/api/minikube/execute-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: command.trim(),
          cluster_name: clusterName || 'minikube'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOutput(prev => `${prev}${data.output}\n`);
      } else {
        setOutput(
          prev => `${prev}Error: ${data.error || 'Command failed'}\n${data.output || ''}\n`
        );
      }
    } catch (err) {
      setOutput(prev => `${prev}Error: Failed to execute command - ${err.message}\n`);
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

  // Command templates for Minikube
  const commandTemplates = [
    { category: 'Cluster Info', commands: [
      { name: 'Cluster Status', cmd: 'minikube status' },
      { name: 'Cluster Info', cmd: 'kubectl cluster-info' },
      { name: 'Kubernetes Version', cmd: 'kubectl version' },
      { name: 'List Nodes', cmd: 'kubectl get nodes' },
    ]},
    { category: 'CAPI/CAPA', commands: [
      { name: 'CAPI Controllers', cmd: 'kubectl get deploy -n capi-system' },
      { name: 'CAPA Controllers', cmd: 'kubectl get deploy -n capa-system' },
      { name: 'CAPI Providers', cmd: 'clusterctl get kubeconfig' },
      { name: 'Provider Status', cmd: 'kubectl get providers -A' },
    ]},
    { category: 'ROSA Resources', commands: [
      { name: 'ROSA Clusters', cmd: 'kubectl get rosacluster -A' },
      { name: 'Control Planes', cmd: 'kubectl get rosacontrolplane -A' },
      { name: 'Machine Pools', cmd: 'kubectl get rosamachinepool -A' },
      { name: 'ROSA Networks', cmd: 'kubectl get rosanetwork -A' },
    ]},
    { category: 'Cluster API', commands: [
      { name: 'All Clusters', cmd: 'kubectl get cluster -A' },
      { name: 'Machines', cmd: 'kubectl get machine -A' },
      { name: 'MachineSets', cmd: 'kubectl get machineset -A' },
      { name: 'KubeadmControlPlane', cmd: 'kubectl get kubeadmcontrolplane -A' },
    ]},
    { category: 'Minikube Management', commands: [
      { name: 'Dashboard', cmd: 'minikube dashboard' },
      { name: 'Service List', cmd: 'minikube service list' },
      { name: 'Addons List', cmd: 'minikube addons list' },
      { name: 'IP Address', cmd: 'minikube ip' },
    ]},
    { category: 'Troubleshooting', commands: [
      { name: 'Recent Events', cmd: 'kubectl get events -A --sort-by=".lastTimestamp" | tail -20' },
      { name: 'Non-Running Pods', cmd: 'kubectl get pods -A | grep -v Running | grep -v Completed' },
      { name: 'Logs - CAPI Controller', cmd: 'kubectl logs -n capi-system -l control-plane=controller-manager' },
      { name: 'Logs - CAPA Controller', cmd: 'kubectl logs -n capa-system -l control-plane=capa-controller-manager' },
    ]},
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚡</span>
            <h3 className="text-xl font-bold text-white">
              Minikube Terminal {clusterName && `- ${clusterName}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 h-[calc(90vh-120px)] overflow-hidden flex">
          {/* Command Templates Sidebar */}
          <div className="w-1/3 pr-6 overflow-y-auto">
            <h4 className="font-semibold text-gray-900 mb-4">Command Templates</h4>
            <div className="space-y-4">
              {commandTemplates.map((category, idx) => (
                <div key={idx}>
                  <h5 className="text-sm font-medium text-gray-700 mb-2 px-3 py-1 bg-gray-100 rounded">
                    {category.category}
                  </h5>
                  <div className="space-y-1">
                    {category.commands.map((cmdTemplate, cmdIdx) => (
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

          {/* Terminal */}
          <div className="flex-1 flex flex-col">
            {/* Terminal Output */}
            <div
              ref={outputRef}
              className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg flex-1 overflow-y-auto mb-4"
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
                  setOutput(`Terminal cleared.\nWelcome to Minikube Terminal for cluster: ${clusterName || 'default'}!\n`);
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
    </div>
  );
};

export default MinikubeTerminalModal;