'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // 1. Google Analytics (existing)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      })
    }

    // 2. v10.8.0: self-hosted beacon → web_vitals table → admin dashboard
    if (typeof window === 'undefined' || !navigator.onLine) return
    try {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.name === 'CLS' ? metric.value * 1000 : metric.value,
        id: metric.id,
        rating: (metric as any).rating ?? null,
        path: window.location.pathname,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        connection: (navigator as any).connection?.effectiveType ?? null,
      })
      // Use sendBeacon if available (survives page unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/web-vitals', new Blob([body], { type: 'application/json' }))
      } else {
        fetch('/api/analytics/web-vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {
      // never break page render
    }
  })

  return null
}


