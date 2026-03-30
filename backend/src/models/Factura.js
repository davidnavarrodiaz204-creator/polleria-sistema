/**
 * Factura.js - Modelo para comprobantes electrónicos SUNAT
 * Soporta: Facturas, Boletas, Notas de Crédito/Débito
 */
const mongoose = require('mongoose');

const itemFacturaSchema = new mongoose.Schema({
  productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
  codigo: { type: String, default: '' },
  nombre: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 0 },
  unidad: { type: String, default: 'NIU' }, // NIU = Unidad, ZZ = Servicio
  precioUnitario: { type: Number, required: true },
  precioTotal: { type: Number, required: true },
  igv: { type: Number, required: true },
  tipoIgv: { type: String, enum: ['10', '20', '30'], default: '10' }, // 10=Gravado, 20=Exonerado, 30=Inafecto
}, { _id: false });

const facturaSchema = new mongoose.Schema({
  // Datos del comprobante
  tipoDocumento: {
    type: String,
    enum: ['01', '03', '07', '08'], // 01=Factura, 03=Boleta, 07=NotaCredito, 08=NotaDebito
    required: true
  },
  serie: { type: String, required: true }, // F001, B001, etc.
  correlativo: { type: Number, required: true },
  numeroCompleto: { type: String }, // F001-00000042

  // Fechas
  fechaEmision: { type: Date, default: Date.now },
  fechaVencimiento: { type: Date },

  // Emisor (datos fijos de tu pollería)
  emisorRuc: { type: String, required: true },
  emisorRazonSocial: { type: String, required: true },
  emisorNombreComercial: { type: String },
  emisorDireccion: { type: String },
  emisorUbigeo: { type: String },

  // Receptor (cliente)
  receptorTipoDoc: { type: String, enum: ['1', '6', '7'], default: '1' }, // 1=DNI, 6=RUC, 7=PAS
  receptorNumDoc: { type: String, required: true },
  receptorNombre: { type: String, required: true },
  receptorDireccion: { type: String, default: '' },

  // Totales (para SUNAT)
  moneda: { type: String, default: 'PEN' },
  subTotal: { type: Number, required: true }, // Sin IGV
  totalIgv: { type: Number, required: true },
  totalDescuento: { type: Number, default: 0 },
  total: { type: Number, required: true },

  // Items detallados
  items: [itemFacturaSchema],

  // Leyendas requeridas por SUNAT
  leyendas: [{ type: String }], // Ej: "TRANSFERENCIA GRATUITA", etc.

  // Estado del comprobante
  estado: {
    type: String,
    enum: ['registrado', 'enviado', 'aceptado', 'rechazado', 'anulado'],
    default: 'registrado'
  },

  // Referencia a pedido original
  pedidoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido' },

  // Datos de envío a SUNAT (para integración futura)
  sunat: {
    ticket: { type: String }, // Ticket de aceptación
    cdr: { type: String }, // Constancia de recepción (XML)
    hash: { type: String }, // Hash del XML firmado
    respuesta: { type: String }, // Mensaje de SUNAT
    fechaEnvio: { type: Date },
    intentos: { type: Number, default: 0 }
  },

  // QR para verificación pública (según SUNAT)
  qr: { type: String },

  // Soft delete
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Middleware auto-filtrar eliminados
facturaSchema.pre(/^find/, function(next) {
  if (!this.getQuery().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Generar número completo antes de guardar
facturaSchema.pre('save', function(next) {
  if (!this.numeroCompleto) {
    this.numeroCompleto = `${this.series}-${String(this.correlativo).padStart(8, '0')}`;
  }
  // Generar QR según especificación SUNAT
  if (!this.qr) {
    const emisor = this.emisorRuc;
    const receptor = this.receptorNumDoc;
    const total = this.total.toFixed(2);
    const fecha = this.fechaEmision.toISOString().split('T')[0];
    this.qr = `${emisor}|${this.tipoDocumento}|${this.serie}|${this.correlativo}|${total}|${fecha}|${receptor}`;
  }
  next();
});

// Índices para búsquedas frecuentes
facturaSchema.index({ serie: 1, correlativo: 1 }, { unique: true });
facturaSchema.index({ numeroCompleto: 1 });
facturaSchema.index({ receptorNumDoc: 1 });
facturaSchema.index({ fechaEmision: -1 });
facturaSchema.index({ estado: 1 });
facturaSchema.index({ pedidoId: 1 });
facturaSchema.index({ deletedAt: 1 });

// Método para anular (no eliminar)
facturaSchema.methods.anular = function(motivo) {
  this.estado = 'anulado';
  this.leyendas.push(`ANULADO: ${motivo}`);
  return this.save();
};

// Método para marcar como enviado a SUNAT
facturaSchema.methods.marcarEnviado = function(ticket, cdr) {
  this.estado = 'aceptado';
  this.sunat.ticket = ticket;
  this.sunat.cdr = cdr;
  this.sunat.fechaEnvio = new Date();
  return this.save();
};

module.exports = mongoose.model('Factura', facturaSchema);
