const mongoose = require('mongoose');

const itemPedidoSchema = new mongoose.Schema({
  productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
  nombre:     { type: String, required: true },
  emoji:      { type: String, default: '🍽️' },
  cantidad:   { type: Number, required: true, min: 1 },
  precio:     { type: Number, required: true },
  // BASE FACTURACIÓN: precio sin IGV y con IGV por item
  precioSinIGV: { type: Number, default: 0 },
  igvItem:      { type: Number, default: 0 },
  nota:         { type: String, default: '' },
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
  numero:        { type: Number },
  tipo:          { type: String, enum: ['mesa', 'delivery', 'para_llevar'], default: 'mesa' },
  mesaId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Mesa', default: null },
  mesaNumero:    { type: Number, default: null },
  deliveryId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', default: null },
  mozo:          { type: String, default: '' },
  items:         [itemPedidoSchema],

  // Totales
  total:         { type: Number, default: 0 },
  // BASE FACTURACIÓN ELECTRÓNICA: IGV desglosado
  subTotal:      { type: Number, default: 0 },   // total sin IGV (total / 1.18)
  totalIGV:      { type: Number, default: 0 },   // IGV = total - subTotal
  // NOTA: precios incluyen IGV (precio con IGV), subTotal se calcula al cobrar

  nota:          { type: String, default: '' },
  estado:        { type: String, enum: ['en_cocina','preparando','listo','entregado','cancelado'], default: 'en_cocina' },
  pagado:        { type: Boolean, default: false },
  metodoPago:    { type: String, enum: ['efectivo','tarjeta','yape','plin','transferencia'], default: 'efectivo' },

  // Cliente vinculado
  clienteId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
  clienteNombre: { type: String, default: '' },
  clienteDoc:    { type: String, default: '' },

  // Comprobante
  tipoComprobante: { type: String, enum: ['ticket','boleta','factura','nota_credito'], default: 'ticket' },

  // === BASE FACTURACIÓN ELECTRÓNICA (SUNAT/Nubefact) ===
  // Se llenan al emitir comprobante electrónico
  serieComprobante:      { type: String, default: '' },   // B001, F001, T001
  numeroComprobante:     { type: Number, default: null },  // correlativo
  codigoHashSunat:       { type: String, default: '' },   // CDR de SUNAT
  estadoSunat:           { type: String, enum: ['pendiente','aceptado','rechazado','anulado',''], default: '' },
  linkPdfSunat:          { type: String, default: '' },   // URL PDF Nubefact
  linkXmlSunat:          { type: String, default: '' },   // URL XML SUNAT
  fechaEmisionElectronica: { type: Date, default: null },
  // Para facturas: datos del cliente empresa
  rucCliente:            { type: String, default: '' },
  razonSocialCliente:    { type: String, default: '' },
  direccionCliente:      { type: String, default: '' },

  creadoEn: { type: Date, default: Date.now },
}, { timestamps: true });

// Autoincremento número de pedido
pedidoSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const ultimo = await this.constructor.findOne().sort({ numero: -1 });
  this.numero = (ultimo?.numero || 0) + 1;
  // Calcular subTotal e IGV automáticamente
  if (this.total && !this.subTotal) {
    this.subTotal  = Math.round((this.total / 1.18) * 100) / 100;
    this.totalIGV  = Math.round((this.total - this.subTotal) * 100) / 100;
  }
  next();
});

module.exports = mongoose.model('Pedido', pedidoSchema);
