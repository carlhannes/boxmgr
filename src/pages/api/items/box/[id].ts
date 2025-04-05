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

  // Check if box exists
  const box = db
    .prepare('SELECT * FROM boxes WHERE id = ?')
    .get(boxId);
  
  if (!box) {
    return res.status(404).json({ error: 'Box not found' });
  }

  switch (req.method) {
    case 'GET':
      // Get all items in a box
      try {
        const items = db
          .prepare('SELECT * FROM items WHERE boxId = ?')
          .all(boxId);
        
        return res.status(200).json(items);
      } catch (error) {
        console.error('Error fetching items:', error);
        return res.status(500).json({ error: 'Failed to fetch items' });
      }

    case 'POST':
      // Add item to a box
      try {
        const { name } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Item name is required' });
        }

        const result = db
          .prepare('INSERT INTO items (name, boxId) VALUES (?, ?)')
          .run(name, boxId);

        if (result.lastInsertRowid) {
          const newItem = db
            .prepare('SELECT * FROM items WHERE id = ?')
            .get(result.lastInsertRowid);
          
          return res.status(201).json(newItem);
        } else {
          return res.status(500).json({ error: 'Failed to create item' });
        }
      } catch (error) {
        console.error('Error creating item:', error);
        return res.status(500).json({ error: 'Failed to create item' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAuth(handler);