import express from 'express';
import { loadDB, saveDB, getNextId } from '../config/database.js';

const router = express.Router();

// GET all vendors
router.get('/', (req, res) => {
  try {
    const data = loadDB();
    res.json(data.vendors || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new vendor
router.post('/', (req, res) => {
  try {
    const { name, category, contact, rating } = req.body;
    const data = loadDB();
    
    const newVendor = {
      id: getNextId(data, 'vendors'),
      name,
      category: category || '',
      contact: contact || '',
      rating: parseInt(rating) || 5,
      created_at: new Date().toISOString()
    };
    
    data.vendors.push(newVendor);
    saveDB(data);
    
    res.status(201).json(newVendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
