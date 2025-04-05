import db from './db';

// Default users to initialize if none exist
const defaultUsers = [
  { username: 'user', password: 'password' },
  { username: 'spouse', password: 'password' }
];

// Initialize users table with default users if empty
export function initializeUsers() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    const insertUser = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    
    // Add default users
    for (const user of defaultUsers) {
      // In a real-world scenario, we'd hash the passwords, but per requirements
      // we're keeping it simple with plaintext
      insertUser.run(user.username, user.password);
    }
  }
}

// Authenticate user
export function authenticateUser(username: string, password: string) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as { id: number; username: string; password: string } | undefined;
  
  if (!user) return false;
  
  // Simple plaintext comparison as per requirements
  return user.password === password;
}

// Initialize users on import
initializeUsers();