/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@helm/shared'],
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

// Only wrap with Sentry if DSN is configured
if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const { withSentryConfig } = require('@sentry/nextjs');
  module.exports = withSentryConfig(nextConfig, {
    silent: !process.env.CI,
    widenClientFileUpload: true,
    tunnelRoute: '/api/sentry',
    hideSourceMaps: true,
    disableLogger: true,
  });
} else {
  module.exports = nextConfig;
}
