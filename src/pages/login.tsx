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
    
    // If user is already logged in, redirect to home
    const authCookie = getCookie('auth');
    if (authCookie) {
      router.push(redirectPath || '/');
      return;
    }
    
    // Check if there are any users, if not redirect to setup
    const checkUsers = async () => {
      try {
        const response = await fetch('/api/auth/check-users');
        const data = await response.json();
        
        if (response.ok && !data.hasUsers) {
          router.push('/setup');
          return;
        }
      } catch (error) {
        console.error('Failed to check users:', error);
      }
      
      setIsLoading(false);
    };
    
    checkUsers();
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