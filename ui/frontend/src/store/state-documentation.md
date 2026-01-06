# State Variables Documentation (106 total)

## UI State (13 variables)

- `darkMode` - Dark mode toggle
- `showCommandPalette` - Command palette visibility
- `searchTerm` - Search functionality
- `visibleCards` - Card animation states
- `expandedCards` - Card expansion states (persisted to localStorage)
- `showFeedback` - Feedback modal visibility
- `feedbackData` - Feedback form data
- `showHelp` - Help modal visibility
- `showConfirmDialog` - Confirmation dialog state
- `settingsPanelOpen` - Settings panel visibility
- `notifications` - Toast notifications array
- `loadingStates` - Set of loading operation IDs
- `favorites` - Set of favorited operation IDs

## Environment State (8 variables)

- `selectedEnvironment` - Current environment (mce/minikube)
- `showEnvironmentDropdown` - Environment selector dropdown
- `environments` - Available environments configuration
- `collapsedSections` - Set of collapsed section IDs
- `mceConfigurationCollapsed` - MCE config section collapsed state
- `minikubeConfigurationCollapsed` - Minikube config section collapsed state
- `showSetupPrompt` - Setup prompt visibility
- `guidedSetupStatus` - Guided setup status data

## API Status State (4 variables)

- `rosaStatus` - ROSA authentication status
- `configStatus` - Configuration status
- `ocpStatus` - OpenShift connection status
- `mceFeatures` - MCE features data
- `mceInfo` - MCE cluster information
- `mceLastVerified` - Last verification timestamp

## Recent Operations State (6 variables)

- `recentOperations` - Recent operations array
- `recentOperationsCollapsed` - Recent ops section collapsed
- `recentOperationsOutputCollapsed` - Recent ops output collapsed
- `minikubeOperationsOutputCollapsed` - Minikube ops output collapsed
- `minikubeRecentOpsCollapsed` - Minikube recent ops collapsed
- `mceRecentOpsCollapsed` - MCE recent ops collapsed

## Modal State (5 variables)

- `showKindClusterModal` - Kind cluster modal visibility
- `showProvisionModal` - Provision modal visibility
- `showYamlEditorModal` - YAML editor modal visibility
- `yamlEditorData` - YAML editor content data
- `showCredentialsModal` - Credentials modal visibility

## Kind Cluster State (5 variables)

- `kindClusters` - Available kind clusters array
- `selectedKindCluster` - Selected cluster name
- `kindClusterInput` - Cluster name input
- `kindVerificationResult` - Verification result data
- `kindLoading` - Kind operations loading state

## Minikube State (8 variables)

- `minikubeClusterInfo` - Cluster information
- `verifiedMinikubeClusterInfo` - Verified cluster data
- `minikubeActiveResources` - Active resources array
- `minikubeResourcesLoading` - Resources loading state
- `minikubeSortField` - Table sort field
- `minikubeSortDirection` - Table sort direction
- `minikubeOperationsOutputCollapsed` - Output section collapsed
- `minikubeRecentOpsCollapsed` - Recent ops collapsed

## MCE State (9 variables)

- `mceLoading` - MCE operations loading state
- `mceActiveResources` - Active resources array
- `mceResourcesLoading` - Resources loading state
- `mceSortField` - Table sort field
- `mceSortDirection` - Table sort direction
- `mceComponentSortField` - Component table sort field
- `mceComponentSortDirection` - Component table sort direction
- `mceRecentOpsCollapsed` - Recent ops collapsed
- `mceConfigurationCollapsed` - Config section collapsed

## Test Suite State (6 variables)

- `testSuiteCollapsed` - Test suite section collapsed
- `selectedVersion` - Selected OpenShift version
- `testItems` - Available test items array
- `testRunning` - Test execution state
- `testResults` - Test execution results
- `selectedTestSuite` - Selected test suite data

## ROSA State (3 variables)

- `rosaClusters` - ROSA clusters array
- `rosaClustersLoading` - ROSA loading state
- `rosaMonitoring` - ROSA monitoring data

## Additional Complex State (45+ variables)

- Multiple ansible result states
- System statistics
- Various modal states
- Form data states
- Filter and search states
- Pagination states
- Sorting states for multiple tables

## State Management Strategy

This large state tree needs to be reorganized into:

1. **Global App State** - Theme, auth, notifications
2. **Environment-Specific State** - MCE, Minikube separate contexts
3. **Feature-Specific State** - Recent operations, testing, ROSA
4. **UI State** - Modals, collapsed states, loading states
