/**
 * pedido.validator.js — Validaciones para pedidos
 */
const { body, param } = require('express-validator');

const createPedidoValidation = [
  body('tipo')
    .notEmpty().withMessage('El tipo de pedido es requerido')
    .isIn(['mesa', 'delivery', 'para_llevar']).withMessage('Tipo debe ser: mesa, delivery o para_llevar'),
  body('items')
    .isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
  body('items.*.nombre').trim().notEmpty().withMessage('Nombre del producto requerido'),
  body('items.*.cantidad')
    .isInt({ min: 1 }).withMessage('Cantidad debe ser al menos 1'),
  body('items.*.precio')
    .isFloat({ min: 0 }).withMessage('Precio debe ser un número positivo'),
  body('mesaId')
    .optional()
    .isMongoId().withMessage('ID de mesa inválido'),
  body('nota')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La nota no puede exceder 500 caracteres'),
  body('metodoPago')
    .optional()
    .isIn(['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia']).withMessage('Método de pago inválido'),
];

const updatePedidoValidation = [
  param('id').isMongoId().withMessage('ID de pedido inválido'),
  body('estado')
    .optional()
    .isIn(['en_cocina', 'preparando', 'listo', 'entregado', 'cancelado']).withMessage('Estado inválido'),
  body('pagado')
    .optional()
    .isBoolean().withMessage('Pagado debe ser booleano'),
  body('metodoPago')
    .optional()
    .isIn(['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia']).withMessage('Método de pago inválido'),
];

module.exports = {
  createPedidoValidation,
  updatePedidoValidation,
};
