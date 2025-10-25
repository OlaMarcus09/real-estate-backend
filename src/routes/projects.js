import express from 'express';
import { loadDB, saveDB, getNextId } from '../config/database.js';

const router = express.Router();

// GET all projects
router.get('/', (req, res) => {
  try {
    const data = loadDB();
    res.json(data.projects || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single project
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadDB();
    const project = data.projects.find(p => p.id === parseInt(id));
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new project
router.post('/', (req, res) => {
  try {
    const { name, budget, start_date, status } = req.body;
    const data = loadDB();
    
    const newProject = {
      id: getNextId(data, 'projects'),
      name,
      budget: parseFloat(budget) || 0,
      status: status || 'Planning',
      spent: 0,
      progress_percent: 0,
      start_date: start_date || null,
      end_date: null,
      created_at: new Date().toISOString()
    };
    
    data.projects.push(newProject);
    saveDB(data);
    
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE project
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadDB();
    
    const projectIndex = data.projects.findIndex(p => p.id === parseInt(id));
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    data.projects.splice(projectIndex, 1);
    saveDB(data);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
