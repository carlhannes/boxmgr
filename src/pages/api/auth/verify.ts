import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/tokenAuth';
import { getCookie } from 'cookies-next';

async function resolveValue<T>(value: T | Promise<T>): Promise<T> {
  return value instanceof Promise ? await value : value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Support both GET and POST for flexibility
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from auth_token cookie
    const authTokenRaw = getCookie('auth_token', { req, res });
    if (!authTokenRaw) {
      // Fall back to legacy 'auth' cookie
      const authCookieRaw = getCookie('auth', { req, res });
      if (!authCookieRaw) {
        return res.status(200).json({ authenticated: false });
      }
      
      // Legacy cookie handling
      try {
        const authCookie = await resolveValue(authCookieRaw as string | Promise<string>);
        const parsedUser = JSON.parse(authCookie);
        
        if (parsedUser && parsedUser.username) {
          return res.status(200).json({
            authenticated: true,
            user: parsedUser,
            legacy: true
          });
        }
      } catch (e) {
        console.warn('Failed to parse legacy cookie', e);
      }
      
      return res.status(200).json({ authenticated: false });
    }
    
    // Ensure we handle both Promise and direct return values
    const token = await resolveValue(authTokenRaw as string | Promise<string>);
    if (!token) {
      return res.status(200).json({ authenticated: false });
    }
    
    // Verify the token
    const user = verifyToken(token);
    
    if (!user) {
      return res.status(200).json({ authenticated: false });
    }
    
    // Return user data if token is valid
    return res.status(200).json({
      authenticated: true,
      user
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(500).json({ error: 'Failed to verify authentication' });
  }
}