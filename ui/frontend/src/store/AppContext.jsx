import React, { createContext, useContext, useReducer, useEffect } from 'react';
import useApiStatus from '../hooks/useApiStatus';
import useMinikubeEnvironment from '../hooks/useMinikubeEnvironment';
import useMCEEnvironment from '../hooks/useMCEEnvironment';
import useRecentOperations from '../hooks/useRecentOperations';

// Initial state for the app
const initialAppState = {
  // UI State
  darkMode: false,
  showCommandPalette: false,
  searchTerm: '',
  visibleCards: new Set(),
  expandedCards: new Set(),
  showFeedback: false,
  feedbackData: { type: 'general', message: '', email: '' },
  showHelp: false,
  showConfirmDialog: null,
  settingsPanelOpen: false,
  notifications: [],
  favorites: new Set(),

  // Environment State
  selectedEnvironment: localStorage.getItem('selectedEnvironment') || 'mce',
  showEnvironmentDropdown: false,
  collapsedSections: new Set(['capi-rosa-hcp-clusters', 'test-suite-dashboard', 'test-suite-runner', 'mce-terminal', 'minikube-terminal', 'helm-chart-tests']),
  showSetupPrompt: false,
  sectionOrder: (localStorage.getItem('selectedEnvironment') || 'mce') === 'minikube'
    ? ['minikube-environment', 'task-summary', 'task-detail', 'rosa-hcp-clusters', 'test-suite-dashboard', 'test-suite-runner', 'minikube-terminal', 'helm-chart-tests']
    : ['mce-configuration', 'task-summary', 'task-detail', 'rosa-hcp-clusters', 'test-suite-dashboard', 'test-suite-runner', 'mce-terminal'],
  hiddenSections: [],
  showFilingCabinet: false,
  filingCabinetMinimized: false,

  // Modal State
  showKindClusterModal: false,
  showProvisionModal: false,
  showYamlEditorModal: false,
  yamlEditorData: null,
  provisionTargetContext: null,  // Track target Minikube cluster for provisioning
  showCredentialsModal: false,

  // Test Suite State
  testSuiteCollapsed: false,
  selectedVersion: '4.21',
  testItems: [],
  testRunning: false,
  testResults: [],
  selectedTestSuite: null,

  // ROSA State
  rosaClusters: [],
  rosaClustersLoading: false,
  rosaMonitoring: null
};

// Action types
export const AppActionTypes = {
  // UI Actions
  SET_DARK_MODE: 'SET_DARK_MODE',
  TOGGLE_COMMAND_PALETTE: 'TOGGLE_COMMAND_PALETTE',
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
  SET_VISIBLE_CARDS: 'SET_VISIBLE_CARDS',
  SET_EXPANDED_CARDS: 'SET_EXPANDED_CARDS',
  SHOW_FEEDBACK: 'SHOW_FEEDBACK',
  SET_FEEDBACK_DATA: 'SET_FEEDBACK_DATA',
  TOGGLE_HELP: 'TOGGLE_HELP',
  SET_CONFIRM_DIALOG: 'SET_CONFIRM_DIALOG',
  TOGGLE_SETTINGS_PANEL: 'TOGGLE_SETTINGS_PANEL',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  TOGGLE_FAVORITE: 'TOGGLE_FAVORITE',

  // Environment Actions
  SET_SELECTED_ENVIRONMENT: 'SET_SELECTED_ENVIRONMENT',
  TOGGLE_ENVIRONMENT_DROPDOWN: 'TOGGLE_ENVIRONMENT_DROPDOWN',
  TOGGLE_SECTION: 'TOGGLE_SECTION',
  SET_SETUP_PROMPT: 'SET_SETUP_PROMPT',
  SET_SECTION_ORDER: 'SET_SECTION_ORDER',
  HIDE_SECTION: 'HIDE_SECTION',
  RESTORE_SECTION: 'RESTORE_SECTION',
  RESTORE_ALL_SECTIONS: 'RESTORE_ALL_SECTIONS',
  TOGGLE_FILING_CABINET: 'TOGGLE_FILING_CABINET',
  TOGGLE_FILING_CABINET_MINIMIZE: 'TOGGLE_FILING_CABINET_MINIMIZE',

  // Modal Actions
  SHOW_KIND_CLUSTER_MODAL: 'SHOW_KIND_CLUSTER_MODAL',
  SHOW_PROVISION_MODAL: 'SHOW_PROVISION_MODAL',
  SHOW_YAML_EDITOR_MODAL: 'SHOW_YAML_EDITOR_MODAL',
  SET_YAML_EDITOR_DATA: 'SET_YAML_EDITOR_DATA',
  SET_PROVISION_TARGET_CONTEXT: 'SET_PROVISION_TARGET_CONTEXT',
  SHOW_CREDENTIALS_MODAL: 'SHOW_CREDENTIALS_MODAL',

  // Test Suite Actions
  TOGGLE_TEST_SUITE: 'TOGGLE_TEST_SUITE',
  SET_SELECTED_VERSION: 'SET_SELECTED_VERSION',
  SET_TEST_ITEMS: 'SET_TEST_ITEMS',
  SET_TEST_RUNNING: 'SET_TEST_RUNNING',
  SET_TEST_RESULTS: 'SET_TEST_RESULTS',
  SET_SELECTED_TEST_SUITE: 'SET_SELECTED_TEST_SUITE',

  // ROSA Actions
  SET_ROSA_CLUSTERS: 'SET_ROSA_CLUSTERS',
  SET_ROSA_CLUSTERS_LOADING: 'SET_ROSA_CLUSTERS_LOADING',
  SET_ROSA_MONITORING: 'SET_ROSA_MONITORING'
};

