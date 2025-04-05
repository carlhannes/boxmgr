import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';

interface Category {
  id: number;
  name: string;
  color: string;
}

interface Box {
  id: number;
  number: number;
  name: string;
  categoryId: number;
  notes: string | null;
}

export default function CategoryDetail() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [category, setCategory] = useState<Category | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && id && !Array.isArray(id)) {
      fetchCategoryData(id);
    }
  }, [isAuthenticated, id]);

  const fetchCategoryData = async (categoryId: string) => {
    try {
      // Fetch category details
      const categoryResponse = await fetch(`/api/categories/${categoryId}`);
      
      if (!categoryResponse.ok) {
        throw new Error('Failed to fetch category');
      }
      
      const categoryData = await categoryResponse.json();
      setCategory(categoryData);
      
      // Fetch boxes for this category
      const boxesResponse = await fetch(`/api/boxes?categoryId=${categoryId}`);
      
      if (!boxesResponse.ok) {
        throw new Error('Failed to fetch boxes');
      }
      
      const boxesData = await boxesResponse.json();
      setBoxes(boxesData);
    } catch (err) {
      setError('Error loading data. Please try again.');
      console.error('Error fetching category data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBox = async (boxId: number) => {
    if (!confirm('Are you sure you want to delete this box? All associated items will also be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`/api/boxes/${boxId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete box');
      }

      // Update local state to remove the deleted box
      setBoxes(boxes.filter(box => box.id !== boxId));
    } catch (err) {
      setError('Error deleting box. Please try again.');
      console.error('Error deleting box:', err);
    }
  };

  // Show loading state while checking authentication or loading data
  if (isAuthenticated === null || loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title={category ? category.name : 'Category'}>
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <Link href="/categories" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Categories
        </Link>
      </div>

      {category ? (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div 
              className="h-3" 
              style={{ backgroundColor: category.color }}
            />
            <div className="p-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">{category.name}</h1>
                <Link
                  href={`/categories/edit/${category.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Boxes in this Category</h2>
            <Link
              href={`/boxes/new?categoryId=${category.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Box
            </Link>
          </div>

          {boxes.length === 0 ? (
            <div className="text-center py-8 bg-white shadow rounded-lg">
              <p className="text-gray-600 mb-4">No boxes in this category yet</p>
              <Link
                href={`/boxes/new?categoryId=${category.id}`}
                className="text-blue-600 hover:text-blue-800"
              >
                Create your first box
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {boxes.map((box) => (
                <div key={box.id} className="bg-white rounded-lg shadow">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium">
                        Box #{box.number}: {box.name}
                      </h3>
                    </div>
                    {box.notes && (
                      <p className="text-sm text-gray-600 mb-3">{box.notes}</p>
                    )}
                    <div className="flex justify-between mt-4">
                      <Link
                        href={`/boxes/${box.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Items
                      </Link>
                      <div className="space-x-2">
                        <Link
                          href={`/boxes/edit/${box.id}`}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteBox(box.id)}
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
        </>
      ) : (
        <div className="text-center py-8 bg-white shadow rounded-lg">
          <p className="text-gray-600">Category not found</p>
        </div>
      )}
    </MainLayout>
  );
}