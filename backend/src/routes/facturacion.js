/**
 * facturacion.js — Integración con Nubefact para facturación electrónica SUNAT
 *
 * Flujo:
 *  1. Caja cobra un pedido como boleta o factura
 *  2. El frontend llama a POST /api/facturacion/emitir
 *  3. Este endpoint arma el JSON según formato Nubefact
 *  4. Envía a Nubefact (demo o producción según config)
 *  5. Nubefact lo envía a SUNAT y devuelve hash + PDF + XML
 *  6. Guardamos esos datos en el pedido
 *  7. El frontend imprime con los datos SUNAT reales
 *
 * Variables de entorno requeridas:
 *  NUBEFACT_TOKEN = token del cliente en Nubefact (Settings → API Token)
 *  NUBEFACT_RUC   = RUC del negocio (también está en Config pero por seguridad va aquí)
 *
 * Autor: David Navarro Diaz
 */
const express = require('express');
const router  = express.Router();
const { auth } = require('../middleware/auth');
const Pedido  = require('../models/Pedido');
const Config  = require('../models/Config');
const Factura = require('../models/Factura');
const facturacionService = require('../services/facturacion.service');
const paginate = require('../utils/paginate');
const Logger = require('../utils/logger');

// URLs de Nubefact
const NUBEFACT_URLS = {
  demo:       'https://ose.nubefact.com/ol-ti-itcpe/resources/SunatService',
  produccion: 'https://ose.nubefact.com/ol-ti-itcpe/resources/SunatService',
  // La URL real de la API REST de Nubefact:
  api_demo:       'https://api.nubefact.com/api/v1/',
  api_produccion: 'https://api.nubefact.com/api/v1/',
}

// Códigos de tipo de comprobante según SUNAT
const TIPO_COMPROBANTE = {
  boleta:       '03',
  factura:      '01',
  nota_credito: '07',
}

// Códigos de motivo para nota de crédito
const MOTIVO_NC = {
  'Anulación de operación':    '01',
  'Error en RUC del cliente':  '06',
  'Devolución de producto':    '04',
  'Descuento posterior':       '03',
  'Error en monto cobrado':    '06',
  'Otro':                      '13',
}

/**
 * Construye el JSON de comprobante en formato Nubefact
 */
const construirComprobante = (pedido, config, tipo) => {
  const ruc    = process.env.NUBEFACT_RUC || config.ruc || ''
  const series = { boleta: config.serieBoleta || 'B001', factura: config.serieFactura || 'F001', nota_credito: config.serieNC || 'BC01' }
  const serie  = series[tipo] || 'B001'

  const igvPct = 18
  const total  = pedido.total || 0
  const subTotal = +(total / 1.18).toFixed(2)
  const igv      = +(total - subTotal).toFixed(2)

  const comprobante = {
    operacion:         'generar_comprobante',
    tipo_de_comprobante: Number(TIPO_COMPROBANTE[tipo]) || 3,
    serie,
    numero:            1, // Nubefact asigna el correlativo automáticamente
    sunat_transaction: 1,
    cliente_tipo_de_documento: pedido.clienteDoc?.length === 11 ? 6 : pedido.clienteDoc?.length === 8 ? 1 : 0,
    cliente_numero_de_documento: pedido.clienteDoc || '',
    cliente_denominacion: pedido.clienteNombre || (tipo === 'boleta' ? 'CLIENTES VARIOS' : ''),
    cliente_direccion:    pedido.direccionCliente || '',
    cliente_email:        '',
    cliente_email_1:      '',
    cliente_email_2:      '',
    fecha_de_emision:     new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g,'-'),
    fecha_de_vencimiento: '',
    moneda:               1, // 1 = Soles
    tipo_de_cambio:       '',
    porcentaje_de_igv:    igvPct,
    descuento_global:     0,
    total_descuento:      0,
    total_anticipo:       0,
    total_gravada:        subTotal,
    total_inafecta:       0,
    total_exonerada:      0,
    total_igv:            igv,
    total_gratuita:       0,
    total_otros_cargos:   0,
    total:                total,
    percepcion_tipo:      '',
    percepcion_base_imponible: 0,
    total_percepcion:     0,
    total_incluido_percepcion: 0,
    detraccion:           false,
    observaciones:        pedido.nota || '',
    documento_que_se_modifica_tipo:   '',
    documento_que_se_modifica_serie:  '',
    documento_que_se_modifica_numero: '',
    tipo_de_nota_de_credito:  '',
    tipo_de_nota_de_debito:   '',
    enviar_automaticamente_a_la_sunat:  true,
    enviar_automaticamente_al_cliente:  false,
    codigo_unico:             '',
    condiciones_de_pago:      'CONTADO',
    medio_de_pago:            pedido.metodoPago === 'efectivo' ? 'EFECTIVO' : pedido.metodoPago?.toUpperCase() || 'EFECTIVO',
    placa_vehiculo:           '',
    orden_compra_servicio:    '',
    tabla_personalizada_codigo: '',
    formato_de_pdf:           'TICKET',  // TICKET para impresora térmica, A4 para normal

    // Detalle de ítems
    items: (pedido.items || []).map((item, i) => ({
      unidad_de_medida:          'NIU',
      codigo:                    String(i + 1).padStart(4, '0'),
      descripcion:               item.nombre,
      cantidad:                  item.cantidad,
      valor_unitario:            +(item.precio / 1.18).toFixed(4),
      precio_unitario:           item.precio,
      descuento:                 '',
      subtotal:                  +(item.precio * item.cantidad / 1.18).toFixed(2),
      tipo_de_igv:               1,
      igv:                       +(item.precio * item.cantidad - item.precio * item.cantidad / 1.18).toFixed(2),
      total:                     +(item.precio * item.cantidad).toFixed(2),
      anticipo_regularizacion:   false,
      anticipo_documento_serie:  '',
      anticipo_documento_numero: '',
    })),
  }

  return comprobante
}

