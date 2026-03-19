const express = require('express');
const router = express.Router();
const { auth: authMiddleware } = require('../middleware/auth');

const Usuario  = require('../models/Usuario');
const Mesa     = require('../models/Mesa');
const Producto = require('../models/Producto');
const Pedido   = require('../models/Pedido');
const Cliente  = require('../models/Cliente');
const Caja     = require('../models/Caja');

// ── Auth flexible: acepta token por header O por ?token=xxx ──
const authFlexible = (req, res, next) => {
  const headerAuth = req.headers['authorization'];
  if (headerAuth && headerAuth.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }
  const queryToken = req.query.token;
  if (queryToken) {
    req.headers['authorization'] = `Bearer ${queryToken}`;
    return authMiddleware(req, res, next);
  }
  return res.status(401).json({ error: 'Token requerido' });
};

// ── GET /api/backup/descargar ─────────────────────────────────
// Descarga JSON completo. Acepta header Auth O ?token=xxx
router.get('/descargar', authFlexible, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede descargar backups' });
    }

    const [usuarios, mesas, productos, pedidos, clientes, cajas] = await Promise.all([
      Usuario.find().select('-password').lean(),
      Mesa.find().lean(),
      Producto.find().lean(),
      Pedido.find().lean(),
      Cliente.find().lean(),
      Caja.find().lean()
    ]);

    const backup = {
      version: '1.0',
      restaurante: process.env.RESTAURANTE_NOMBRE || 'PollerOS',
      fecha: new Date().toISOString(),
      fechaLegible: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
      datos: { usuarios, mesas, productos, pedidos, clientes, cajas },
      resumen: {
        totalUsuarios: usuarios.length,
        totalMesas:    mesas.length,
        totalProductos: productos.length,
        totalPedidos:  pedidos.length,
        totalClientes: clientes.length,
        totalCajas:    cajas.length
      }
    };

    const fecha = new Date().toLocaleDateString('es-PE', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
    }).replace(/\//g, '-');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backup-polleros-${fecha}.json"`);
    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: 'Error al generar backup: ' + error.message });
  }
});

// ── GET /api/backup — lista vacía (compatibilidad frontend) ───
router.get('/', authMiddleware, async (req, res) => {
  res.json([]);
});

// ── POST /api/backup/crear — devuelve stats para el mensaje ──
router.post('/crear', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });
    const counts = await Promise.all([
      Usuario.countDocuments(), Mesa.countDocuments(), Producto.countDocuments(),
      Pedido.countDocuments(),  Cliente.countDocuments(), Caja.countDocuments()
    ]);
    const tamaño = counts.reduce((a, b) => a + b, 0);
    res.json({ success: true, tamaño, mensaje: `${tamaño} registros listos para descargar` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
