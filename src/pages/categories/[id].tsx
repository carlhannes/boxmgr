import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';
import { Category, Box, ItemWithDetails } from '@/lib/db-schema';

// Define a new interface for boxes with their items
interface BoxWithItems extends Box {
  items: ItemWithDetails[];
}

export default function CategoryDetail() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [category, setCategory] = useState<Category | null>(null);
  const [boxes, setBoxes] = useState<BoxWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingQuickBox, setAddingQuickBox] = useState(false);

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
      const boxesResponse = await fetch(`/api/boxes?category_id=${categoryId}`);
      
      if (!boxesResponse.ok) {
        throw new Error('Failed to fetch boxes');
      }
      
      const boxesData = await boxesResponse.json();
      
      // Fetch items for each box
      const boxesWithItems = await Promise.all(
        boxesData.map(async (box: Box) => {
          try {
            const itemsResponse = await fetch(`/api/items/box/${box.id}`);
            if (!itemsResponse.ok) {
              return { ...box, items: [] };
            }
            const itemsData = await itemsResponse.json();
            return { ...box, items: itemsData || [] };
          } catch (error) {
            console.error(`Error fetching items for box ${box.id}:`, error);
            return { ...box, items: [] };
          }
        })
      );
      
      setBoxes(boxesWithItems);
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

  const getNextBoxNumber = (): number => {
    if (boxes.length === 0) {
      return 1;
    }
    
    const maxNumber = Math.max(...boxes.map(box => box.number));
    return maxNumber + 1;
  };

  const handleQuickAddBox = async () => {
    if (!category) return;
    
    setAddingQuickBox(true);
    setError(null);
    
    try {
      const nextNumber = getNextBoxNumber();
      const response = await fetch('/api/boxes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: nextNumber,
          name: `Box ${nextNumber}`,
          category_id: category.id,
          notes: null
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create box');
      }
      
      const newBox = await response.json();
      // Redirect to the new box
      router.push(`/boxes/${newBox.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create box');
      setAddingQuickBox(false);
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
            <div className="space-x-2">
              <button
                onClick={handleQuickAddBox}
                disabled={addingQuickBox}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {addingQuickBox ? 'Adding...' : `Quick Add Box #${getNextBoxNumber()}`}
              </button>
              <Link
                href={`/boxes/new?category_id=${category.id}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Box
              </Link>
            </div>
          </div>

          {boxes.length === 0 ? (
            <div className="text-center py-8 bg-white shadow rounded-lg">
              <p className="text-gray-600 mb-4">No boxes in this category yet</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleQuickAddBox}
                  disabled={addingQuickBox}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {addingQuickBox ? 'Adding...' : `Quick Add Box #1`}
                </button>
                <Link
                  href={`/boxes/new?category_id=${category.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Create a customized box
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {boxes.map((box) => (
                <div key={box.id} className="bg-white rounded-lg shadow">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium">
                        #{box.number}: {box.name}
                      </h3>
                    </div>
                    {box.notes && (
                      <p className="text-sm text-gray-600 mb-3">{box.notes}</p>
                    )}
                    
                    <p className="text-sm text-gray-600 my-2 line-clamp-2">
                      {box.items && box.items.length > 0 
                        ? box.items.map(item => item.name).join(', ')
                        : "(no items)"}
                    </p>
                    
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