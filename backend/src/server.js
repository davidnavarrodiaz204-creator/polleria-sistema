/**
 * server.js — Servidor principal PollerOS v2.1
 * Arquitectura refactorizada con Clean Architecture
 * Autor: David Navarro Diaz
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { setupSocket } = require('./config/socket');

// Nuevos imports de arquitectura
const Logger = require('./utils/logger');
const { globalErrorHandler } = require('./interface/http/middlewares/errorHandler');
const { helmet, mongoSanitize, apiLimiter } = require('./interface/http/middlewares/security');
const { seed } = require('./infrastructure/persistence/seed');

// Inicializar conexión a BD
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

// ─── Middlewares de seguridad ───────────────────────────
app.use(helmet);
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(mongoSanitize);

// Rate limiting general para API
app.use('/api', apiLimiter);

// Parsing de body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Injectar io en requests para socket.io
app.use((req, _res, next) => { req.io = io; next(); });

// Request logging en desarrollo
if (process.env.NODE_ENV === 'development') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// ─── Rutas refactorizadas (nueva arquitectura) ──────────
app.use('/api/auth', require('./interface/http/routes/auth.routes'));

// ─── Rutas legacy (pendientes de refactor) ─────────────
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

// Rutas condicionales
const rutasOpcionales = ['inventario', 'reservas', 'facturacion', 'reset'];
rutasOpcionales.forEach(ruta => {
  try {
    app.use(`/api/${ruta}`, require(`./routes/${ruta}`));
  } catch(e) {
    // Silencio si no existe
  }
});

// ─── Health check mejorado ──────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.1.0',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ─── Manejo de rutas no encontradas ─────────────────────
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    status: 'fail',
    message: `No se encontró ${req.originalUrl} en este servidor`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// ─── Error handler global ─────────────────────────────
app.use(globalErrorHandler);

// ─── Setup Socket.io ────────────────────────────────────
setupSocket(io);

// ─── Seed inicial ───────────────────────────────────────
seed().catch(err => Logger.error('Error en seed:', err));

// ─── Backup automático cada 6 horas ───────────────────────
const hacerBackupAutomatico = async () => {
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
    const resumen = { usuarios:U, mesas:M, productos:Pr, pedidos:Pe, clientes:C, cajas:Ca };
    const tamaño = Object.values(resumen).reduce((a,b) => a+b, 0);
    await Backup.create({ tipo:'automatico', tamaño, resumen, creadoPor:'sistema' });
    Logger.info(`Backup automático: ${tamaño} registros`);
  } catch(e) {
    Logger.warn('Backup automático omitido:', e.message);
  }
};
setInterval(hacerBackupAutomatico, 6 * 60 * 60 * 1000);

// ─── Iniciar servidor ───────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  Logger.info(`🍗 PollerOS v2.1 corriendo en http://localhost:${PORT}`);
  Logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// ─── Manejo de errores no capturados ────────────────────
process.on('unhandledRejection', (err) => {
  Logger.error('UNHANDLED REJECTION:', err);
  // En producción, no matamos el proceso
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  Logger.error('UNCAUGHT EXCEPTION:', err);
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});
