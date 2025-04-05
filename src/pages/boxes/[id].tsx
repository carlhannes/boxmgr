import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';

interface Box {
  id: number;
  number: number;
  name: string;
  categoryId: number;
  notes: string | null;
  categoryName?: string;
  categoryColor?: string;
}

interface Item {
  id: number;
  name: string;
  boxId: number;
}

export default function BoxDetail() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [box, setBox] = useState<Box | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated && id && !Array.isArray(id)) {
      fetchBoxData(id);
    }
  }, [isAuthenticated, id]);

  const fetchBoxData = async (boxId: string) => {
    try {
      // Fetch box details
      const boxResponse = await fetch(`/api/boxes/${boxId}`);
      
      if (!boxResponse.ok) {
        throw new Error('Failed to fetch box data');
      }
      
      const boxData = await boxResponse.json();
      setBox(boxData);
      
      // Fetch box items using the new endpoint
      const itemsResponse = await fetch(`/api/items/box/${boxId}`);
      if (!itemsResponse.ok) {
        throw new Error('Failed to fetch box items');
      }
      
      const itemsData = await itemsResponse.json();
      setItems(itemsData);
    } catch (err) {
      setError('Error loading box data. Please try again.');
      console.error('Error fetching box data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id || Array.isArray(id) || !newItemName.trim()) {
      return;
    }

    setAddingItem(true);

    try {
      // Use the new endpoint for adding items
      const response = await fetch(`/api/items/box/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newItemName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      const newItem = await response.json();
      
      // Update the items in state
      setItems(prev => [...prev, newItem]);
      
      // Clear the input
      setNewItemName('');
      
      // Focus on the input for the next item
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err) {
      setError('Error adding item. Please try again.');
      console.error('Error adding item:', err);
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      // Update local state to remove the deleted item
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      setError('Error deleting item. Please try again.');
      console.error('Error deleting item:', err);
    }
  };

  // Show loading state while checking authentication or loading data
  if (isAuthenticated === null || loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title={box ? `Box ${box.number}: ${box.name}` : 'Box Details'}>
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <Link 
          href={box?.categoryId ? `/categories/${box.categoryId}` : "/boxes"} 
          className="text-blue-600 hover:text-blue-800"
        >
          &larr; Back to {box?.categoryName || 'Boxes'}
        </Link>
      </div>

      {box ? (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            {box.categoryColor && (
              <div 
                className="h-3" 
                style={{ backgroundColor: box.categoryColor }}
              />
            )}
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold">Box #{box.number}: {box.name}</h1>
                <Link
                  href={`/boxes/edit/${box.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </Link>
              </div>
              <p className="text-gray-700 mb-1">
                {box.categoryName}
              </p>
              {box.notes && (
                <p className="text-gray-700 mt-2">
                  <span className="font-medium">Notes:</span> {box.notes}
                </p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Items in this Box</h2>
            
            <div className="bg-white shadow rounded-lg p-4 mb-4">
              <form onSubmit={handleAddItem} className="flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add new item..."
                  disabled={addingItem}
                  required
                />
                <button
                  type="submit"
                  disabled={addingItem || !newItemName.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {addingItem ? 'Adding...' : 'Add'}
                </button>
              </form>
            </div>

            {items.length > 0 ? (
              <ul className="bg-white shadow rounded-lg overflow-hidden divide-y divide-gray-200">
                {items.map((item) => (
                  <li key={item.id} className="p-4 flex justify-between items-center">
                    <span>{item.name}</span>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                      aria-label={`Delete ${item.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 bg-white shadow rounded-lg">
                <p className="text-gray-600">No items in this box yet</p>
                <p className="text-gray-500 text-sm mt-2">Add items using the form above</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8 bg-white shadow rounded-lg">
          <p className="text-gray-600">Box not found</p>
        </div>
      )}
    </MainLayout>
  );
}