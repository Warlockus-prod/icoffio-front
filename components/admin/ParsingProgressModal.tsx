'use client';

import { useEffect, useState } from 'react';

interface ParsingProgressModalProps {
  isOpen: boolean;
  currentStep: 1 | 2 | 3 | 4;
  articleTitle?: string;
  onClose?: () => void; // NEW: Allow manual close
  isMinimized?: boolean; // NEW: Minimized state
  onToggleMinimize?: () => void; // NEW: Toggle minimize
}

interface Step {
  id: number;
  label: string;
  icon: string;
  estimatedTime: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'Parsing content from URL', icon: '🌐', estimatedTime: '10-15s' },
  { id: 2, label: 'Translating to EN & PL', icon: '🌍', estimatedTime: '15-25s' },
  { id: 3, label: 'Generating featured image', icon: '🎨', estimatedTime: '8-12s' },
  { id: 4, label: 'Finalizing article', icon: '✨', estimatedTime: '3-5s' }
];

export default function ParsingProgressModal({ 
  isOpen, 
  currentStep, 
  articleTitle,
  onClose,
  isMinimized = false,
  onToggleMinimize 
}: ParsingProgressModalProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [localMinimized, setLocalMinimized] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      setLocalMinimized(false);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const totalProgress = (currentStep / 4) * 100;
  const estimatedTotal = '36-57 seconds';
  const minimized = isMinimized || localMinimized;

  return (
    <div className="fixed bottom-6 right-6 z-50 transition-all duration-300">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-blue-500 transition-all duration-300 ${
        minimized ? 'w-80' : 'w-[500px]'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${
          minimized ? 'pb-4' : ''
        }`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-3xl animate-pulse">📄</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Processing Article
              </h3>
              {!minimized && articleTitle && (
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {articleTitle}
                </p>
              )}
              {minimized && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Step {currentStep}/4 • {Math.round(totalProgress)}%
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setLocalMinimized(!localMinimized);
                onToggleMinimize?.();
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title={minimized ? "Expand" : "Minimize"}
            >
              {minimized ? '⬆️' : '⬇️'}
            </button>
          </div>
        </div>

        {minimized && (
          <div className="p-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        )}

        {!minimized && (
          <div className="p-6 space-y-6">{/* Content wrapper */}

            {/* Overall Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(totalProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const isPending = step.id > currentStep;

            return (
              <div 
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' 
                    : isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }`}
              >
                {/* Icon */}
                <div className={`text-2xl ${isActive ? 'animate-bounce' : ''}`}>
                  {isCompleted ? '✅' : step.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium truncate ${
                      isActive 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : isCompleted
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.id}. {step.label}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {step.estimatedTime}
                    </span>
                  </div>
                  
                  {/* Step Progress Bar */}
                  {isActive && (
                    <div className="mt-1.5 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1 overflow-hidden">
                      <div className="h-full bg-blue-500 animate-pulse w-3/4 rounded-full" />
                    </div>
                  )}
                </div>

                {/* Status Icon */}
                <div className="text-lg">
                  {isCompleted ? '✓' : isActive ? '⏳' : '○'}
                </div>
              </div>
            );
          })}
            </div>

            {/* Footer Info */}
            <div className="text-center space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span>{elapsedTime}s</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>⏳</span>
                  <span>{estimatedTotal}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                💡 You can continue adding more URLs while processing
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

