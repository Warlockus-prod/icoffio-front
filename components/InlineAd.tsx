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
    <div className={`my-6 w-full ${className}`}>
      {/* Inline Banner Ad - Пустой контейнер для VOX */}
      <div className="flex justify-center">
        <div 
          data-hyb-ssp-ad-place={placeId}
          style={{
            width: `${config.width}px`,
            height: `${config.height}px`,
            maxWidth: '100%',
            minHeight: `${config.height}px`,
            display: 'block',
          }}
          className="bg-gray-100 dark:bg-gray-800"
        >
          {/* Пустой контейнер - VOX заполнит рекламой */}
        </div>
      </div>
    </div>
  )
}
