/**
 * security.js — Configuraciones de seguridad
 * Rate limiting, headers, sanitización
 */
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiting específico por endpoint
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas peticiones. Intenta más tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
});

// Helmet config (seguridad de headers)
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Para compatibilidad con imágenes externas
};

// Sanitización MongoDB
const mongoSanitizeConfig = {
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[SANITIZE] Campo sanitizado: ${key} en ${req.path}`);
  }
};

module.exports = {
  authLimiter,
  apiLimiter,
  helmet: helmet(helmetConfig),
  mongoSanitize: mongoSanitize(mongoSanitizeConfig),
};
