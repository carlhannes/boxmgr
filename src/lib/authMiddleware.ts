import { NextApiRequest, NextApiResponse } from 'next';
import { getCookie } from 'cookies-next';

// Auth user type
export interface AuthUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

// Extended request type with user property
export interface AuthenticatedRequest extends NextApiRequest {
  user: AuthUser;
}

// Type for next API handlers
type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;

// Parse auth cookie to get user info
export function getAuthUser(req: NextApiRequest, res: NextApiResponse): AuthUser | null {
  const authCookie = getCookie('auth', { req, res }) as string | undefined;
  
  if (!authCookie) return null;
  
  try {
    // Try to parse as JSON first (new format)
    return JSON.parse(authCookie) as AuthUser;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // Fall back to old format (just username string)
    // Ignore parse error and use the fallback
    return {
      username: authCookie,
      isAdmin: authCookie === 'user', // Default 'user' was admin in old system
      id: -1 // Placeholder for old format
    };
  }
}

// Middleware to check if user is authenticated
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Check for authentication cookie
    const user = getAuthUser(req, res);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Add user to the request object
    (req as AuthenticatedRequest).user = user;

    // If authenticated, proceed with the request
    return handler(req, res);
  };
}

// Admin-only middleware
export function withAdminAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Check for authentication cookie
    const user = getAuthUser(req, res);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }

    // Add user to the request object
    (req as AuthenticatedRequest).user = user;

    // If authenticated and admin, proceed with the request
    return handler(req, res);
  };
}

// For use in components/pages
export function isUserAuthenticated(req: NextApiRequest, res: NextApiResponse): boolean {
  return !!getAuthUser(req, res);
}