import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';

interface SearchResult {
  itemId: number;
  itemName: string;
  boxId: number;
  boxName: string;
  boxNumber: number;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
}

export default function Search() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { q: initialQuery } = router.query;
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('Failed to perform search');
      }
      
      const data = await response.json();
      setResults(data);
      setSearched(true);
      
      // Update URL with the search query for sharing/bookmarking
      router.push({
        pathname: '/search',
        query: { q: searchQuery },
      }, undefined, { shallow: true });
    } catch (err) {
      setError('Error performing search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [router]);

  useEffect(() => {
    if (initialQuery && typeof initialQuery === 'string') {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  // Group results by box
  const resultsByBox: { [key: string]: SearchResult[] } = {};
  results.forEach(result => {
    const boxKey = `${result.boxId}`;
    if (!resultsByBox[boxKey]) {
      resultsByBox[boxKey] = [];
    }
    resultsByBox[boxKey].push(result);
  });

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title="Search Items">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Search Items</h1>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <form onSubmit={handleSubmit}>
            <div className="flex">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search for items..."
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {searched && !searching && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">
              {results.length === 0 
                ? 'No results found' 
                : `Found ${results.length} ${results.length === 1 ? 'item' : 'items'}`}
            </h2>
          </div>
        )}

        {Object.keys(resultsByBox).length > 0 && (
          <div className="space-y-6">
            {Object.keys(resultsByBox).map(boxId => {
              const items = resultsByBox[boxId];
              const firstItem = items[0]; // Use the first item to get box and category info
              
              return (
                <div key={boxId} className="bg-white shadow rounded-lg overflow-hidden">
                  <div 
                    className="h-2" 
                    style={{ backgroundColor: firstItem.categoryColor }}
                  />
                  <div className="p-4">
                    <div className="mb-3">
                      <Link 
                        href={`/boxes/${boxId}`} 
                        className="text-lg font-medium hover:text-blue-600"
                      >
                        Box #{firstItem.boxNumber}: {firstItem.boxName}
                      </Link>
                      <p className="text-sm text-gray-600">
                        Category: {firstItem.categoryName}
                      </p>
                    </div>
                    
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Items found in this box:
                    </h3>
                    <ul className="divide-y divide-gray-200">
                      {items.map(item => (
                        <li key={item.itemId} className="py-2">
                          {item.itemName}
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Link 
                        href={`/boxes/${boxId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Box &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}