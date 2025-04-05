import React, { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children,
  title = 'Box Manager' 
}) => {
  const router = useRouter();
  
  const isActive = (path: string) => {
    return router.pathname === path ? 
      'text-blue-600 border-b-2 border-blue-600' : 
      'text-gray-600 hover:text-blue-500';
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          
          <nav className="flex space-x-4 pb-3 overflow-x-auto">
            <Link href="/" className={`px-3 py-2 text-sm font-medium ${isActive('/')}`}>
              Home
            </Link>
            <Link href="/categories" className={`px-3 py-2 text-sm font-medium ${isActive('/categories')}`}>
              Categories
            </Link>
            <Link href="/boxes" className={`px-3 py-2 text-sm font-medium ${isActive('/boxes')}`}>
              Boxes
            </Link>
            <Link href="/search" className={`px-3 py-2 text-sm font-medium ${isActive('/search')}`}>
              Search
            </Link>
            <Link href="/print" className={`px-3 py-2 text-sm font-medium ${isActive('/print')}`}>
              Print
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-6 sm:px-6">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm text-gray-500">
            Box Manager - A simple app to organize your moving boxes
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;