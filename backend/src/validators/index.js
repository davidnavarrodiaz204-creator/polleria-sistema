/**
 * validators/index.js - Centraliza todas las validaciones
 * Exporta validadores por módulo
 */
const { body, param, query, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors.array().map(e => ({
        field: e.path,
        message: e.msg,
        value: e.value
      }))
    });
  }
  next();
};

// Validadores de Pedido
const pedidoValidators = {
  crear: [
    body('tipo')
      .notEmpty().withMessage('El tipo es requerido')
      .isIn(['mesa', 'delivery', 'para_llevar']).withMessage('Tipo inválido'),
    body('items')
      .isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
    body('items.*.nombre')
      .trim().notEmpty().withMessage('Nombre del producto requerido'),
    body('items.*.cantidad')
      .isInt({ min: 1 }).withMessage('Cantidad mínima 1'),
    body('items.*.precio')
      .isFloat({ min: 0 }).withMessage('Precio debe ser positivo'),
    body('mesaId')
      .optional()
      .isMongoId().withMessage('ID de mesa inválido'),
    body('nota')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Nota máxima 500 caracteres'),
    handleValidationErrors
  ],

  actualizar: [
    param('id')
      .isMongoId().withMessage('ID de pedido inválido'),
    body('estado')
      .optional()
      .isIn(['en_cocina', 'preparando', 'listo', 'entregado', 'cancelado'])
      .withMessage('Estado inválido'),
    body('pagado')
      .optional()
      .isBoolean().withMessage('Pagado debe ser booleano'),
    body('metodoPago')
      .optional()
      .isIn(['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia'])
      .withMessage('Método de pago inválido'),
    handleValidationErrors
  ]
};

// Validadores de Cliente
const clienteValidators = {
  crear: [
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre es requerido')
      .isLength({ min: 2, max: 100 }).withMessage('Nombre entre 2-100 caracteres'),
    body('numDoc')
      .trim()
      .notEmpty().withMessage('El documento es requerido')
      .matches(/^[0-9]{8,11}$/).withMessage('DNI/RUC debe tener 8-11 dígitos'),
    body('tipoDoc')
      .optional()
      .isIn(['dni', 'ruc', 'ce', 'pasaporte']).withMessage('Tipo de documento inválido'),
    body('telefono')
      .optional()
      .matches(/^[0-9]{9}$/).withMessage('Teléfono debe tener 9 dígitos'),
    body('email')
      .optional()
      .isEmail().withMessage('Email inválido'),
    handleValidationErrors
  ],

  actualizar: [
    param('id').isMongoId().withMessage('ID de cliente inválido'),
    body('nombre')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Nombre entre 2-100 caracteres'),
    body('email')
      .optional()
      .isEmail().withMessage('Email inválido'),
    handleValidationErrors
  ]
};

// Validadores de Caja
const cajaValidators = {
  abrir: [
    body('montoApertura')
      .notEmpty().withMessage('Monto de apertura requerido')
      .isFloat({ min: 0 }).withMessage('Monto debe ser positivo'),
    handleValidationErrors
  ],

  cerrar: [
    body('montoCierre')
      .notEmpty().withMessage('Monto de cierre requerido')
      .isFloat({ min: 0 }).withMessage('Monto debe ser positivo'),
    body('observaciones')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
    handleValidationErrors
  ]
};

// Validadores de Mesa
const mesaValidators = {
  crear: [
    body('numero')
      .notEmpty().withMessage('El número es requerido')
      .isInt({ min: 1 }).withMessage('Número debe ser positivo'),
    body('capacidad')
      .optional()
      .isInt({ min: 1, max: 20 }).withMessage('Capacidad entre 1-20'),
    handleValidationErrors
  ]
};

// Validadores de Query (paginación/filtros)
const queryValidators = {
  paginacion: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Página debe ser >= 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Límite entre 1-100'),
    handleValidationErrors
  ]
};

module.exports = {
  pedido: pedidoValidators,
  cliente: clienteValidators,
  caja: cajaValidators,
  mesa: mesaValidators,
  query: queryValidators,
  handleValidationErrors
};
