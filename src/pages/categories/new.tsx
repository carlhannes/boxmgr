import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';

export default function NewCategory() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6'); // Default blue color
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, color }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create category');
      }

      // Redirect to categories list after successful creation
      router.push('/categories');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title="New Category">
      <div className="mb-6">
        <Link href="/categories" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Categories
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create New Category</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-700">
              Category Name
            </label>
            <input
              type="text"
              id="name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Kitchen, Bedroom, etc."
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="color" className="block mb-2 text-sm font-medium text-gray-700">
              Category Color
            </label>
            <div className="flex items-center">
              <input
                type="color"
                id="color"
                className="h-10 w-10 border-0 p-0 mr-3"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <input
                type="text"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                placeholder="#HEX color"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/categories"
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}