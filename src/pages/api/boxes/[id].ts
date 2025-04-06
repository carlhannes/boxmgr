import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid box ID' });
  }

  const boxId = parseInt(id, 10);
  
  if (isNaN(boxId)) {
    return res.status(400).json({ error: 'Box ID must be a number' });
  }

  switch (req.method) {
    case 'GET':
      // Get a specific box with its items
      try {
        const box = db
          .prepare(`
            SELECT b.*, c.name as categoryName, c.color as categoryColor 
            FROM boxes b 
            LEFT JOIN categories c ON b.category_id = c.id 
            WHERE b.id = ?
          `)
          .get(boxId);
        
        if (!box) {
          return res.status(404).json({ error: 'Box not found' });
        }

        // Get all items in this box using the box_items junction table
        const items = db
          .prepare(`
            SELECT i.* 
            FROM items i
            JOIN box_items bi ON i.id = bi.item_id
            WHERE bi.box_id = ?
          `)
          .all(boxId);
        
        return res.status(200).json({ ...box, items });
      } catch (error) {
        console.error('Error fetching box:', error);
        return res.status(500).json({ error: 'Failed to fetch box' });
      }

    case 'PUT':
      // Update a box
      try {
        const { number, name, categoryId, notes } = req.body;

        // Check if box exists
        const existingBox = db
          .prepare('SELECT * FROM boxes WHERE id = ?')
          .get(boxId);
        
        if (!existingBox) {
          return res.status(404).json({ error: 'Box not found' });
        }

        // Update with provided fields
        const updates = [];
        const values = [];
        
        if (number !== undefined) {
          updates.push('number = ?');
          values.push(number);
        }
        
        if (name !== undefined) {
          updates.push('name = ?');
          values.push(name);
        }
        
        if (categoryId !== undefined) {
          // Check if category exists
          const category = db
            .prepare('SELECT * FROM categories WHERE id = ?')
            .get(categoryId);
          
          if (!category) {
            return res.status(404).json({ error: 'Category not found' });
          }
          
          updates.push('category_id = ?');
          values.push(categoryId);
        }
        
        if (notes !== undefined) {
          updates.push('notes = ?');
          values.push(notes);
        }
        
        if (updates.length === 0) {
          return res.status(400).json({ error: 'No update data provided' });
        }
        
        // Add the box ID for the WHERE clause
        values.push(boxId);
        
        db.prepare(`UPDATE boxes SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        
        const updatedBox = db
          .prepare('SELECT * FROM boxes WHERE id = ?')
          .get(boxId);
        
        return res.status(200).json(updatedBox);
      } catch (error) {
        console.error('Error updating box:', error);
        return res.status(500).json({ error: 'Failed to update box' });
      }

    case 'DELETE':
      // Delete a box
      try {
        // Check if box exists
        const existingBox = db
          .prepare('SELECT * FROM boxes WHERE id = ?')
          .get(boxId);
        
        if (!existingBox) {
          return res.status(404).json({ error: 'Box not found' });
        }

        // Delete the box (items will be cascaded due to foreign key constraint)
        db.prepare('DELETE FROM boxes WHERE id = ?').run(boxId);
        
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error deleting box:', error);
        return res.status(500).json({ error: 'Failed to delete box' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAuth(handler);