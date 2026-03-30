/**
 * email.js — Rutas para envío de comprobantes por email
 * Autor: David Navarro Diaz
 */
const router = require('express').Router();
const { auth } = require('../middleware/auth');
const emailService = require('../services/emailService');
const Config = require('../models/Config');
const Pedido = require('../models/Pedido');
const Logger = require('../utils/logger');

// GET /api/email/estado — Verificar si el servicio está configurado
router.get('/estado', auth, async (_req, res) => {
  try {
    const configurado = emailService.estaConfigurado();
    const config = await Config.findOne();
    res.json({
      success: true,
      configurado,
      activo: config?.email?.activo ?? false
    });
  } catch (err) {
    Logger.error('Error en GET /email/estado:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/email/enviar/:pedidoId — Enviar comprobante de un pedido específico
router.post('/enviar/:pedidoId', auth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requerido' });
    }

    const pedido = await Pedido.findById(req.params.pedidoId);
    if (!pedido) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    const config = await Config.findOne();
    if (!config?.email?.activo) {
      return res.status(400).json({ success: false, message: 'El servicio de email no está activo' });
    }

    const resultado = await emailService.enviarComprobante(
      pedido.toObject(),
      config.toObject(),
      email
    );

    Logger.info(`Comprobante #${pedido.numero} enviado a ${email} por ${req.usuario.nombre}`);

    res.json({
      success: true,
      message: `Comprobante enviado a ${email}`,
      ...resultado
    });
  } catch (err) {
    Logger.error('Error enviando email:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/email/prueba — Enviar email de prueba
router.post('/prueba', auth, async (req, res) => {
  try {
    // Solo admin puede hacer pruebas
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo administradores pueden hacer pruebas' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requerido' });
    }

    await emailService.enviarPrueba(email);

    Logger.info(`Email de prueba enviado a ${email} por ${req.usuario.nombre}`);

    res.json({
      success: true,
      message: `Email de prueba enviado a ${email}`
    });
  } catch (err) {
    Logger.error('Error en email de prueba:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;