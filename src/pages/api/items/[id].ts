import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/authMiddleware';
import { Item } from '@/lib/db-schema';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid item ID' });
  }

  const itemId = parseInt(id, 10);
  
  if (isNaN(itemId)) {
    return res.status(400).json({ error: 'Item ID must be a number' });
  }

  switch (req.method) {
    case 'GET':
      // Get a specific item
      try {
        const item = db
          .prepare('SELECT * FROM items WHERE id = ?')
          .get(itemId) as Item | undefined;
        
        if (!item) {
          return res.status(404).json({ error: 'Item not found' });
        }
        
        return res.status(200).json(item);
      } catch (error) {
        console.error('Error fetching item:', error);
        return res.status(500).json({ error: 'Failed to fetch item' });
      }

    case 'PUT':
      // Update an item
      try {
        const { name, category_id } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Item name is required' });
        }

        // Check if item exists
        const existingItem = db
          .prepare('SELECT * FROM items WHERE id = ?')
          .get(itemId) as Item | undefined;
        
        if (!existingItem) {
          return res.status(404).json({ error: 'Item not found' });
        }

        // Update the item
        if (category_id !== undefined) {
          db.prepare('UPDATE items SET name = ?, category_id = ? WHERE id = ?')
            .run(name, category_id, itemId);
        } else {
          db.prepare('UPDATE items SET name = ? WHERE id = ?')
            .run(name, itemId);
        }
        
        const updatedItem = db
          .prepare('SELECT * FROM items WHERE id = ?')
          .get(itemId) as Item;
        
        return res.status(200).json(updatedItem);
      } catch (error) {
        console.error('Error updating item:', error);
        return res.status(500).json({ error: 'Failed to update item' });
      }

    case 'DELETE':
      // Delete an item
      try {
        // Check if item exists
        const existingItem = db
          .prepare('SELECT * FROM items WHERE id = ?')
          .get(itemId) as Item | undefined;
        
        if (!existingItem) {
          return res.status(404).json({ error: 'Item not found' });
        }

        // Delete the item
        db.prepare('DELETE FROM items WHERE id = ?').run(itemId);
        
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error deleting item:', error);
        return res.status(500).json({ error: 'Failed to delete item' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAuth(handler);