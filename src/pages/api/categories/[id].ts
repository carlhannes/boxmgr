import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  const categoryId = parseInt(id, 10);
  
  if (isNaN(categoryId)) {
    return res.status(400).json({ error: 'Category ID must be a number' });
  }

  switch (req.method) {
    case 'GET':
      // Get a specific category
      try {
        const category = db
          .prepare('SELECT * FROM categories WHERE id = ?')
          .get(categoryId);
        
        if (!category) {
          return res.status(404).json({ error: 'Category not found' });
        }
        
        return res.status(200).json(category);
      } catch (error) {
        console.error('Error fetching category:', error);
        return res.status(500).json({ error: 'Failed to fetch category' });
      }

    case 'PUT':
      // Update a category
      try {
        const { name, color } = req.body;

        if (!name && !color) {
          return res.status(400).json({ error: 'No update data provided' });
        }

        // Check if category exists
        const existingCategory = db
          .prepare('SELECT * FROM categories WHERE id = ?')
          .get(categoryId);
        
        if (!existingCategory) {
          return res.status(404).json({ error: 'Category not found' });
        }

        // Update with provided fields
        const updates = [];
        const values = [];
        
        if (name) {
          updates.push('name = ?');
          values.push(name);
        }
        
        if (color) {
          updates.push('color = ?');
          values.push(color);
        }
        
        // Add the category ID for the WHERE clause
        values.push(categoryId);
        
        db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        
        const updatedCategory = db
          .prepare('SELECT * FROM categories WHERE id = ?')
          .get(categoryId);
        
        return res.status(200).json(updatedCategory);
      } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ error: 'Failed to update category' });
      }

    case 'DELETE':
      // Delete a category
      try {
        // Check if category exists
        const existingCategory = db
          .prepare('SELECT * FROM categories WHERE id = ?')
          .get(categoryId);
        
        if (!existingCategory) {
          return res.status(404).json({ error: 'Category not found' });
        }

        // Delete the category
        db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
        
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error deleting category:', error);
        return res.status(500).json({ error: 'Failed to delete category' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAuth(handler);