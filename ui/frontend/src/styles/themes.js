// Theme configurations for different environments
export const themes = {
  mce: {
    name: 'MCE',
    primary: {
      50: 'from-cyan-50 to-blue-50',
      100: 'from-cyan-100 to-blue-100',
      600: 'from-cyan-600 to-blue-600',
      700: 'from-cyan-700 to-blue-700'
    },
    colors: {
      border: 'border-cyan-200',
      text: {
        primary: 'text-cyan-900',
        secondary: 'text-cyan-600'
      },
      button: {
        primary: 'bg-cyan-600 hover:bg-cyan-700',
        secondary: 'bg-blue-600 hover:bg-blue-700'
      }
    },
    icon: '🎯'
  },
  minikube: {
    name: 'Minikube',
    primary: {
      50: 'from-purple-50 to-violet-50',
      100: 'from-purple-100 to-violet-100', 
      600: 'from-purple-600 to-violet-600',
      700: 'from-purple-700 to-violet-700'
    },
    colors: {
      border: 'border-purple-200',
      text: {
        primary: 'text-purple-900',
        secondary: 'text-purple-600'
      },
      button: {
        primary: 'bg-purple-600 hover:bg-purple-700',
        secondary: 'bg-violet-600 hover:bg-violet-700'
      }
    },
    icon: '⚡'
  }
};

// Shared component styles
export const cardStyles = {
  base: 'bg-white rounded-2xl shadow-md border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300',
  header: 'px-6 py-4 flex items-center justify-between cursor-pointer transition-colors',
  content: 'px-6 py-4',
  grid: 'grid grid-cols-1 lg:grid-cols-3 gap-6'
};

export const buttonStyles = {
  primary: 'px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105',
  secondary: 'px-3 py-2 rounded-md font-medium transition-all duration-200',
  icon: 'p-2 rounded-lg transition-all duration-200 transform hover:scale-110'
};

export const statusIndicators = {
  success: 'text-green-600 bg-green-50 border-green-200',
  error: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  info: 'text-blue-600 bg-blue-50 border-blue-200'
};