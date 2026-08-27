import { NextResponse, NextRequest } from 'next/server';

/**
 * Middleware: CSP headers on every route. When Clerk key is valid, also
 * runs Clerk auth. When invalid, app runs in demo mode.
 */

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const CLERK_KEY_REGEX = /^pk_(test|live)_[A-Za-z0-9+/=_-]{20,}$/;
const hasValidClerkKey = CLERK_KEY_REGEX.test(clerkKey);

function setSecurityHeaders(response: NextResponse) {
  const isDev = process.env.NODE_ENV !== 'production';
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://*.clerk.com https://*.clerk.accounts.dev https://js.stripe.com",
    "script-src-elem 'self' 'unsafe-inline' https://*.clerk.com https://*.clerk.accounts.dev https://js.stripe.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.com https://*.clerk.accounts.dev",
    "img-src 'self' data: blob: https://*.clerk.com https://*.clerk.accounts.dev https://images.clerk.com https://avatars.githubusercontent.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://clerk.telemetry.nextjs.com wss://*.clerk.com wss://*.clerk.accounts.dev http://localhost:4000 http://localhost:3456",
    "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://js.stripe.com https://*.clerk.services",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isDev ? '' : "upgrade-insecure-requests",
  ].filter(Boolean).join('; ');
  response.headers.set('Content-Security-Policy', cspDirectives);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

/**
 * When Clerk is valid, delegate to clerkMiddleware.
 * When not valid, just set headers (no auth).
 */
async function clerkHandler(request: NextRequest) {
  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');
  const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)', '/sign-up(.*)', '/',
    '/dashboard(.*)', '/leads(.*)', '/emails(.*)', '/settings(.*)',
  ]);
  // clerkMiddleware returns NextMiddleware when called with a handler
  const handler = (clerkMiddleware as any)(async (auth: any, req: any) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  });
  return handler(request) as Promise<NextResponse>;
}

export default async function middleware(request: NextRequest) {
  if (hasValidClerkKey) {
    try {
      const clerkResponse = await clerkHandler(request);
      setSecurityHeaders(clerkResponse);
      return clerkResponse;
    } catch (err) {
      console.warn('[Helm] Clerk middleware failed, falling back:', err);
    }
  }
  const response = NextResponse.next();
  setSecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
