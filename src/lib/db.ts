import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database connection
const db = new Database(path.join(dataDir, 'boxmgr.sqlite'), { verbose: console.log });

// Initialize the database schema if it doesn't exist
function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    )
  `);

  // Boxes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      name TEXT NOT NULL,
      categoryId INTEGER NOT NULL,
      notes TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories (id) ON DELETE CASCADE
    )
  `);

  // Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      boxId INTEGER NOT NULL,
      FOREIGN KEY (boxId) REFERENCES boxes (id) ON DELETE CASCADE
    )
  `);
}

// Initialize the database
initDb();

export default db;
export { initDb };