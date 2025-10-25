'use client'

import { useState } from 'react';
import { trackNewsletterSignup } from './Analytics';
import { useToast } from './ToastNotification';

interface NewsletterProps {
  locale: string;
}

const translations = {
  en: {
    title: "Stay Updated",
    description: "Get the latest tech news and insights delivered to your inbox",
    placeholder: "Enter your email address",
    button: "Subscribe",
    subscribing: "Subscribing...",
    success: "Thanks for subscribing!",
    error: "Please enter a valid email address",
    privacy: "We respect your privacy and won't spam you",
    emptyField: "Email field cannot be empty",
    networkError: "Something went wrong. Please try again."
  },
  pl: {
    title: "Bądź na bieżąco",
    description: "Otrzymuj najnowsze wiadomości technologiczne i spostrzeżenia na swoją skrzynkę",
    placeholder: "Wpisz swój adres email",
    button: "Subskrybuj",
    subscribing: "Subskrybowanie...",
    success: "Dziękujemy za subskrypcję!",
    error: "Wprowadź prawidłowy adres email",
    privacy: "Szanujemy Twoją prywatność i nie będziemy spamować",
    emptyField: "Pole e-mail nie może być puste",
    networkError: "Coś poszło nie tak. Spróbuj ponownie."
  }
};

export function Newsletter({ locale }: NewsletterProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { showToast } = useToast();

  const t = translations[locale as keyof typeof translations] || translations.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous messages
    setMessage('');
    
    // Trim whitespace
    const trimmedEmail = email.trim();
    
    // Check if email is empty
    if (!trimmedEmail) {
      setStatus('error');
      setMessage(t.emptyField);
      return;
    }
    
    // Enhanced email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(trimmedEmail)) {
      setStatus('error');
      setMessage(t.error);
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      // Simulate newsletter signup (replace with real API call)
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate random success/failure for demo
          if (Math.random() > 0.9) {
            reject(new Error('Network error'));
          } else {
            resolve(true);
          }
        }, 1000);
      });
      
      // Track the signup
      trackNewsletterSignup(trimmedEmail);
      
      setStatus('success');
      setMessage(t.success);
      setEmail('');
      
      // Show toast notification
      showToast(t.success, 'success');
      
      // Reset status after 5 seconds (increased for better UX)
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
      
    } catch (error) {
      setStatus('error');
      setMessage(t.networkError);
      
      // Show toast notification
      showToast(t.networkError, 'error');
      
      // Reset error status after 5 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
      <div className="max-w-md">
        <h3 className="text-xl font-bold mb-2">{t.title}</h3>
        <p className="text-blue-100 mb-4 text-sm">{t.description}</p>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.placeholder}
              disabled={status === 'loading'}
              className={`w-full px-4 py-3 rounded-lg backdrop-blur-sm text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 transition-colors ${
                status === 'error' 
                  ? 'bg-red-500/20 border border-red-300 focus:ring-red-300' 
                  : status === 'success'
                  ? 'bg-green-500/20 border border-green-300 focus:ring-green-300'
                  : 'bg-white/10 border border-white/20 focus:ring-white/50'
              }`}
            />
            
            {/* Success icon */}
            {status === 'success' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            
            {/* Error icon */}
            {status === 'error' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="w-full px-4 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t.subscribing}
              </>
            ) : (
              <>
                {t.button}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </>
            )}
          </button>
          
          {message && (
            <p className={`text-sm ${
              status === 'success' 
                ? 'text-green-200' 
                : status === 'error' 
                ? 'text-red-200' 
                : 'text-white/70'
            }`}>
              {message}
            </p>
          )}
        </form>
        
        <p className="text-xs text-blue-200 mt-3">{t.privacy}</p>
      </div>
    </div>
  );
}