// ─────────────────────────────────────────────────────────────
// POST /api/facturacion/emitir
// Emite un comprobante electrónico para un pedido ya cobrado
// Body: { pedidoId, tipo: 'boleta'|'factura' }
// ─────────────────────────────────────────────────────────────
router.post('/emitir', auth, async (req, res) => {
  try {
    const { pedidoId, tipo = 'boleta' } = req.body
    if (!pedidoId) return res.status(400).json({ error: 'pedidoId requerido' })

    const token = process.env.NUBEFACT_TOKEN
    if (!token) {
      return res.status(503).json({
        error: 'Facturación electrónica no configurada',
        detalle: 'Agrega NUBEFACT_TOKEN en las variables de Railway'
      })
    }

    const pedido = await Pedido.findById(pedidoId)
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })
    if (!pedido.pagado) return res.status(400).json({ error: 'El pedido debe estar pagado primero' })

    const config = await Config.findOne() || {}
    const modo   = config.nubefact?.modo || 'demo'

    // Si ya tiene comprobante electrónico, no emitir de nuevo
    if (pedido.codigoHashSunat && pedido.estadoSunat === 'aceptado') {
      return res.json({
        success: true,
        yaEmitido: true,
        hash:    pedido.codigoHashSunat,
        pdfUrl:  pedido.linkPdfSunat,
        xmlUrl:  pedido.linkXmlSunat,
        serie:   pedido.serieComprobante,
        numero:  pedido.numeroComprobante,
      })
    }

    const comprobante = construirComprobante(pedido, config, tipo)
    const apiUrl = `https://api.nubefact.com/api/v1/${process.env.NUBEFACT_RUC || config.ruc}`

    // Llamar a Nubefact
    const response = await fetch(apiUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Token token="${token}"`,
      },
      body: JSON.stringify(comprobante),
      signal: AbortSignal.timeout(30000),
    })

    const resultado = await response.json()
    console.log('[NUBEFACT] Respuesta:', JSON.stringify(resultado).slice(0, 200))

    if (!response.ok || resultado.errors) {
      const errMsg = resultado.errors?.[0] || resultado.message || 'Error en Nubefact'
      return res.status(400).json({ error: errMsg, detalle: resultado })
    }

    // Guardar datos del comprobante en el pedido
    pedido.serieComprobante   = resultado.serie        || comprobante.serie
    pedido.numeroComprobante  = resultado.numero       || 1
    pedido.codigoHashSunat    = resultado.enlace_del_cdr || resultado.hash || ''
    pedido.estadoSunat        = resultado.aceptada_por_sunat ? 'aceptado' : 'pendiente'
    pedido.linkPdfSunat       = resultado.enlace_del_pdf || ''
    pedido.linkXmlSunat       = resultado.enlace_del_xml || ''
    pedido.fechaEmisionElectronica = new Date()
    pedido.tipoComprobante    = tipo
    await pedido.save()

    res.json({
      success:  true,
      serie:    pedido.serieComprobante,
      numero:   pedido.numeroComprobante,
      hash:     pedido.codigoHashSunat,
      pdfUrl:   pedido.linkPdfSunat,
      xmlUrl:   pedido.linkXmlSunat,
      estado:   pedido.estadoSunat,
      modo,
    })

  } catch (err) {
    console.error('[NUBEFACT] Error:', err.message)
    res.status(500).json({ error: 'Error al emitir comprobante: ' + err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/facturacion/estado
// Verifica si Nubefact está configurado y en qué modo
// ─────────────────────────────────────────────────────────────
router.get('/estado', auth, async (req, res) => {
  try {
    const token  = process.env.NUBEFACT_TOKEN
    const ruc    = process.env.NUBEFACT_RUC
    const config = await Config.findOne() || {}
    const modo   = config.nubefact?.modo || 'demo'

    res.json({
      configurado: !!token,
      modoActual:  modo,
      rucConfigurado: !!(ruc || config.ruc),
      mensaje: token
        ? `Nubefact activo en modo ${modo.toUpperCase()}`
        : 'Agrega NUBEFACT_TOKEN y NUBEFACT_RUC en Railway para activar',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/facturacion/nota-credito
// Emite una Nota de Crédito electrónica referenciando boleta/factura original
// Body: { pedidoOriginalId, pedidoNCId, motivo }
// ─────────────────────────────────────────────────────────────
router.post('/nota-credito', auth, async (req, res) => {
  try {
    const { pedidoOriginalId, pedidoNCId, motivo } = req.body
    if (!pedidoOriginalId || !pedidoNCId) {
      return res.status(400).json({ error: 'pedidoOriginalId y pedidoNCId son requeridos' })
    }

    const token = process.env.NUBEFACT_TOKEN
    if (!token) {
      return res.status(503).json({
        error: 'Facturación electrónica no configurada',
        detalle: 'Agrega NUBEFACT_TOKEN en Railway'
      })
    }

    const [pedidoOriginal, pedidoNC] = await Promise.all([
      Pedido.findById(pedidoOriginalId),
      Pedido.findById(pedidoNCId),
    ])

    if (!pedidoOriginal) return res.status(404).json({ error: 'Pedido original no encontrado' })
    if (!pedidoNC)       return res.status(404).json({ error: 'Pedido NC no encontrado' })

    // Verificar que el original era boleta o factura
    if (!['boleta','factura'].includes(pedidoOriginal.tipoComprobante)) {
      return res.status(400).json({ error: 'Solo se pueden hacer NC de boletas y facturas' })
    }

    // Verificar que el original fue enviado a SUNAT
    if (!pedidoOriginal.serieComprobante || !pedidoOriginal.numeroComprobante) {
      return res.status(400).json({
        error: 'El comprobante original no fue emitido electrónicamente',
        detalle: 'Primero emite el comprobante original a SUNAT'
      })
    }

    const config = await Config.findOne() || {}
    const motivoCodigo = MOTIVO_NC[motivo] || '13'

    const comprobante = construirComprobante(pedidoNC, config, 'nota_credito')

    // Datos adicionales de la NC referenciando el original
    comprobante.documento_que_se_modifica_tipo   = pedidoOriginal.tipoComprobante === 'factura' ? '01' : '03'
    comprobante.documento_que_se_modifica_serie  = pedidoOriginal.serieComprobante
    comprobante.documento_que_se_modifica_numero = String(pedidoOriginal.numeroComprobante)
    comprobante.tipo_de_nota_de_credito          = motivoCodigo
    comprobante.observaciones = `NC por: ${motivo} | Ref: ${pedidoOriginal.serieComprobante}-${String(pedidoOriginal.numeroComprobante).padStart(8,'0')}`

    const apiUrl = `https://api.nubefact.com/api/v1/${process.env.NUBEFACT_RUC || config.ruc}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Token token="${token}"`,
      },
      body: JSON.stringify(comprobante),
      signal: AbortSignal.timeout(30000),
    })

    const resultado = await response.json()

    if (!response.ok || resultado.errors) {
      return res.status(400).json({ error: resultado.errors?.[0] || 'Error en Nubefact', detalle: resultado })
    }

    // Guardar datos en el pedido NC
    pedidoNC.serieComprobante  = resultado.serie       || comprobante.serie
    pedidoNC.numeroComprobante = resultado.numero      || 1
    pedidoNC.codigoHashSunat   = resultado.enlace_del_cdr || ''
    pedidoNC.estadoSunat       = resultado.aceptada_por_sunat ? 'aceptado' : 'pendiente'
    pedidoNC.linkPdfSunat      = resultado.enlace_del_pdf || ''
    pedidoNC.linkXmlSunat      = resultado.enlace_del_xml || ''
    pedidoNC.fechaEmisionElectronica = new Date()
    await pedidoNC.save()

    res.json({
      success: true,
      serie:   pedidoNC.serieComprobante,
      numero:  pedidoNC.numeroComprobante,
      hash:    pedidoNC.codigoHashSunat,
      pdfUrl:  pedidoNC.linkPdfSunat,
      xmlUrl:  pedidoNC.linkXmlSunat,
      estado:  pedidoNC.estadoSunat,
    })

  } catch (err) {
    console.error('[NUBEFACT NC] Error:', err.message)
    res.status(500).json({ error: 'Error al emitir NC: ' + err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/facturacion/pdf/:pedidoId
// Redirige al PDF del comprobante en Nubefact
// ─────────────────────────────────────────────────────────────
router.get('/pdf/:pedidoId', auth, async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.pedidoId)
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })
    if (!pedido.linkPdfSunat) return res.status(404).json({ error: 'Este pedido no tiene comprobante electrónico' })
    res.redirect(pedido.linkPdfSunat)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ================================================================
// NUEVOS ENDPOINTS v2.1 - Sistema Factura Model + Service
// ================================================================

// Solo admin para operaciones de gestión
const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({ success: false, message: 'Solo administradores' });
  }
  next();
};

