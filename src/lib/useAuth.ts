import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCookie } from 'cookies-next';

export default function useAuth(redirectTo: string = '/login') {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Skip auth check for login page to avoid redirect loops
    if (router.pathname === '/login') {
      setIsAuthenticated(false);
      return;
    }

    const checkAuth = async () => {
      // Check if user is authenticated using cookie
      const authCookie = getCookie('auth');
      
      if (!authCookie) {
        // Redirect to login if not authenticated
        router.push(redirectTo);
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    };

    checkAuth();
  }, [redirectTo, router]);

  return { isAuthenticated };
}