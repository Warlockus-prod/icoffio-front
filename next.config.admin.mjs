/** @type {import('next').NextConfig} */

// Конфигурация для админ панели на app.icoffio.com
const nextConfig = {
  // Базовый путь для админки
  basePath: '/admin',
  
  // Переключение между режимами
  env: {
    ADMIN_MODE: 'true',
    NEXT_PUBLIC_ADMIN_MODE: 'true'
  },

  // Настройки для продакшена
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Переписывание маршрутов для админки
  async rewrites() {
    return [
      // API маршруты
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
      // Админ маршруты
      {
        source: '/admin/:path*',
        destination: '/:path*',
      },
      // Главная страница админки
      {
        source: '/',
        destination: '/ru/admin',
      }
    ];
  },

  // Редиректы для безопасности
  async redirects() {
    return [
      // Редирект с корня на админ панель
      {
        source: '/',
        destination: '/ru/admin',
        permanent: false,
      },
      // Блокируем доступ к обычным страницам сайта
      {
        source: '/ru/((?!admin).*)',
        destination: '/ru/admin',
        permanent: false,
      },
      {
        source: '/(en|pl|de|ro|cs)/((?!admin).*)',
        destination: '/ru/admin',
        permanent: false,
      }
    ];
  },

  // Заголовки безопасности
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          }
        ],
      },
    ];
  },

  // Настройки изображений
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
      }
    ],
  },

  // Экспериментальные функции
  experimental: {
    serverActions: {
      allowedOrigins: ['app.icoffio.com', 'localhost:3000'],
    },
  },

  // Webpack конфигурация
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;


