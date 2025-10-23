import express from 'express';
import cors from 'cors';
import { initDB } from './config/database.js';
import projectRoutes from './routes/projects.js';
import workerRoutes from './routes/workers.js';
import vendorRoutes from './routes/vendors.js';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for production
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://real-estate-project-manager.vercel.app',
    'https://*.vercel.app',
    'https://*.onrender.com'
  ],
  credentials: true
}));

app.use(express.json());

// Add database to request object
app.use((req, res, next) => {
  req.db = { loadDB: () => require('./config/database.js').loadDB() };
  next();
});

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/vendors', vendorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'JSON',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Real Estate Project Manager API',
    version: '1.0.0',
    database: 'JSON File',
    endpoints: {
      health: '/api/health',
      projects: '/api/projects',
      workers: '/api/workers',
      vendors: '/api/vendors'
    }
  });
});

// Initialize and start server
console.log('🚀 Starting Real Estate Backend...');
initDB();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health: http://0.0.0.0:${PORT}/api/health`);
});
