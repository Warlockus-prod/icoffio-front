'use client'

import { useState, useEffect } from 'react';

interface TelegramWidget {
  openTelegram: () => void;
  isConnected: boolean;
}

export function TelegramBot() {
  const [isVisible, setIsVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Show widget after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const openTelegram = () => {
    // ICOFFIO Bot Telegram link
    const botLink = 'https://t.me/icoffio_bot'; // Замените на ваш бот
    window.open(botLink, '_blank');
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Telegram Bot Widget */}
      <div className={`
        bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4 max-w-sm
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}>
        <div className="flex items-start gap-3">
          {/* Bot Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
          
          {/* Bot Message */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-neutral-900 mb-1">
              🤖 ICOFFIO Bot
            </div>
            <div className="text-xs text-neutral-600 leading-relaxed">
              Привет! Я могу помочь тебе:
              <br />
              📝 Создать статью для сайта
              <br />
              📊 Получить статистику
              <br />
              🔄 Управлять контентом
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={openTelegram}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                Открыть бота
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xs px-2 py-1.5 transition-colors"
              >
                Скрыть
              </button>
            </div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors p-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-100">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-orange-400'
          }`} />
          <span className="text-xs text-neutral-500">
            {isConnected ? 'Подключен' : 'Доступен 24/7'}
          </span>
        </div>
      </div>
      
      {/* Floating Telegram Button (alternative view) */}
      {!isVisible && (
        <button
          onClick={openTelegram}
          className="bg-blue-500 hover:bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
          title="Открыть ICOFFIO Bot"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </button>
      )}
    </div>
  );
}
