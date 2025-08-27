'use client'

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Type for gtag function
type GtagFunction = (
  command: string,
  targetId: string,
  config?: {
    page_path?: string;
    [key: string]: any;
  }
) => void;

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag?: GtagFunction;
    dataLayer?: any[];
  }
}

interface AnalyticsProps {
  gaId?: string;
}

export function Analytics({ gaId }: AnalyticsProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Only load analytics in production and if GA ID is provided
    if (process.env.NODE_ENV !== 'production' || !gaId) {
      console.log('Analytics: Skipping in development or missing GA ID');
      return;
    }

    // Load Google Analytics script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script1);

    // Initialize gtag
    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', {
        page_path: window.location.pathname,
        cookie_flags: 'max-age=7200;secure;samesite=none'
      });
    `;
    document.head.appendChild(script2);

    return () => {
      // Clean up scripts on unmount
      if (script1.parentNode) script1.parentNode.removeChild(script1);
      if (script2.parentNode) script2.parentNode.removeChild(script2);
    };
  }, [gaId]);

  // Track page views on route change
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && gaId && typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', gaId, {
        page_path: pathname,
      });
    }
  }, [pathname, gaId]);

  return null;
}

// Helper functions for tracking events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

export const trackSearch = (searchTerm: string) => {
  trackEvent('search', 'engagement', searchTerm);
};

export const trackArticleView = (articleTitle: string, category: string) => {
  trackEvent('view_article', 'content', articleTitle);
  trackEvent('view_content', 'engagement', category);
};

export const trackNewsletterSignup = (email?: string) => {
  trackEvent('newsletter_signup', 'engagement', email ? 'with_email' : 'anonymous');
};

export const trackSocialShare = (platform: string, articleTitle?: string) => {
  trackEvent('share', 'social', `${platform}_${articleTitle || 'unknown'}`);
};
