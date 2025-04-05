import { NextApiRequest, NextApiResponse } from 'next';
import { getCookie } from 'cookies-next';

// Type for next API handlers
type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;

// Middleware to check if user is authenticated
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Check for authentication cookie
    const authCookie = getCookie('auth', { req, res });

    if (!authCookie) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // If authenticated, proceed with the request
    return handler(req, res);
  };
}

// For use in components/pages
export function isUserAuthenticated(req: NextApiRequest, res: NextApiResponse): boolean {
  const authCookie = getCookie('auth', { req, res });
  return !!authCookie;
}