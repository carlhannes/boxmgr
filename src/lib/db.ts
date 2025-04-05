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
  } catch (error) {
    // description column doesn't exist, need to add it
    try {
      console.log('Adding description column to settings table...', error);
      db.exec('ALTER TABLE settings ADD COLUMN description TEXT;');
      console.log('Added description column to settings table successfully.');
    } catch (alterError) {
      console.error('Error adding description column:', alterError);
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