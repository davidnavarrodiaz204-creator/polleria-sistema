/**
 * caja.validator.js — Validaciones para operaciones de caja
 */
const { body } = require('express-validator');

const abrirCajaValidation = [
  body('montoApertura')
    .notEmpty().withMessage('El monto de apertura es requerido')
    .isFloat({ min: 0 }).withMessage('El monto debe ser un número positivo'),
];

const cerrarCajaValidation = [
  body('montoCierre')
    .notEmpty().withMessage('El monto de cierre es requerido')
    .isFloat({ min: 0 }).withMessage('El monto debe ser un número positivo'),
  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Observaciones no pueden exceder 1000 caracteres'),
];

module.exports = {
  abrirCajaValidation,
  cerrarCajaValidation,
};
