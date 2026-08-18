/** @type {import('next').NextConfig} */

const { withSentryConfig } = require('@sentry/nextjs');

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://dues-management-system-production.up.railway.app/api';

const nextConfig = {
  reactStrictMode: true,

  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  images: {
    domains: [
      'localhost',
      'dues-management-system-production.up.railway.app',
      'uewdept.org',
      'www.uewdept.org'
    ],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
});
