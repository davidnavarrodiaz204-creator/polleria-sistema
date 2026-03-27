/**
 * auth.service.js — Lógica de negocio de autenticación
 * Separa la lógica del controller y maneja errores de forma consistente
 */
const jwt = require('jsonwebtoken');
const Usuario = require('../../../models/Usuario');
const { AuthenticationError, ConflictError } = require('../../../utils/errors');

class AuthService {
  /**
   * Autenticar usuario y generar token JWT
   * @param {string} usuario - Nombre de usuario
   * @param {string} password - Contraseña
   * @returns {Promise<{token: string, usuario: object}>}
   */
  async login(usuario, password) {
    const user = await Usuario.findOne({ usuario: usuario.toLowerCase(), activo: true });

    if (!user) {
      throw new AuthenticationError('Usuario o contraseña incorrectos');
    }

    const valido = await user.comparePassword(password);

    if (!valido) {
      throw new AuthenticationError('Usuario o contraseña incorrectos');
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user._id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return {
      token,
      usuario: {
        id: user._id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
      },
    };
  }

  /**
   * Obtener perfil del usuario actual
   * @param {string} userId - ID del usuario
   * @returns {Promise<object>}
   */
  async getProfile(userId) {
    const user = await Usuario.findById(userId).select('-password');
    if (!user || !user.activo) {
      throw new AuthenticationError('Usuario no válido');
    }
    return user;
  }

  /**
   * Crear nuevo usuario (solo admin)
   * @param {object} data - Datos del usuario
   * @returns {Promise<object>}
   */
  async createUser(data) {
    const { nombre, usuario, password, rol = 'mozo' } = data;

    // Verificar si el usuario ya existe
    const existe = await Usuario.findOne({ usuario: usuario.toLowerCase() });
    if (existe) {
      throw new ConflictError('El nombre de usuario ya está registrado');
    }

    const user = await Usuario.create({
      nombre,
      usuario: usuario.toLowerCase(),
      password,
      rol,
    });

    return {
      id: user._id,
      nombre: user.nombre,
      usuario: user.usuario,
      rol: user.rol,
      activo: user.activo,
      createdAt: user.createdAt,
    };
  }

  /**
   * Cambiar contraseña de usuario
   * @param {string} userId - ID del usuario
   * @param {string} currentPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await Usuario.findById(userId);
    if (!user) {
      throw new AuthenticationError('Usuario no encontrado');
    }

    const valido = await user.comparePassword(currentPassword);
    if (!valido) {
      throw new AuthenticationError('Contraseña actual incorrecta');
    }

    user.password = newPassword;
    await user.save();

    return { message: 'Contraseña actualizada correctamente' };
  }
}

module.exports = new AuthService();
