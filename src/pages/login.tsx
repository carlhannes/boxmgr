import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getCookie } from 'cookies-next';
import LoginForm from '@/components/LoginForm';

const LoginPage: React.FC = () => {
  const router = useRouter();

  // If user is already logged in, redirect to home
  useEffect(() => {
    const authCookie = getCookie('auth');
    if (authCookie) {
      router.push('/');
    }
  }, [router]);

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
          <LoginForm />
        </div>
      </div>
    </>
  );
};

export default LoginPage;