require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const taskRoutes = require('./routes/tasks');
const adminRoutes = require('./routes/admin');

// Socket handler
const initializeSocket = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Support one or more comma-separated origins, e.g.
// CLIENT_URL=http://localhost:5173,https://taskflow.example.com
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server, mobile apps)
    if (!origin || allowedOrigins.includes(origin ) || 
    (
      (origin.includes('taskflow') && origin.endsWith('.vercel.app') 
      ) 
    ))
    {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin "${origin}" is not allowed.`));
  },
  credentials: true,
};

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || 
    (
      (origin.includes('taskflow') && origin.endsWith('.vercel.app') 
      ) 
    )) {
        return callback(null, true);
      }
      return callback(new Error(`Socket.IO CORS: origin "${origin}" is not allowed.`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach io to req so controllers can use it
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ── Optional: serve the built React app from this same server ────────────────
// Set SERVE_CLIENT=true and build the client into ../client/dist first.
// Useful for single-service deployments (e.g. one Render web service).
if (process.env.SERVE_CLIENT === 'true') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));

  // SPA fallback — anything not matching /api/* returns index.html
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 handler (API routes only reach here)
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Initialize Socket.IO handlers
initializeSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 TaskFlow server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
