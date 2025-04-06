import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser } from '@/lib/users';
import { setCookie } from 'cookies-next';
import { generateToken } from '@/lib/tokenAuth';

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
    try {
      // Generate secure token
      const token = generateToken({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      });
      
      // Set authentication token in HTTP-only cookie for API calls
      setCookie('auth_token', token, { 
        req, 
        res, 
        maxAge: 7 * 24 * 60 * 60, // 1 week
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        httpOnly: true,  // Make cookie accessible only to the server
      });
      
      // Set a separate flag cookie that client JavaScript can access
      // This doesn't contain sensitive data, just indicates auth status
      setCookie('auth_status', 'authenticated', { 
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
    } catch (error) {
      console.error('Error generating auth token:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  } else {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
}