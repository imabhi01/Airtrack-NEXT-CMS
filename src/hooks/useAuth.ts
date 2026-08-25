// FILE: src/hooks/useAuth.ts
// Client-side auth hook — use in components that need to know who is logged in
// For PAGE protection use middleware.ts instead (faster, no flash)

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getUser, getToken, isLoggedIn, isTokenExpired,
  getUserRole, hasRole, hasAnyRole, logout,
} from '@/lib/auth';

interface AuthState {
  user:       any | null;
  token:      string | null;
  role:       string | null;
  loading:    boolean;
  loggedIn:   boolean;
}

// Basic auth state — use in components that display user info
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user:    null,
    token:   null,
    role:    null,
    loading: true,
    loggedIn:false,
  });

  useEffect(() => {
    const token   = getToken();
    const expired = isTokenExpired();

    if (!token || expired) {
      if (token && expired) logout(); // clear stale token
      setState({ user: null, token: null, role: null, loading: false, loggedIn: false });
      return;
    }

    setState({
      user:    getUser(),
      token,
      role:    getUserRole(),
      loading: false,
      loggedIn:true,
    });
  }, []);

  return state;
}

// Use this in a page if you want an extra client-side guard on top of middleware
// Middleware is the primary guard — this is a backup for dynamic role checks
export function useRequireAuth(requiredRoles?: string[]) {
  const router = useRouter();
  const auth   = useAuth();

  useEffect(() => {
    if (auth.loading) return;

    if (!auth.loggedIn) {
      router.replace('/login');
      return;
    }

    if (requiredRoles && !hasAnyRole(requiredRoles)) {
      // Logged in but wrong role — redirect to dashboard
      router.replace('/dashboard');
    }
  }, [auth.loading, auth.loggedIn, router]);

  return auth;
}

// Convenience re-exports
export { hasRole, hasAnyRole, logout };