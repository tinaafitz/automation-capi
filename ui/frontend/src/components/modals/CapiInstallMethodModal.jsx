import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

const CapiInstallMethodModal = ({ isOpen, onClose, onMethodSelected, currentMethod }) => {
  const [selectedMethod, setSelectedMethod] = useState(currentMethod || 'clusterctl');
  const [rememberChoice, setRememberChoice] = useState(false);

  useEffect(() => {
    if (currentMethod) {
      setSelectedMethod(currentMethod);
    }
  }, [currentMethod]);

  const handleContinue = () => {
    onMethodSelected(selectedMethod, rememberChoice);
    onClose();
  };

  if (!isOpen) return null;

  const methods = [
    {
      id: 'clusterctl',
      name: 'Cluster API',
      icon: '⚡'
    },
    {
      id: 'helm',
      name: 'Helm Charts',
      icon: '📦'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">Choose Installation Method</h2>
            <p className="text-sm text-purple-100">Select how to install CAPI</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          {methods.map((method) => (
            <div
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                selectedMethod === method.id
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">{method.icon}</div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900">{method.name}</h3>
                </div>
                {selectedMethod === method.id && (
                  <CheckIcon className="h-6 w-6 text-purple-600" />
                )}
              </div>
            </div>
          ))}

          {/* Remember Choice */}
          <div className="pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Remember my choice</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:from-purple-700 hover:to-violet-700 transition-all font-medium shadow-md hover:shadow-lg"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

CapiInstallMethodModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onMethodSelected: PropTypes.func.isRequired,
  currentMethod: PropTypes.string,
};

export default CapiInstallMethodModal;