// App reducer
const appReducer = (state, action) => {
  switch (action.type) {
    // UI Actions
    case AppActionTypes.SET_DARK_MODE:
      return { ...state, darkMode: action.payload };
    
    case AppActionTypes.TOGGLE_COMMAND_PALETTE:
      return { ...state, showCommandPalette: !state.showCommandPalette };
    
    case AppActionTypes.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload };
    
    case AppActionTypes.SET_VISIBLE_CARDS:
      return { ...state, visibleCards: action.payload };
    
    case AppActionTypes.SET_EXPANDED_CARDS:
      return { ...state, expandedCards: action.payload };
    
    case AppActionTypes.SHOW_FEEDBACK:
      return { ...state, showFeedback: action.payload };
    
    case AppActionTypes.SET_FEEDBACK_DATA:
      return { ...state, feedbackData: action.payload };
    
    case AppActionTypes.TOGGLE_HELP:
      return { ...state, showHelp: !state.showHelp };
    
    case AppActionTypes.SET_CONFIRM_DIALOG:
      return { ...state, showConfirmDialog: action.payload };
    
    case AppActionTypes.TOGGLE_SETTINGS_PANEL:
      return { ...state, settingsPanelOpen: !state.settingsPanelOpen };
    
    case AppActionTypes.ADD_NOTIFICATION:
      return { 
        ...state, 
        notifications: [...state.notifications, action.payload] 
      };
    
    case AppActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    case AppActionTypes.TOGGLE_FAVORITE: {
      const newFavorites = new Set(state.favorites);
      if (newFavorites.has(action.payload)) {
        newFavorites.delete(action.payload);
      } else {
        newFavorites.add(action.payload);
      }
      return { ...state, favorites: newFavorites };
    }

    // Environment Actions
    case AppActionTypes.SET_SELECTED_ENVIRONMENT: {
      // Update section order based on selected environment
      const newSectionOrder = action.payload === 'minikube'
        ? ['minikube-environment', 'task-summary', 'task-detail', 'rosa-hcp-clusters', 'test-suite-dashboard', 'test-suite-runner', 'minikube-terminal', 'helm-chart-tests']
        : ['mce-configuration', 'task-summary', 'task-detail', 'rosa-hcp-clusters', 'test-suite-dashboard', 'test-suite-runner', 'mce-terminal'];

      return {
        ...state,
        selectedEnvironment: action.payload,
        sectionOrder: newSectionOrder
      };
    }
    
    case AppActionTypes.TOGGLE_ENVIRONMENT_DROPDOWN:
      return { ...state, showEnvironmentDropdown: !state.showEnvironmentDropdown };
    
    case AppActionTypes.TOGGLE_SECTION: {
      const newSections = new Set(state.collapsedSections);
      if (newSections.has(action.payload)) {
        newSections.delete(action.payload);
      } else {
        newSections.add(action.payload);
      }
      return { ...state, collapsedSections: newSections };
    }
    
    case AppActionTypes.SET_SETUP_PROMPT:
      return { ...state, showSetupPrompt: action.payload };

    case AppActionTypes.SET_SECTION_ORDER: {
      // Ensure Configuration section is always first
      const configSection = state.selectedEnvironment === 'minikube' ? 'minikube-environment' : 'mce-configuration';
      const otherSections = action.payload.filter(id => id !== configSection);
      const enforcedOrder = [configSection, ...otherSections];

      // Persist to localStorage
      localStorage.setItem('mce-section-order', JSON.stringify(enforcedOrder));
      return { ...state, sectionOrder: enforcedOrder };
    }

    case AppActionTypes.HIDE_SECTION: {
      const newHiddenSections = [...state.hiddenSections, action.payload];
      const newSectionOrder = state.sectionOrder.filter(id => id !== action.payload);
      localStorage.setItem('mce-hidden-sections', JSON.stringify(newHiddenSections));
      return {
        ...state,
        hiddenSections: newHiddenSections,
        sectionOrder: newSectionOrder,
        filingCabinetMinimized: false, // Unminimize filing cabinet when new section is hidden
      };
    }

    case AppActionTypes.RESTORE_SECTION: {
      const newHiddenSections = state.hiddenSections.filter(id => id !== action.payload);
      const newSectionOrder = [...state.sectionOrder, action.payload];
      localStorage.setItem('mce-hidden-sections', JSON.stringify(newHiddenSections));
      return {
        ...state,
        hiddenSections: newHiddenSections,
        sectionOrder: newSectionOrder,
      };
    }

    case AppActionTypes.RESTORE_ALL_SECTIONS: {
      const newSectionOrder = [...state.sectionOrder, ...state.hiddenSections];
      localStorage.setItem('mce-hidden-sections', JSON.stringify([]));
      return {
        ...state,
        hiddenSections: [],
        sectionOrder: newSectionOrder,
      };
    }

    case AppActionTypes.TOGGLE_FILING_CABINET:
      return { ...state, showFilingCabinet: !state.showFilingCabinet };

    case AppActionTypes.TOGGLE_FILING_CABINET_MINIMIZE:
      return { ...state, filingCabinetMinimized: !state.filingCabinetMinimized, showFilingCabinet: false };

    // Modal Actions
    case AppActionTypes.SHOW_KIND_CLUSTER_MODAL:
      return { ...state, showKindClusterModal: action.payload };
    
    case AppActionTypes.SHOW_PROVISION_MODAL:
      return { ...state, showProvisionModal: action.payload };
    
    case AppActionTypes.SHOW_YAML_EDITOR_MODAL:
      return { ...state, showYamlEditorModal: action.payload };
    
    case AppActionTypes.SET_YAML_EDITOR_DATA:
      return { ...state, yamlEditorData: action.payload };

    case AppActionTypes.SET_PROVISION_TARGET_CONTEXT:
      return { ...state, provisionTargetContext: action.payload };

    case AppActionTypes.SHOW_CREDENTIALS_MODAL:
      return { ...state, showCredentialsModal: action.payload };

    // Test Suite Actions
    case AppActionTypes.TOGGLE_TEST_SUITE:
      return { ...state, testSuiteCollapsed: !state.testSuiteCollapsed };
    
    case AppActionTypes.SET_SELECTED_VERSION:
      return { ...state, selectedVersion: action.payload };
    
    case AppActionTypes.SET_TEST_ITEMS:
      return { ...state, testItems: action.payload };
    
    case AppActionTypes.SET_TEST_RUNNING:
      return { ...state, testRunning: action.payload };
    
    case AppActionTypes.SET_TEST_RESULTS:
      return { ...state, testResults: action.payload };
    
    case AppActionTypes.SET_SELECTED_TEST_SUITE:
      return { ...state, selectedTestSuite: action.payload };

    // ROSA Actions
    case AppActionTypes.SET_ROSA_CLUSTERS:
      return { ...state, rosaClusters: action.payload };
    
    case AppActionTypes.SET_ROSA_CLUSTERS_LOADING:
      return { ...state, rosaClustersLoading: action.payload };
    
    case AppActionTypes.SET_ROSA_MONITORING:
      return { ...state, rosaMonitoring: action.payload };

    default:
      return state;
  }
};

