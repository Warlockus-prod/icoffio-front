/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false }, // Отключаем для поддержки i18n
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'icoffio.com' },
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
