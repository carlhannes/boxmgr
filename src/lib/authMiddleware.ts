import { NextApiRequest, NextApiResponse } from 'next';
import { getCookie } from 'cookies-next';
import { verifyToken } from './tokenAuth';

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

// Parse auth cookie and verify token
export async function getAuthUser(req: NextApiRequest, res: NextApiResponse): Promise<AuthUser | null> {
  try {
    // Try to get the new auth_token cookie
    const authTokenRaw = getCookie('auth_token', { req, res });
    if (authTokenRaw) {
      // Resolve token value
      const authToken = await resolveValue(authTokenRaw as string | Promise<string>);
      if (!authToken) return null;
      
      // Verify the token
      const user = verifyToken(authToken);
      if (user) {
        return user;
      }
    }
    
    // Fall back to legacy 'auth' cookie for backward compatibility
    const authCookieRaw = getCookie('auth', { req, res });
    if (!authCookieRaw) return null;
    
    const authCookie = await resolveValue(authCookieRaw as string | Promise<string>);
    if (!authCookie) return null;
    
    // Try legacy format handling
    try {
      // Try to parse as JSON (old format)
      const parsedUser = JSON.parse(authCookie) as AuthUser;
      console.warn('Using legacy authentication format. Please log out and log in again.');
      return parsedUser;
    } catch {
      // Even older format (just username string)
      console.warn('Using very old authentication format. Please log out and log in again.');
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