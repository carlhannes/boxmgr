import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';
import { Category } from '@/lib/db-schema';

export default function NewBox() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { category_id: initialCategoryId } = router.query;
  
  const [number, setNumber] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Memoize the fetchCategories function to avoid dependency issues
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      setCategories(data);
      
      // If no initial category ID was provided and we have categories, set the first one as default
      if (!initialCategoryId && data.length > 0 && categoryId === '') {
        setCategoryId(data[0].id);
      }
    } catch (err) {
      setError('Error loading categories. Please try again.');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, [initialCategoryId, categoryId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated, fetchCategories]);

  useEffect(() => {
    // Set the initial category ID if provided in the URL
    if (initialCategoryId && !Array.isArray(initialCategoryId)) {
      setCategoryId(parseInt(initialCategoryId, 10));
    }
  }, [initialCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (number === '' || !categoryId) {
      setError('Box number and category are required');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/boxes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          number: parseInt(number.toString(), 10),
          name,
          category_id: categoryId, // Changed from categoryId to category_id to match the API and database
          notes: notes || null 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create box');
      }

      const box = await response.json();

      // Redirect to the new box details
      router.push(`/boxes/${box.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create box');
      setSaving(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <MainLayout title="New Box">
      <div className="mb-6">
        <Link href="/boxes" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Boxes
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Add New Box</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">You need to create a category first</p>
            <Link href="/categories/new" className="text-blue-600 hover:text-blue-800">
              Create a Category
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="category" className="block mb-2 text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={categoryId}
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

              {selectedCategory && (
                <div 
                  className="mt-2 h-2 rounded-sm" 
                  style={{ backgroundColor: selectedCategory.color }}
                />
              )}
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
                placeholder="1"
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
                placeholder="Kitchen Utensils"
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
                href="/boxes"
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Box'}
              </button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
}