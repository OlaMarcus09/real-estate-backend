import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let db;

export const initDB = async () => {
  try {
    // Use different database path for production (Railway has ephemeral storage)
    const dbPath = process.env.NODE_ENV === 'production' 
      ? '/tmp/real_estate.db'  // Railway ephemeral storage
      : './real_estate.db';    // Local development
    
    console.log(`📁 Using database path: ${dbPath}`);
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'Planning',
        budget REAL DEFAULT 0,
        spent REAL DEFAULT 0,
        progress_percent INTEGER DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        hourly_rate REAL NOT NULL,
        contact TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS project_workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        worker_id INTEGER,
        hours_worked REAL DEFAULT 0,
        assigned_rate REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        contact TEXT,
        rating INTEGER DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        vendor_id INTEGER,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        unit TEXT NOT NULL,
        stock_qty REAL DEFAULT 0,
        cost_per_unit REAL NOT NULL,
        project_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database initialized successfully');
    
    // Add sample data only if no projects exist
    const projectCount = await db.get('SELECT COUNT(*) as count FROM projects');
    if (projectCount.count === 0) {
      await db.run(
        'INSERT INTO projects (name, budget, status, progress_percent) VALUES (?, ?, ?, ?)',
        ['Sample Real Estate Project', 500000, 'Active', 25]
      );
      console.log('✅ Sample project added');
    }
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    throw err; // Re-throw to fail deployment if DB fails
  }
};
