import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser } from '@/lib/users';
import { setCookie } from 'cookies-next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests for login
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, redirect } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Authenticate user with case-insensitive username
  const user = authenticateUser(username.toLowerCase(), password);
  
  if (user) {
    // Create auth payload with user info
    const authPayload = JSON.stringify({
      username: user.username,
      isAdmin: user.isAdmin,
      id: user.id
    });
    
    // Set authentication cookie with user info
    setCookie('auth', authPayload, { 
      req, 
      res, 
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    return res.status(200).json({ 
      success: true,
      isAdmin: user.isAdmin,
      redirect: redirect || '/' 
    });
  } else {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
}