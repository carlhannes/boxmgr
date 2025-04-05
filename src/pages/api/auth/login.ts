import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser } from '@/lib/users';
import { setCookie } from 'cookies-next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests for login
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Authenticate user
  const isAuthenticated = authenticateUser(username, password);
  
  if (isAuthenticated) {
    // Set a simple authentication cookie
    setCookie('auth', username, { 
      req, 
      res, 
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
}