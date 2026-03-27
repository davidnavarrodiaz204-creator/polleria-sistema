/**
 * auth.controller.js — Controllers para autenticación
 * Solo parsea requests, delega lógica al service, formatea responses
 */
const authService = require('../../../application/services/auth.service');
const catchAsync = require('../../../utils/catchAsync');
const Logger = require('../../../utils/logger');

class AuthController {
  /**
   * POST /api/auth/login
   */
  login = catchAsync(async (req, res) => {
    const { usuario, password } = req.body;
    const result = await authService.login(usuario, password);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: result,
    });
  });

  /**
   * GET /api/auth/me
   */
  getProfile = catchAsync(async (req, res) => {
    const user = await authService.getProfile(req.usuario._id);

    res.json({
      success: true,
      data: { user },
    });
  });

  /**
   * POST /api/auth/register (solo admin)
   */
  register = catchAsync(async (req, res) => {
    const user = await authService.createUser(req.body);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: { user },
    });
  });

  /**
   * PUT /api/auth/change-password
   */
  changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.usuario._id,
      currentPassword,
      newPassword
    );

    res.json({
      success: true,
      message: result.message,
    });
  });
}

module.exports = new AuthController();
