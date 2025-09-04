'use client'

import { useEffect } from 'react'

interface SidebarAdProps {
  placeId: string
  format: '300x250' | '300x600'
  position?: string
  className?: string
}

const SIDEBAR_AD_CONFIG = {
  '300x250': {
    name: 'Medium Rectangle',
    width: 300,
    height: 250,
    description: 'Сайдбар баннер'
  },
  '300x600': {
    name: 'Large Skyscraper',
    width: 300, 
    height: 600,
    description: 'Высокий сайдбар'
  }
}

export function SidebarAd({ placeId, format, position, className = '' }: SidebarAdProps) {
  const config = SIDEBAR_AD_CONFIG[format]
  
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any)._tx) {
      const timer = setTimeout(() => {
        if ((window as any)._tx && (window as any)._tx.init) {
          (window as any)._tx.init()
        }
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div className={`mb-6 ${className}`}>
      {/* Sidebar Ad - Пустой контейнер для VOX */}
      <div 
        data-hyb-ssp-ad-place={placeId}
        style={{
          width: `${config.width}px`,
          height: `${config.height}px`,
          minHeight: `${config.height}px`,
          display: 'block',
        }}
        className="bg-gray-100 dark:bg-gray-800"
      >
        {/* Пустой контейнер - VOX заполнит рекламой */}
      </div>
    </div>
  )
}
