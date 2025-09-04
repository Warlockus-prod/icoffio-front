'use client'

import { useEffect } from 'react'

interface InlineAdProps {
  placeId: string
  format: '728x90' | '970x250'
  className?: string
}

const INLINE_AD_CONFIG = {
  '728x90': {
    name: 'Leaderboard',
    width: 728,
    height: 90,
    description: 'Встроенный баннер'
  },
  '970x250': {
    name: 'Large Leaderboard', 
    width: 970,
    height: 250,
    description: 'Широкий баннер'
  }
}

export function InlineAd({ placeId, format, className = '' }: InlineAdProps) {
  const config = INLINE_AD_CONFIG[format]
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window._tx) {
      const timer = setTimeout(() => {
        if (window._tx && window._tx.init) {
          window._tx.init()
        }
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div className={`my-6 w-full ${className}`}>
      {/* Inline Banner Ad */}
      <div className="flex justify-center">
        <div 
          data-hyb-ssp-ad-place={placeId}
          style={{
            width: `${config.width}px`,
            height: `${config.height}px`,
            maxWidth: '100%',
            minHeight: '90px',
          }}
          className="border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 relative"
        >
          <div className="text-center p-3">
            <div className="text-sm font-bold mb-1">📺 INLINE AD</div>
            <div className="text-xs font-semibold mb-1">{config.name}</div>
            <div className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
              {format}
            </div>
          </div>
          
          <div className="absolute top-1 left-1 text-xs bg-blue-500 text-white px-1 rounded">
            VOX
          </div>
          <div className="absolute top-1 right-1 text-xs bg-gray-500 text-white px-1 rounded">
            INLINE
          </div>
        </div>
      </div>
    </div>
  )
}
