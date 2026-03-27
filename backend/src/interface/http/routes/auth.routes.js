/**
 * auth.routes.js — Rutas de autenticación refactorizadas
 * Usa: controller + service + validaciones + rate limiting
 */
const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate');
const { security } = require('../middlewares/security');
const { loginValidation, createUserValidation } = require('../validators/auth.validator');
const { auth, soloAdmin } = require('../../../../middleware/auth');

// POST /api/auth/login - con rate limiting y validación
router.post('/login', security.authLimiter, validate(loginValidation), authController.login);

// GET /api/auth/me - requiere auth
router.get('/me', auth, authController.getProfile);

// POST /api/auth/register - solo admin, con validación
router.post('/register', auth, soloAdmin, validate(createUserValidation), authController.register);

// PUT /api/auth/change-password - cambio de contraseña
router.put('/change-password', auth, authController.changePassword);

module.exports = router;
