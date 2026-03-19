const express = require('express');
const router = express.Router();
const { auth: authMiddleware } = require('../middleware/auth');

// Importa todos los modelos para el backup completo
const Usuario = require('../models/Usuario');
const Mesa = require('../models/Mesa');
const Producto = require('../models/Producto');
const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');
const CajaSession = require('../models/CajaSession');
const { auth: authMiddleware } = require('../middleware/auth');

// ============================================================
// FIX: El error "Token requerido" ocurría porque el frontend
// usaba window.location.href para descargar, lo que no enviaba
// el header Authorization. Solución: el token se acepta también
// por query param ?token=xxx  O por header Authorization.
// ============================================================

const authFlexible = (req, res, next) => {
  // Intentar token desde header (normal)
  const headerAuth = req.headers['authorization'];
  if (headerAuth && headerAuth.startsWith('Bearer ')) {
    req.headers['authorization'] = headerAuth;
    return authMiddleware(req, res, next);
  }

  // Intentar token desde query param (para descarga directa)
  const queryToken = req.query.token;
  if (queryToken) {
    req.headers['authorization'] = `Bearer ${queryToken}`;
    return authMiddleware(req, res, next);
  }

  return res.status(401).json({ error: 'Token requerido' });
};

// ============================================================
// GET /api/backup/descargar
// Descarga el backup completo en JSON
// Funciona con header Authorization O con ?token=xxx
// ============================================================
router.get('/descargar', authFlexible, async (req, res) => {
  try {
    // Solo admin puede descargar backup
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede descargar backups' });
    }

    const [usuarios, mesas, productos, pedidos, clientes, cajas] = await Promise.all([
      Usuario.find().select('-password').lean(),
      Mesa.find().lean(),
      Producto.find().lean(),
      Pedido.find().lean(),
      Cliente.find().lean(),
      CajaSession.find().lean()
    ]);

    const backup = {
      version: '1.0',
      restaurante: process.env.RESTAURANTE_NOMBRE || 'PollerOS',
      fecha: new Date().toISOString(),
      fechaLegible: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
      datos: {
        usuarios,
        mesas,
        productos,
        pedidos,
        clientes,
        cajas
      },
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
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');

    const nombreArchivo = `backup-polleros-${fecha}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.json(backup);

  } catch (error) {
    console.error('Error generando backup:', error);
    res.status(500).json({ error: 'Error al generar el backup: ' + error.message });
  }
});

// ============================================================
// GET /api/backup/estado
// Info rápida del estado de la base de datos
// ============================================================
router.get('/estado', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo administrador' });
    }

    const [usuarios, mesas, productos, pedidos, clientes, cajas] = await Promise.all([
      Usuario.countDocuments(),
      Mesa.countDocuments(),
      Producto.countDocuments(),
      Pedido.countDocuments(),
      Cliente.countDocuments(),
      CajaSession.countDocuments()
    ]);

    res.json({
      success: true,
      estado: {
        usuarios,
        mesas,
        productos,
        pedidos,
        clientes,
        cajas,
        ultimaConsulta: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/backup/restaurar
// Restaura datos desde un JSON de backup (solo admin)
// ============================================================
router.post('/restaurar', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede restaurar backups' });
    }

    const { datos } = req.body;
    if (!datos) {
      return res.status(400).json({ error: 'No se encontraron datos en el backup' });
    }

    const resultados = {};

    if (datos.productos && datos.productos.length > 0) {
      await Producto.deleteMany({});
      await Producto.insertMany(datos.productos);
      resultados.productos = datos.productos.length;
    }

    if (datos.mesas && datos.mesas.length > 0) {
      await Mesa.deleteMany({});
      await Mesa.insertMany(datos.mesas);
      resultados.mesas = datos.mesas.length;
    }

    if (datos.clientes && datos.clientes.length > 0) {
      await Cliente.deleteMany({});
      await Cliente.insertMany(datos.clientes);
      resultados.clientes = datos.clientes.length;
    }

    res.json({
      success: true,
      message: 'Backup restaurado correctamente',
      restaurado: resultados
    });

  } catch (error) {
    console.error('Error restaurando backup:', error);
    res.status(500).json({ error: 'Error al restaurar: ' + error.message });
  }
});

module.exports = router;
