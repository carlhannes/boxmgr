import { useState, useEffect } from 'react';
import Head from 'next/head';
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
  items?: Item[];
}

interface Item {
  id: number;
  name: string;
  boxId: number;
}

interface PrintData {
  categories: Category[];
  boxesByCategory: { [categoryId: string]: (Box & { items: Item[] })[] };
}

export default function PrintOverview() {
  const { isAuthenticated } = useAuth();
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPrintData();
    }
  }, [isAuthenticated]);

  const fetchPrintData = async () => {
    try {
      // First, fetch all categories
      const categoriesRes = await fetch('/api/categories');
      if (!categoriesRes.ok) throw new Error('Failed to fetch categories');
      const categories = await categoriesRes.json();

      // Initialize the boxes by category object
      const boxesByCategory: PrintData['boxesByCategory'] = {};
      
      // Fetch boxes and items for each category
      for (const category of categories) {
        const boxesRes = await fetch(`/api/boxes?categoryId=${category.id}`);
        if (!boxesRes.ok) throw new Error(`Failed to fetch boxes for category ${category.id}`);
        const boxes = await boxesRes.json();
        
        // For each box, fetch its items
        const boxesWithItems = [];
        for (const box of boxes) {
          const boxDetailRes = await fetch(`/api/boxes/${box.id}`);
          if (!boxDetailRes.ok) throw new Error(`Failed to fetch details for box ${box.id}`);
          const boxDetail = await boxDetailRes.json();
          boxesWithItems.push(boxDetail);
        }
        
        boxesByCategory[category.id] = boxesWithItems;
      }
      
      setPrintData({ categories, boxesByCategory });
    } catch (err) {
      setError('Error loading data for printing. Please try again.');
      console.error('Error fetching print data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title="Print Overview">
      <Head>
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container, .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-before: always;
            }
          }
        `}</style>
      </Head>

      <div className="no-print mb-6 flex justify-between items-center">
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Dashboard
        </Link>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={loading || !!error}
        >
          Print Overview
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 no-print">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading data for printing...</div>
      ) : (
        <div className="print-container">
          <h1 className="text-3xl font-bold text-center mb-6">
            Moving Boxes Overview
          </h1>
          <p className="text-center mb-8 text-gray-600">
            Generated on {new Date().toLocaleDateString()}
          </p>

          {printData?.categories.map((category, categoryIndex) => (
            <div key={category.id} className={categoryIndex > 0 ? 'page-break mt-10' : ''}>
              <div className="mb-6">
                <div 
                  className="h-3 rounded-sm mb-1" 
                  style={{ backgroundColor: category.color }}
                />
                <h2 className="text-2xl font-bold">{category.name}</h2>
              </div>

              {printData.boxesByCategory[category.id]?.length > 0 ? (
                printData.boxesByCategory[category.id].map((box) => (
                  <div 
                    key={box.id} 
                    className="mb-8 bg-white shadow-md rounded-lg p-6"
                  >
                    <h3 className="text-xl font-bold mb-2">
                      #{box.number}: {box.name}
                    </h3>
                    
                    {box.notes && (
                      <p className="text-gray-600 mb-4">Notes: {box.notes}</p>
                    )}

                    <h4 className="text-md font-semibold mb-2">Contents:</h4>
                    {box.items && box.items.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {box.items.map((item) => (
                          <li key={item.id}>{item.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No items in this box</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No boxes in this category</p>
              )}
            </div>
          ))}

          {(!printData || printData.categories.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-600">No categories or boxes found</p>
              <p className="text-gray-500 mt-2">
                Add some categories and boxes first to generate a printable overview
              </p>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}