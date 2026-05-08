/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    // v10.6.1: keep `isomorphic-dompurify` (and its transitive deps `dompurify`, `jsdom`)
    // as external CommonJS modules at runtime. Next.js bundler does not pick up jsdom's
    // default-stylesheet.css asset, which causes "ENOENT default-stylesheet.css" during
    // page-data collection for routes that import the sanitizer (e.g. /[locale]/article/[slug]).
    serverComponentsExternalPackages: ['isomorphic-dompurify', 'dompurify', 'jsdom'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'admin.icoffio.com' },
      { protocol: 'http', hostname: 'admin.icoffio.com' },
      { protocol: 'https', hostname: 'icoffio.com' },
      { protocol: 'https', hostname: 'web.icoffio.com' },
      { protocol: 'https', hostname: '185.41.68.62' },
      { protocol: 'http', hostname: '185.41.68.62' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // v10.7.0: Vercel Blob (DALL-E persisted images), DALL-E direct, common AI image hosts
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'oaidalleapiprodscus.blob.core.windows.net' },
    ],
  },
  async rewrites() {
    return [
      { source: '/', destination: '/en' },
      { source: '/article/:slug', destination: '/en/article/:slug' },
      { source: '/category/:slug', destination: '/en/category/:slug' },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          { key: 'Strict-Transport-Security', value: 'max-age=15552000' },
        ],
      },
    ];
  },
};

export default nextConfig;
