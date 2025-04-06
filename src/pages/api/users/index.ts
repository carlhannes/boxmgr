import { NextApiRequest, NextApiResponse } from 'next';
import { getAllUsers, createUser } from '@/lib/users';
import { withAdminAuth } from '@/lib/authMiddleware';
import { ensureDatabaseMigrated } from '@/lib/db';
import { User } from '@/lib/db-schema';

// Ensure database schema is migrated before handling any requests
ensureDatabaseMigrated();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle GET request to fetch all users
  if (req.method === 'GET') {
    const users = getAllUsers();
    return res.status(200).json(users);
  }
  
  // Handle POST request to create a new user
  if (req.method === 'POST') {
    const { username, password, isAdmin } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Create the user
    const user = createUser(username, password, isAdmin === true);
    
    if (user) {
      // Return the user without the password
      const userWithoutPassword: Omit<User, 'password'> = {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        created_at: user.created_at
      };
      return res.status(201).json(userWithoutPassword);
    } else {
      return res.status(400).json({ error: 'Username already exists or invalid data' });
    }
  }
  
  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}

// Only allow admin users to manage users
export default withAdminAuth(handler);