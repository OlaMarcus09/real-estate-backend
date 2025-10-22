import express from 'express';
const router = express.Router();

// GET all workers with their project assignments
router.get('/', async (req, res) => {
  try {
    const workers = await req.db.all(`
      SELECT w.*, 
      GROUP_CONCAT(pw.project_id) as assigned_project_ids,
      GROUP_CONCAT(p.name) as assigned_project_names
      FROM workers w
      LEFT JOIN project_workers pw ON w.id = pw.worker_id
      LEFT JOIN projects p ON pw.project_id = p.id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `);
    
    // Parse the concatenated fields
    const workersWithProjects = workers.map(worker => ({
      ...worker,
      assigned_project_ids: worker.assigned_project_ids ? worker.assigned_project_ids.split(',').map(Number) : [],
      assigned_project_names: worker.assigned_project_names ? worker.assigned_project_names.split(',') : []
    }));
    
    res.json(workersWithProjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new worker
router.post('/', async (req, res) => {
  try {
    const { name, role, hourly_rate, contact } = req.body;
    const result = await req.db.run(
      'INSERT INTO workers (name, role, hourly_rate, contact) VALUES (?, ?, ?, ?)',
      [name, role, hourly_rate, contact]
    );
    const worker = await req.db.get('SELECT * FROM workers WHERE id = ?', [result.lastID]);
    res.status(201).json(worker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign worker to project
router.post('/:workerId/assign', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { project_id, hours_worked = 0 } = req.body;
    
    // Get worker's hourly rate
    const worker = await req.db.get('SELECT hourly_rate FROM workers WHERE id = ?', [workerId]);
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    const result = await req.db.run(
      'INSERT INTO project_workers (project_id, worker_id, hours_worked, assigned_rate) VALUES (?, ?, ?, ?)',
      [project_id, workerId, hours_worked, worker.hourly_rate]
    );
    
    res.status(201).json({ 
      message: 'Worker assigned to project',
      assignment_id: result.lastID 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE worker
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if worker exists
    const worker = await req.db.get('SELECT * FROM workers WHERE id = ?', [id]);
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    // Remove from project assignments first
    await req.db.run('DELETE FROM project_workers WHERE worker_id = ?', [id]);
    
    // Then delete worker
    await req.db.run('DELETE FROM workers WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
