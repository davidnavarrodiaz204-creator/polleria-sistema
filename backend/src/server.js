/**
 * server.js — Servidor principal PollerOS v2.1
 * Ahora con: Helmet + Rate Limiting + Mongo Sanitize + Logger
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const { setupSocket } = require('./config/socket');
const Logger = require('./utils/logger');

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

// Seguridad: Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

// Sanitización MongoDB
app.use(mongoSanitize({ replaceWith: '_' }));

// Rate limiting global
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Demasiadas peticiones', code: 'RATE_LIMIT' }
});
app.use('/api', apiLimiter);

// Body parsing
app.use(express.json());
app.use((req, _res, next) => { req.io = io; next(); });

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/config', require('./routes/config'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/mesas', require('./routes/mesas'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/caja', require('./routes/caja'));
app.use('/api/egresos', require('./routes/egresos'));
app.use('/api/reportes', require('./routes/reportes'));

// Rutas opcionales
['inventario', 'reservas', 'facturacion', 'reset'].forEach(ruta => {
  try { app.use(`/api/${ruta}`, require(`./routes/${ruta}`)); } catch(e) {}
});

// Health check
app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  version: '2.1.0',
  timestamp: new Date(),
  env: process.env.NODE_ENV || 'development'
}));

// 404 handler
app.all('*', (req, res) => res.status(404).json({
  success: false, message: `Ruta ${req.originalUrl} no encontrada`
}));

// Error handler mejorado (MongoDB + Validation)
app.use((err, _req, res, _next) => {
  let statusCode = err.status || 500;
  let message = err.message || 'Error interno del servidor';
  let code = 'INTERNAL_ERROR';

  // Errores de MongoDB
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `ID inválido: ${err.value}`;
    code = 'INVALID_ID';
  } else if (err.code === 11000) {
    // Duplicado
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} ya existe en el sistema`;
    code = 'DUPLICATE_ERROR';
  } else if (err.name === 'ValidationError') {
    // Validación de Mongoose
    statusCode = 400;
    const messages = Object.values(err.errors).map(e => e.message);
    message = messages.join(', ');
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
    code = 'TOKEN_EXPIRED';
  }

  Logger.error(`[${statusCode}] ${message}`, { path: _req.path, method: _req.method });

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

setupSocket(io);

// Backup automático cada 6 horas
const hacerBackup = async () => {
  try {
    const Backup = require('./models/Backup');
    const [U, M, Pr, Pe, C, Ca] = await Promise.all([
      require('./models/Usuario').countDocuments(),
      require('./models/Mesa').countDocuments(),
      require('./models/Producto').countDocuments(),
      require('./models/Pedido').countDocuments(),
      require('./models/Cliente').countDocuments(),
      require('./models/Caja').countDocuments(),
    ]);
    const resumen = { usuarios: U, mesas: M, productos: Pr, pedidos: Pe, clientes: C, cajas: Ca };
    await Backup.create({ tipo: 'automatico', tamaño: Object.values(resumen).reduce((a, b) => a + b, 0), resumen, creadoPor: 'sistema' });
    Logger.info('Backup automático realizado');
  } catch (e) {
    Logger.warn('Backup omitido:', e.message);
  }
};
setInterval(hacerBackup, 6 * 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  Logger.info(`🍗 PollerOS v2.1 en http://localhost:${PORT}`);
});

process.on('unhandledRejection', (err) => Logger.error('Unhandled:', err));
process.on('uncaughtException', (err) => Logger.error('Uncaught:', err));
