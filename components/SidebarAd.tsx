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
      {/* Sidebar Ad */}
      <div 
        data-hyb-ssp-ad-place={placeId}
        style={{
          width: `${config.width}px`,
          height: `${config.height}px`,
        }}
        className="border-2 border-dashed border-green-400 bg-green-50 dark:bg-green-900/20 flex flex-col items-center justify-center text-green-600 dark:text-green-400 relative"
      >
        <div className="text-center p-4">
          <div className="text-sm font-bold mb-1">📋 SIDEBAR AD</div>
          <div className="text-xs font-semibold mb-1">{config.name}</div>
          <div className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded mb-1">
            {format}
          </div>
          <div className="text-xs">{config.description}</div>
          {position && (
            <div className="text-xs mt-2 bg-green-500 text-white px-2 py-1 rounded">
              {position}
            </div>
          )}
        </div>
        
        <div className="absolute top-1 left-1 text-xs bg-green-500 text-white px-1 rounded">
          VOX
        </div>
        <div className="absolute top-1 right-1 text-xs bg-gray-500 text-white px-1 rounded">
          SIDE
        </div>
      </div>
    </div>
  )
}
