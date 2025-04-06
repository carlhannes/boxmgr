import { NextApiRequest, NextApiResponse } from 'next';
import { hasUsers } from '@/lib/users';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return whether any users exist in the database
  return res.status(200).json({ hasUsers: hasUsers() });
}