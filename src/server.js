const app = require('./app');
const pool = require('./config/database');
const config = require('./config/env');
const http = require('http');
const { Server } = require('socket.io');

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Join room based on user role
  socket.on('join', (data) => {
    const { role, userId } = data;
    socket.join(role); // Join role-based room (admin, staff, agency)
    socket.join(`user_${userId}`); // Join user-specific room
    console.log(`👤 User ${userId} joined room: ${role}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Test database connection
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected successfully');
});

const PORT = config.PORT;

server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 API base URL: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket is ready on ws://localhost:${PORT}`);
});
