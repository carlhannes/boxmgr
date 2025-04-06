import { useState, useEffect } from 'react';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';
import { BoxWithCategory } from '@/lib/db-schema';

export default function Boxes() {
  const { isAuthenticated } = useAuth();
  const [boxes, setBoxes] = useState<BoxWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBoxes();
    }
  }, [isAuthenticated]);

  const fetchBoxes = async () => {
    try {
      const response = await fetch('/api/boxes');
      
      if (!response.ok) {
        throw new Error('Failed to fetch boxes');
      }
      
      const data = await response.json();
      setBoxes(data);
    } catch (err) {
      setError('Error loading boxes. Please try again.');
      console.error('Error fetching boxes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this box? All associated items will also be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`/api/boxes/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete box');
      }

      // Refresh the boxes list
      fetchBoxes();
    } catch (err) {
      setError('Error deleting box. Please try again.');
      console.error('Error deleting box:', err);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title="Boxes">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Boxes</h1>
        <Link
          href="/boxes/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Box
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading boxes...</div>
      ) : boxes.length === 0 ? (
        <div className="text-center py-8 bg-white shadow rounded-lg">
          <p className="text-gray-600 mb-4">No boxes yet</p>
          <Link
            href="/boxes/new"
            className="text-blue-600 hover:text-blue-800"
          >
            Create your first box
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {boxes.map((box) => (
            <div key={box.id} className="bg-white rounded-lg shadow overflow-hidden">
              {box.categoryColor && (
                <div 
                  className="h-2" 
                  style={{ backgroundColor: box.categoryColor }}
                />
              )}
              <div className="p-4">
                <h2 className="text-lg font-medium mb-1">#{box.number}: {box.name}</h2>
                {box.categoryName && (
                  <p className="text-sm text-gray-600 mb-2">
                    {box.categoryName}
                  </p>
                )}
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
                      onClick={() => handleDelete(box.id)}
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