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
  logo:          { type: String, default: '🍗' },  // emoji o base64 de imagen (max ~500KB)
  direccion:     { type: String, default: '' },
  telefono:      { type: String, default: '' },

  // Datos SUNAT del negocio (obligatorios para facturación electrónica)
  ruc:           { type: String, default: '' },  // RUC de 11 dígitos
  razonSocial:   { type: String, default: '' },  // Razón social oficial SUNAT
  email:         { type: String, default: '' },  // Email del negocio
  ubigeo:        { type: String, default: '150101' }, // Código ubigeo (Lima por defecto)

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

  // Configuración de impresora
  impresora: {
    habilitada:    { type: Boolean, default: false },
    ancho:         { type: Number, default: 80, enum: [58, 80] }, // mm
    nombre:        { type: String, default: '' }, // Nombre referencial
    copias:        { type: Number, default: 1 }, // Número de copias
    imprimirCocina:{ type: Boolean, default: true }, // Imprimir ticket cocina automáticamente
  },

  // Configuración de email (Nodemailer + Gmail)
  email: {
    activo:        { type: Boolean, default: false },
    enviarBoleta:  { type: Boolean, default: true }, // Enviar boleta automáticamente
    enviarTicket:  { type: Boolean, default: false },
  },

  // Configuración de tema/colores
  tema: {
    modo:          { type: String, enum: ['claro', 'oscuro', 'auto'], default: 'claro' },
    nombreTema:    { type: String, default: 'default' }, // default, oliva, marino, burdeos, carbon
    colorPrimario: { type: String, default: '#F5C518' },
    colorTexto:    { type: String, default: '#212121' },
    colorFondo:    { type: String, default: '#F9FAFB' },
  },

  // Configuración de sonido cocina
  sonido: {
    activo:        { type: Boolean, default: true },
    volumen:       { type: Number, default: 80, min: 0, max: 100 },
  },

  // Sistema de puntos
  puntos: {
    activo:        { type: Boolean, default: true },
    puntosPorSol:  { type: Number, default: 10 }, // 1 punto por cada S/10
    valorPunto:    { type: Number, default: 0.10 }, // Cada punto vale S/0.10
    minimoCanje:   { type: Number, default: 50 }, // Mínimo 50 puntos para canjear
  },

  // Descuentos
  descuentos: {
    activo:        { type: Boolean, default: true },
    maxPorcentaje: { type: Number, default: 50 }, // Máximo 50% de descuento
  },

}, { timestamps: true });

module.exports = mongoose.model('Config', configSchema);
