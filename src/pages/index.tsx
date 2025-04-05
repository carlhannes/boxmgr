import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';

interface Category {
  id: number;
  name: string;
  color: string;
}

interface BoxCountsByCategory {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  boxCount: number;
}

interface BoxData {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
}

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

// Debounce function to prevent spamming the search API
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Home() {
  // Auth protection
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [boxCounts, setBoxCounts] = useState<BoxCountsByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Apply debounce to search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Fetch data for dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const fetchDashboardData = async () => {
        try {
          // Fetch categories
          const catResponse = await fetch('/api/categories');
          const categoriesData = await catResponse.json();
          
          if (!catResponse.ok) throw new Error('Failed to fetch categories');
          setCategories(categoriesData);

          // Fetch boxes with category info for counts
          const boxesResponse = await fetch('/api/boxes');
          const boxesData = await boxesResponse.json();
          
          if (!boxesResponse.ok) throw new Error('Failed to fetch boxes');
          
          // Calculate counts by category
          const countsByCategory: BoxCountsByCategory[] = [];
          const categoryMap = new Map<number, BoxCountsByCategory>();
          
          boxesData.forEach((box: BoxData) => {
            if (!categoryMap.has(box.categoryId)) {
              categoryMap.set(box.categoryId, {
                categoryId: box.categoryId,
                categoryName: box.categoryName,
                categoryColor: box.categoryColor,
                boxCount: 1
              });
            } else {
              const entry = categoryMap.get(box.categoryId);
              if (entry) {
                entry.boxCount++;
              }
            }
          });
          
          categoryMap.forEach(entry => countsByCategory.push(entry));
          setBoxCounts(countsByCategory);
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchDashboardData();
    }
  }, [isAuthenticated]);
  
  // Search function that gets triggered by the debounced search query
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Failed to perform search');
      }
      
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      setError('Error performing search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);
  
  // Effect to trigger search when debounced query changes
  useEffect(() => {
    if (isAuthenticated && searchFocused) {
      performSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, isAuthenticated, searchFocused, performSearch]);
  
  // Group search results by box
  const resultsByBox: { [key: string]: SearchResult[] } = {};
  searchResults.forEach(result => {
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
    <MainLayout title="Box Manager">
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link 
            href="/categories/new" 
            className="bg-white p-4 rounded-lg shadow text-center hover:shadow-md transition-shadow"
          >
            <div className="text-blue-600 font-medium">Add Category</div>
          </Link>
          <Link 
            href="/boxes/new" 
            className="bg-white p-4 rounded-lg shadow text-center hover:shadow-md transition-shadow"
          >
            <div className="text-blue-600 font-medium">Add Box</div>
          </Link>
          <Link 
            href="/print" 
            className="bg-white p-4 rounded-lg shadow text-center hover:shadow-md transition-shadow"
          >
            <div className="text-blue-600 font-medium">Print Overview</div>
          </Link>
        </div>
      </section>
      
      <section className="mb-8">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={(e) => {
                // Keep focused state if clicking within search results
                if (!e.relatedTarget || !e.relatedTarget.closest('.search-results')) {
                  // Add a small delay to allow clicks on search results
                  setTimeout(() => setSearchFocused(false), 200);
                }
              }}
              className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search for items..."
            />
            {searchQuery && (
              <button 
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <svg className="w-4 h-4 text-gray-500 hover:text-gray-700" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </section>

      {searchFocused ? (
        <section className="mb-8 search-results">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {searching ? (
            <div className="text-center py-4">Searching...</div>
          ) : searchQuery ? (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">
                  {searchResults.length === 0 
                    ? 'No results found' 
                    : `Found ${searchResults.length} ${searchResults.length === 1 ? 'item' : 'items'}`}
                </h2>
              </div>
              
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
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">Enter a search query to find items</p>
            </div>
          )}
        </section>
      ) : (
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Categories Overview</h2>
            <Link 
              href="/categories" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-4">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-4 bg-white rounded-lg shadow">
              <p className="text-gray-600">No categories yet</p>
              <Link 
                href="/categories/new" 
                className="mt-2 inline-block text-blue-600 hover:text-blue-800"
              >
                Create your first category
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.slice(0, 6).map((category) => {
                const count = boxCounts.find(b => b.categoryId === category.id)?.boxCount || 0;
                return (
                  <Link 
                    key={category.id}
                    href={`/categories/${category.id}`} 
                    className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
                  >
                    <div 
                      className="w-full h-2 mb-2 rounded-sm" 
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-sm text-gray-600">{count} boxes</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </MainLayout>
  );
}
