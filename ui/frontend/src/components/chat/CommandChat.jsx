import React, { useState, useRef, useEffect } from 'react';
import {
  CommandLineIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export function CommandChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'system',
      content: 'Welcome to ROSA Command Chat! Execute automation tasks using natural language.',
      examples: [
        'provision rosa cluster named test-cluster',
        'delete cluster th9-test',
        'show all clusters in us-west-2',
        'verify mce environment',
      ],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseCommand = (text) => {
    const lower = text.toLowerCase();

    // Provision cluster
    if (lower.includes('provision') || lower.includes('create cluster')) {
      const nameMatch = text.match(/named?\s+(\S+)|cluster\s+(\S+)/i);
      return {
        action: 'provision',
        params: {
          clusterName: nameMatch ? nameMatch[1] || nameMatch[2] : null,
        },
      };
    }

    // Delete cluster
    if (lower.includes('delete') || lower.includes('remove')) {
      const nameMatch = text.match(/cluster\s+(\S+)|delete\s+(\S+)/i);
      return {
        action: 'delete',
        params: {
          clusterName: nameMatch ? nameMatch[1] || nameMatch[2] : null,
        },
      };
    }

    // List clusters
    if (lower.includes('show') || lower.includes('list') || lower.includes('get')) {
      const regionMatch = text.match(/in\s+([\w-]+)/i);
      return {
        action: 'list',
        params: {
          region: regionMatch ? regionMatch[1] : null,
        },
      };
    }

    // Verify environment
    if (lower.includes('verify') || lower.includes('check')) {
      return {
        action: 'verify',
        params: {},
      };
    }

    return null;
  };

  const executeCommand = async (command) => {
    const { action, params } = command;

    try {
      let response;

      switch (action) {
        case 'provision':
          if (!params.clusterName) {
            return {
              status: 'error',
              message: 'Please specify a cluster name. Example: "provision cluster named test-123"',
            };
          }
          response = await fetch('http://localhost:8000/api/rosa-hcp/provision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clusterName: params.clusterName,
              // Default config - could be enhanced with more params
              openShiftVersion: '4.19.10',
              awsRegion: 'us-west-2',
            }),
          });
          break;

        case 'delete':
          if (!params.clusterName) {
            return {
              status: 'error',
              message: 'Please specify a cluster name. Example: "delete cluster th9-test"',
            };
          }
          response = await fetch(
            `http://localhost:8000/api/rosa-hcp/clusters/${params.clusterName}`,
            { method: 'DELETE' }
          );
          break;

        case 'list':
          const url = params.region
            ? `http://localhost:8000/api/rosa-hcp/clusters?region=${params.region}`
            : 'http://localhost:8000/api/rosa-hcp/clusters';
          response = await fetch(url);
          break;

        case 'verify':
          response = await fetch('http://localhost:8000/api/mce/verify', {
            method: 'POST',
          });
          break;

        default:
          return {
            status: 'error',
            message: 'Unknown command. Try "provision", "delete", "list", or "verify"',
          };
      }

      const data = await response.json();
      return {
        status: response.ok ? 'success' : 'error',
        message: data.message || JSON.stringify(data, null, 2),
        data: data,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error: ${error.message}`,
      };
    }
  };

  const sendCommand = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const commandText = input;
    setInput('');
    setIsProcessing(true);

    // Parse command
    const command = parseCommand(commandText);

    if (!command) {
      const errorMessage = {
        type: 'error',
        content: "I didn't understand that command. Try one of the examples above.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsProcessing(false);
      return;
    }

    // Show processing message
    const processingMessage = {
      type: 'processing',
      content: `Executing: ${command.action} ${JSON.stringify(command.params)}...`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, processingMessage]);

    // Execute command
    const result = await executeCommand(command);

    // Remove processing message and add result
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.type !== 'processing');
      return [
        ...filtered,
        {
          type: result.status,
          content: result.message,
          data: result.data,
          timestamp: new Date(),
        },
      ];
    });

    setIsProcessing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCommand();
    }
  };

  const renderMessage = (message, index) => {
    const icons = {
      success: <CheckCircleIcon className="h-5 w-5 text-green-600" />,
      error: <ExclamationCircleIcon className="h-5 w-5 text-red-600" />,
      processing: <ClockIcon className="h-5 w-5 text-blue-600 animate-spin" />,
    };

    return (
      <div key={index} className="space-y-2">
        {/* User Messages */}
        {message.type === 'user' && (
          <div className="flex justify-end">
            <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
              <div className="flex items-center gap-2">
                <CommandLineIcon className="h-4 w-4" />
                <code className="text-sm font-mono">{message.content}</code>
              </div>
              <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        {/* System Messages */}
        {message.type === 'system' && (
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-700">{message.content}</p>
            {message.examples && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-semibold text-gray-600">Examples:</p>
                {message.examples.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(example)}
                    className="block w-full text-left text-xs bg-white px-3 py-2 rounded hover:bg-gray-50 border border-gray-200 font-mono"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Result Messages */}
        {(message.type === 'success' ||
          message.type === 'error' ||
          message.type === 'processing') && (
          <div className="flex justify-start">
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : message.type === 'error'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {icons[message.type]}
                <div className="flex-1">
                  <pre className="text-sm whitespace-pre-wrap font-mono">{message.content}</pre>
                  {message.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        View details
                      </summary>
                      <pre className="text-xs mt-2 p-2 bg-white rounded overflow-x-auto">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    </details>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Floating Command Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 z-50"
        >
          <CommandLineIcon className="h-6 w-6" />
        </button>
      )}

      {/* Command Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[500px] h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CommandLineIcon className="h-5 w-5" />
              <h3 className="font-semibold">Command Chat</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message, index) => renderMessage(message, index))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter command... (e.g., 'list all clusters')"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                disabled={isProcessing}
              />
              <button
                onClick={sendCommand}
                disabled={!input.trim() || isProcessing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Commands: provision, delete, list, verify</p>
          </div>
        </div>
      )}
    </>
  );
}
