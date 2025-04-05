import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search term with wildcards for partial matching
    const searchTerm = `%${q}%`;
    
    // Query items that match the search term and join with box and category info
    const results = db.prepare(`
      SELECT 
        i.id as itemId, 
        i.name as itemName, 
        b.id as boxId, 
        b.name as boxName, 
        b.number as boxNumber,
        c.id as categoryId, 
        c.name as categoryName, 
        c.color as categoryColor
      FROM items i
      JOIN boxes b ON i.boxId = b.id
      JOIN categories c ON b.categoryId = c.id
      WHERE i.name LIKE ?
      ORDER BY c.name, b.number, i.name
    `).all(searchTerm);
    
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error searching items:', error);
    return res.status(500).json({ error: 'Failed to search items' });
  }
}

export default withAuth(handler);