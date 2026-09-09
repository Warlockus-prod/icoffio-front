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
    // v10.20.0: added Content-Security-Policy. v10.20.10: FIXED the ad allowlist.
    //
    // ⚠️ Lesson (broke ads for ~1 month): "VOX SSP" is Hybrid.ai's ad product.
    // Its real domains are st.hbrd.io / ssp.hbrd.io / ssp.hybrid.ai — NOT vox.com
    // (that's Vox Media, an unrelated news company). v10.20.0 allowlisted the
    // wrong domains and the browser silently blocked the ad stack. Verified live:
    //   script:  https://st.hbrd.io/ssp.js, prebid.js, simple-ad.js
    //   connect: https://ssp.hybrid.ai/... (bid + scriptmetrics), ssp.hbrd.io/matching
    //   GA4 also connects to REGIONAL endpoints (region1.google-analytics.com) —
    //   the www-only entry blocked those too → wildcard *.google-analytics.com.
    //
    // Bidio (Prebid wrapper, web.icoffio.com test subdomain) — same lesson as
    // above: without these entries the browser silently blocks the SDK and the
    // console only says "failed to load". Verified live:
    //   script:  https://files.bidio.pl/bidio-sdk-dev.js
    //   connect: https://as.bidio.pl/o?websiteId=... (config), bid endpoints
    // Listed unconditionally so ?ads=prebid debugging works on every build.
    // They are inert on VOX deployments — PrebidManager only injects the SDK
    // when NEXT_PUBLIC_ADS_PROVIDER is prebid/both.
    // NOTE: creatives are served by DSPs on their own domains; if a winning bid
    // renders blank, check the console for the blocked host and add it here.
    //
    // 'unsafe-inline' on script-src is required by Next.js for hydration scripts.
    // 'unsafe-eval' is required by the VOX/prebid stack and react-dev-tools.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://st.hbrd.io https://*.hbrd.io https://*.hybrid.ai https://files.bidio.pl https://*.bidio.pl https://www.googletagmanager.com https://*.google-analytics.com https://pagead2.googlesyndication.com https://*.doubleclick.net https://*.googletagservices.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://st.hbrd.io https://*.hbrd.io https://*.hybrid.ai https://as.bidio.pl https://*.bidio.pl https://*.google-analytics.com https://*.doubleclick.net https://api.openai.com https://api.unsplash.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.doubleclick.net https://st.hbrd.io https://*.hbrd.io https://*.hybrid.ai https://*.bidio.pl",
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
