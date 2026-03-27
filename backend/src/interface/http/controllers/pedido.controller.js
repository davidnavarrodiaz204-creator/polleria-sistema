/**
 * pedido.controller.js — Controllers para pedidos
 */
const pedidoService = require('../../../application/services/pedido.service');
const catchAsync = require('../../../utils/catchAsync');
const { emit } = require('../../../config/socket');

class PedidoController {
  /**
   * GET /api/pedidos
   */
  getPedidos = catchAsync(async (req, res) => {
    const pedidos = await pedidoService.getPedidosHoy();
    res.json({
      success: true,
      count: pedidos.length,
      data: { pedidos },
    });
  });

  /**
   * GET /api/pedidos/historial
   */
  getHistorial = catchAsync(async (req, res) => {
    const pedidos = await pedidoService.listarPedivos(req.query);
    res.json({
      success: true,
      count: pedidos.length,
      data: { pedidos },
    });
  });

  /**
   * GET /api/pedidos/cocina
   */
  getPedidosCocina = catchAsync(async (req, res) => {
    const pedidos = await pedidoService.getPedidosCocina();
    res.json({
      success: true,
      count: pedidos.length,
      data: { pedidos },
    });
  });

  /**
   * POST /api/pedidos
   */
  crearPedido = catchAsync(async (req, res) => {
    const pedido = await pedidoService.crearPedido(req.body, req.usuario);

    // Emitir eventos en tiempo real
    emit.nuevoPedido(req.io, pedido);
    emit.notificacion(req.io, {
      tipo: 'info',
      titulo: `🔥 Nuevo pedido — ${pedido.tipo === 'mesa' ? 'Mesa ' + pedido.mesaNumero : pedido.tipo === 'delivery' ? 'Delivery' : 'Para llevar'}`,
      mensaje: `${pedido.items.length} producto(s) · S/ ${pedido.total.toFixed(2)}`,
    });

    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      data: { pedido },
    });
  });

  /**
   * PUT /api/pedidos/:id
   */
  actualizarPedido = catchAsync(async (req, res) => {
    const pedido = await pedidoService.actualizarEstado(
      req.params.id,
      req.body,
      req.io
    );

    // Emitir eventos según el cambio
    if (req.body.estado === 'listo') {
      emit.pedidoListo(req.io, pedido);
      emit.notificacion(req.io, {
        tipo: 'success',
        titulo: `✅ Listo — ${pedido.tipo === 'mesa' ? 'Mesa ' + pedido.mesaNumero : 'Para llevar'}`,
        mensaje: 'Listo para servir',
      });
    }

    if (req.body.estado === 'entregado' && pedido.mesaId) {
      emit.mesaActualizada(req.io, await Mesa.findById(pedido.mesaId));
    }

    res.json({
      success: true,
      message: 'Pedido actualizado',
      data: { pedido },
    });
  });

  /**
   * DELETE /api/pedidos/:id
   */
  eliminarPedido = catchAsync(async (req, res) => {
    await Pedido.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Pedido eliminado',
    });
  });
}

module.exports = new PedidoController();