/**
 * GET /api/facturacion/v2/comprobantes
 * Listar todos los comprobantes con paginación
 */
router.get('/v2/comprobantes', auth, soloAdmin, async (req, res) => {
  try {
    const { estado, tipo, fechaDesde, fechaHasta, page, limit } = req.query;
    const filtro = {};

    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipoDocumento = tipo;
    if (fechaDesde || fechaHasta) {
      filtro.fechaEmision = {};
      if (fechaDesde) filtro.fechaEmision.$gte = new Date(fechaDesde);
      if (fechaHasta) filtro.fechaEmision.$lte = new Date(fechaHasta);
    }

    const resultado = await paginate(Factura, filtro, {
      page,
      limit,
      sort: { fechaEmision: -1 },
      populate: { path: 'pedidoId', select: 'numero mesaNumero' }
    });

    res.json({
      success: true,
      data: { comprobantes: resultado.data },
      pagination: resultado.pagination
    });
  } catch (err) {
    Logger.error('Error en GET /facturacion/v2/comprobantes:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/facturacion/v2/resumen/:anio/:mes
 * Resumen mensual para SUNAT
 */
router.get('/v2/resumen/:anio/:mes', auth, soloAdmin, async (req, res) => {
  try {
    const { anio, mes } = req.params;
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 0, 23, 59, 59);

    const resumen = await facturacionService.obtenerResumen(inicio, fin);

    res.json({
      success: true,
      data: {
        periodo: `${mes}/${anio}`,
        resumen,
        totalGeneral: resumen.reduce((sum, r) => sum + r.total, 0),
        totalIgv: resumen.reduce((sum, r) => sum + r.totalIgv, 0)
      }
    });
  } catch (err) {
    Logger.error('Error en GET /facturacion/v2/resumen:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/facturacion/v2/:id
 * Detalle de comprobante
 */
router.get('/v2/:id', auth, soloAdmin, async (req, res) => {
  try {
    const factura = await Factura.findById(req.params.id)
      .populate('pedidoId');

    if (!factura) {
      return res.status(404).json({ success: false, message: 'Comprobante no encontrado' });
    }

    res.json({ success: true, data: { factura } });
  } catch (err) {
    Logger.error('Error en GET /facturacion/v2/:id:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/facturacion/v2/generar/:pedidoId
 * Generar comprobante desde pedido
 */
router.post('/v2/generar/:pedidoId', auth, soloAdmin, async (req, res) => {
  try {
    const factura = await facturacionService.crearDesdePedido(req.params.pedidoId);

    res.status(201).json({
      success: true,
      message: 'Comprobante generado',
      data: { factura }
    });
  } catch (err) {
    Logger.error('Error en POST /facturacion/v2/generar:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/facturacion/v2/nota-credito/:facturaId
 * Emitir nota de crédito
 */
router.post('/v2/nota-credito/:facturaId', auth, soloAdmin, async (req, res) => {
  try {
    const { motivo } = req.body;
    if (!motivo) {
      return res.status(400).json({ success: false, message: 'Motivo requerido' });
    }

    const notaCredito = await facturacionService.emitirNotaCredito(
      req.params.facturaId,
      motivo
    );

    res.status(201).json({
      success: true,
      message: 'Nota de crédito emitida',
      data: { notaCredito }
    });
  } catch (err) {
    Logger.error('Error en POST /facturacion/v2/nota-credito:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router
