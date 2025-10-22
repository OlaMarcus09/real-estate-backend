import express from 'express';
const router = express.Router();

// GET all vendors
router.get('/', async (req, res) => {
  try {
    const vendors = await req.db.all('SELECT * FROM vendors ORDER BY created_at DESC');
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new vendor
router.post('/', async (req, res) => {
  try {
    const { name, category, contact, rating } = req.body;
    const result = await req.db.run(
      'INSERT INTO vendors (name, category, contact, rating) VALUES (?, ?, ?, ?)',
      [name, category, contact, rating || 5]
    );
    const vendor = await req.db.get('SELECT * FROM vendors WHERE id = ?', [result.lastID]);
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
