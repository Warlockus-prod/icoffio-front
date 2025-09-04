'use client'

import { useEffect } from 'react'

interface DisplayAdProps {
  placeId: string
  format: '728x90' | '300x250' | '300x600' | '970x250'
  position?: string
  className?: string
}

const AD_CONFIG = {
  '728x90': {
    name: 'Leaderboard',
    width: 728,
    height: 90,
    description: 'Banner horizontal'
  },
  '300x250': {
    name: 'Medium Rectangle', 
    width: 300,
    height: 250,
    description: 'Bloque lateral/contenido'
  },
  '300x600': {
    name: 'Large Skyscraper',
    width: 300, 
    height: 600,
    description: 'Skyscraper lateral'
  },
  '970x250': {
    name: 'Large Leaderboard',
    width: 970,
    height: 250, 
    description: 'Banner ancho grande'
  }
}

export function DisplayAd({ placeId, format, position, className = '' }: DisplayAdProps) {
  const config = AD_CONFIG[format]
  
  useEffect(() => {
    // Инициализируем только если VOX уже загружен глобально
    if (typeof window !== 'undefined' && window._tx) {
      // Небольшая задержка для загрузки DOM
      const timer = setTimeout(() => {
        if (window._tx && window._tx.init) {
          window._tx.init()
        }
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div className={`my-8 flex flex-col items-center ${className}`}>
      {/* Ad Container */}
      <div className="relative">
        <div 
          data-hyb-ssp-ad-place={placeId}
          style={{
            width: `${config.width}px`,
            height: `${config.height}px`,
            maxWidth: '100%',
          }}
          className="border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 text-sm"
        >
          {/* Placeholder Content - показывается пока нет рекламы */}
          <div className="text-center p-4">
            <div className="font-semibold mb-1">Ad Placement</div>
            <div className="text-xs opacity-75">
              {config.name} • {format}
            </div>
            <div className="text-xs opacity-60 mt-1">
              {config.description}
            </div>
            {position && (
              <div className="text-xs opacity-50 mt-2 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                {position}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
