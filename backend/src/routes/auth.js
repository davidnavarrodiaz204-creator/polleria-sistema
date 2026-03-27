/**
 * auth.js — Rutas de autenticación refactorizadas
 * Ahora con: validaciones + rate limiting + service layer
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');
const Config = require('../models/Config');
const Mesa = require('../models/Mesa');
const Producto = require('../models/Producto');
const { auth } = require('../middleware/auth');

// Seed inicial
const seed = async () => {
  const count = await Usuario.countDocuments();
  if (count > 0) return;
  console.log('🌱 Creando datos iniciales...');
  await Usuario.create({ nombre: 'Admin Principal', usuario: 'admin', password: 'admin123', rol: 'admin' });
  await Usuario.create({ nombre: 'Carlos Quispe', usuario: 'carlos', password: 'mozo123', rol: 'mozo' });
  await Usuario.create({ nombre: 'Ana Torres', usuario: 'ana', password: 'mozo123', rol: 'mozo' });
  await Usuario.create({ nombre: 'Miguel Rojas', usuario: 'miguel', password: 'cocina123', rol: 'cocina' });
  await Usuario.create({ nombre: 'Luis Huanca', usuario: 'luis', password: 'delivery123', rol: 'delivery' });
  await Config.create({});
  for (let i = 1; i <= 10; i++) {
    await Mesa.create({ numero: i, capacidad: i <= 2 ? 2 : i <= 6 ? 4 : 6 });
  }
  await Producto.insertMany([
    { nombre: 'Pollo Entero a la Brasa', categoria: 'Pollos', precio: 38, emoji: '🍗' },
    { nombre: '1/2 Pollo a la Brasa', categoria: 'Pollos', precio: 22, emoji: '🍗' },
    { nombre: '1/4 Pollo a la Brasa', categoria: 'Pollos', precio: 14, emoji: '🍗' },
    { nombre: 'Pechuga', categoria: 'Presas', precio: 10, emoji: '🥩' },
    { nombre: 'Pierna', categoria: 'Presas', precio: 9, emoji: '🦵' },
    { nombre: 'Ala', categoria: 'Presas', precio: 7, emoji: '🍖' },
    { nombre: 'Papas Fritas Grandes', categoria: 'Acompañamientos', precio: 8, emoji: '🍟' },
    { nombre: 'Ensalada Fresca', categoria: 'Acompañamientos', precio: 5, emoji: '🥗' },
    { nombre: 'Crema Huancaína', categoria: 'Acompañamientos', precio: 4, emoji: '🫙' },
    { nombre: 'Yuca Frita', categoria: 'Acompañamientos', precio: 6, emoji: '🍠' },
    { nombre: 'Inca Kola 500ml', categoria: 'Bebidas', precio: 4, emoji: '🥤' },
    { nombre: 'Coca Cola 500ml', categoria: 'Bebidas', precio: 4, emoji: '🥤' },
    { nombre: 'Chicha Morada', categoria: 'Bebidas', precio: 5, emoji: '🍇' },
    { nombre: 'Agua San Luis 625ml', categoria: 'Bebidas', precio: 3, emoji: '💧' },
    { nombre: 'Kola Escocesa', categoria: 'Bebidas', precio: 4, emoji: '🥤' },
    { nombre: 'Jugo de Maracuyá', categoria: 'Bebidas', precio: 6, emoji: '🍹' },
    { nombre: 'Arroz con Leche', categoria: 'Postres', precio: 6, emoji: '🍮' },
    { nombre: 'Mazamorra Morada', categoria: 'Postres', precio: 6, emoji: '🍮' },
  ]);
  console.log('✅ Datos iniciales creados');
};
seed().catch(console.error);

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Demasiados intentos. Intenta en 15 minutos.', code: 'RATE_LIMIT' }
});

// Validaciones de login
const loginValidation = [
  body('usuario').trim().notEmpty().withMessage('Usuario requerido').toLowerCase(),
  body('password').notEmpty().withMessage('Contraseña requerida')
];

// Middleware de validación
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
    });
  }
  next();
};

// POST /api/auth/login - con rate limiting y validación
router.post('/login', loginLimiter, loginValidation, validate, async (req, res) => {
  try {
    const { usuario, password } = req.body;
    const user = await Usuario.findOne({ usuario: usuario.toLowerCase(), activo: true });
    if (!user) return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    const valido = await user.comparePassword(password);
    if (!valido) return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    const token = jwt.sign({ id: user._id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      usuario: { id: user._id, nombre: user.nombre, usuario: user.usuario, rol: user.rol }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await Usuario.findById(req.usuario._id).select('-password');
    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
