/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false }, // Отключаем для поддержки i18n
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'admin.icoffio.com' },
      { protocol: 'http', hostname: 'admin.icoffio.com' }, // HTTP fallback
      { protocol: 'https', hostname: 'icoffio.com' }, // Backward compatibility
      { protocol: 'https', hostname: '185.41.68.62' },
      { protocol: 'http', hostname: '185.41.68.62' }, // HTTP fallback
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ],
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