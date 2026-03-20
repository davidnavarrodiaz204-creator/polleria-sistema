/**
 * Config.js — Configuración del negocio
 * Incluye datos SUNAT y configuración de Nubefact para facturación electrónica
 * Autor: David Navarro Diaz
 */
const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  // Datos del negocio
  nombre:        { type: String, default: 'PollerOS' },
  slogan:        { type: String, default: 'El mejor pollo del barrio' },
  colorPrimario: { type: String, default: '#F5C518' },
  colorTexto:    { type: String, default: '#212121' },
  logo:          { type: String, default: '🍗' },
  direccion:     { type: String, default: '' },
  telefono:      { type: String, default: '' },

  // Datos SUNAT del negocio (obligatorios para facturación electrónica)
  ruc:           { type: String, default: '' },  // RUC de 11 dígitos
  razonSocial:   { type: String, default: '' },  // Razón social oficial SUNAT
  email:         { type: String, default: '' },  // Email del negocio

  // Series de comprobantes (configurables por el contador)
  serieTicket:   { type: String, default: 'T001' },
  serieBoleta:   { type: String, default: 'B001' },
  serieFactura:  { type: String, default: 'F001' },
  serieNC:       { type: String, default: 'BC01' }, // Nota de crédito

  // Facturación electrónica — Nubefact
  // El token se guarda en variable de entorno NUBEFACT_TOKEN por seguridad
  // Estos campos son para configuración visual y modo
  nubefact: {
    activo:      { type: Boolean, default: false },  // true cuando esté configurado
    modo:        { type: String, default: 'demo', enum: ['demo', 'produccion'] },
    // demo = pruebas sin valor legal | produccion = comprobantes reales SUNAT
  },

  // WhatsApp — CallMeBot
  whatsapp: {
    numero:  { type: String, default: '' },   // número del admin que recibe (con código país: 51987654321)
    apikey:  { type: String, default: '' },   // CallMeBot API key (también en var entorno)
    activo:  { type: Boolean, default: false },
  },

  // Módulos activos
  modulos: {
    mesas:     { type: Boolean, default: true },
    cocina:    { type: Boolean, default: true },
    delivery:  { type: Boolean, default: true },
    bebidas:   { type: Boolean, default: true },
    caja:      { type: Boolean, default: true },
    reservas:  { type: Boolean, default: false },
  },

  impresora: {
    habilitada: { type: Boolean, default: false },
    ancho:      { type: Number, default: 80 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Config', configSchema);
