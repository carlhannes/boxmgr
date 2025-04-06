import { NextApiRequest, NextApiResponse } from 'next';
import { db, ensureDatabaseMigrated } from '@/lib/db';
import { withAuth } from '@/lib/authMiddleware';
import { Box, ItemWithDetails } from '@/lib/db-schema';

// Ensure database schema is migrated before handling any requests
ensureDatabaseMigrated();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid box ID' });
  }

  const boxId = parseInt(id, 10);
  
  if (isNaN(boxId)) {
    return res.status(400).json({ error: 'Box ID must be a number' });
  }

  // Check if box exists
  const box = db
    .prepare('SELECT * FROM boxes WHERE id = ?')
    .get(boxId) as Box | undefined;
  
  if (!box) {
    return res.status(404).json({ error: 'Box not found' });
  }

  switch (req.method) {
    case 'GET':
      // Get all items in a box - using the box_items junction table
      try {
        const items = db
          .prepare(`
            SELECT i.*, bi.quantity 
            FROM items i
            JOIN box_items bi ON i.id = bi.item_id
            WHERE bi.box_id = ?
          `)
          .all(boxId) as ItemWithDetails[];
        
        return res.status(200).json(items);
      } catch (error) {
        console.error('Error fetching items:', error);
        return res.status(500).json({ error: 'Failed to fetch items' });
      }

    case 'POST':
      // Add item to a box - need to create item first, then associate with box
      try {
        const { name, category_id, quantity = 1 } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Item name is required' });
        }

        // Begin transaction
        const transaction = db.transaction(() => {
          // First insert into items table
          const itemResult = db
            .prepare('INSERT INTO items (name, category_id) VALUES (?, ?)')
            .run(name, category_id || null);
          
          const itemId = itemResult.lastInsertRowid;
          
          if (!itemId) {
            throw new Error('Failed to create item');
          }
          
          // Then create association in box_items
          db.prepare('INSERT INTO box_items (box_id, item_id, quantity) VALUES (?, ?, ?)')
            .run(boxId, itemId, quantity);
          
          // Return the newly created item with its box association
          return db
            .prepare(`
              SELECT i.*, bi.quantity 
              FROM items i
              JOIN box_items bi ON i.id = bi.item_id
              WHERE i.id = ? AND bi.box_id = ?
            `)
            .get(itemId, boxId) as ItemWithDetails;
        });
        
        // Execute transaction
        const newItem = transaction();
        return res.status(201).json(newItem);
      } catch (error) {
        console.error('Error creating item:', error);
        return res.status(500).json({ error: 'Failed to create item' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAuth(handler);