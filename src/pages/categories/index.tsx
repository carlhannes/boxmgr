import { useState, useEffect } from 'react';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';
import { Category } from '@/lib/db-schema';

export default function Categories() {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated]);

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
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category? All associated boxes and items will also be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      // Refresh the categories list
      fetchCategories();
    } catch (err) {
      setError('Error deleting category. Please try again.');
      console.error('Error deleting category:', err);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title="Categories">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Link
          href="/categories/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Category
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8 bg-white shadow rounded-lg">
          <p className="text-gray-600 mb-4">No categories yet</p>
          <Link
            href="/categories/new"
            className="text-blue-600 hover:text-blue-800"
          >
            Create your first category
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div 
                className="h-2" 
                style={{ backgroundColor: category.color }}
              />
              <div className="p-4">
                <h2 className="text-lg font-medium mb-2">{category.name}</h2>
                <div className="flex justify-between mt-4">
                  <Link
                    href={`/categories/${category.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View Boxes
                  </Link>
                  <div className="space-x-2">
                    <Link
                      href={`/categories/edit/${category.id}`}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}