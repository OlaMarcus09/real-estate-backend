import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use different database path for production
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/data.json'
  : './data.json';

// Default data structure
const defaultData = {
  projects: [
    {
      id: 1,
      name: "Sample Real Estate Project",
      status: "Active",
      budget: 500000,
      spent: 0,
      progress_percent: 25,
      start_date: null,
      end_date: null,
      created_at: new Date().toISOString()
    }
  ],
  workers: [],
  vendors: [],
  expenses: [],
  inventory_items: [],
  project_workers: []
};

// Initialize database
export const initDB = () => {
  try {
    console.log(`📁 Using database path: ${dbPath}`);
    
    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      console.log('🆕 Creating new database file...');
      saveDB(defaultData);
      console.log('✅ Database initialized with sample data');
    } else {
      console.log('✅ Existing database loaded');
    }
    
    return loadDB();
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    // Return default data if there's an error
    return defaultData;
  }
};

// Load database from file
export const loadDB = () => {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(data);
    }
    return defaultData;
  } catch (err) {
    console.error('❌ Error loading database:', err);
    return defaultData;
  }
};

// Save database to file
export const saveDB = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Error saving database:', err);
  }
};

// Helper function to get next ID for any table
export const getNextId = (data, tableName) => {
  const items = data[tableName] || [];
  if (items.length === 0) return 1;
  return Math.max(...items.map(item => item.id)) + 1;
};
