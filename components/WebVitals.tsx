'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log('📊 Web Vitals:', metric)
    
    // Можно отправлять в аналитику (Google Analytics, Yandex.Metrica и т.д.)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      })
    }
  })

  return null
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}
