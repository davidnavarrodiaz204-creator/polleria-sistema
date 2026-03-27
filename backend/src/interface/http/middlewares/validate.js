/**
 * validate.js — Middleware para express-validator
 * Centraliza el manejo de errores de validación
 */
const { validationResult } = require('express-validator');
const { ValidationError } = require('../../../utils/errors');

const validate = (validations) => {
  return async (req, res, next) => {
    // Ejecutar todas las validaciones
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Formatear errores
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    next(new ValidationError('Error de validación', formattedErrors));
  };
};

module.exports = { validate };
