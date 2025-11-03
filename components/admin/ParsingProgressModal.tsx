'use client';

import { useEffect, useState } from 'react';

interface ParsingProgressModalProps {
  isOpen: boolean;
  currentStep: 1 | 2 | 3 | 4;
  articleTitle?: string;
}

interface Step {
  id: number;
  label: string;
  icon: string;
  estimatedTime: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'Parsing content from URL', icon: '🌐', estimatedTime: '5-8s' },
  { id: 2, label: 'Translating to Polish', icon: '🌍', estimatedTime: '8-12s' },
  { id: 3, label: 'Generating featured image', icon: '🎨', estimatedTime: '3-5s' },
  { id: 4, label: 'Finalizing article', icon: '✨', estimatedTime: '2-3s' }
];

export default function ParsingProgressModal({ isOpen, currentStep, articleTitle }: ParsingProgressModalProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const totalProgress = (currentStep / 4) * 100;
  const estimatedTotal = '18-28 seconds';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-pulse">📄</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Processing Article
          </h2>
          {articleTitle && (
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {articleTitle.substring(0, 60)}...
            </p>
          )}
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-8">
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
        <div className="space-y-4 mb-8">
          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const isPending = step.id > currentStep;

            return (
              <div 
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' 
                    : isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }`}
              >
                {/* Icon */}
                <div className={`text-3xl ${isActive ? 'animate-bounce' : ''}`}>
                  {isCompleted ? '✅' : step.icon}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${
                      isActive 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : isCompleted
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Step {step.id}/4: {step.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {step.estimatedTime}
                    </span>
                  </div>
                  
                  {/* Step Progress Bar */}
                  {isActive && (
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-blue-500 animate-pulse w-3/4 rounded-full" />
                    </div>
                  )}
                </div>

                {/* Status Icon */}
                <div className="text-2xl">
                  {isCompleted ? '✓' : isActive ? '⏳' : '○'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>⏱️</span>
              <span>Elapsed: {elapsedTime}s</span>
            </div>
            <div className="flex items-center gap-2">
              <span>⏳</span>
              <span>Est. Total: {estimatedTotal}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Please wait while we process your article with AI...
          </p>
        </div>
      </div>
    </div>
  );
}

