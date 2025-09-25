import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QuestionMarkCircleIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  UserIcon,
  RocketLaunchIcon,
  PlusIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
  CheckCircleIcon,
  PowerIcon,
  CubeIcon,
  ArrowUpIcon,
  TrashIcon,
  CommandLineIcon,
  BookOpenIcon,
  CloudIcon,
  ShieldCheckIcon,
  KeyIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';

export function WhatCanIHelp() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ type: 'general', message: '', email: '' });
  const [showHelp, setShowHelp] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [loadingStates, setLoadingStates] = useState(new Set());
  const [favorites, setFavorites] = useState(new Set());
  const [recentOperations, setRecentOperations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [systemStats, setSystemStats] = useState({
    clustersActive: 2,
    resourcesUsed: 85,
    lastUpdate: new Date().toLocaleTimeString(),
    connectionStatus: 'Connected',
    apiUrl: 'https://api.cluster-abc123.abc123.sandbox1234.opentlc.com:6443',
    currentUser: 'kube:admin'
  });

  // Load preferences from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const savedRecent = JSON.parse(localStorage.getItem('recentOperations') || '[]');

    setDarkMode(savedDarkMode);
    setFavorites(new Set(savedFavorites));
    setRecentOperations(savedRecent);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('recentOperations', JSON.stringify(recentOperations));
  }, [recentOperations]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowHelp(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setShowFeedback(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowHelp(false);
        setShowFeedback(false);
        setShowConfirmDialog(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Staggered card animations
  useEffect(() => {
    const timer = setTimeout(() => {
      configureEnvironment.forEach((_, index) => {
        setTimeout(() => {
          setVisibleCards(prev => new Set([...prev, `config-${index}`]));
        }, index * 100);
      });

      manageROSAClusters.forEach((_, index) => {
        setTimeout(() => {
          setVisibleCards(prev => new Set([...prev, `manage-${index}`]));
        }, (index + configureEnvironment.length) * 100);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Real-time data updates
  useEffect(() => {
    const updateStats = () => {
      setSystemStats(prev => ({
        ...prev,
        clustersActive: Math.floor(Math.random() * 3) + 1,
        resourcesUsed: Math.floor(Math.random() * 20) + 80,
        lastUpdate: new Date().toLocaleTimeString()
      }));
    };

    const interval = setInterval(updateStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const userFriendlyCategories = [
    {
      id: 'no-clue',
      title: "I have no clue",
      subtitle: "I'm new to this, help me understand",
      description: "Get started with guided tutorials and learn about ROSA CAPI/CAPA test automation",
      icon: QuestionMarkCircleIcon,
      color: 'bg-blue-600',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-300',
      puppyImage: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&h=100&fit=crop&crop=face',
      action: () => navigate('/onboarding/tour')
    },
    {
      id: 'broken',
      title: "My stuff is broken",
      subtitle: "Something isn't working, help me fix it",
      description: "Run diagnostics, troubleshoot issues, and get automated fixes",
      icon: WrenchScrewdriverIcon,
      color: 'bg-red-600',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50 hover:bg-red-100',
      borderColor: 'border-red-300',
      puppyImage: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=100&h=100&fit=crop&crop=face',
      action: () => navigate('/diagnostics')
    },
    {
      id: 'environment',
      title: "Tell me about my environment",
      subtitle: "What do I have set up? What's my current state?",
      description: "View your AWS setup, existing clusters, and resource usage",
      icon: ChartBarIcon,
      color: 'bg-green-600',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-300',
      puppyImage: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=100&h=100&fit=crop&crop=face',
      action: () => navigate('/environment/overview')
    },
    {
      id: 'user-info',
      title: "Tell me about my user information",
      subtitle: "What are my permissions? What can I access?",
      description: "Check your identity, permissions, quotas, and recent activity",
      icon: UserIcon,
      color: 'bg-purple-600',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      borderColor: 'border-purple-300',
      puppyImage: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=100&h=100&fit=crop&crop=face',
      action: () => navigate('/user/profile')
    }
  ];

  const configureEnvironment = [
    {
      id: 'check-capa',
      title: "Check if CAPI/CAPA are enabled",
      subtitle: "Verify environment status",
      description: "Check if CAPI and CAPA controllers are enabled and running",
      icon: CheckCircleIcon,
      color: 'bg-green-600',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-300',
      duration: "~30s",
      tooltip: "Quickly verify that all required CAPI/CAPA components are installed and operational in your cluster",
      details: "This check verifies that CAPI controllers are running in the multicluster-engine namespace and that CAPA providers are properly configured. It also validates AWS credentials and checks cluster permissions.",
      requirements: ["OpenShift 4.18+", "MultiCluster Engine installed", "AWS credentials configured"],
      action: () => console.log('Check CAPI/CAPA status')
    },
    {
      id: 'enable-capa',
      title: "Enable CAPI/CAPA",
      subtitle: "Initialize automation environment",
      description: "Enable CAPI and CAPA controllers in your environment",
      icon: PowerIcon,
      color: 'bg-blue-600',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-300',
      duration: "~2m",
      tooltip: "Install and configure CAPI/CAPA controllers in your OpenShift cluster",
      details: "This process enables the Cluster API and AWS Provider in your OpenShift cluster. It installs necessary operators, creates required namespaces, and configures RBAC permissions for ROSA cluster management.",
      requirements: ["Cluster admin permissions", "MultiCluster Engine operator", "Valid ROSA subscription"],
      steps: ["Install CAPI operators", "Configure AWS provider", "Set up RBAC", "Validate installation"],
      action: () => console.log('Enable CAPI/CAPA')
    },
    {
      id: 'configure-mce',
      title: "Configure MCE CAPI/CAPA environment",
      subtitle: "Step-by-step setup",
      description: "Complete environment configuration with guided setup",
      icon: Cog6ToothIcon,
      color: 'bg-indigo-600',
      textColor: 'text-indigo-700',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100',
      borderColor: 'border-indigo-300',
      duration: "~5m",
      tooltip: "Complete MultiCluster Engine setup with guided configuration steps",
      action: () => console.log('Configure MCE environment')
    },
    {
      id: 'check-components',
      title: "Check required components",
      subtitle: "Verify configuration",
      description: "Ensure all MCE CAPI/CAPA components are present and configured",
      icon: CheckCircleIcon,
      color: 'bg-emerald-600',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100',
      borderColor: 'border-emerald-300',
      duration: "~1m",
      tooltip: "Verify all MCE CAPI/CAPA components are properly installed and configured",
      action: () => console.log('Check components')
    }
  ];

  const manageROSAClusters = [
    {
      id: 'create-cluster',
      title: "Create ROSA HCP cluster",
      subtitle: "Deploy new resources",
      description: "Create ROSA HCP cluster or apply custom resource files",
      icon: CubeIcon,
      color: 'bg-orange-600',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      borderColor: 'border-orange-300',
      duration: "~15m",
      tooltip: "Launch a new ROSA HCP cluster with automated provisioning",
      action: () => navigate('/clusters/create')
    },
    {
      id: 'upgrade-cluster',
      title: "Upgrade ROSA HCP cluster",
      subtitle: "Update existing cluster",
      description: "Upgrade cluster to newer OpenShift version",
      icon: ArrowUpIcon,
      color: 'bg-cyan-600',
      textColor: 'text-cyan-700',
      bgColor: 'bg-cyan-50 hover:bg-cyan-100',
      borderColor: 'border-cyan-300',
      duration: "~30m",
      tooltip: "Upgrade your cluster to the latest OpenShift version safely",
      action: () => console.log('Upgrade cluster')
    },
    {
      id: 'delete-cluster',
      title: "Delete ROSA HCP cluster",
      subtitle: "Remove resources",
      description: "Delete cluster or remove custom resources",
      icon: TrashIcon,
      color: 'bg-red-600',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50 hover:bg-red-100',
      borderColor: 'border-red-300',
      duration: "~10m",
      tooltip: "Safely remove cluster and clean up all associated resources",
      action: () => console.log('Delete cluster')
    },
    {
      id: 'custom-commands',
      title: "Enter custom commands",
      subtitle: "Advanced operations",
      description: "Execute custom oc commands and automation scripts",
      icon: CommandLineIcon,
      color: 'bg-gray-600',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-50 hover:bg-gray-100',
      borderColor: 'border-gray-300',
      duration: "Variable",
      tooltip: "Execute custom oc commands and automation scripts",
      action: () => console.log('Custom commands')
    }
  ];


  // All operations for command palette
  const allOperations = [
    ...configureEnvironment.map(op => ({ ...op, category: 'Configure Environment' })),
    ...manageROSAClusters.map(op => ({ ...op, category: 'Manage Clusters' })),
    ...userFriendlyCategories.map(op => ({ ...op, category: 'Getting Started' }))
  ];

  const filteredOperations = allOperations.filter(op =>
    op.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCardExpansion = (cardId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    // Here you would normally send to your backend
    console.log('Feedback submitted:', feedbackData);

    // Show success notification
    addNotification('Thank you for your feedback! We appreciate your input.', 'success');

    // Reset and close
    setFeedbackData({ type: 'general', message: '', email: '' });
    setShowFeedback(false);
  };

  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  const toggleFavorite = (operationId) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(operationId)) {
        newSet.delete(operationId);
        addNotification('Removed from favorites', 'info');
      } else {
        newSet.add(operationId);
        addNotification('Added to favorites', 'success');
      }
      return newSet;
    });
  };

  const addToRecent = (operation) => {
    setRecentOperations(prev => {
      const filtered = prev.filter(op => op.id !== operation.id);
      return [{ ...operation, timestamp: Date.now() }, ...filtered].slice(0, 5);
    });
  };

  const executeOperation = async (operation) => {
    const isDestructive = ['delete', 'remove', 'destroy'].some(word =>
      operation.title.toLowerCase().includes(word)
    );

    if (isDestructive) {
      setShowConfirmDialog({
        title: `Confirm ${operation.title}`,
        message: `Are you sure you want to ${operation.title.toLowerCase()}? This action cannot be undone.`,
        onConfirm: () => performOperation(operation),
        type: 'danger'
      });
      return;
    }

    performOperation(operation);
  };

  const performOperation = async (operation) => {
    setLoadingStates(prev => new Set([...prev, operation.id]));
    addToRecent(operation);

    try {
      // Simulate operation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Execute the original action
      operation.action();

      addNotification(`${operation.title} completed successfully`, 'success');
    } catch (error) {
      addNotification(`Failed to execute ${operation.title}`, 'error');
    } finally {
      setLoadingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(operation.id);
        return newSet;
      });
      setShowConfirmDialog(null);
    }
  };

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${darkMode
        ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white'
        : 'bg-gradient-to-br from-gray-50 to-gray-100'
      }`}
      role="main"
      aria-label="ROSA CAPI/CAPA Test Automation Dashboard"
    >
      {/* Red Hat Header */}
      <div className="bg-white border-b border-gray-200 shadow-lg backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-red-600 text-white px-2 py-1 rounded mr-3 font-bold text-sm">
                RH
              </div>
              <span className="text-xl font-bold text-red-600 mr-2">Red Hat</span>
              <span className="text-xl font-semibold text-gray-900">ROSA CAPI/CAPA Test Automation</span>
            </div>
            <div className="flex items-center space-x-6">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search operations..."
                  className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50 w-64 focus:outline-none"
                  aria-label="Search operations"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Connected</span>
                </div>
                <span className="text-sm text-gray-500">OpenShift 4.20</span>
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-all duration-300 group hover:bg-gray-100 rounded-lg hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Toggle dark mode"
                  aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
                >
                  {darkMode ? (
                    <svg className="h-5 w-5 text-yellow-500 group-hover:text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-600 group-hover:text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Command Palette Trigger */}
                <button
                  onClick={() => setShowCommandPalette(true)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-all duration-300 group hover:bg-gray-100 rounded-lg hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Command palette (⌘K)"
                  aria-label="Open command palette"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                {/* Help Button */}
                <button
                  onClick={() => setShowHelp(true)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-all duration-300 group hover:bg-gray-100 rounded-lg hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Keyboard shortcuts (⌘/)"
                  aria-label="Show keyboard shortcuts"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Feedback Button */}
                <button
                  onClick={() => setShowFeedback(true)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-all duration-300 group hover:bg-gray-100 rounded-lg hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Send feedback (⌘.)"
                  aria-label="Send feedback"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
                <div className="flex items-center space-x-2 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold group-hover:shadow-lg transition-shadow">
                    TF
                  </div>
                  <div className="hidden lg:block">
                    <div className="text-sm font-medium text-gray-700">Tina F.</div>
                    <div className="text-xs text-gray-500">Admin</div>
                  </div>
                  <svg className="h-4 w-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Main Header with Configure Environment and Right Sidebar */}
        <div className="flex items-start justify-between space-x-12 mb-12 animate-in fade-in duration-700">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight animate-in fade-in slide-in-from-bottom duration-800">
              ROSA CAPI/CAPA Test Automation
            </h1>
            <p className="text-xl text-gray-600 mb-6 leading-relaxed max-w-4xl animate-in fade-in slide-in-from-bottom duration-1000">
              Welcome to the Ansible test automation for Cluster API (CAPI) and Cluster API provider AWS (CAPA).
            </p>
            <p className="text-lg font-medium text-gray-800 mb-6">
              What would you like to do today?
            </p>

            {/* Configure Environment - Next to getting started */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-200/50 p-6 mb-6 backdrop-blur-sm hover:scale-[1.02] hover:-translate-y-1 animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
              <h2 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center">
                <div className="bg-indigo-600 rounded-full p-1 mr-2">
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span>Configure My Environment</span>
                <div className="ml-auto bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                  Ready
                </div>
              </h2>
              <div className="space-y-2">
                {configureEnvironment.map((operation, index) => {
                  const Icon = operation.icon;
                  const isVisible = visibleCards.has(`config-${index}`);
                  const isExpanded = expandedCards.has(operation.id);
                  const isLoading = loadingStates.has(operation.id);
                  const isFavorite = favorites.has(operation.id);
                  return (
                    <div
                      key={operation.id}
                      className={`bg-white hover:bg-indigo-50 rounded-lg cursor-pointer transition-all duration-500 border border-transparent hover:border-indigo-300 ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      } ${isExpanded ? 'shadow-xl scale-[1.02] border-indigo-400' : 'hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-95'} ${
                        isLoading ? 'opacity-75 cursor-wait' : ''
                      }`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <div
                        onClick={() => executeOperation(operation)}
                        className="flex items-center space-x-2 p-3 group relative"
                      >
                        {isLoading && (
                          <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
                          </div>
                        )}
                        <div className={`${operation.color} rounded p-1 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 group-active:scale-95`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={`text-xs font-medium ${operation.textColor}`} title={operation.tooltip}>
                              {operation.title}
                            </h3>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1 rounded">
                                {operation.duration}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(operation.id);
                                }}
                                className={`p-1 rounded transition-colors ${
                                  isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'
                                }`}
                                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                              >
                                <svg className="h-3 w-3" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </button>
                              {(operation.details || operation.requirements) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCardExpansion(operation.id);
                                  }}
                                  className="text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors"
                                  title={isExpanded ? "Show less" : "Show more"}
                                >
                                  <svg className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 truncate" title={operation.tooltip}>
                            {operation.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (operation.details || operation.requirements) && (
                        <div className="px-3 pb-3 border-t border-indigo-100 mt-2 pt-2 animate-in slide-in-from-top duration-300">
                          {operation.details && (
                            <div className="mb-3">
                              <h4 className="text-xs font-semibold text-indigo-800 mb-1">Details</h4>
                              <p className="text-xs text-gray-600 leading-relaxed">{operation.details}</p>
                            </div>
                          )}
                          {operation.requirements && (
                            <div className="mb-3">
                              <h4 className="text-xs font-semibold text-indigo-800 mb-1">Requirements</h4>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {operation.requirements.map((req, idx) => (
                                  <li key={idx} className="flex items-center">
                                    <div className="w-1 h-1 bg-indigo-400 rounded-full mr-2"></div>
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {operation.steps && (
                            <div>
                              <h4 className="text-xs font-semibold text-indigo-800 mb-1">Process Steps</h4>
                              <ol className="text-xs text-gray-600 space-y-1">
                                {operation.steps.map((step, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="bg-indigo-100 text-indigo-700 rounded-full w-4 h-4 flex items-center justify-center mr-2 text-xs font-medium flex-shrink-0 mt-0.5">{idx + 1}</span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Manage ROSA HCP Clusters - Moved up under Configure Environment */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-200/50 p-6 backdrop-blur-sm hover:scale-[1.02] hover:-translate-y-1 animate-in fade-in-50 slide-in-from-bottom-4 duration-1000">
              <h2 className="text-sm font-semibold text-orange-900 mb-3 flex items-center">
                <div className="bg-orange-600 rounded-full p-1 mr-2">
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span>Manage ROSA HCP Clusters</span>
                <div className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                  {systemStats.clustersActive} Active
                </div>
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {manageROSAClusters.map((operation, index) => {
                  const Icon = operation.icon;
                  const isVisible = visibleCards.has(`manage-${index}`);
                  return (
                    <div
                      key={operation.id}
                      onClick={operation.action}
                      className={`flex items-center space-x-2 p-3 bg-white hover:bg-orange-50 rounded-lg cursor-pointer transition-all duration-500 group hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] border border-transparent hover:border-orange-300 active:scale-95 ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      }`}
                      style={{ transitionDelay: `${(index + configureEnvironment.length) * 100}ms` }}
                    >
                      <div className={`${operation.color} rounded p-1 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 group-active:scale-95`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-xs font-medium ${operation.textColor}`} title={operation.tooltip}>
                            {operation.title}
                          </h3>
                          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1 rounded text-xs">
                            {operation.duration}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate" title={operation.tooltip}>
                          {operation.subtitle}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar with Environment Status and Getting Started */}
          <div className="space-y-4 min-w-72 max-w-80 sticky top-8 animate-in slide-in-from-right duration-1000">
            {/* Environment Status */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-xl border border-gray-200/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] animate-in fade-in slide-in-from-right-4 duration-800 overflow-hidden">
              {/* Header with animated background */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 bg-white/20 rounded backdrop-blur-sm">
                      <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-white">Live Environment</h2>
                      <div className="text-xs text-blue-100 font-medium">Real-time Status</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white font-mono">{systemStats.lastUpdate}</div>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="group bg-gradient-to-br from-red-50 via-red-50 to-red-100 rounded-lg border border-red-200/60 p-2 hover:shadow-md transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1 bg-red-500 rounded">
                        <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <div className="text-lg font-bold text-red-700 group-hover:scale-110 transition-transform">4.20</div>
                    </div>
                    <div className="text-xs text-red-600 font-semibold">OCP Version</div>
                  </div>

                  <div className="group bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 rounded-lg border border-blue-200/60 p-2 hover:shadow-md transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1 bg-blue-500 rounded">
                        <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div className="text-lg font-bold text-blue-700 animate-pulse group-hover:scale-110 transition-transform">{systemStats.clustersActive}</div>
                    </div>
                    <div className="text-xs text-blue-600 font-semibold">Clusters</div>
                  </div>

                  <div className="group bg-gradient-to-br from-green-50 via-green-50 to-green-100 rounded-lg border border-green-200/60 p-2 hover:shadow-md transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1 bg-green-500 rounded relative">
                        <div className="absolute inset-0 bg-green-400 rounded animate-ping opacity-75"></div>
                        <svg className="h-2.5 w-2.5 text-white relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="text-lg font-bold text-green-700 flex items-center group-hover:scale-110 transition-transform">
                        ✓
                      </div>
                    </div>
                    <div className="text-xs text-green-600 font-semibold">Status</div>
                  </div>

                  <div className="group bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 rounded-lg border border-purple-200/60 p-2 hover:shadow-md transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1 bg-purple-500 rounded">
                        <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="text-lg font-bold text-purple-700 group-hover:scale-110 transition-transform">{systemStats.resourcesUsed}%</div>
                    </div>
                    <div className="text-xs text-purple-600 font-semibold">Resources</div>
                  </div>
                </div>

                {/* Connection Details */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="p-1 bg-gray-600 rounded">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-bold text-gray-800">Connection</h3>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-white rounded p-2 border border-gray-200/50 hover:shadow-sm transition-all duration-200 group">
                      <div className="flex items-start space-x-2">
                        <div className="p-1 bg-blue-100 rounded group-hover:bg-blue-200 transition-colors">
                          <svg className="h-2 w-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-600 font-semibold mb-1">API</div>
                          <div className="text-xs text-gray-900 font-mono bg-gray-50 px-1.5 py-0.5 rounded border truncate" title={systemStats.apiUrl}>
                            {systemStats.apiUrl}
                          </div>
                        </div>
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0 mt-1"></div>
                      </div>
                    </div>

                    <div className="bg-white rounded p-2 border border-gray-200/50 hover:shadow-sm transition-all duration-200 group">
                      <div className="flex items-start space-x-2">
                        <div className="p-1 bg-green-100 rounded group-hover:bg-green-200 transition-colors">
                          <svg className="h-2 w-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-600 font-semibold mb-1">User</div>
                          <div className="text-xs text-gray-900 font-mono bg-gray-50 px-1.5 py-0.5 rounded border truncate" title={systemStats.currentUser}>
                            {systemStats.currentUser}
                          </div>
                        </div>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Operations Widget */}
            {recentOperations.length > 0 && (
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-xl border border-gray-200/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] animate-in fade-in slide-in-from-right-4 duration-1000 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 animate-pulse"></div>
                  <div className="relative flex items-center space-x-2">
                    <div className="p-1 bg-white/20 rounded backdrop-blur-sm">
                      <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-white">Recent Operations</h2>
                      <div className="text-xs text-indigo-100 font-medium">Quick Access</div>
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <div className="space-y-1.5">
                    {recentOperations.map((operation, index) => {
                      const timeAgo = Math.floor((Date.now() - operation.timestamp) / 60000);
                      return (
                        <div
                          key={`${operation.id}-${operation.timestamp}`}
                          onClick={() => executeOperation(operation)}
                          className="bg-white rounded p-2 border border-gray-200/50 hover:shadow-sm transition-all duration-200 group cursor-pointer hover:scale-[1.01]"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className={`w-1.5 h-1.5 ${operation.color.replace('bg-', 'bg-')} rounded-full`}></div>
                              <span className="text-xs font-medium text-gray-900 truncate group-hover:text-indigo-700">{operation.title}</span>
                            </div>
                            <span className="text-xs font-mono text-gray-500 ml-2 flex-shrink-0">
                              {timeAgo < 1 ? 'now' : `${timeAgo}m`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* System Activity Widget */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-xl border border-gray-200/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] animate-in fade-in slide-in-from-right-4 duration-1100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 animate-pulse"></div>
                <div className="relative flex items-center space-x-2">
                  <div className="p-1 bg-white/20 rounded backdrop-blur-sm">
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white">System Activity</h2>
                    <div className="text-xs text-emerald-100 font-medium">Live Updates</div>
                  </div>
                </div>
              </div>

              <div className="p-3">
                <div className="space-y-1.5">
                  <div className="bg-white rounded p-2 border border-gray-200/50 hover:shadow-sm transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-gray-900">Cluster tfitzger-test-1 created</span>
                      </div>
                      <span className="text-xs font-mono text-gray-500">2m</span>
                    </div>
                  </div>
                  <div className="bg-white rounded p-2 border border-gray-200/50 hover:shadow-sm transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-medium text-gray-900">Environment check completed</span>
                      </div>
                      <span className="text-xs font-mono text-gray-500">5m</span>
                    </div>
                  </div>
                  <div className="bg-white rounded p-2 border border-gray-200/50 hover:shadow-sm transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                        <span className="text-xs font-medium text-gray-900">Network automation enabled</span>
                      </div>
                      <span className="text-xs font-mono text-gray-500">12m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Getting Started Widget */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-xl border border-gray-200/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] animate-in fade-in slide-in-from-right-4 duration-1200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-600 to-red-600 px-4 py-3 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-400/20 animate-pulse"></div>
                <div className="relative flex items-center space-x-2">
                  <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Getting Started</h2>
                    <div className="text-xs text-orange-100 font-medium">Help & Guidance</div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="space-y-2">
                  {userFriendlyCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <div
                        key={category.id}
                        onClick={category.action}
                        className="bg-white rounded-lg p-3 border border-gray-200/50 hover:shadow-md transition-all duration-200 group cursor-pointer hover:scale-[1.02]"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={category.puppyImage}
                              alt="Helpful guide"
                              className="h-8 w-8 rounded-full object-cover group-hover:scale-110 transition-all duration-300"
                              title={category.description}
                            />
                            <div className={`absolute -bottom-1 -right-1 ${category.color} rounded-full p-0.5`}>
                              <Icon className="h-2.5 w-2.5 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 group-hover:text-orange-700">
                              {category.title}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                              {category.subtitle}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Getting Started Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Getting Started</h3>
              <p className="text-sm text-blue-700 mt-1">
                New to ROSA CAPI/CAPA test automation? Choose <strong>"I have no clue"</strong> for guided onboarding,
                or <strong>"Tell me about my environment"</strong> to see your current setup.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCommandPalette(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-96 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <svg className="absolute left-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search operations... (type to filter)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {filteredOperations.length > 0 ? (
                <div className="p-2">
                  {filteredOperations.map((operation, index) => {
                    const Icon = operation.icon;
                    return (
                      <div
                        key={operation.id}
                        onClick={() => {
                          operation.action();
                          setShowCommandPalette(false);
                          setSearchTerm('');
                        }}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 group"
                      >
                        <div className={`${operation.color} rounded p-2`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {operation.title}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                              {operation.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {operation.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <svg className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.935-6.072-2.709C3.693 10.124 3 8.191 3 6c0-1.657.672-3.157 1.757-4.243L12 9l7.243-7.243C20.328 2.843 21 4.343 21 6c0 2.191-.693 4.124-2.928 6.291z" />
                  </svg>
                  <p>No operations found</p>
                  <p className="text-xs mt-1">Try searching for "create", "check", or "configure"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
              <span>⌘K to reopen</span>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-right duration-300 ${
              notification.type === 'success' ? 'bg-green-600 text-white' :
              notification.type === 'error' ? 'bg-red-600 text-white' :
              'bg-blue-600 text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {notification.type === 'info' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Navigation</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Command Palette</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">⌘K</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Help</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">⌘/</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Send Feedback</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">⌘.</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Close Modals</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">ESC</kbd>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Features</h4>
                    <div className="space-y-2 text-sm">
                      <div className="text-gray-600 dark:text-gray-400">
                        • Click ⭐ to favorite operations
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        • Click ↓ to expand details
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        • Dark mode toggle in header
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        • Real-time status updates
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">⌘/</kbd> anytime to open this help
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirmDialog(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                {showConfirmDialog.type === 'danger' && (
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {showConfirmDialog.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {showConfirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={showConfirmDialog.onConfirm}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    showConfirmDialog.type === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFeedback(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send Feedback</h3>
                <button
                  onClick={() => setShowFeedback(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Feedback Type
                  </label>
                  <select
                    value={feedbackData.type}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="improvement">UI/UX Improvement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    value={feedbackData.message}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Tell us what you think..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={feedbackData.email}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="your.email@example.com"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave your email if you'd like us to follow up
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFeedback(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Send Feedback
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>© 2024 Red Hat, Inc. ROSA CAPI/CAPA Test Automation Platform</div>
            <div className="flex space-x-6">
              <span>Documentation</span>
              <span>Support</span>
              <button
                onClick={() => setShowFeedback(true)}
                className="hover:text-red-600 transition-colors cursor-pointer"
              >
                Send Feedback
              </button>
              <span>Status</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}