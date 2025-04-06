import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCookie } from 'cookies-next';

export interface AuthUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

// Helper function to resolve value regardless if it's a promise or direct value
async function resolveValue<T>(value: T | Promise<T>): Promise<T> {
  return value instanceof Promise ? await value : value;
}

export default function useAuth(redirectTo: string = '/login') {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Skip auth check for login page to avoid redirect loops
    if (router.pathname === '/login' || router.pathname === '/setup') {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        // Check if user is authenticated using cookie
        const authCookieRaw = getCookie('auth');
        if (!authCookieRaw) {
          // Redirect to login if not authenticated
          router.push(redirectTo);
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        // Ensure we handle both Promise and direct return values
        const authCookie = await resolveValue(authCookieRaw as string | Promise<string>);
        if (!authCookie) {
          router.push(redirectTo);
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        try {
          // Try to parse as JSON first (new format)
          const userData = JSON.parse(authCookie) as AuthUser;
          setUser(userData);
          setIsAuthenticated(true);
        } catch {
          // Fall back to old format (just username string)
          setUser({
            username: authCookie,
            isAdmin: authCookie === 'user', // Default 'user' was admin in old system
            id: -1 // Placeholder for old format
          });
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push(redirectTo);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [redirectTo, router]);

  return { isAuthenticated, user, isAdmin: user?.isAdmin || false, isLoading };
}