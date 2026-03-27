/**
 * seed.js — Datos iniciales del sistema
 * Ejecutado al iniciar si la BD está vacía
 */
const Usuario = require('../../models/Usuario');
const Config = require('../../models/Config');
const Mesa = require('../../models/Mesa');
const Producto = require('../../models/Producto');
const Logger = require('../../utils/logger');

const seed = async () => {
  try {
    const count = await Usuario.countDocuments();
    if (count > 0) {
      Logger.info('Seed omitido: ya existen usuarios en la BD');
      return;
    }

    Logger.info('🌱 Creando datos iniciales...');

    // Crear usuarios uno a uno para que el middleware de hash funcione
    await Usuario.create({
      nombre: 'Admin Principal',
      usuario: 'admin',
      password: 'admin123',
      rol: 'admin'
    });

    await Usuario.create({
      nombre: 'Carlos Quispe',
      usuario: 'carlos',
      password: 'mozo123',
      rol: 'mozo'
    });

    await Usuario.create({
      nombre: 'Ana Torres',
      usuario: 'ana',
      password: 'mozo123',
      rol: 'mozo'
    });

    await Usuario.create({
      nombre: 'Miguel Rojas',
      usuario: 'miguel',
      password: 'cocina123',
      rol: 'cocina'
    });

    await Usuario.create({
      nombre: 'Luis Huanca',
      usuario: 'luis',
      password: 'delivery123',
      rol: 'delivery'
    });

    await Config.create({});

    // Crear mesas con capacidades variadas
    for (let i = 1; i <= 10; i++) {
      await Mesa.create({
        numero: i,
        capacidad: i <= 2 ? 2 : i <= 6 ? 4 : 6
      });
    }

    // Crear productos del menú
    await Producto.insertMany([
      { nombre: 'Pollo Entero a la Brasa',  categoria: 'Pollos',           precio: 38, emoji: '🍗' },
      { nombre: '1/2 Pollo a la Brasa',     categoria: 'Pollos',           precio: 22, emoji: '🍗' },
      { nombre: '1/4 Pollo a la Brasa',     categoria: 'Pollos',           precio: 14, emoji: '🍗' },
      { nombre: 'Pechuga',                  categoria: 'Presas',           precio: 10, emoji: '🥩' },
      { nombre: 'Pierna',                   categoria: 'Presas',           precio:  9, emoji: '🦵' },
      { nombre: 'Ala',                      categoria: 'Presas',           precio:  7, emoji: '🍖' },
      { nombre: 'Papas Fritas Grandes',     categoria: 'Acompañamientos',  precio:  8, emoji: '🍟' },
      { nombre: 'Ensalada Fresca',          categoria: 'Acompañamientos',  precio:  5, emoji: '🥗' },
      { nombre: 'Crema Huancaína',          categoria: 'Acompañamientos',  precio:  4, emoji: '🫙' },
      { nombre: 'Yuca Frita',              categoria: 'Acompañamientos',  precio:  6, emoji: '🍠' },
      { nombre: 'Inca Kola 500ml',          categoria: 'Bebidas',          precio:  4, emoji: '🥤' },
      { nombre: 'Coca Cola 500ml',          categoria: 'Bebidas',          precio:  4, emoji: '🥤' },
      { nombre: 'Chicha Morada',            categoria: 'Bebidas',          precio:  5, emoji: '🍇' },
      { nombre: 'Agua San Luis 625ml',      categoria: 'Bebidas',          precio:  3, emoji: '💧' },
      { nombre: 'Kola Escocesa',            categoria: 'Bebidas',          precio:  4, emoji: '🥤' },
      { nombre: 'Jugo de Maracuyá',         categoria: 'Bebidas',          precio:  6, emoji: '🍹' },
      { nombre: 'Arroz con Leche',          categoria: 'Postres',          precio:  6, emoji: '🍮' },
      { nombre: 'Mazamorra Morada',         categoria: 'Postres',          precio:  6, emoji: '🍮' },
    ]);

    Logger.info('✅ Datos iniciales creados exitosamente');
  } catch (error) {
    Logger.error('Error en seed:', error);
  }
};

module.exports = { seed };
