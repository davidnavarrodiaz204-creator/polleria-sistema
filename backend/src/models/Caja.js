const mongoose = require('mongoose');

const cajaSchema = new mongoose.Schema({
  fecha:          { type: String, required: true }, // YYYY-MM-DD

  // Apertura / cierre
  montoApertura:  { type: Number, default: 0 },
  montoCierre:    { type: Number, default: null },

  // Totales por método de pago
  totalVentas:    { type: Number, default: 0 },
  totalEfectivo:  { type: Number, default: 0 },
  totalYape:      { type: Number, default: 0 },
  totalPlin:      { type: Number, default: 0 },
  totalTarjeta:   { type: Number, default: 0 },
  totalTransferencia: { type: Number, default: 0 },

  // Contador de pagos mixtos
  totalPagosMixtos: { type: Number, default: 0 },
  montoPagosMixtos: { type: Number, default: 0 },

  // Descuentos aplicados
  totalDescuentos:  { type: Number, default: 0 },
  montoDescuentos:  { type: Number, default: 0 },

  // Totales por comprobante (base para facturación electrónica)
  totalTickets:   { type: Number, default: 0 },  // cant. tickets
  totalBoletas:   { type: Number, default: 0 },  // cant. boletas
  totalFacturas:  { type: Number, default: 0 },  // cant. facturas
  montoTickets:   { type: Number, default: 0 },  // S/ tickets
  montoBoletas:   { type: Number, default: 0 },  // S/ boletas
  montoFacturas:  { type: Number, default: 0 },  // S/ facturas

  // IGV desglosado (base para SUNAT)
  subTotal:       { type: Number, default: 0 },  // sin IGV
  totalIGV:       { type: Number, default: 0 },  // 18%
  // totalVentas = subTotal + totalIGV

  // Egresos
  totalEgresos:   { type: Number, default: 0 },
  saldoFinal:     { type: Number, default: 0 },

  estado:         { type: String, enum: ['abierta', 'cerrada'], default: 'abierta' },
  observaciones:  { type: String, default: '' },
  abiertaPor:     { type: String, default: '' },
  cerradaPor:     { type: String, default: '' },

  // === BASE PARA FACTURACIÓN ELECTRÓNICA (SUNAT/Nubefact) ===
  // Serie del punto de venta (se configura en Configuración)
  serieTicket:    { type: String, default: 'T001' },  // tickets
  serieBoleta:    { type: String, default: 'B001' },  // boletas electrónicas
  serieFactura:   { type: String, default: 'F001' },  // facturas electrónicas
  // Correlativo del día (se resetea por serie, no por caja)
  correlativoInicioBoleta:  { type: Number, default: null },
  correlativoFinBoleta:     { type: Number, default: null },
  correlativoInicioFactura: { type: Number, default: null },
  correlativoFinFactura:    { type: Number, default: null },

}, { timestamps: true });

module.exports = mongoose.model('Caja', cajaSchema);