// Create contexts
const AppContext = createContext();
const AppDispatchContext = createContext();
const ApiStatusContext = createContext();
const MinikubeContext = createContext();
const MCEContext = createContext();
const RecentOperationsContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  
  // Custom hooks
  const apiStatus = useApiStatus();
  const minikubeEnv = useMinikubeEnvironment();
  const mceEnv = useMCEEnvironment();
  const recentOps = useRecentOperations();

  // Load persisted state from localStorage
  useEffect(() => {
    try {
      const savedExpandedCards = localStorage.getItem('expandedCards');
      if (savedExpandedCards) {
        const parsed = JSON.parse(savedExpandedCards);
        dispatch({
          type: AppActionTypes.SET_EXPANDED_CARDS,
          payload: new Set(parsed)
        });
      }

      const savedFavorites = localStorage.getItem('favorites');
      if (savedFavorites) {
        const parsed = JSON.parse(savedFavorites);
        dispatch({
          type: AppActionTypes.TOGGLE_FAVORITE,
          payload: new Set(parsed)
        });
      }

      const savedSectionOrder = localStorage.getItem('mce-section-order');
      if (savedSectionOrder) {
        const parsed = JSON.parse(savedSectionOrder);

        // Migrate old 'test-suite' to new 'test-suite-dashboard' and 'test-suite-runner'
        const migratedOrder = parsed.flatMap(id => {
          if (id === 'test-suite') {
            return ['test-suite-dashboard', 'test-suite-runner'];
          }
          return id;
        });

        // Ensure all new sections are included (merge with default based on environment)
        const currentEnv = localStorage.getItem('selectedEnvironment') || 'mce';
        const defaultOrder = currentEnv === 'minikube'
          ? ['minikube-environment', 'task-summary', 'task-detail', 'rosa-hcp-clusters', 'test-suite-dashboard', 'test-suite-runner', 'minikube-terminal', 'helm-chart-tests']
          : ['mce-configuration', 'task-summary', 'task-detail', 'rosa-hcp-clusters', 'test-suite-dashboard', 'test-suite-runner', 'mce-terminal'];

        // Merge orders but ensure Configuration is always first
        const configSection = currentEnv === 'minikube' ? 'minikube-environment' : 'mce-configuration';
        const otherSections = [...new Set([...migratedOrder, ...defaultOrder])].filter(id => id !== configSection);
        const mergedOrder = [configSection, ...otherSections];

        dispatch({
          type: AppActionTypes.SET_SECTION_ORDER,
          payload: mergedOrder
        });
      }

      const savedHiddenSections = localStorage.getItem('mce-hidden-sections');
      if (savedHiddenSections) {
        const parsed = JSON.parse(savedHiddenSections);
        // Update hiddenSections state directly since we already have it in initial state
        dispatch({
          type: AppActionTypes.RESTORE_ALL_SECTIONS // This will clear, then we'll set properly
        });
        // Set the actual hidden sections
        parsed.forEach(sectionId => {
          dispatch({
            type: AppActionTypes.HIDE_SECTION,
            payload: sectionId
          });
        });
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem('expandedCards', JSON.stringify([...state.expandedCards]));
  }, [state.expandedCards]);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify([...state.favorites]));
  }, [state.favorites]);

  // Persist selected environment to localStorage
  useEffect(() => {
    localStorage.setItem('selectedEnvironment', state.selectedEnvironment);
  }, [state.selectedEnvironment]);

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <ApiStatusContext.Provider value={apiStatus}>
          <MinikubeContext.Provider value={minikubeEnv}>
            <MCEContext.Provider value={mceEnv}>
              <RecentOperationsContext.Provider value={recentOps}>
                {children}
              </RecentOperationsContext.Provider>
            </MCEContext.Provider>
          </MinikubeContext.Provider>
        </ApiStatusContext.Provider>
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  );
};

// Custom hooks to use contexts
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
};

export const useApiStatusContext = () => {
  const context = useContext(ApiStatusContext);
  if (!context) {
    throw new Error('useApiStatusContext must be used within an AppProvider');
  }
  return context;
};

export const useMinikubeContext = () => {
  const context = useContext(MinikubeContext);
  if (!context) {
    throw new Error('useMinikubeContext must be used within an AppProvider');
  }
  return context;
};

export const useMCEContext = () => {
  const context = useContext(MCEContext);
  if (!context) {
    throw new Error('useMCEContext must be used within an AppProvider');
  }
  return context;
};

export const useRecentOperationsContext = () => {
  const context = useContext(RecentOperationsContext);
  if (!context) {
    throw new Error('useRecentOperationsContext must be used within an AppProvider');
  }
  return context;
};