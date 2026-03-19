/**
 * backup.js — Rutas de backup del sistema PollerOS
 *
 * Permite al administrador:
 *  - Ver historial de backups creados
 *  - Crear un backup manual (registra en BD + descarga)
 *  - Descargar backup en formato JSON o Excel
 *  - Eliminar registros del historial
 *
 * Autor: David Navarro Diaz
 */

const express  = require('express');
const router   = express.Router();
const ExcelJS  = require('exceljs');
const { auth: authMiddleware } = require('../middleware/auth');

const Usuario  = require('../models/Usuario');
const Mesa     = require('../models/Mesa');
const Producto = require('../models/Producto');
const Pedido   = require('../models/Pedido');
const Cliente  = require('../models/Cliente');
const Caja     = require('../models/Caja');
const Backup   = require('../models/Backup');

/**
 * Middleware flexible de autenticación.
 * Acepta el token JWT por header Authorization O por query param ?token=
 * Esto es necesario para descargas directas con <a href> que no envían headers.
 */
const authFlexible = (req, res, next) => {
  const headerAuth = req.headers['authorization'];
  if (headerAuth && headerAuth.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }
  const queryToken = req.query.token;
  if (queryToken) {
    req.headers['authorization'] = `Bearer ${queryToken}`;
    return authMiddleware(req, res, next);
  }
  return res.status(401).json({ error: 'Token requerido' });
};

// ─────────────────────────────────────────────────────────────
// GET /api/backup — historial de backups (últimos 20)
// ─────────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede ver backups' });
    }
    const backups = await Backup.find().sort({ createdAt: -1 }).limit(20);
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/backup/crear — registra un backup en el historial
// El JSON se descarga en el cliente; aquí solo guardamos el registro.
// ─────────────────────────────────────────────────────────────
router.post('/crear', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede crear backups' });
    }

    const [usuarios, mesas, productos, pedidos, clientes, cajas] = await Promise.all([
      Usuario.countDocuments(), Mesa.countDocuments(), Producto.countDocuments(),
      Pedido.countDocuments(),  Cliente.countDocuments(), Caja.countDocuments()
    ]);

    const resumen = { usuarios, mesas, productos, pedidos, clientes, cajas };
    const tamaño  = Object.values(resumen).reduce((a, b) => a + b, 0);

    const backup = await Backup.create({
      tipo:      req.body.tipo || 'manual',
      tamaño,
      resumen,
      creadoPor: req.usuario.nombre || 'admin'
    });

    res.json({ success: true, _id: backup._id, tamaño, resumen });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/backup/descargar?formato=json|excel
