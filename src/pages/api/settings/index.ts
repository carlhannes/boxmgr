import { NextApiRequest, NextApiResponse } from 'next';
import { db, setSetting } from '@/lib/db';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET request - Fetch all settings
  if (req.method === 'GET') {
    try {
      const settings = db.prepare('SELECT key, value, description FROM settings').all();
      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  } 
  
  // POST request - Save a setting
  else if (req.method === 'POST') {
    try {
      const { key, value, description } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key and value are required' });
      }

      setSetting(key, value, description);
      return res.status(200).json({ success: true, message: 'Setting saved successfully' });
    } catch (error) {
      console.error('Error saving setting:', error);
      return res.status(500).json({ error: 'Failed to save setting' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ error: 'Method not allowed' });
}

// Protect this endpoint with authentication middleware
export default withAuth(handler);