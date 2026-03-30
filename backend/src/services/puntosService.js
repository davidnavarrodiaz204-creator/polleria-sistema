/**
 * puntosService.js — Servicio para gestión de puntos de fidelidad
 * Reglas:
 *   - Por defecto: 1 punto por cada S/10 de compra
 *   - Cada punto vale S/0.10 al canjear
 *   - Mínimo 50 puntos para canjear
 *
 * Autor: David Navarro Diaz
 */

const Cliente = require('../models/Cliente');
const Config = require('../models/Config');

/**
 * Calcula puntos ganados según el monto de la compra
 * @param {Number} monto - Monto total de la compra
 * @param {Object} configPuntos - Configuración de puntos
 * @returns {Number} - Puntos ganados
 */
const calcularPuntosGanados = (monto, configPuntos = {}) => {
  const puntosPorSol = configPuntos.puntosPorSol || 10; // Por defecto S/10 = 1 punto

  // Ejemplo: S/85 con puntosPorSol=10 → 8.5 → 8 puntos
  return Math.floor(monto / puntosPorSol);
};

/**
 * Calcula el valor en soles de los puntos a canjear
 * @param {Number} puntos - Cantidad de puntos a canjear
 * @param {Object} configPuntos - Configuración de puntos
 * @returns {Number} - Valor en soles
 */
const calcularValorPuntos = (puntos, configPuntos = {}) => {
  const valorPunto = configPuntos.valorPunto || 0.10;
  return Math.round(puntos * valorPunto * 100) / 100;
};

/**
 * Verifica si un cliente puede canjear puntos
 * @param {Object} cliente - Documento del cliente
 * @param {Number} puntosACanjear - Puntos que se quieren canjear
 * @param {Object} configPuntos - Configuración de puntos
 * @returns {Object} - { puede, mensaje }
 */
const verificarCanje = (cliente, puntosACanjear, configPuntos = {}) => {
  const minimoCanje = configPuntos.minimoCanje || 50;

  if (!cliente) {
    return { puede: false, mensaje: 'Cliente no encontrado' };
  }

  if (cliente.puntos < puntosACanjear) {
    return { puede: false, mensaje: `Solo tiene ${cliente.puntos} puntos` };
  }

  if (puntosACanjear < minimoCanje) {
    return { puede: false, mensaje: `Mínimo ${minimoCanje} puntos para canjear` };
  }

  return { puede: true, mensaje: 'OK' };
};

/**
 * Procesa la actualización de puntos después de una compra
 * @param {String} clienteId - ID del cliente
 * @param {Number} montoCompra - Monto total de la compra
 * @param {Number} puntosCanjeados - Puntos usados en esta compra
 * @returns {Object} - Resultado de la operación
 */
const procesarPuntosCompra = async (clienteId, montoCompra, puntosCanjeados = 0) => {
  if (!clienteId) return { puntosGanados: 0 };

  const config = await Config.findOne();
  const configPuntos = config?.puntos || {};

  if (!configPuntos.activo) {
    return { puntosGanados: 0 };
  }

  const cliente = await Cliente.findById(clienteId);
  if (!cliente) return { puntosGanados: 0 };

  // Calcular puntos ganados (sin contar descuentos por puntos)
  const montoParaPuntos = Math.max(0, montoCompra - (puntosCanjeados > 0 ? calcularValorPuntos(puntosCanjeados, configPuntos) : 0));
  const puntosGanados = calcularPuntosGanados(montoParaPuntos, configPuntos);

  // Actualizar cliente
  cliente.puntos = (cliente.puntos || 0) + puntosGanados - puntosCanjeados;
  cliente.puntosCanjeados = (cliente.puntosCanjeados || 0) + puntosCanjeados;
  cliente.totalCompras = (cliente.totalCompras || 0) + 1;
  cliente.montoAcumulado = (cliente.montoAcumulado || 0) + montoCompra;
  cliente.ultimaVisita = new Date();

  await cliente.save();

  return {
    puntosGanados,
    puntosTotales: cliente.puntos,
    puntosUsados: puntosCanjeados
  };
};

/**
 * Obtiene el resumen de puntos de un cliente
 * @param {String} clienteId - ID del cliente
 * @returns {Object} - Resumen de puntos
 */
const obtenerResumenPuntos = async (clienteId) => {
  const config = await Config.findOne();
  const configPuntos = config?.puntos || {};

  const cliente = await Cliente.findById(clienteId);
  if (!cliente) return null;

  return {
    puntosActuales: cliente.puntos || 0,
    puntosCanjeados: cliente.puntosCanjeados || 0,
    valorPunto: configPuntos.valorPunto || 0.10,
    minimoCanje: configPuntos.minimoCanje || 50,
    valorDisponible: calcularValorPuntos(cliente.puntos || 0, configPuntos),
    puedeCanjear: (cliente.puntos || 0) >= (configPuntos.minimoCanje || 50)
  };
};

module.exports = {
  calcularPuntosGanados,
  calcularValorPuntos,
  verificarCanje,
  procesarPuntosCompra,
  obtenerResumenPuntos
};