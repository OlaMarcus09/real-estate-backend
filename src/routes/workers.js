import express from 'express';
import { loadDB, saveDB, getNextId } from '../config/database.js';

const router = express.Router();

// GET all workers
router.get('/', (req, res) => {
  try {
    const data = loadDB();
    res.json(data.workers || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new worker
router.post('/', (req, res) => {
  try {
    const { name, role, hourly_rate, contact } = req.body;
    const data = loadDB();
    
    const newWorker = {
      id: getNextId(data, 'workers'),
      name,
      role,
      hourly_rate: parseFloat(hourly_rate) || 0,
      contact: contact || '',
      created_at: new Date().toISOString()
    };
    
    data.workers.push(newWorker);
    saveDB(data);
    
    res.status(201).json(newWorker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE worker
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadDB();
    
    const workerIndex = data.workers.findIndex(w => w.id === parseInt(id));
    if (workerIndex === -1) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    data.workers.splice(workerIndex, 1);
    saveDB(data);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