// Descarga el backup completo. Acepta Authorization header o ?token=
// ─────────────────────────────────────────────────────────────
router.get('/descargar', authFlexible, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede descargar backups' });
    }

    const formato = req.query.formato || 'json';

    const [usuarios, mesas, productos, pedidos, clientes, cajas] = await Promise.all([
      Usuario.find().select('-password').lean(),
      Mesa.find().lean(),
      Producto.find().lean(),
      Pedido.find().lean(),
      Cliente.find().lean(),
      Caja.find().lean()
    ]);

    const fechaStr = new Date().toLocaleDateString('es-PE', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
    }).replace(/\//g, '-');

    // ── FORMATO JSON ──────────────────────────────────────────
    if (formato === 'json') {
      const backup = {
        version:      '1.0',
        restaurante:  process.env.RESTAURANTE_NOMBRE || 'PollerOS',
        fecha:        new Date().toISOString(),
        fechaLegible: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
        datos:        { usuarios, mesas, productos, pedidos, clientes, cajas },
        resumen: {
          totalUsuarios:  usuarios.length,
          totalMesas:     mesas.length,
          totalProductos: productos.length,
          totalPedidos:   pedidos.length,
          totalClientes:  clientes.length,
          totalCajas:     cajas.length
        }
      };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="backup-polleros-${fechaStr}.json"`);
      return res.json(backup);
    }

    // ── FORMATO EXCEL ─────────────────────────────────────────
    if (formato === 'excel') {
      const wb = new ExcelJS.Workbook();
      wb.creator  = process.env.RESTAURANTE_NOMBRE || 'PollerOS';
      wb.created  = new Date();
      wb.modified = new Date();

      // Estilo de cabecera reutilizable
      const estiloHeader = {
        fill:   { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4A017' } },
        font:   { bold: true, color: { argb: 'FF000000' }, size: 11 },
        border: {
          top:    { style: 'thin' }, bottom: { style: 'thin' },
          left:   { style: 'thin' }, right:  { style: 'thin' }
        },
        alignment: { horizontal: 'center' }
      };

      // ── Hoja: Pedidos ──
      const hPedidos = wb.addWorksheet('Pedidos');
      hPedidos.columns = [
        { header: '# Pedido',     key: 'numero',          width: 10 },
        { header: 'Tipo',         key: 'tipo',             width: 12 },
        { header: 'Mesa',         key: 'mesaNumero',       width: 8  },
        { header: 'Mozo',         key: 'mozo',             width: 16 },
        { header: 'Items',        key: 'items',            width: 40 },
        { header: 'Total S/',     key: 'total',            width: 12 },
        { header: 'Método pago',  key: 'metodoPago',       width: 14 },
        { header: 'Comprobante',  key: 'tipoComprobante',  width: 14 },
        { header: 'Cliente',      key: 'clienteNombre',    width: 24 },
        { header: 'Doc. Cliente', key: 'clienteDoc',       width: 14 },
        { header: 'Estado',       key: 'estado',           width: 12 },
        { header: 'Pagado',       key: 'pagado',           width: 10 },
        { header: 'Fecha',        key: 'creadoEn',         width: 20 },
      ];
      hPedidos.getRow(1).eachCell(cell => Object.assign(cell, estiloHeader));
      pedidos.forEach(p => {
        hPedidos.addRow({
          ...p,
          items: p.items?.map(i => `${i.cantidad}x ${i.nombre}`).join(', ') || '',
          pagado: p.pagado ? 'Sí' : 'No',
          creadoEn: p.creadoEn ? new Date(p.creadoEn).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : ''
        });
      });

      // ── Hoja: Clientes ──
      const hClientes = wb.addWorksheet('Clientes');
      hClientes.columns = [
        { header: 'Tipo Doc',   key: 'tipoDoc',  width: 10 },
        { header: 'Número',     key: 'numDoc',   width: 14 },
        { header: 'Nombre',     key: 'nombre',   width: 30 },
        { header: 'Dirección',  key: 'direccion',width: 30 },
        { header: 'Celular',    key: 'celular',  width: 14 },
        { header: 'Email',      key: 'email',    width: 24 },
        { header: 'Acepta promo',key:'aceptaPromo',width:13},
        { header: 'Compras',    key: 'totalCompras', width: 10 },
        { header: 'Monto total',key: 'montoAcumulado',width:13},
      ];
      hClientes.getRow(1).eachCell(cell => Object.assign(cell, estiloHeader));
      clientes.forEach(c => {
        hClientes.addRow({ ...c, aceptaPromo: c.aceptaPromo ? 'Sí' : 'No' });
      });

      // ── Hoja: Caja / Cierres ──
      const hCaja = wb.addWorksheet('Cierres de Caja');
      hCaja.columns = [
        { header: 'Fecha',        key: 'fecha',         width: 12 },
        { header: 'Apertura S/',  key: 'montoApertura', width: 13 },
        { header: 'Ventas S/',    key: 'totalVentas',   width: 13 },
        { header: 'Efectivo S/',  key: 'totalEfectivo', width: 13 },
        { header: 'Yape S/',      key: 'totalYape',     width: 11 },
        { header: 'Plin S/',      key: 'totalPlin',     width: 11 },
        { header: 'Tarjeta S/',   key: 'totalTarjeta',  width: 12 },
        { header: 'Egresos S/',   key: 'totalEgresos',  width: 12 },
        { header: 'Saldo S/',     key: 'saldoFinal',    width: 12 },
        { header: 'Estado',       key: 'estado',        width: 10 },
        { header: 'Abierta por',  key: 'abiertaPor',    width: 16 },
        { header: 'Cerrada por',  key: 'cerradaPor',    width: 16 },
      ];
      hCaja.getRow(1).eachCell(cell => Object.assign(cell, estiloHeader));
      cajas.forEach(c => hCaja.addRow(c));

      // ── Hoja: Productos / Carta ──
      const hProductos = wb.addWorksheet('Carta');
      hProductos.columns = [
        { header: 'Nombre',      key: 'nombre',      width: 28 },
        { header: 'Categoría',   key: 'categoria',   width: 16 },
        { header: 'Precio S/',   key: 'precio',      width: 12 },
        { header: 'Descripción', key: 'descripcion', width: 36 },
        { header: 'Disponible',  key: 'disponible',  width: 12 },
      ];
      hProductos.getRow(1).eachCell(cell => Object.assign(cell, estiloHeader));
      productos.forEach(p => {
        hProductos.addRow({ ...p, disponible: p.disponible !== false ? 'Sí' : 'No' });
      });

      // ── Hoja: Resumen ──
      const hResumen = wb.addWorksheet('Resumen');
      const nombreRest = process.env.RESTAURANTE_NOMBRE || 'PollerOS';
      const ahora = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
      hResumen.addRow([`BACKUP COMPLETO — ${nombreRest}`]);
      hResumen.addRow([`Generado el: ${ahora}`]);
      hResumen.addRow([]);
      hResumen.addRow(['Sección', 'Total registros']);
      [
        ['Pedidos',   pedidos.length],
        ['Clientes',  clientes.length],
        ['Productos', productos.length],
        ['Cierres de caja', cajas.length],
        ['Usuarios',  usuarios.length],
        ['Mesas',     mesas.length],
      ].forEach(fila => hResumen.addRow(fila));
      hResumen.getRow(1).font = { bold: true, size: 14 };
      hResumen.getRow(4).eachCell(cell => Object.assign(cell, estiloHeader));
      hResumen.getColumn(1).width = 22;
      hResumen.getColumn(2).width = 16;

      // Enviar el archivo
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="backup-polleros-${fechaStr}.xlsx"`);
      await wb.xlsx.write(res);
      return res.end();
    }

    res.status(400).json({ error: 'Formato no válido. Usa ?formato=json o ?formato=excel' });

  } catch (error) {
    console.error('Error generando backup:', error);
    res.status(500).json({ error: 'Error al generar backup: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/backup/:id — eliminar registro del historial
// ─────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede eliminar backups' });
    }
    await Backup.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
