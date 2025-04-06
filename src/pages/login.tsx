import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getCookie } from 'cookies-next';
import LoginForm from '@/components/LoginForm';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const { redirect, setup } = router.query;
  const redirectPath = typeof redirect === 'string' ? redirect : undefined;

  useEffect(() => {
    // Check if user just completed setup
    if (setup === 'success') {
      setSetupSuccess(true);
    }
    
    // Check for auth cookie and verify it before redirecting
    const checkAuth = async () => {
      try {
        // First check for the auth_status cookie that's accessible to JavaScript
        const authStatus = getCookie('auth_status');
        
        if (authStatus) {
          console.log('Login page: Auth status cookie exists, verifying with API');
          
          // Verify the token is valid before redirecting
          const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          const data = await response.json();
          
          if (response.ok && data.authenticated && data.user) {
            console.log('Login page: Valid auth token verified, redirecting');
            router.push(redirectPath || '/');
            return;
          } else {
            console.log('Login page: Auth cookie exists but validation failed, staying on login page');
          }
        }
        
        // If no valid auth, check if there are any users
        const userResponse = await fetch('/api/auth/check-users');
        const userData = await userResponse.json();
        
        if (userResponse.ok && !userData.hasUsers) {
          console.log('Login page: No users exist, redirecting to setup');
          router.push('/setup');
          return;
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Login page: Error checking authentication:', error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router, redirectPath, setup]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Login | Box Manager</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-gray-900">Box Manager</h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to manage your moving boxes
            </p>
          </div>
          
          {setupSuccess && (
            <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6 text-sm">
              Setup completed successfully! Please log in with your new credentials.
            </div>
          )}
          
          <LoginForm redirectPath={redirectPath} />
        </div>
      </div>
    </>
  );
};

export default LoginPage;