/**
 * catchAsync.js — Wrapper para controllers async
 * Elimina try-catch repetitivo en controllers
 */
const Logger = require('./logger');

const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      Logger.error(`Error en ${req.method} ${req.path}: ${error.message}`);
      next(error);
    });
  };
};

module.exports = catchAsync;
