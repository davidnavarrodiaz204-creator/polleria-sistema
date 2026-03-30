/**
 * emailService.js — Servicio de envío de emails con Nodemailer + Gmail
 * Configuración:
 *   - EMAIL_USER: tu correo Gmail
 *   - EMAIL_PASS: contraseña de aplicación (no tu contraseña normal)
 *     Cómo generar: https://myaccount.google.com/apppasswords
 *
 * Autor: David Navarro Diaz
 */

const nodemailer = require('nodemailer');

// Configurar transporter solo si hay credenciales
let transporter = null;

const initTransporter = () => {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.log('[EMAIL] Credenciales no configuradas. Agrega EMAIL_USER y EMAIL_PASS en .env');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    // Para Gmail es necesario esto:
    tls: { rejectUnauthorized: false }
  });

  return transporter;
};

/**
 * Genera HTML del comprobante para enviar por email
 */
const generarHtmlComprobante = (pedido, config) => {
  const nombre = config.nombre || 'Mi Pollería';
  const rucLocal = config.ruc || '';
  const direccion = config.direccion || '';
  const telefono = config.telefono || '';

  const tipo = pedido.tipoComprobante || 'ticket';
  const esBoletaFactura = tipo === 'boleta' || tipo === 'factura';

  const total = Number(pedido.total || 0);
  const igv = esBoletaFactura ? +(total * 18 / 118).toFixed(2) : 0;
  const subTotal = esBoletaFactura ? +(total - igv).toFixed(2) : total;

  const fecha = new Date().toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const hora = new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit'
  });

  const tipoLabel = {
    ticket: 'Ticket de Venta',
    boleta: 'Boleta de Venta Electrónica',
    factura: 'Factura Electrónica'
  };

  const serie = config[`serie${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`] ||
    (tipo === 'ticket' ? 'T001' : tipo === 'boleta' ? 'B001' : 'F001');
  const numero = String(pedido.numero || 1).padStart(8, '0');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tipoLabel[tipo]} - ${serie}-${numero}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #F5C518; padding-bottom: 15px; margin-bottom: 15px; }
    .logo { font-size: 36px; margin-bottom: 5px; }
    .negocio { font-size: 22px; font-weight: bold; margin: 5px 0; }
    .ruc { color: #666; font-size: 12px; }
    .comprobante-tipo { background: #F5C518; color: #212121; padding: 10px; text-align: center;
      font-weight: bold; font-size: 16px; margin: 15px 0; border-radius: 5px; }
    .serie-numero { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 15px; }
    .info-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
    .cliente-box { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f1f3f4; padding: 8px; text-align: left; font-size: 12px; }
    td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
    .text-right { text-align: right; }
    .totales { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .total-final { font-size: 20px; font-weight: bold; color: #E53935; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ccc; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .puntos-info { background: #E8F5E9; padding: 10px; border-radius: 5px; margin: 10px 0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${config.logo || '🍗'}</div>
    <div class="negocio">${nombre}</div>
    ${rucLocal ? `<div class="ruc">RUC: ${rucLocal}</div>` : ''}
    ${direccion ? `<div class="ruc">${direccion}</div>` : ''}
    ${telefono ? `<div class="ruc">Tel: ${telefono}</div>` : ''}
  </div>

  <div class="comprobante-tipo">${tipoLabel[tipo]}</div>
  <div class="serie-numero">${serie} - ${numero}</div>

  <div class="info-row"><span>Fecha:</span><span>${fecha}</span></div>
  <div class="info-row"><span>Hora:</span><span>${hora}</span></div>
  ${pedido.mesaNumero ? `<div class="info-row"><span>Mesa:</span><span>${pedido.mesaNumero}</span></div>` : ''}
  ${pedido.mozo ? `<div class="info-row"><span>Atendió:</span><span>${pedido.mozo}</span></div>` : ''}

  ${pedido.clienteNombre || pedido.clienteDoc ? `
    <div class="cliente-box">
      <strong>Datos del cliente:</strong><br>
      ${pedido.clienteNombre ? `Nombre: ${pedido.clienteNombre}<br>` : ''}
      ${pedido.clienteDoc ? `${pedido.clienteDoc.length === 8 ? 'DNI' : 'RUC'}: ${pedido.clienteDoc}<br>` : ''}
      ${pedido.direccion ? `Dirección: ${pedido.direccion}` : ''}
    </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="text-right">Cant.</th>
        <th class="text-right">P. Unit.</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${(pedido.items || []).map(item => `
        <tr>
          <td>${item.nombre}</td>
          <td class="text-right">${item.cantidad}</td>
          <td class="text-right">S/ ${item.precio.toFixed(2)}</td>
          <td class="text-right">S/ ${(item.precio * item.cantidad).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totales">
    ${esBoletaFactura ? `
      <div class="total-row"><span>Op. Gravadas:</span><span>S/ ${subTotal.toFixed(2)}</span></div>
      <div class="total-row"><span>I.G.V (18%):</span><span>S/ ${igv.toFixed(2)}</span></div>
    ` : ''}
    ${pedido.descuento > 0 ? `
      <div class="total-row" style="color: #43A047;">
        <span>Descuento${pedido.tipoDescuento === 'porcentaje' ? ` (${pedido.descuento}%)` : ''}:</span>
        <span>- S/ ${pedido.montoDescuento?.toFixed(2) || '0.00'}</span>
      </div>
    ` : ''}
    <div class="total-row total-final">
      <span>TOTAL:</span>
      <span>S/ ${total.toFixed(2)}</span>
    </div>
    <div class="total-row" style="margin-top: 8px;">
      <span>Método de pago:</span>
      <span>${(pedido.metodoPago || 'efectivo').toUpperCase()}</span>
    </div>
  </div>

  ${pedido.puntosGanados > 0 ? `
    <div class="puntos-info">
      🎁 Puntos ganados en esta compra: <strong>+${pedido.puntosGanados}</strong>
    </div>
  ` : ''}

  <div class="footer">
    <p>¡Gracias por su preferencia!</p>
    <p>${nombre}</p>
  </div>
</body>
</html>
`;
};

/**
 * Envía comprobante por email
 * @param {Object} pedido - Datos del pedido
 * @param {Object} config - Configuración del negocio
 * @param {String} emailDestino - Email del cliente
 * @returns {Promise<Object>} - Resultado del envío
 */
const enviarComprobante = async (pedido, config, emailDestino) => {
  const transporter = initTransporter();

  if (!transporter) {
    throw new Error('Servicio de email no configurado. Agrega EMAIL_USER y EMAIL_PASS en las variables de entorno.');
  }

  if (!emailDestino) {
    throw new Error('Email del cliente requerido');
  }

  const nombre = config.nombre || 'Mi Pollería';
  const tipo = pedido.tipoComprobante || 'ticket';
  const tipoLabel = tipo === 'boleta' ? 'Boleta' : tipo === 'factura' ? 'Factura' : 'Ticket';
  const numero = String(pedido.numero || 1).padStart(8, '0');

  const html = generarHtmlComprobante(pedido, config);

  const mailOptions = {
    from: `"${nombre}" <${process.env.EMAIL_USER}>`,
    to: emailDestino,
    subject: `${tipoLabel} ${numero} - ${nombre}`,
    html,
    // Alternativamente se puede adjuntar PDF:
    // attachments: [{
    //   filename: `${tipoLabel}-${numero}.pdf`,
    //   path: pedido.linkPdfSunat // si existe
    // }]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Enviado a ${emailDestino}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error enviando:', error);
    throw new Error(`Error enviando email: ${error.message}`);
  }
};

/**
 * Verifica si el servicio está configurado
 */
const estaConfigurado = () => {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

/**
 * Envía email de prueba
 */
const enviarPrueba = async (emailDestino) => {
  const transporter = initTransporter();
  if (!transporter) {
    throw new Error('Servicio de email no configurado');
  }

  await transporter.sendMail({
    from: `"${process.env.EMAIL_USER}" <${process.env.EMAIL_USER}>`,
    to: emailDestino,
    subject: 'Prueba de configuración - PollerOS',
    html: `
      <h2>✅ Configuración exitosa</h2>
      <p>El servicio de email está funcionando correctamente.</p>
      <p>Los comprobantes se enviarán desde esta dirección.</p>
    `
  });

  return { success: true };
};

module.exports = {
  enviarComprobante,
  estaConfigurado,
  enviarPrueba
};