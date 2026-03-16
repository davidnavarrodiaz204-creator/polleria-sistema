const setupSocket = (io) => {
  io.on('connection', (socket) => {
    // El cliente se une a su sala según su rol
    socket.on('join', ({ rol, userId }) => {
      socket.join(rol);
      if (userId) socket.join(`user_${userId}`);
      console.log(`🔌 ${rol} conectado (${socket.id})`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Desconectado: ${socket.id}`);
    });
  });
};

// Emitir eventos a los clientes
const emit = {
  nuevoPedido:        (io, data) => { io.to('cocina').emit('nuevo_pedido', data);        io.to('admin').emit('nuevo_pedido', data); },
  pedidoListo:        (io, data) => { io.to('mozo').emit('pedido_listo', data);          io.to('admin').emit('pedido_listo', data); },
  mesaActualizada:    (io, data) => io.emit('mesa_actualizada', data),
  deliveryActualizado:(io, data) => io.emit('delivery_actualizado', data),
  notificacion:       (io, data) => io.emit('notificacion', data),
  cajaActualizada:    (io, data) => io.to('admin').emit('caja_actualizada', data),
};

module.exports = { setupSocket, emit };
