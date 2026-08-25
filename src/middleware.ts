// FILE: src/middleware.ts
// Place this file at: src/middleware.ts  (next to your app folder)
// This runs on EVERY request before the page renders — on the edge, not the browser
//
// Rules:
//   1. Not logged in + trying to access /dashboard, /rota etc → redirect to /login
//   2. Already logged in + trying to visit /login              → redirect to /dashboard
//   3. Everything else passes through unchanged

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Which paths require authentication ───────────────────────────────────────
// Any path starting with these prefixes is protected
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/rota',
  '/tasks',
  '/staff',
  '/attendance',
  '/leave',
  '/airlines',
  '/operations',
  '/geofence',
  '/anomalies',
  '/notifications',
  '/reports',
  '/settings',
  '/shifts',
];

// ── Which paths are only for guests (redirect away if logged in) ──────────────
const GUEST_ONLY = ['/login'];

// ── The cookie / localStorage key that holds the JWT ─────────────────────────
// Must match what your api.ts writes — we check the cookie here (edge-safe)
// Your api.ts uses localStorage — we also set a cookie on login so middleware can read it
const TOKEN_COOKIE = 'airtrack_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read token from cookie (edge-compatible — localStorage is not available here)
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isLoggedIn = !!token;

  // ── Rule 1: Redirect unauthenticated users away from protected pages ─────
  const isProtected = PROTECTED_PREFIXES.some(prefix =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    // Remember where they were trying to go so we can redirect back after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Rule 2: Redirect logged-in users away from /login ────────────────────
  const isGuestOnly = GUEST_ONLY.some(path => pathname.startsWith(path));

  if (isGuestOnly && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── Rule 3: Redirect root / to dashboard or login ────────────────────────
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(isLoggedIn ? '/dashboard' : '/login', request.url)
    );
  }

  return NextResponse.next();
}

// ── Which paths this middleware runs on ──────────────────────────────────────
// Exclude static files, images, Next internals — only run on real page routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|images|fonts|api).*)',
  ],
};