import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';
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
      JOIN box_items bi ON i.id = bi.item_id
      JOIN boxes b ON bi.box_id = b.id
      JOIN categories c ON b.category_id = c.id
      WHERE i.name LIKE ?
      ORDER BY c.name, b.number, i.name
    `).all(searchTerm);
    
    // Also search by box name and number
    const boxResults = db.prepare(`
      SELECT 
        NULL as itemId,
        NULL as itemName,
        b.id as boxId, 
        b.name as boxName, 
        b.number as boxNumber,
        c.id as categoryId, 
        c.name as categoryName, 
        c.color as categoryColor
      FROM boxes b
      JOIN categories c ON b.category_id = c.id
      WHERE b.name LIKE ? OR CAST(b.number AS TEXT) LIKE ?
      ORDER BY c.name, b.number
    `).all(searchTerm, searchTerm);
    
    // Combine both result sets
    const combinedResults = [...results, ...boxResults];
    
    return res.status(200).json(combinedResults);
  } catch (error) {
    console.error('Error searching items:', error);
    return res.status(500).json({ error: 'Failed to search items' });
  }
}

export default withAuth(handler);