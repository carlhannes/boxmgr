import crypto from 'crypto';
import { getSetting } from './db';
import { AuthUser } from './authMiddleware';

// Interface for token payload
export interface TokenPayload {
  id: number;
  username: string;
  isAdmin: boolean;
  exp: number;
}

// Simple token generation function
export function generateToken(user: AuthUser): string {
  const secret = getSetting('jwt_secret');
  if (!secret) {
    throw new Error('JWT secret not found in settings');
  }

  // Create token payload with user data and expiration (7 days)
  const payload: TokenPayload = {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days in seconds
  };

  // Convert payload to base64
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  
  // Create signature using HMAC SHA256
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64');

  // Return token as base64 payload + signature
  return `${payloadBase64}.${signature}`;
}

// Verify token and return payload if valid
export function verifyToken(token: string): AuthUser | null {
  try {
    const secret = getSetting('jwt_secret');
    if (!secret) {
      console.error('JWT secret not found in settings');
      return null;
    }

    // Split token into parts
    const [payloadBase64, receivedSignature] = token.split('.');
    
    if (!payloadBase64 || !receivedSignature) {
      console.warn('Invalid token format');
      return null;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64');

    if (receivedSignature !== expectedSignature) {
      console.warn('Invalid token signature');
      return null;
    }

    // Parse payload
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString()) as TokenPayload;
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.warn('Token expired');
      return null;
    }

    // Return user from payload
    return {
      id: payload.id,
      username: payload.username,
      isAdmin: payload.isAdmin
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}