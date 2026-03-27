/**
 * errorHandler.js — Manejo centralizado de errores
 * Convierte cualquier error en respuesta JSON estandarizada
 */
const Logger = require('../../../utils/logger');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const response = {
    success: false,
    status: err.status,
    message: err.message,
    code: err.code || 'INTERNAL_ERROR',
  };

  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.errors = err.errors; // Validaciones detalladas
  }

  // Log del error
  if (err.statusCode >= 500) {
    Logger.error(`[${err.statusCode}] ${err.message}`, {
      path: req.path,
      method: req.method,
      stack: err.stack
    });
  } else {
    Logger.warn(`[${err.statusCode}] ${err.message}`, {
      path: req.path,
      method: req.method
    });
  }

  res.status(err.statusCode).json(response);
};

// Handler para errores de MongoDB (duplicados, cast errors, etc.)
const handleMongoErrors = (err) => {
  if (err.name === 'CastError') {
    return { statusCode: 400, message: `ID inválido: ${err.value}` };
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return { statusCode: 409, message: `${field} ya existe` };
  }
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return { statusCode: 400, message: 'Error de validación', errors: messages };
  }
  return null;
};

// Wrapper para usar en server.js
const globalErrorHandler = (err, req, res, next) => {
  const mongoError = handleMongoErrors(err);
  if (mongoError) {
    err.statusCode = mongoError.statusCode;
    err.message = mongoError.message;
    err.errors = mongoError.errors;
  }
  errorHandler(err, req, res, next);
};

module.exports = { errorHandler, globalErrorHandler };
