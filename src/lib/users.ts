import { db } from './db';

// Default users to initialize if none exist
const defaultUsers = [
  { username: 'user', password: 'password', isAdmin: true },
  { username: 'spouse', password: 'password', isAdmin: false }
];

// User type definition
export interface User {
  id: number;
  username: string;
  password?: string;
  isAdmin: boolean;
  created_at?: string;
}

// Initialize users table with default users if empty
export function initializeUsers() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    const insertUser = db.prepare('INSERT INTO users (username, password, isAdmin) VALUES (?, ?, ?)');
    
    // Add default users
    for (const user of defaultUsers) {
      // In a real-world scenario, we'd hash the passwords, but per requirements
      // we're keeping it simple with plaintext
      insertUser.run(user.username, user.password, user.isAdmin ? 1 : 0);
    }
  }
}

// Authenticate user
export function authenticateUser(username: string, password: string): User | null {
  const lowerUsername = username.toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(lowerUsername) as User | undefined;
  
  if (!user) return null;
  
  // Simple plaintext comparison as per requirements
  return user.password === password ? user : null;
}

// Get user by username
export function getUserByUsername(username: string): User | null {
  const lowerUsername = username.toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(lowerUsername) as User | undefined;
  return user || null;
}

// Get all users
export function getAllUsers(): User[] {
  return db.prepare('SELECT id, username, isAdmin, created_at FROM users').all() as User[];
}

// Create a new user
export function createUser(username: string, password: string, isAdmin: boolean = false): User | null {
  const lowerUsername = username.toLowerCase();
  // Check if user already exists
  const existingUser = getUserByUsername(lowerUsername);
  if (existingUser) return null;
  
  const result = db.prepare('INSERT INTO users (username, password, isAdmin) VALUES (?, ?, ?)').run(
    username, password, isAdmin ? 1 : 0
  );
  
  if (result.lastInsertRowid) {
    return getUserById(result.lastInsertRowid as number);
  }
  return null;
}

// Get user by ID
export function getUserById(id: number): User | null {
  const user = db.prepare('SELECT id, username, isAdmin, created_at FROM users WHERE id = ?').get(id) as User | undefined;
  return user || null;
}

// Update user
export function updateUser(id: number, data: {username?: string, password?: string, isAdmin?: boolean}): boolean {
  const currentUser = getUserById(id);
  if (!currentUser) return false;

  let sql = 'UPDATE users SET ';
  const params = [];
  const updates = [];
  
  if (data.username !== undefined) {
    updates.push('username = ?');
    params.push(data.username);
  }
  
  if (data.password !== undefined) {
    updates.push('password = ?');
    params.push(data.password);
  }
  
  if (data.isAdmin !== undefined) {
    updates.push('isAdmin = ?');
    params.push(data.isAdmin ? 1 : 0);
  }
  
  if (updates.length === 0) return false;
  
  sql += updates.join(', ') + ' WHERE id = ?';
  params.push(id);
  
  const result = db.prepare(sql).run(...params);
  return result.changes > 0;
}

// Delete user
export function deleteUser(id: number): boolean {
  // Don't allow deletion if this would leave no admin users
  const isAdmin = getUserById(id)?.isAdmin;
  
  if (isAdmin) {
    // Check if this is the last admin
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE isAdmin = 1').get() as { count: number };
    if (adminCount.count <= 1) {
      return false;
    }
  }
  
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return result.changes > 0;
}

// Check if any users exist
export function hasUsers(): boolean {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  return userCount.count > 0;
}

// Initialize users on import
initializeUsers();