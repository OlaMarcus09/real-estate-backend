import express from 'express';
const router = express.Router();

// GET all projects
router.get('/', async (req, res) => {
  try {
    const projects = await req.db.all('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single project
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await req.db.get('SELECT * FROM projects WHERE id = ?', [id]);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new project
router.post('/', async (req, res) => {
  try {
    const { name, budget, start_date, status } = req.body;
    const result = await req.db.run(
      'INSERT INTO projects (name, budget, start_date, status) VALUES (?, ?, ?, ?)',
      [name, budget, start_date, status || 'Planning']
    );
    const project = await req.db.get('SELECT * FROM projects WHERE id = ?', [result.lastID]);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if project exists
    const project = await req.db.get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    await req.db.run('DELETE FROM projects WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
