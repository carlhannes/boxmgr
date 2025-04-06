import { NextApiRequest, NextApiResponse } from 'next';
import { getUserById, updateUser, deleteUser } from '@/lib/users';
import { withAdminAuth } from '@/lib/authMiddleware';
import { ensureDatabaseMigrated } from '@/lib/db';

// Ensure database schema is migrated before handling any requests
ensureDatabaseMigrated();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const userId = parseInt(id as string, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  // Get user by ID
  if (req.method === 'GET') {
    const user = getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user without password
    const userWithoutPassword = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      created_at: user.created_at
    };
    return res.status(200).json(userWithoutPassword);
  }
  
  // Update user
  if (req.method === 'PUT') {
    const { username, password, isAdmin } = req.body;
    
    // Check if user exists
    const existingUser = getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update the user
    const updateData: {username?: string; password?: string; isAdmin?: boolean} = {};
    
    if (username !== undefined) {
      updateData.username = username;
    }
    
    if (password !== undefined && password.trim() !== '') {
      updateData.password = password;
    }
    
    if (isAdmin !== undefined) {
      updateData.isAdmin = isAdmin;
    }
    
    const updated = updateUser(userId, updateData);
    
    if (updated) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ error: 'Failed to update user' });
    }
  }
  
  // Delete user
  if (req.method === 'DELETE') {
    // Check if user exists
    const existingUser = getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Block deleting the last admin
    if (existingUser.isAdmin) {
      // Check if this is the last admin
      const result = deleteUser(userId);
      
      if (!result) {
        return res.status(400).json({ 
          error: 'Cannot delete the last admin user'
        });
      }
    } else {
      // Non-admin users can be deleted
      deleteUser(userId);
    }
    
    return res.status(200).json({ success: true });
  }
  
  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}

// Only allow admin users to manage users
export default withAdminAuth(handler);