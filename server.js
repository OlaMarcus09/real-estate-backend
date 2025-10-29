const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        units INTEGER,
        status VARCHAR(50) DEFAULT 'Planning',
        budget DECIMAL(15,2),
        spent DECIMAL(15,2) DEFAULT 0,
        start_date DATE,
        progress_percent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(100),
        hourly_rate DECIMAL(10,2),
        contact VARCHAR(255),
        total_paid DECIMAL(15,2) DEFAULT 0,
        last_payment_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS worker_payments (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        contact VARCHAR(255),
        rating INTEGER DEFAULT 5,
        total_paid DECIMAL(15,2) DEFAULT 0,
        last_payment_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vendor_payments (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        unit_price DECIMAL(10,2),
        min_stock INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables initialized with payment tracking');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
};

initDB();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Real Estate API with Payment Tracking',
    currency: 'Nigerian Naira (₦)',
    version: '2.1.0'
  });
});

// ... (Keep all your existing endpoints for projects, workers, vendors, inventory)

// WORKER PAYMENT ENDPOINTS
app.get('/api/workers/:id/payments', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM worker_payments WHERE worker_id = $1 ORDER BY payment_date DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workers/:id/payments', async (req, res) => {
  const { id } = req.params;
  const { amount, payment_date, description } = req.body;
  try {
    // Start transaction
    await pool.query('BEGIN');

    // Add payment record
    const paymentResult = await pool.query(
      'INSERT INTO worker_payments (worker_id, amount, payment_date, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, amount, payment_date, description]
    );

    // Update worker's total paid and last payment date
    await pool.query(
      'UPDATE workers SET total_paid = total_paid + $1, last_payment_date = $2 WHERE id = $3',
      [amount, payment_date, id]
    );

    await pool.query('COMMIT');
    res.json(paymentResult.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// VENDOR PAYMENT ENDPOINTS
app.get('/api/vendors/:id/payments', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM vendor_payments WHERE vendor_id = $1 ORDER BY payment_date DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vendors/:id/payments', async (req, res) => {
  const { id } = req.params;
  const { amount, payment_date, description } = req.body;
  try {
    // Start transaction
    await pool.query('BEGIN');

    // Add payment record
    const paymentResult = await pool.query(
      'INSERT INTO vendor_payments (vendor_id, amount, payment_date, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, amount, payment_date, description]
    );

    // Update vendor's total paid and last payment date
    await pool.query(
      'UPDATE vendors SET total_paid = total_paid + $1, last_payment_date = $2 WHERE id = $3',
      [amount, payment_date, id]
    );

    await pool.query('COMMIT');
    res.json(paymentResult.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Real Estate API with Payment Tracking running on port ${PORT}`);
  console.log(`💰 Currency: Nigerian Naira (₦)`);
});
