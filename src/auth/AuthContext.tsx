import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { handleCallback, refreshAccessToken, logout as oauthLogout } from './google-oauth';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  logout: () => void;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState>({
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  logout: () => {},
  refreshToken: async () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

function getStoredToken(key: string): string | null {
  const fromLocal = localStorage.getItem(key);
  if (fromLocal) return fromLocal;
  const fromSession = sessionStorage.getItem(key);
  if (fromSession) {
    localStorage.setItem(key, fromSession);
    sessionStorage.removeItem(key);
    return fromSession;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    const token = getStoredToken('access_token');
    const expiry = getStoredToken('token_expiry');
    if (token && expiry && Number(expiry) > Date.now() + 60_000) {
      return token;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const url = new URL(window.location.href);
    if (url.searchParams.has('code') || url.searchParams.has('error')) return true;
    const token = getStoredToken('access_token');
    const expiry = getStoredToken('token_expiry');
    if (token && expiry && Number(expiry) > Date.now() + 60_000) {
      return false;
    }
    if (getStoredToken('refresh_token')) {
      return true;
    }
    return false;
  });

  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doRefresh = useCallback(async (token: string): Promise<string | null> => {
    try {
      const tokens = await refreshAccessToken(token);
      setAccessToken(tokens.access_token);
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('token_expiry', String(Date.now() + tokens.expires_in * 1000));
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }
      // Schedule next refresh 5 min before expiry
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      const refreshMs = Math.max((tokens.expires_in - 300) * 1000, 10000);
      const rt = tokens.refresh_token || token;
      refreshTimerRef.current = setTimeout(() => { doRefresh(rt); }, refreshMs);
      return tokens.access_token;
    } catch {
      setError('Session expired. Please log in again.');
      setAccessToken(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expiry');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('token_expiry');
      return null;
    }
  }, []);

  // Expose a refresh function for the API client to call on 401
  const refreshTokenFn = useCallback(async (): Promise<string | null> => {
    const rt = getStoredToken('refresh_token');
    if (!rt) return null;
    return doRefresh(rt);
  }, [doRefresh]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const errorParam = url.searchParams.get('error');

    if (errorParam) {
      setError(`OAuth error: ${errorParam}`);
      setIsLoading(false);
      window.history.replaceState({}, '', '/');
      return;
    }

    if (code) {
      handleCallback(code)
        .then((tokens) => {
          setAccessToken(tokens.access_token);
          localStorage.setItem('access_token', tokens.access_token);
          localStorage.setItem('token_expiry', String(Date.now() + tokens.expires_in * 1000));
          if (tokens.refresh_token) {
            localStorage.setItem('refresh_token', tokens.refresh_token);
            const refreshMs = Math.max((tokens.expires_in - 300) * 1000, 10000);
            refreshTimerRef.current = setTimeout(() => { doRefresh(tokens.refresh_token!); }, refreshMs);
          }
          window.history.replaceState({}, '', '/');
        })
        .catch((err) => {
          setError(err.message);
          window.history.replaceState({}, '', '/');
        })
        .finally(() => {
          setIsLoading(false);
        });
      return;
    }

    // Existing session
    const storedAccessToken = getStoredToken('access_token');
    const storedExpiry = getStoredToken('token_expiry');
    const storedRefreshToken = getStoredToken('refresh_token');

    const isTokenValid = storedAccessToken && storedExpiry && Number(storedExpiry) > Date.now() + 60_000;

    if (isTokenValid) {
      setAccessToken(storedAccessToken);
      setIsLoading(false);
      if (storedRefreshToken) {
        const msUntilRefresh = Math.max(Number(storedExpiry) - Date.now() - 300_000, 10_000);
        refreshTimerRef.current = setTimeout(() => {
          doRefresh(storedRefreshToken);
        }, msUntilRefresh);
      }
    } else if (storedRefreshToken) {
      doRefresh(storedRefreshToken).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [doRefresh]);

  const logout = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setAccessToken(null);
    oauthLogout();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        error,
        logout,
        refreshToken: refreshTokenFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
