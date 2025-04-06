import { NextApiRequest, NextApiResponse } from 'next';
import { createUser, hasUsers } from '@/lib/users';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests for setup
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Don't allow setup if users already exist
  if (hasUsers()) {
    return res.status(403).json({ error: 'Setup already completed. Users already exist.' });
  }

  // Create admin user
  const user = createUser(username, password, true);
  
  if (user) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(500).json({ error: 'Failed to create user' });
  }
}