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
      try {
        // Check for auth_status cookie first (the non-httpOnly one)
        const authStatus = getCookie('auth_status');
        
        // If no auth status cookie, we're definitely not authenticated
        if (!authStatus) {
          router.push(redirectTo);
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Make API call to verify authentication and get user data
        // The server will check the httpOnly auth_token cookie
        try {
          const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            console.error('useAuth: Verify API returned non-OK status', response.status);
            throw new Error('Failed to verify user');
          }
          
          const data = await response.json();
          
          if (!data.authenticated) {
            console.warn('useAuth: Server reports not authenticated, redirecting to login');
            router.push(redirectTo);
            setIsAuthenticated(false);
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          if (!data.user) {
            console.warn('useAuth: No user data in response, redirecting to login');
            router.push(redirectTo);
            setIsAuthenticated(false);
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          // Use the verified user data from the server
          setUser(data.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('useAuth: Error verifying token:', error);
          router.push(redirectTo);
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('useAuth: Error checking authentication:', error);
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