/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false }, // Отключаем для поддержки i18n
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'icoffio.com' },
      { protocol: 'https', hostname: '185.41.68.62' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ],
  },
  async redirects() {
    return [
      // Редирект с icoffio.com на www.icoffio.com
      {
        source: '/(.*)',
        has: [
          {
            type: 'host',
            value: 'icoffio.com',
          },
        ],
        destination: 'https://www.icoffio.com/:path*',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/en',
      },
      {
        source: '/article/:slug',
        destination: '/en/article/:slug',
      },
      {
        source: '/category/:slug',
        destination: '/en/category/:slug',
      },
    ]
  },
};
export default nextConfig;