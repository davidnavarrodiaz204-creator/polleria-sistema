/**
 * auth.validator.js — Validaciones para autenticación
 */
const { body } = require('express-validator');

const loginValidation = [
  body('usuario')
    .trim()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ min: 3, max: 30 }).withMessage('Usuario debe tener entre 3 y 30 caracteres')
    .toLowerCase(),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
];

const createUserValidation = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  body('usuario')
    .trim()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ min: 3, max: 30 }).withMessage('Usuario debe tener entre 3 y 30 caracteres')
    .matches(/^[a-z0-9_]+$/).withMessage('Usuario solo puede contener letras minúsculas, números y guiones bajos')
    .toLowerCase(),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol')
    .optional()
    .isIn(['admin', 'cajero', 'mozo', 'cocina', 'delivery']).withMessage('Rol inválido'),
];

module.exports = {
  loginValidation,
  createUserValidation,
};
