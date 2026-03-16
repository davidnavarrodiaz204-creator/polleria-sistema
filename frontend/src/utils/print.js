// Utilidades de impresión para boletas, tickets de cocina y caja

export const imprimirBoleta = (pedido, config = {}) => {
  const nombre = config.nombre || 'PollerOS'
  const ruc = config.ruc || ''
  const direccion = config.direccion || ''
  const telefono = config.telefono || ''

  const contenido = `
    <html><head>
    <meta charset="UTF-8">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Courier New', monospace; width: 80mm; font-size: 12px; padding: 8px; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .big { font-size: 16px; font-weight: bold; }
      .line { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; padding: 2px 0; }
      .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; padding: 4px 0; }
    </style>
    </head><body>
      <div class="center big">${config.logo || '🍗'} ${nombre}</div>
      ${ruc ? `<div class="center">RUC: ${ruc}</div>` : ''}
      ${direccion ? `<div class="center">${direccion}</div>` : ''}
      ${telefono ? `<div class="center">Tel: ${telefono}</div>` : ''}
      <div class="line"></div>
      <div class="center bold">BOLETA DE VENTA</div>
      <div class="center">N° ${String(pedido.numero || '').padStart(6,'0')}</div>
      <div class="row"><span>Fecha:</span><span>${new Date().toLocaleDateString('es-PE')}</span></div>
      <div class="row"><span>Hora:</span><span>${new Date().toLocaleTimeString('es-PE', {hour:'2-digit',minute:'2-digit'})}</span></div>
      ${pedido.mesaNumero ? `<div class="row"><span>Mesa:</span><span>${pedido.mesaNumero}</span></div>` : ''}
      ${pedido.mozo ? `<div class="row"><span>Atendido por:</span><span>${pedido.mozo}</span></div>` : ''}
      <div class="line"></div>
      <div class="bold">PRODUCTOS</div>
      <div class="line"></div>
      ${(pedido.items || []).map(item => `
        <div class="row">
          <span>${item.cantidad}x ${item.nombre}</span>
          <span>S/ ${(item.precio * item.cantidad).toFixed(2)}</span>
        </div>
        <div style="font-size:11px;color:#666;padding-left:8px;">@ S/ ${item.precio.toFixed(2)} c/u</div>
      `).join('')}
      <div class="line"></div>
      <div class="total-row"><span>TOTAL:</span><span>S/ ${(pedido.total || 0).toFixed(2)}</span></div>
      ${pedido.metodoPago ? `<div class="row"><span>Pago:</span><span style="text-transform:capitalize">${pedido.metodoPago}</span></div>` : ''}
      <div class="line"></div>
      <div class="center">¡Gracias por su preferencia!</div>
      <div class="center" style="font-size:10px;margin-top:4px;">Vuelva pronto 🍗</div>
      <br/><br/>
    </body></html>
  `

  const ventana = window.open('', '_blank', 'width=320,height=600')
  ventana.document.write(contenido)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => { ventana.print(); ventana.close() }, 500)
}

export const imprimirTicketCocina = (pedido) => {
  const contenido = `
    <html><head>
    <meta charset="UTF-8">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Courier New', monospace; width: 80mm; font-size: 14px; padding: 10px; }
      .center { text-align: center; }
      .big { font-size: 22px; font-weight: bold; }
      .line { border-top: 2px dashed #000; margin: 8px 0; }
      .item { display: flex; gap: 8px; padding: 4px 0; font-size: 16px; border-bottom: 1px dotted #999; }
      .qty { font-weight: bold; font-size: 20px; min-width: 28px; }
    </style>
    </head><body>
      <div class="center big">🍗 COCINA</div>
      <div class="line"></div>
      <div style="font-size:18px;font-weight:bold;">
        ${pedido.mesaNumero ? `Mesa ${pedido.mesaNumero}` : pedido.tipo === 'delivery' ? 'DELIVERY' : 'PARA LLEVAR'}
      </div>
      <div>Pedido #${pedido.numero} — ${new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</div>
      ${pedido.mozo ? `<div>Mozo: ${pedido.mozo}</div>` : ''}
      <div class="line"></div>
      ${(pedido.items || []).map(item => `
        <div class="item">
          <span class="qty">${item.cantidad}x</span>
          <span>${item.nombre}</span>
        </div>
        ${item.nota ? `<div style="font-size:12px;padding-left:36px;color:#333;">⚠ ${item.nota}</div>` : ''}
      `).join('')}
      ${pedido.nota ? `<div class="line"></div><div>NOTA: ${pedido.nota}</div>` : ''}
      <div class="line"></div>
      <br/><br/><br/>
    </body></html>
  `

  const ventana = window.open('', '_blank', 'width=320,height=500')
  ventana.document.write(contenido)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => { ventana.print(); ventana.close() }, 500)
}

export const imprimirCierreCaja = (caja, egresos = []) => {
  const contenido = `
    <html><head>
    <meta charset="UTF-8">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Courier New', monospace; width: 80mm; font-size: 12px; padding: 8px; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .row { display: flex; justify-content: space-between; padding: 3px 0; }
      .line { border-top: 1px dashed #000; margin: 6px 0; }
      .total { font-size: 15px; font-weight: bold; }
    </style>
    </head><body>
      <div class="center bold" style="font-size:16px;">CIERRE DE CAJA</div>
      <div class="center">${caja.fecha}</div>
      <div class="line"></div>
      <div class="row"><span>Apertura con:</span><span>S/ ${(caja.montoApertura||0).toFixed(2)}</span></div>
      <div class="line"></div>
      <div class="bold">VENTAS DEL DÍA</div>
      <div class="row"><span>Efectivo:</span><span>S/ ${(caja.totalEfectivo||0).toFixed(2)}</span></div>
      <div class="row"><span>Yape:</span><span>S/ ${(caja.totalYape||0).toFixed(2)}</span></div>
      <div class="row"><span>Plin:</span><span>S/ ${(caja.totalPlin||0).toFixed(2)}</span></div>
      <div class="row"><span>Tarjeta:</span><span>S/ ${(caja.totalTarjeta||0).toFixed(2)}</span></div>
      <div class="row total"><span>TOTAL VENTAS:</span><span>S/ ${(caja.totalVentas||0).toFixed(2)}</span></div>
      <div class="line"></div>
      <div class="bold">EGRESOS</div>
      ${egresos.map(e => `<div class="row"><span>${e.descripcion}</span><span>S/ ${e.monto.toFixed(2)}</span></div>`).join('')}
      <div class="row total"><span>TOTAL EGRESOS:</span><span>S/ ${(caja.totalEgresos||0).toFixed(2)}</span></div>
      <div class="line"></div>
      <div class="row total"><span>SALDO FINAL:</span><span>S/ ${(caja.saldoFinal||0).toFixed(2)}</span></div>
      ${caja.cerradaPor ? `<div class="row"><span>Cerrado por:</span><span>${caja.cerradaPor}</span></div>` : ''}
      <br/><br/>
    </body></html>
  `

  const ventana = window.open('', '_blank', 'width=320,height=700')
  ventana.document.write(contenido)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => { ventana.print(); ventana.close() }, 500)
}
