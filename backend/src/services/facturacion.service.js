/**
 * facturacion.service.js - Servicio de facturación electrónica
 * Prepara y gestiona comprobantes para SUNAT
 * Compatible con: Nubefact, Factura.com, o integración directa
 */
const Factura = require('../models/Factura');
const Pedido = require('../models/Pedido');
const Config = require('../models/Config');
const Logger = require('../utils/logger');

class FacturacionService {
  /**
   * Generar correlativo siguiente para una serie
   */
  async generarCorrelativo(tipoDocumento, serie) {
    const ultimo = await Factura.findOne({ tipoDocumento, serie })
      .sort({ correlativo: -1 });
    return (ultimo?.correlativo || 0) + 1;
  }

  /**
   * Crear factura/boleta desde un pedido pagado
   */
  async crearDesdePedido(pedidoId, datosFactura = {}) {
    const pedido = await Pedido.findById(pedidoId)
      .populate('clienteId')
      .populate('items.productoId');

    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    if (!pedido.pagado) {
      throw new Error('El pedido debe estar pagado para emitir comprobante');
    }

    // Obtener configuración del negocio
    const config = await Config.findOne() || {};

    // Determinar tipo de documento según cliente
    const esRuc = pedido.clienteDoc?.length === 11;
    const tipoDocumento = esRuc ? '01' : '03'; // 01=Factura, 03=Boleta
    const serie = esRuc ? (config.serieFactura || 'F001') : (config.serieBoleta || 'B001');

    const correlativo = await this.generarCorrelativo(tipoDocumento, serie);

    // Mapear items al formato SUNAT
    const items = pedido.items.map(item => ({
      productoId: item.productoId?._id,
      codigo: item.productoId?._id?.toString().slice(-6) || 'PROD001',
      nombre: item.nombre,
      cantidad: item.cantidad,
      unidad: 'NIU',
      precioUnitario: item.precio / 1.18, // Sin IGV
      precioTotal: (item.precio * item.cantidad) / 1.18,
      igv: (item.precio * item.cantidad) - ((item.precio * item.cantidad) / 1.18),
      tipoIgv: '10' // Gravado
    }));

    const subTotal = items.reduce((sum, i) => sum + i.precioTotal, 0);
    const totalIgv = items.reduce((sum, i) => sum + i.igv, 0);
    const total = subTotal + totalIgv;

    const factura = await Factura.create({
      tipoDocumento,
      serie,
      correlativo,
      fechaEmision: new Date(),
      fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días

      // Emisor (de configuración)
      emisorRuc: config.ruc || '00000000000',
      emisorRazonSocial: config.razonSocial || 'Pollería Demo',
      emisorNombreComercial: config.nombre || 'PollerOS',
      emisorDireccion: config.direccion || 'Av. Principal 123',
      emisorUbigeo: config.ubigeo || '150101',

      // Receptor
      receptorTipoDoc: esRuc ? '6' : '1',
      receptorNumDoc: pedido.clienteDoc || '00000000',
      receptorNombre: pedido.clienteNombre || 'CLIENTE VARIOS',
      receptorDireccion: pedido.clienteId?.direccion || '',

      // Totales
      subTotal,
      totalIgv,
      total,
      items,

      // Leyendas obligatorias SUNAT
      leyendas: [
        'TRANSFERENCIA GRATUITA DE UN BIEN Y/O SERVICIO PRESTADO GRATUITAMENTE',
        `SON: ${this.numeroALetras(total)} SOLES`
      ],

      pedidoId: pedido._id,
      estado: 'registrado'
    });

    // Actualizar pedido con referencia
    await Pedido.findByIdAndUpdate(pedidoId, {
      tipoComprobante: esRuc ? 'factura' : 'boleta',
      $set: { facturaId: factura._id }
    });

    Logger.info(`Comprobante ${factura.numeroCompleto} creado para pedido #${pedido.numero}`);

    return factura;
  }

