import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      // Get all boxes or filter by category
      try {
        const { categoryId } = req.query;
        
        let boxes;
        if (categoryId) {
          // Filter boxes by category
          boxes = db
            .prepare('SELECT * FROM boxes WHERE categoryId = ? ORDER BY number')
            .all(categoryId);
        } else {
          // Get all boxes
          boxes = db
            .prepare('SELECT b.*, c.name as categoryName, c.color as categoryColor FROM boxes b LEFT JOIN categories c ON b.categoryId = c.id ORDER BY b.categoryId, b.number')
            .all();
        }
        
        return res.status(200).json(boxes);
      } catch (error) {
        console.error('Error fetching boxes:', error);
        return res.status(500).json({ error: 'Failed to fetch boxes' });
      }

    case 'POST':
      // Create a new box
      try {
        const { number, name, categoryId, notes } = req.body;

        if (!number || !name || !categoryId) {
          return res.status(400).json({ error: 'Number, name, and category ID are required' });
        }

        // Check if category exists
        const category = db
          .prepare('SELECT * FROM categories WHERE id = ?')
          .get(categoryId);
        
        if (!category) {
          return res.status(404).json({ error: 'Category not found' });
        }

        const result = db
          .prepare('INSERT INTO boxes (number, name, categoryId, notes) VALUES (?, ?, ?, ?)')
          .run(number, name, categoryId, notes || null);

        if (result.lastInsertRowid) {
          const newBox = db
            .prepare('SELECT * FROM boxes WHERE id = ?')
            .get(result.lastInsertRowid);
          
          return res.status(201).json(newBox);
        } else {
          return res.status(500).json({ error: 'Failed to create box' });
        }
      } catch (error) {
        console.error('Error creating box:', error);
        return res.status(500).json({ error: 'Failed to create box' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAuth(handler);