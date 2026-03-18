// ─── Utilidades de impresión — Formato peruano real ───────────────────────────

const abrirVentana = (html) => {
  const win = window.open('', '_blank', 'width=360,height=750,scrollbars=yes')
  if (!win) { alert('Activa los popups del navegador para imprimir'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 900)
}

// ── Número en letras (español peruano) ────────────────────────────────────────
const enLetras = (n) => {
  const entero = Math.floor(n)
  const cents  = Math.round((n - entero) * 100)
  const cts    = String(cents).padStart(2, '0')

  const unidades = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
                    'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE',
                    'DIECIOCHO','DIECINUEVE','VEINTE']
  const decenas  = ['','','VEINTI','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA']
  const centenas = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
                    'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS']

  const toWords = (num) => {
    if (num === 0) return 'CERO'
    if (num <= 20) return unidades[num]
    if (num < 30) return 'VEINTI' + unidades[num - 20]
    if (num < 100) {
      const d = Math.floor(num / 10), u = num % 10
      return decenas[d] + (u ? ' Y ' + unidades[u] : '')
    }
    if (num === 100) return 'CIEN'
    if (num < 1000) {
      const c = Math.floor(num / 100), r = num % 100
      return centenas[c] + (r ? ' ' + toWords(r) : '')
    }
    if (num < 1000000) {
      const m = Math.floor(num / 1000), r = num % 1000
      return (m === 1 ? 'MIL' : toWords(m) + ' MIL') + (r ? ' ' + toWords(r) : '')
    }
    return String(num)
  }

  return toWords(entero) + ` CON ${cts}/100 SOLES`
}

