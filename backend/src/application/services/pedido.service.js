/**
 * pedido.service.js — Lógica de negocio para pedidos
 * Incluye transacciones MongoDB para integridad de datos
 */
const mongoose = require('mongoose');
const Pedido = require('../../../models/Pedido');
const Mesa = require('../../../models/Mesa');
const Cliente = require('../../../models/Cliente');
const { NotFoundError, ConflictError } = require('../../../utils/errors');
const Logger = require('../../../utils/logger');

class PedidoService {
  /**
   * Crear nuevo pedido con transacción
   * Si falla la mesa, el pedido no se guarda
   */
  async crearPedido(data, usuario) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { tipo, mesaId, mesaNumero, items, nota, metodoPago } = data;

      if (!items?.length) {
        throw new ConflictError('El pedido necesita al menos un producto');
      }

      // Calcular totales
      const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
      const subTotal = Math.round((total / 1.18) * 100) / 100;
      const totalIGV = Math.round((total - subTotal) * 100) / 100;

      // Crear pedido
      const [pedido] = await Pedido.create([{
        tipo,
        mesaId,
        mesaNumero,
        mozo: usuario.nombre,
        items,
        total,
        subTotal,
        totalIGV,
        nota: nota || '',
        metodoPago: metodoPago || 'efectivo',
      }], { session });

      // Si es pedido de mesa, actualizar mesa en la misma transacción
      if (mesaId) {
        const mesa = await Mesa.findById(mesaId).session(session);
        if (!mesa) {
          throw new NotFoundError('Mesa');
        }
        if (mesa.estado === 'ocupada') {
          throw new ConflictError(`La mesa ${mesa.numero} ya está ocupada`);
        }

        await Mesa.findByIdAndUpdate(mesaId, {
          estado: 'ocupada',
          mozo: usuario.nombre,
          pedidoActual: pedido._id,
        }, { session });
      }

      await session.commitTransaction();
      Logger.info(`Pedido #${pedido.numero} creado por ${usuario.nombre}`);

      return await this.getPedidoById(pedido._id);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Obtener pedido por ID con datos populados
   */
  async getPedidoById(id) {
    const pedido = await Pedido.findById(id)
      .populate('mesaId', 'numero capacidad estado')
      .populate('clienteId', 'nombre numDoc telefono');

    if (!pedido) {
      throw new NotFoundError('Pedido');
    }

    return pedido;
  }

  /**
   * Actualizar estado del pedido
   */
  async actualizarEstado(id, data, io) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const anterior = await Pedido.findById(id).session(session);
      if (!anterior) {
        throw new NotFoundError('Pedido');
      }

      const updateData = { ...data };

      // Actualizar estadísticas del cliente si se está pagando
      if (data.pagado === true && !anterior.pagado && anterior.clienteId) {
        await Cliente.findByIdAndUpdate(anterior.clienteId, {
          $inc: { totalCompras: 1, montoAcumulado: anterior.total },
          ultimaVisita: new Date(),
        }, { session });
      }

      const pedido = await Pedido.findByIdAndUpdate(id, updateData, {
        new: true,
        session,
      });

      // Si se entrega, liberar mesa
      if (data.estado === 'entregado' && anterior.mesaId) {
        await Mesa.findByIdAndUpdate(anterior.mesaId, {
          estado: 'libre',
          mozo: null,
          pedidoActual: null,
        }, { session });
      }

      await session.commitTransaction();
      return pedido;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Listar pedidos con filtros
   */
  async listarPedidos(filtros = {}) {
    const {
      fecha,
      desde,
      hasta,
      tipo,
      estado,
      comprobante,
      pagado,
      q,
      limit = 100
    } = filtros;

    const query = {};

    // Filtros de fecha
    if (fecha) {
      const inicio = new Date(fecha + 'T05:00:00.000Z');
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 1);
      query.creadoEn = { $gte: inicio, $lt: fin };
    } else if (desde || hasta) {
      query.creadoEn = {};
      if (desde) query.creadoEn.$gte = new Date(desde + 'T05:00:00.000Z');
      if (hasta) {
        const h = new Date(hasta + 'T05:00:00.000Z');
        h.setDate(h.getDate() + 1);
        query.creadoEn.$lt = h;
      }
    }

    if (tipo) query.tipo = tipo;
    if (estado) query.estado = estado;
    if (comprobante) query.tipoComprobante = comprobante;
    if (pagado !== undefined) query.pagado = pagado === 'true';

    // Búsqueda de texto
    if (q) {
      const num = parseInt(q);
      query.$or = [
        { clienteNombre: { $regex: q, $options: 'i' } },
        { clienteDoc: { $regex: q, $options: 'i' } },
        { mozo: { $regex: q, $options: 'i' } },
        ...(isNaN(num) ? [] : [{ numero: num }]),
      ];
    }

    return await Pedido.find(query)
      .populate('mesaId', 'numero capacidad')
      .sort({ creadoEn: -1 })
      .limit(Number(limit));
  }

  /**
   * Pedidos de hoy (para caja y cocina)
   */
  async getPedidosHoy() {
    const inicioHoy = new Date();
    inicioHoy.setUTCHours(5, 0, 0, 0);
    const finHoy = new Date(inicioHoy);
    finHoy.setDate(finHoy.getDate() + 1);

    return await Pedido.find({
      creadoEn: { $gte: inicioHoy, $lt: finHoy }
    })
      .populate('mesaId', 'numero capacidad estado')
      .sort({ creadoEn: -1 })
      .limit(500);
  }

  /**
   * Pedidos para cocina (en_cocina + preparando)
   */
  async getPedidosCocina() {
    return await Pedido.find({
      estado: { $in: ['en_cocina', 'preparando'] }
    })
      .populate('mesaId', 'numero capacidad')
      .sort({ creadoEn: 1 });
  }
}

module.exports = new PedidoService();
