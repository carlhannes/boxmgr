import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/authMiddleware';
import { Category } from '@/lib/db-schema';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      // Get all categories
      try {
        const categories = db.prepare('SELECT * FROM categories').all() as Category[];
        return res.status(200).json(categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({ error: 'Failed to fetch categories' });
      }

    case 'POST':
      // Create a new category
      try {
        const { name, color } = req.body;

        if (!name || !color) {
          return res.status(400).json({ error: 'Name and color are required' });
        }

        const result = db
          .prepare('INSERT INTO categories (name, color) VALUES (?, ?)')
          .run(name, color);

        if (result.lastInsertRowid) {
          const newCategory = db
            .prepare('SELECT * FROM categories WHERE id = ?')
            .get(result.lastInsertRowid) as Category;
          
          return res.status(201).json(newCategory);
        } else {
          return res.status(500).json({ error: 'Failed to create category' });
        }
      } catch (error) {
        console.error('Error creating category:', error);
        return res.status(500).json({ error: 'Failed to create category' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAuth(handler);