const express = require('express');
const router = express.Router();
const { auth: authMiddleware } = require('../middleware/auth');

const Usuario = require('../models/Usuario');
const Mesa = require('../models/Mesa');
const Producto = require('../models/Producto');
const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');
const Caja = require('../models/Caja');

// ============================================================
// FIX: El error "Token requerido" ocurría porque el frontend
// usaba window.location.href que NO envía headers Authorization.
// Solución: aceptar token también por query param ?token=xxx
// ============================================================

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

// GET /api/backup/descargar
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
        totalMesas: mesas.length,
        totalProductos: productos.length,
        totalPedidos: pedidos.length,
        totalClientes: clientes.length,
        totalCajas: cajas.length
      }
    };

    const fecha = new Date().toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).replace(/\//g, '-');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backup-polleros-${fecha}.json"`);
    res.json(backup);

  } catch (error) {
    console.error('Error generando backup:', error);
    res.status(500).json({ error: 'Error al generar el backup: ' + error.message });
  }
});

// GET /api/backup — listar (compatibilidad con frontend)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/backup/crear — crear backup manual
router.post('/crear', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });

    const counts = await Promise.all([
      Usuario.countDocuments(), Mesa.countDocuments(), Producto.countDocuments(),
      Pedido.countDocuments(), Cliente.countDocuments(), Caja.countDocuments()
    ]);
    const tamaño = counts.reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      tamaño,
      mensaje: `Backup disponible: ${tamaño} registros`,
      fecha: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backup/estado
router.get('/estado', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });

    const [usuarios, mesas, productos, pedidos, clientes, cajas] = await Promise.all([
      Usuario.countDocuments(), Mesa.countDocuments(), Producto.countDocuments(),
      Pedido.countDocuments(), Cliente.countDocuments(), Caja.countDocuments()
    ]);

    res.json({
      success: true,
      estado: { usuarios, mesas, productos, pedidos, clientes, cajas,
        ultimaConsulta: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/backup/restaurar
router.post('/restaurar', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });

    const { datos } = req.body;
    if (!datos) return res.status(400).json({ error: 'No se encontraron datos en el backup' });

    const resultados = {};
    if (datos.productos?.length > 0) {
      await Producto.deleteMany({});
      await Producto.insertMany(datos.productos);
      resultados.productos = datos.productos.length;
    }
    if (datos.mesas?.length > 0) {
      await Mesa.deleteMany({});
      await Mesa.insertMany(datos.mesas);
      resultados.mesas = datos.mesas.length;
    }
    if (datos.clientes?.length > 0) {
      await Cliente.deleteMany({});
      await Cliente.insertMany(datos.clientes);
      resultados.clientes = datos.clientes.length;
    }

    res.json({ success: true, message: 'Backup restaurado correctamente', restaurado: resultados });
  } catch (error) {
    res.status(500).json({ error: 'Error al restaurar: ' + error.message });
  }
});

module.exports = router;
