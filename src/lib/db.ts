import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database connection
const db = new Database(path.join(dataDir, 'boxmgr.sqlite'));

// Initialize the database schema if it doesn't exist
function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      isAdmin BOOLEAN NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS box_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      box_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (box_id) REFERENCES boxes (id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
      UNIQUE(box_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Check if we need to migrate existing settings table to add the description column
  try {
    db.prepare('SELECT description FROM settings LIMIT 1').get();
  } catch {
    // description column doesn't exist, need to add it
    try {
      console.log('Adding description column to settings table...');
      db.exec('ALTER TABLE settings ADD COLUMN description TEXT;');
      console.log('Added description column to settings table successfully.');
    } catch (alterError) {
      console.error('Error adding description column:', alterError);
    }
  }

  // Check if we need to migrate existing users table to add the isAdmin column
  try {
    db.prepare('SELECT isAdmin FROM users LIMIT 1').get();
  } catch {
    // isAdmin column doesn't exist, need to add it
    try {
      console.log('Adding isAdmin column to users table...');
      db.exec('ALTER TABLE users ADD COLUMN isAdmin BOOLEAN NOT NULL DEFAULT 0;');
      console.log('Added isAdmin column to users table successfully.');
      
      // Set the 'user' account as admin by default
      db.exec("UPDATE users SET isAdmin = 1 WHERE username = 'user';");
      console.log('Set default user as admin.');
    } catch (alterError) {
      console.error('Error adding isAdmin column:', alterError);
    }
  }
  
  // Check if we need to migrate existing users table to add the created_at column
  try {
    db.prepare('SELECT created_at FROM users LIMIT 1').get();
  } catch {
    // created_at column doesn't exist, need to add it
    try {
      console.log('Adding created_at column to users table...');
      
      // SQLite doesn't support adding a column with DEFAULT CURRENT_TIMESTAMP directly
      // First add the column without a default value
      db.exec('ALTER TABLE users ADD COLUMN created_at TEXT;');
      
      // Then update existing records with current timestamp
      const currentTime = new Date().toISOString();
      db.exec(`UPDATE users SET created_at = '${currentTime}';`);
      
      console.log('Added created_at column to users table successfully and set values for existing users.');
    } catch (alterError) {
      console.error('Error adding created_at column:', alterError);
      // If we encounter an error, force create a new users table with the right schema
      try {
        console.log('Attempting to recreate users table with correct schema...');
        const currentTime = new Date().toISOString();
        
        // Create a backup of current users
        db.exec(`
          CREATE TABLE IF NOT EXISTS users_backup (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            isAdmin BOOLEAN NOT NULL DEFAULT 0
          );
          
          INSERT INTO users_backup (id, username, password, isAdmin)
          SELECT id, username, password, isAdmin FROM users;
        `);
        
        // Drop and recreate the users table with the correct schema
        db.exec(`
          DROP TABLE IF EXISTS users;
          
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            isAdmin BOOLEAN NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          
          INSERT INTO users (id, username, password, isAdmin, created_at)
          SELECT id, username, password, isAdmin, '${currentTime}' FROM users_backup;
          
          DROP TABLE users_backup;
        `);
        
        console.log('Successfully recreated users table with correct schema.');
      } catch (recreateError) {
        console.error('Failed to recreate users table:', recreateError);
      }
    }
  }
  
  // Ensure at least one admin exists in the system
  try {
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE isAdmin = 1').get() as { count: number };
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (adminCount.count === 0 && totalUsers.count > 0) {
      console.log('No admin users found. Upgrading all existing users to admin...');
      db.exec('UPDATE users SET isAdmin = 1');
      console.log('All users have been upgraded to admin.');
    }
  } catch {
    console.error('Error checking for admin users');
  }
}

// Initialize the database
initDb();

// Helper functions for settings
export function getSetting(key: string): string | null {
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return result ? result.value : null;
}

export function setSetting(key: string, value: string, description?: string): void {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, description)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, description = excluded.description
  `);
  stmt.run(key, value, description || null);
}

// Function to force migration of the database schema
export function ensureDatabaseMigrated() {
  console.log('Ensuring database schema is up to date...');
  initDb();
  console.log('Database schema check completed.');
  
  // Verify migration was successful
  try {
    // Verify users table has the created_at column
    const userColumns = db.prepare("PRAGMA table_info(users)").all() as {name: string}[];
    const hasCreatedAt = userColumns.some(col => col.name === 'created_at');
    
    if (!hasCreatedAt) {
      console.error('Migration failed! The created_at column is still missing from users table.');
      console.error('Attempting to fix by recreating the table...');
      
      // Last resort - if migrations failed twice, recreate the table
      const currentTime = new Date().toISOString();
      try {
        db.exec(`
          -- Create a backup of current users
          CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
          
          -- Drop and recreate the users table with the correct schema
          DROP TABLE users;
          
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            isAdmin BOOLEAN NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT '${currentTime}'
          );
          
          -- Copy data from backup, adding the created_at column
          INSERT INTO users (id, username, password, isAdmin, created_at)
          SELECT 
            id, 
            username, 
            password, 
            COALESCE(isAdmin, 0),
            '${currentTime}'
          FROM users_backup;
          
          DROP TABLE users_backup;
        `);
        console.log('Users table successfully recreated with the correct schema.');
      } catch (recreateError) {
        console.error('Failed in final attempt to fix users table:', recreateError);
        console.error('APPLICATION MAY NOT FUNCTION CORRECTLY.');
      }
    } else {
      console.log('Verified users table has created_at column.');
    }
  } catch (verifyError) {
    console.error('Error verifying migration:', verifyError);
  }
}

export { db };
export { initDb };
