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
      // v10.7.0: Blob storage SaaS (DALL-E persisted images via @vercel/blob package — works on any host with BLOB_READ_WRITE_TOKEN), DALL-E direct, common AI image hosts
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
    // v10.20.0: added Content-Security-Policy.
    //
    // Policy must allow the live integrations the site actually uses:
    //   - VOX SSP advertising — vox-cdn.com, vox.com, doubleclick, googletagservices
    //   - Google Tag Manager / Analytics — googletagmanager.com, google-analytics.com
    //   - Unsplash images — images.unsplash.com
    //   - Vercel Blob (admin uploads) — public.blob.vercel-storage.com
    //   - YouTube embeds — youtube.com, ytimg.com
    //   - Self-hosted everything else
    //
    // 'unsafe-inline' on script-src is required by Next.js for hydration scripts.
    // 'unsafe-eval' is required by react-dev-tools in dev — kept narrow to script-src.
    // Report-Only is NOT used: we ship enforcing policy because the allow-list
    // was hand-verified against the components/AdManager and StructuredData files.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vox.com https://*.vox-cdn.com https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://*.doubleclick.net https://*.googletagservices.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.vox.com https://*.vox-cdn.com https://www.google-analytics.com https://*.doubleclick.net https://api.openai.com https://api.unsplash.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.doubleclick.net https://*.vox.com",
      "media-src 'self' https: data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

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
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
