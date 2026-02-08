import { withSentryConfig } from "@sentry/nextjs";

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

export default withSentryConfig(nextConfig, {
  // Sentry options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Suppress source map upload warnings when SENTRY_AUTH_TOKEN is not set
  silent: !process.env.SENTRY_AUTH_TOKEN,
  
  // Upload source maps for better stack traces (only when token available)
  widenClientFileUpload: true,
  
  // Disable Sentry telemetry
  disableLogger: true,
  
  // Don't create .sentryclirc
  hideSourceMaps: true,
});