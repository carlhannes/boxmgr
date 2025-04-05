import { useEffect, useState } from 'react';
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

export default function Home() {
  // Auth protection
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [boxCounts, setBoxCounts] = useState<BoxCountsByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
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
        <div className="grid grid-cols-2 gap-4">
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
            href="/search" 
            className="bg-white p-4 rounded-lg shadow text-center hover:shadow-md transition-shadow"
          >
            <div className="text-blue-600 font-medium">Search Items</div>
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
    </MainLayout>
  );
}
