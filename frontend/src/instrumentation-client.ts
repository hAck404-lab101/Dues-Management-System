import * as Sentry from '@sentry/nextjs';

const tracePropagationTargets: Array<string | RegExp> = ['localhost', /^\//];
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (configuredApiUrl) {
  tracePropagationTargets.push(configuredApiUrl);
} else if (process.env.NODE_ENV === 'production') {
  tracePropagationTargets.push('dues-management-system-production.up.railway.app');
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  tracePropagationTargets,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
