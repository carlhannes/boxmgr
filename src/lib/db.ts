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

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      number INTEGER,
      category_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
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
      
      // Set all existing users as admin by default for backward compatibility
      db.exec("UPDATE users SET isAdmin = 1;");
      console.log('Set existing users as admin.');
    } catch (alterError) {
      console.error('Error adding isAdmin column:', alterError);
    }
  }
  
  // Check if we need to migrate existing boxes table to add the category_id column
  try {
    db.prepare('SELECT category_id FROM boxes LIMIT 1').get();
  } catch {
    // category_id column doesn't exist, need to add it
    try {
      console.log('Adding category_id column to boxes table...');
      db.exec('ALTER TABLE boxes ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;');
      console.log('Added category_id column to boxes table successfully.');
    } catch (alterError) {
      console.error('Error adding category_id column to boxes table:', alterError);
    }
  }
  
  // Check if we need to migrate existing boxes table to add the number column
  try {
    db.prepare('SELECT number FROM boxes LIMIT 1').get();
  } catch {
    // number column doesn't exist, need to add it
    try {
      console.log('Adding number column to boxes table...');
      db.exec('ALTER TABLE boxes ADD COLUMN number INTEGER;');
      console.log('Added number column to boxes table successfully.');
    } catch (alterError) {
      console.error('Error adding number column to boxes table:', alterError);
    }
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

export { db };
export { initDb };
