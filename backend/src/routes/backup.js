const express = require('express');
const router = express.Router();
const { auth: authMiddleware } = require('../middleware/auth');

const Usuario  = require('../models/Usuario');
const Mesa     = require('../models/Mesa');
const Producto = require('../models/Producto');
const Pedido   = require('../models/Pedido');
const Cliente  = require('../models/Cliente');
const Caja     = require('../models/Caja');
const Backup   = require('../models/Backup');

// Auth flexible: header Bearer O ?token=xxx (para descarga directa)
const authFlexible = (req, res, next) => {
  const h = req.headers['authorization'];
  if (h && h.startsWith('Bearer ')) return authMiddleware(req, res, next);
  const t = req.query.token;
  if (t) { req.headers['authorization'] = `Bearer ${t}`; return authMiddleware(req, res, next); }
  return res.status(401).json({ error: 'Token requerido' });
};

// ── GET /api/backup — historial de backups ────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });
    const backups = await Backup.find().sort({ createdAt: -1 }).limit(20);
    res.json(backups);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── POST /api/backup/crear — registra backup en historial ─────
router.post('/crear', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });

    const [usuarios, mesas, productos, pedidos, clientes, cajas] = await Promise.all([
      Usuario.countDocuments(), Mesa.countDocuments(), Producto.countDocuments(),
      Pedido.countDocuments(),  Cliente.countDocuments(), Caja.countDocuments()
    ]);

    const resumen = { usuarios, mesas, productos, pedidos, clientes, cajas };
    const tamaño  = Object.values(resumen).reduce((a, b) => a + b, 0);

    // Guardar registro en historial
    const backup = await Backup.create({
      tipo: req.body.tipo || 'manual',
      tamaño,
      resumen,
      creadoPor: req.usuario.nombre || req.usuario.email || 'admin'
    });

    res.json({ success: true, _id: backup._id, tamaño, resumen });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── GET /api/backup/descargar — descarga JSON completo ────────
// Acepta: Authorization Bearer O ?token=xxx
router.get('/descargar', authFlexible, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });

    const [usuarios, mesas, productos, pedidos, clientes, cajas] = await Promise.all([
      Usuario.find().select('-password').lean(),
      Mesa.find().lean(),
      Producto.find().lean(),
      Pedido.find().lean(),
      Cliente.find().lean(),
      Caja.find().lean()
    ]);

    const backup = {
      version:     '1.0',
      restaurante: process.env.RESTAURANTE_NOMBRE || 'PollerOS',
      fecha:       new Date().toISOString(),
      fechaLegible: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
      datos:       { usuarios, mesas, productos, pedidos, clientes, cajas },
      resumen: {
        totalUsuarios:  usuarios.length,
        totalMesas:     mesas.length,
        totalProductos: productos.length,
        totalPedidos:   pedidos.length,
        totalClientes:  clientes.length,
        totalCajas:     cajas.length
      }
    };

    const fecha = new Date().toLocaleDateString('es-PE', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
    }).replace(/\//g, '-');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backup-polleros-${fecha}.json"`);
    res.json(backup);
  } catch (error) { res.status(500).json({ error: 'Error al generar backup: ' + error.message }); }
});

// ── DELETE /api/backup/:id — eliminar registro historial ──────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });
    await Backup.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
