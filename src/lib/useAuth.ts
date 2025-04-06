import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCookie } from 'cookies-next';

export interface AuthUser {
  id: number;
  username: string;
  isAdmin: boolean;
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
      // Check if user is authenticated using cookie
      const authCookie = getCookie('auth') as string | undefined;
      
      if (!authCookie) {
        // Redirect to login if not authenticated
        router.push(redirectTo);
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
      } else {
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
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [redirectTo, router]);

  return { isAuthenticated, user, isAdmin: user?.isAdmin || false, isLoading };
}