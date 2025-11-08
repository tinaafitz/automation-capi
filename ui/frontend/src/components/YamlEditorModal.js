import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

export function YamlEditorModal({ isOpen, onClose, onProvision, yamlData }) {
  const [editedYaml, setEditedYaml] = useState('');
  const [originalYaml, setOriginalYaml] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef(null);

  // Initialize YAML content when modal opens
  useEffect(() => {
    if (isOpen && yamlData?.yaml_content) {
      setOriginalYaml(yamlData.yaml_content);
      setEditedYaml(yamlData.yaml_content);
      setValidationError(null);
      setShowDiff(false);
      setHasChanges(false);
    }
  }, [isOpen, yamlData]);

  // Validate YAML syntax
  const validateYaml = (yamlContent) => {
    try {
      // Basic YAML validation - check for common syntax errors
      const lines = yamlContent.split('\n');
      let inString = false;
      let stringChar = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip empty lines and comments
        if (line.trim() === '' || line.trim().startsWith('#')) continue;

        // Check for basic indentation issues
        const leadingSpaces = line.match(/^ */)[0].length;
        if (leadingSpaces % 2 !== 0 && line.trim() !== '') {
          throw new Error(`Line ${i + 1}: Invalid indentation (must be multiple of 2)`);
        }

        // Check for unmatched quotes (basic check)
        for (let char of line) {
          if ((char === '"' || char === "'") && !inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar && inString) {
            inString = false;
            stringChar = null;
          }
        }
      }

      if (inString) {
        throw new Error('Unmatched quotes in YAML');
      }

      setValidationError(null);
      return true;
    } catch (error) {
      setValidationError(error.message);
      return false;
    }
  };

  // Handle YAML content change
  const handleYamlChange = (e) => {
    const newYaml = e.target.value;
    setEditedYaml(newYaml);
    setHasChanges(newYaml !== originalYaml);
    validateYaml(newYaml);
  };

  // Reset to original YAML
  const handleReset = () => {
    setEditedYaml(originalYaml);
    setHasChanges(false);
    setValidationError(null);
    setShowDiff(false);
  };

  // Download YAML file
  const handleDownload = () => {
    const blob = new Blob([editedYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${yamlData?.cluster_name || 'cluster'}-${yamlData?.feature_type || 'config'}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate simple diff view
  const generateDiff = () => {
    const originalLines = originalYaml.split('\n');
    const editedLines = editedYaml.split('\n');
    const maxLines = Math.max(originalLines.length, editedLines.length);
    const diffLines = [];

    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i] || '';
      const editLine = editedLines[i] || '';

      if (origLine !== editLine) {
        if (origLine && !editLine) {
          diffLines.push({ type: 'removed', line: origLine, lineNum: i + 1 });
        } else if (!origLine && editLine) {
          diffLines.push({ type: 'added', line: editLine, lineNum: i + 1 });
        } else {
          diffLines.push({ type: 'removed', line: origLine, lineNum: i + 1 });
          diffLines.push({ type: 'added', line: editLine, lineNum: i + 1 });
        }
      }
    }

    return diffLines;
  };

  // Handle provision
  const handleProvision = () => {
    if (validateYaml(editedYaml)) {
      onProvision(editedYaml);
    }
  };

  if (!isOpen) return null;

  const diffLines = showDiff ? generateDiff() : [];
  const filePath = yamlData?.file_paths?.[0] || 'Generated YAML';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="h-7 w-7" />
            <div>
              <h2 className="text-xl font-bold">Review & Edit Provisioning YAML</h2>
              <p className="text-sm text-purple-100 mt-0.5">
                {yamlData?.cluster_name} • {yamlData?.feature_type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            title="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* File Path Display */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="font-medium">File Path:</span>
              <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">{filePath}</code>
            </div>
            {hasChanges && (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Modified
              </span>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
              title="Download YAML"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset to original"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={() => setShowDiff(!showDiff)}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                showDiff
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title="Show changes"
            >
              {showDiff ? 'Hide Diff' : 'Show Diff'}
            </button>
          </div>

          {/* Validation Status */}
          <div className="flex items-center gap-2">
            {validationError ? (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span className="font-medium">Invalid YAML</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="font-medium">Valid YAML</span>
              </div>
            )}
          </div>
        </div>

        {/* Validation Error Display */}
        {validationError && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Syntax Error</p>
                <p className="text-sm text-red-700 mt-1">{validationError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Editor / Diff View */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {showDiff && hasChanges ? (
            /* Diff View */
            <div className="p-4">
              <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Changes ({diffLines.length} line{diffLines.length !== 1 ? 's' : ''})
                  </h3>
                </div>
                <div className="font-mono text-sm">
                  {diffLines.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">No changes detected</div>
                  ) : (
                    diffLines.map((diff, idx) => (
                      <div
                        key={idx}
                        className={`px-4 py-1 ${
                          diff.type === 'removed'
                            ? 'bg-red-50 text-red-800'
                            : 'bg-green-50 text-green-800'
                        }`}
                      >
                        <span className="inline-block w-12 text-gray-500 text-right mr-4">
                          {diff.lineNum}
                        </span>
                        <span className="inline-block w-6 mr-2 font-bold">
                          {diff.type === 'removed' ? '-' : '+'}
                        </span>
                        <span>{diff.line}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* YAML Editor */
            <div className="p-4">
              <textarea
                ref={textareaRef}
                value={editedYaml}
                onChange={handleYamlChange}
                className="w-full h-[500px] p-4 font-mono text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                spellCheck="false"
                style={{
                  tabSize: 2,
                  lineHeight: '1.5',
                }}
              />
            </div>
          )}
        </div>

        {/* Footer with file path and actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <p>
                Saved to:{' '}
                <code className="bg-gray-100 px-2 py-0.5 rounded">
                  generated-yamls/{new Date().toISOString().split('T')[0]}/
                </code>
              </p>
              <p className="mt-1">
                File:{' '}
                <code className="bg-gray-100 px-2 py-0.5 rounded">
                  {yamlData?.cluster_name}-{yamlData?.feature_type}.yaml
                </code>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProvision}
                disabled={!!validationError}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Provision Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

YamlEditorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onProvision: PropTypes.func.isRequired,
  yamlData: PropTypes.shape({
    yaml_content: PropTypes.string,
    cluster_name: PropTypes.string,
    feature_type: PropTypes.string,
    file_paths: PropTypes.arrayOf(PropTypes.string),
  }),
};