  /**
   * Emitir nota de crédito (anulación parcial o total)
   */
  async emitirNotaCredito(facturaId, motivo, itemsModificados = null) {
    const facturaOriginal = await Factura.findById(facturaId);
    if (!facturaOriginal) {
      throw new Error('Factura original no encontrada');
    }

    if (facturaOriginal.estado === 'anulado') {
      throw new Error('La factura ya está anulada');
    }

    const config = await Config.findOne() || {};
    const serieNC = config.serieNotaCredito || 'BC01';
    const correlativo = await this.generarCorrelativo('07', serieNC);

    // Si es anulación total, copiar todos los items con montos negativos
    const items = itemsModificados || facturaOriginal.items.map(item => ({
      ...item.toObject(),
      cantidad: item.cantidad,
      precioUnitario: -item.precioUnitario,
      precioTotal: -item.precioTotal,
      igv: -item.igv
    }));

    const subTotal = items.reduce((sum, i) => sum + i.precioTotal, 0);
    const totalIgv = items.reduce((sum, i) => sum + i.igv, 0);
    const total = subTotal + totalIgv;

    const notaCredito = await Factura.create({
      tipoDocumento: '07', // Nota de Crédito
      serie: serieNC,
      correlativo,

      // Referencia a documento afectado
      documentoAfectado: {
        tipo: facturaOriginal.tipoDocumento,
        serie: facturaOriginal.serie,
        correlativo: facturaOriginal.correlativo,
        motivo: motivo || 'ANULACION DE LA OPERACION'
      },

      // Copiar datos del emisor y receptor
      emisorRuc: facturaOriginal.emisorRuc,
      emisorRazonSocial: facturaOriginal.emisorRazonSocial,
      emisorNombreComercial: facturaOriginal.emisorNombreComercial,
      emisorDireccion: facturaOriginal.emisorDireccion,
      emisorUbigeo: facturaOriginal.emisorUbigeo,

      receptorTipoDoc: facturaOriginal.receptorTipoDoc,
      receptorNumDoc: facturaOriginal.receptorNumDoc,
      receptorNombre: facturaOriginal.receptorNombre,
      receptorDireccion: facturaOriginal.receptorDireccion,

      subTotal,
      totalIgv,
      total,
      items,

      leyendas: [`NOTA DE CREDITO - ${motivo}`],

      estado: 'registrado'
    });

    // Anular factura original
    await facturaOriginal.anular(motivo);

    Logger.info(`Nota de crédito ${notaCredito.numeroCompleto} emitida`);

    return notaCredito;
  }

  /**
   * Obtener resumen de facturación para reportes
   */
  async obtenerResumen(fechaInicio, fechaFin) {
    const match = {
      fechaEmision: {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      },
      estado: { $ne: 'anulado' },
      deletedAt: null
    };

    const resumen = await Factura.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$tipoDocumento',
          cantidad: { $sum: 1 },
          total: { $sum: '$total' },
          subTotal: { $sum: '$subTotal' },
          totalIgv: { $sum: '$totalIgv' }
        }
      }
    ]);

    const formatTipo = (tipo) => {
      const map = { '01': 'Facturas', '03': 'Boletas', '07': 'NotasCredito', '08': 'NotasDebito' };
      return map[tipo] || tipo;
    };

    return resumen.map(r => ({
      tipo: formatTipo(r._id),
      ...r,
      _id: undefined
    }));
  }

  /**
   * Convertir número a letras (para SUNAT)
   */
  numeroALetras(numero) {
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    const entero = Math.floor(numero);
    const decimal = Math.round((numero - entero) * 100);

    let resultado = '';

    if (entero === 0) return 'CERO';
    if (entero === 100) return 'CIEN';

    // Simplificado para este ejemplo
    resultado = entero.toString();

    return `${resultado} CON ${String(decimal).padStart(2, '0')}/100`;
  }
}

module.exports = new FacturacionService();
