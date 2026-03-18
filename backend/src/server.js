require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { setupSocket } = require('./config/socket');

// Conectar a MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// ── Middleware global ──────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Inyectar io en cada request
app.use((req, _res, next) => { req.io = io; next(); });

// ── Rutas ─────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/config',    require('./routes/config'));
app.use('/api/usuarios',  require('./routes/usuarios'));
app.use('/api/mesas',     require('./routes/mesas'));
app.use('/api/menu',      require('./routes/menu'));
app.use('/api/pedidos',   require('./routes/pedidos'));
app.use('/api/delivery',  require('./routes/delivery'));
app.use('/api/clientes',  require('./routes/clientes'));
app.use('/api/whatsapp',  require('./routes/whatsapp'));
app.use('/api/backup',    require('./routes/backup'));
app.use('/api/caja',      require('./routes/caja'));
app.use('/api/egresos',   require('./routes/egresos'));
app.use('/api/reportes',  require('./routes/reportes'));

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date() })
);

// ── Socket.io ─────────────────────────────────────────────
setupSocket(io);

// ── Servidor ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`🍗 PollerOS corriendo en http://localhost:${PORT}`)
);
