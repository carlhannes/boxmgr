import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';
import { Box, BoxWithCategory, Category } from '@/lib/db-schema';

export default function EditBox() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [number, setNumber] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && id && !Array.isArray(id)) {
      fetchBox(id);
    }
  }, [isAuthenticated, id]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError('Error loading categories. Please try again.');
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchBox = async (boxId: string) => {
    try {
      const response = await fetch(`/api/boxes/${boxId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch box');
      }
      
      const data: BoxWithCategory = await response.json();
      setNumber(data.number);
      setName(data.name);
      setCategoryId(data.category_id);
      setNotes(data.notes || '');
    } catch (err) {
      setError('Error loading box. Please try again.');
      console.error('Error fetching box:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!id || Array.isArray(id) || number === '' || !categoryId) {
      setError('Box number and category are required');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/boxes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: parseInt(number.toString(), 10),
          name,
          category_id: categoryId,
          notes: notes || null
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update box');
      }

      // Redirect to box details page after successful update
      router.push(`/boxes/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update box');
      setSaving(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title="Edit Box">
      <div className="mb-6">
        <Link href={`/boxes/${id}`} className="text-blue-600 hover:text-blue-800">
          &larr; Back to Box
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit Box</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading || loadingCategories ? (
          <div className="text-center py-4">Loading box data...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="category" className="block mb-2 text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={categoryId === '' ? '' : categoryId.toString()}
                onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value, 10) : '')}
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="number" className="block mb-2 text-sm font-medium text-gray-700">
                Box Number
              </label>
              <input
                type="number"
                id="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={number}
                onChange={(e) => setNumber(e.target.value ? parseInt(e.target.value, 10) : '')}
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-700">
                Box Name
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
              <label htmlFor="notes" className="block mb-2 text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information about this box"
              />
            </div>

            <div className="flex items-center justify-between">
              <Link
                href={`/boxes/${id}`}
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