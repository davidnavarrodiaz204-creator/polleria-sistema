/**
 * server.js — Servidor principal PollerOS
 * Autor: David Navarro Diaz
 */
require('dotenv').config();
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors   = require('cors');
const connectDB     = require('./config/db');
const { setupSocket } = require('./config/socket');

connectDB();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use((req, _res, next) => { req.io = io; next(); });

// ── Rutas ──────────────────────────────────────────────────────
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
app.use('/api/inventario',require('./routes/inventario'));
app.use('/api/reservas',  require('./routes/reservas'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date() })
);

setupSocket(io);

// ── Backup automático cada 6 horas ────────────────────────────
const Backup   = require('./models/Backup');
const Usuario  = require('./models/Usuario');
const Mesa     = require('./models/Mesa');
const Producto = require('./models/Producto');
const Pedido   = require('./models/Pedido');
const Cliente  = require('./models/Cliente');
const Caja     = require('./models/Caja');

const hacerBackupAutomatico = async () => {
  try {
    const [usuarios, mesas, productos, pedidos, clientes, cajas] = await Promise.all([
      Usuario.countDocuments(), Mesa.countDocuments(), Producto.countDocuments(),
      Pedido.countDocuments(),  Cliente.countDocuments(), Caja.countDocuments()
    ]);
    const resumen = { usuarios, mesas, productos, pedidos, clientes, cajas };
    const tamaño  = Object.values(resumen).reduce((a, b) => a + b, 0);
    await Backup.create({ tipo: 'automatico', tamaño, resumen, creadoPor: 'sistema' });
    console.log(`✅ Backup automático creado: ${tamaño} registros`);
  } catch (err) {
    console.error('❌ Error en backup automático:', err.message);
  }
};

// Ejecutar cada 6 horas (6 * 60 * 60 * 1000 ms)
setInterval(hacerBackupAutomatico, 6 * 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`🍗 PollerOS v2.0 corriendo en http://localhost:${PORT}`)
);
