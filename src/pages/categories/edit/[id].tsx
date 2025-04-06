import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';
import { Category } from '@/lib/db-schema';

export default function EditCategory() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated && id && !Array.isArray(id)) {
      fetchCategory(id);
    }
  }, [isAuthenticated, id]);

  const fetchCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch category');
      }
      
      const data: Category = await response.json();
      setName(data.name);
      setColor(data.color);
    } catch (err) {
      setError('Error loading category. Please try again.');
      console.error('Error fetching category:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!id || Array.isArray(id)) {
      setError('Invalid category ID');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, color }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update category');
      }

      // Redirect to category details page after successful update
      router.push(`/categories/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
      setSaving(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title="Edit Category">
      <div className="mb-6">
        <Link href={`/categories/${id}`} className="text-blue-600 hover:text-blue-800">
          &larr; Back to Category
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit Category</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">Loading category data...</div>
        ) : (
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
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                href={`/categories/${id}`}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
}