// ── Generar QR real con API pública ───────────────────────────────────────────
// Usamos goqr.me que es gratuita y no requiere API key
const qrUrl = (texto) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(texto)}`

// ── BOLETA / FACTURA / TICKET / NOTA DE CRÉDITO ───────────────────────────────
export const imprimirBoleta = (pedido, config = {}) => {
  const nombre    = config.nombre    || 'Mi Pollería'
  const rucLocal  = config.ruc       || ''
  const direccion = config.direccion || ''
  const telefono  = config.telefono  || ''
  const email     = config.email     || ''
  const logo      = config.logo      || '🍗'

  const tipo = pedido.tipoComprobante || 'ticket'

  const TITULOS = {
    ticket:       'TICKET DE VENTA',
    boleta:       'BOLETA DE VENTA ELECTRÓNICA',
    factura:      'FACTURA ELECTRÓNICA',
    nota_credito: 'NOTA DE CRÉDITO ELECTRÓNICA',
  }
  const SERIES = {
    ticket:       'T001',
    boleta:       'B001',
    factura:      'F001',
    nota_credito: 'NC01',
  }

  const serie    = SERIES[tipo] || 'T001'
  const numero   = String(pedido.numero || 1).padStart(8, '0')
  const totalNum = Number(pedido.total  || 0)

  // IGV 18% — solo en boleta y factura
  const conIGV   = tipo === 'boleta' || tipo === 'factura'
  const igv      = conIGV ? +(totalNum * 18 / 118).toFixed(2) : 0
  const subTotal = conIGV ? +(totalNum - igv).toFixed(2)       : totalNum

  const fecha = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })
  const hora  = new Date().toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })

  // Datos para QR (formato SUNAT básico)
  const qrData = [rucLocal, serie, numero, igv.toFixed(2), totalNum.toFixed(2), fecha].join('|')

  const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 78mm;
    max-width: 78mm;
    padding: 6px 8px;
    font-size: 11px;
    color: #000;
    background: #fff;
  }
  .center  { text-align: center; }
  .right   { text-align: right; }
  .bold    { font-weight: bold; }
  .negocio { font-size: 15px; font-weight: bold; text-align: center; letter-spacing: 0.5px; }
  .logo-emoji { font-size: 28px; text-align: center; display: block; margin-bottom: 3px; }
  .titulo-box {
    border: 2px solid #000;
    text-align: center;
    padding: 4px 6px;
    margin: 6px 0;
    font-weight: bold;
    font-size: 12px;
  }
  .serie-num { font-size: 13px; font-weight: bold; text-align: center; }
  .line-solid  { border-top: 1px solid #000; margin: 4px 0; }
  .line-dashed { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 11px; }
  .row-bold { display: flex; justify-content: space-between; font-weight: bold; padding: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  thead tr { border-bottom: 1px solid #000; border-top: 1px solid #000; }
  th { font-size: 10px; font-weight: bold; padding: 2px 1px; text-align: left; }
  td { font-size: 11px; padding: 2px 1px; vertical-align: top; }
  .th-r, .td-r { text-align: right; }
  .th-c, .td-c { text-align: center; }
  .totales-box { border: 1px solid #000; padding: 5px 8px; margin: 4px 0; }
  .total-grande { font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; padding: 2px 0; }
  .qr-section { text-align: center; margin: 8px 0 4px; }
  .qr-section img { width: 90px; height: 90px; display: block; margin: 0 auto; }
  .small { font-size: 9px; }
  .footer { text-align: center; margin-top: 4px; }
  @media print {
    body { width: 78mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style>
</head>
<body>

  <!-- ENCABEZADO -->
  <span class="logo-emoji">${logo}</span>
  ${rucLocal ? `<div class="center bold">RUC: ${rucLocal}</div>` : ''}
  <div class="negocio">${nombre.toUpperCase()}</div>
  ${config.razonSocial ? `<div class="center" style="font-size:11px">${config.razonSocial}</div>` : ''}
  ${direccion ? `<div class="center" style="font-size:10px">${direccion}</div>` : ''}
  ${telefono  ? `<div class="center" style="font-size:10px">Telf: ${telefono}</div>` : ''}
  ${email     ? `<div class="center" style="font-size:10px">Correo: ${email}</div>` : ''}

  <!-- TIPO Y NÚMERO -->
  <div class="titulo-box">${TITULOS[tipo]}</div>
  <div class="serie-num">${serie} - ${numero}</div>

  <div class="line-dashed"></div>

  <!-- DATOS DEL COMPROBANTE -->
  <div class="row"><span>FECHA:</span><span>${fecha}</span></div>
  <div class="row"><span>HORA:</span><span>${hora}</span></div>
  ${pedido.mesaNumero ? `<div class="row"><span>MESA:</span><span>${pedido.mesaNumero}</span></div>` : ''}
  ${pedido.mozo       ? `<div class="row"><span>ATENDIÓ:</span><span>${pedido.mozo}</span></div>` : ''}

  <!-- DATOS DEL CLIENTE -->
  ${(pedido.clienteNombre || pedido.ruc) ? `
    <div class="line-dashed"></div>
    ${tipo === 'factura' ? `
      <div class="row"><span>RUC:</span><span>${pedido.clienteDoc || pedido.ruc || ''}</span></div>
      <div class="row"><span>RAZÓN SOCIAL:</span><span style="text-align:right;flex:1;margin-left:4px">${pedido.razonSocial || pedido.clienteNombre || ''}</span></div>
      ${pedido.direccion ? `<div class="row"><span>DIRECCIÓN:</span><span style="text-align:right;flex:1;margin-left:4px">${pedido.direccion}</span></div>` : ''}
    ` : `
      <div class="row"><span>CLIENTE:</span><span>${pedido.clienteNombre || ''}</span></div>
      ${pedido.clienteDoc ? `<div class="row"><span>${pedido.clienteDoc.length === 8 ? 'DNI' : 'RUC'}:</span><span>${pedido.clienteDoc}</span></div>` : ''}
    `}
  ` : ''}

  <!-- DETALLE DE PRODUCTOS -->
  <div class="line-solid"></div>
  <table>
    <thead>
      <tr>
        <th style="width:42%">DESCRIPCIÓN</th>
        <th class="th-c" style="width:10%">U.M</th>
        <th class="th-c" style="width:12%">CANT</th>
        <th class="th-r" style="width:18%">P.UNIT</th>
        <th class="th-r" style="width:18%">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${(pedido.items || []).map(item => `
        <tr>
          <td>${item.nombre}</td>
          <td class="td-c">UND</td>
          <td class="td-c">${item.cantidad}</td>
          <td class="td-r">${item.precio.toFixed(2)}</td>
          <td class="td-r">${(item.precio * item.cantidad).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="line-solid"></div>

  <!-- TOTALES -->
  <div class="totales-box">
    ${conIGV ? `
      <div class="row"><span>OP. GRAVADAS&nbsp;&nbsp;(S/):</span><span>${subTotal.toFixed(2)}</span></div>
      <div class="row"><span>I.G.V 18%&nbsp;&nbsp;&nbsp;&nbsp;(S/):</span><span>${igv.toFixed(2)}</span></div>
      <div class="line-dashed"></div>
    ` : ''}
    <div class="total-grande">
      <span>TOTAL&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(S/)</span>
      <span>${totalNum.toFixed(2)}</span>
    </div>
  </div>

  <!-- SON / PAGO -->
  <div class="row"><span class="bold">SON:</span><span style="text-align:right;flex:1;margin-left:4px">${enLetras(totalNum)}</span></div>
  <div class="row"><span class="bold">FORMA DE PAGO:</span><span>${(pedido.metodoPago || 'EFECTIVO').toUpperCase()}</span></div>
  ${pedido.metodoPago === 'efectivo' && Number(pedido.vuelto) > 0
    ? `<div class="row"><span class="bold">VUELTO (S/):</span><span>${Number(pedido.vuelto).toFixed(2)}</span></div>` : ''}
  <div class="row"><span class="bold">COND. VENTA:</span><span>CONTADO</span></div>

  <!-- QR y pie de página para boleta/factura -->
  ${conIGV ? `
    <div class="line-dashed"></div>
    <div class="qr-section">
      <img src="${qrUrl(qrData)}" alt="QR" onerror="this.style.display='none';this.nextSibling.style.display='block'"/>
      <div style="display:none;border:1px solid #999;width:90px;height:90px;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:8px;text-align:center">
        Código QR<br>${serie}-${numero}
      </div>
    </div>
    <div class="center small">Representación impresa de ${TITULOS[tipo]}</div>
    ${rucLocal ? `<div class="center small">Puede consultar en: www.sunat.gob.pe</div>` : ''}
    <div class="center small">Autorizado mediante Res. 034-005-0000001</div>
  ` : ''}

  <div class="line-dashed"></div>
  <div class="footer bold" style="font-size:12px">¡Gracias por su preferencia!</div>
  <div class="footer small">${nombre}</div>
  <br/><br/><br/>

</body></html>`

  abrirVentana(html)
}

// ── TICKET DE COCINA ──────────────────────────────────────────────────────────
export const imprimirTicketCocina = (pedido) => {
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; width:78mm; padding:8px; font-size:13px; background:#fff; }
  .center { text-align:center; }
  .big    { font-size:22px; font-weight:bold; }
  .line   { border-top:2px dashed #000; margin:6px 0; }
  .item   { display:flex; gap:8px; padding:5px 0; border-bottom:1px dotted #999; align-items:flex-start; }
  .qty    { font-weight:bold; font-size:24px; min-width:32px; color:#000; }
  @media print { @page { margin:0; size:80mm auto; } }
</style></head><body>
  <div class="center big">*** COCINA ***</div>
  <div class="line"></div>
  <div style="font-size:20px;font-weight:bold">
    ${pedido.tipo==='mesa'     ? 'MESA ' + pedido.mesaNumero :
      pedido.tipo==='delivery' ? '*** DELIVERY ***'          : '*** PARA LLEVAR ***'}
  </div>
  <div style="font-size:13px">
    Pedido #${pedido.numero} — ${new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}
  </div>
  ${pedido.mozo ? `<div style="font-size:12px">Mozo: ${pedido.mozo}</div>` : ''}
  <div class="line"></div>
  ${(pedido.items||[]).map(i=>`
    <div class="item">
      <span class="qty">${i.cantidad}x</span>
      <div>
        <div style="font-weight:700;font-size:14px">${i.nombre}</div>
        ${i.nota ? `<div style="font-size:11px">*** ${i.nota} ***</div>` : ''}
      </div>
    </div>
  `).join('')}
  ${pedido.nota ? `<div class="line"></div><div style="font-weight:bold;font-size:13px">NOTA ESPECIAL: ${pedido.nota}</div>` : ''}
  <div class="line"></div>
  <br/><br/><br/>
</body></html>`

  abrirVentana(html)
}

