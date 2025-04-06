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

// Helper function to resolve value regardless if it's a promise or direct value
async function resolveValue<T>(value: T | Promise<T>): Promise<T> {
  return value instanceof Promise ? await value : value;
}

// Parse auth cookie to get user info
export async function getAuthUser(req: NextApiRequest, res: NextApiResponse): Promise<AuthUser | null> {
  try {
    const authCookieRaw = getCookie('auth', { req, res });
    if (!authCookieRaw) return null;
    
    // Ensure we handle both Promise and direct return values
    const authCookie = await resolveValue(authCookieRaw as string | Promise<string>);
    if (!authCookie) return null;
    
    try {
      // Try to parse as JSON first (new format)
      return JSON.parse(authCookie) as AuthUser;
    } catch {
      // Fall back to old format (just username string)
      return {
        username: authCookie,
        isAdmin: authCookie === 'user', // Default 'user' was admin in old system
        id: -1 // Placeholder for old format
      };
    }
  } catch (error) {
    console.error('Error parsing auth cookie:', error);
    return null;
  }
}

// Middleware to check if user is authenticated
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Check for authentication cookie
    const user = await getAuthUser(req, res);

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
    const user = await getAuthUser(req, res);

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
export async function isUserAuthenticated(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  const user = await getAuthUser(req, res);
  return !!user;
}