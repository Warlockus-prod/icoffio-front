/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'admin.icoffio.com' },
      { protocol: 'http', hostname: 'admin.icoffio.com' },
      { protocol: 'https', hostname: 'icoffio.com' },
      { protocol: 'https', hostname: '185.41.68.62' },
      { protocol: 'http', hostname: '185.41.68.62' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ],
  },
  async rewrites() {
    return [
      { source: '/', destination: '/en' },
      { source: '/article/:slug', destination: '/en/article/:slug' },
      { source: '/category/:slug', destination: '/en/category/:slug' },
    ]
  },
};

// Only wrap with Sentry when DSN is configured (avoids build hangs without token)
let config = nextConfig;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const { withSentryConfig } = await import("@sentry/nextjs");
  config = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.SENTRY_AUTH_TOKEN,
    widenClientFileUpload: true,
    disableLogger: true,
    hideSourceMaps: true,
  });
}

export default config;