// ── CIERRE DE CAJA ────────────────────────────────────────────────────────────
export const imprimirCierreCaja = (caja, egresos = []) => {
  const fecha = caja.fecha || new Date().toLocaleDateString('es-PE')
  const html  = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; width:78mm; padding:8px; font-size:11px; background:#fff; }
  .center { text-align:center; }
  .bold   { font-weight:bold; }
  .row    { display:flex; justify-content:space-between; padding:2.5px 0; }
  .row-b  { display:flex; justify-content:space-between; font-weight:bold; padding:3px 0; font-size:13px; }
  .line   { border-top:1px dashed #000; margin:5px 0; }
  @media print { @page { margin:0; size:80mm auto; } }
</style></head><body>
  <div class="center bold" style="font-size:16px">REPORTE DE CIERRE</div>
  <div class="center bold" style="font-size:13px">CAJA DEL DÍA</div>
  <div class="center">${fecha}</div>
  <div class="line"></div>
  <div class="row"><span>Monto apertura:</span><span>S/ ${(caja.montoApertura||0).toFixed(2)}</span></div>
  <div class="line"></div>
  <div class="bold">INGRESOS POR FORMA DE PAGO</div>
  <div class="row"><span>Efectivo:</span><span>S/ ${(caja.totalEfectivo||0).toFixed(2)}</span></div>
  <div class="row"><span>Yape:</span><span>S/ ${(caja.totalYape||0).toFixed(2)}</span></div>
  <div class="row"><span>Plin:</span><span>S/ ${(caja.totalPlin||0).toFixed(2)}</span></div>
  <div class="row"><span>Tarjeta:</span><span>S/ ${(caja.totalTarjeta||0).toFixed(2)}</span></div>
  <div class="row-b"><span>TOTAL VENTAS:</span><span>S/ ${(caja.totalVentas||0).toFixed(2)}</span></div>
  <div class="line"></div>
  <div class="bold">EGRESOS DEL DÍA</div>
  ${egresos.map(e=>`<div class="row"><span>${e.descripcion}</span><span>S/ ${e.monto.toFixed(2)}</span></div>`).join('')}
  <div class="row-b"><span>TOTAL EGRESOS:</span><span>S/ ${(caja.totalEgresos||0).toFixed(2)}</span></div>
  <div class="line"></div>
  <div class="row-b" style="font-size:15px"><span>SALDO FINAL:</span><span>S/ ${(caja.saldoFinal||0).toFixed(2)}</span></div>
  ${caja.montoCierre!=null ? `<div class="row"><span>Contado físico:</span><span>S/ ${Number(caja.montoCierre).toFixed(2)}</span></div>` : ''}
  ${caja.cerradaPor   ? `<div class="row"><span>Cerrado por:</span><span>${caja.cerradaPor}</span></div>` : ''}
  ${caja.observaciones ? `<div class="line"></div><div>${caja.observaciones}</div>` : ''}
  <div class="line"></div>
  <div class="center bold">- - - FIN DEL REPORTE - - -</div>
  <br/><br/>
</body></html>`

  abrirVentana(html)
}
