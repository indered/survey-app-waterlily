import express from 'express';
import { LoginDto, SignupDto } from '../dtos/authDto.js';
import { authController } from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateDto } from '../middleware/validation.js';

const router = express.Router();

router.get('/signup', (_req, res) => {
  res.status(405).json({
    ok: false,
    message: 'Signup is a POST endpoint. Send email, password and optional fullname in JSON body.'
  });
});

router.post('/signup', validateDto(SignupDto), authController.signup);

router.get('/login', (_req, res) => {
  res.status(405).json({
    ok: false,
    message: 'Login is a POST endpoint. Send email, password in JSON body.'
  });
});

router.post('/login', validateDto(LoginDto), authController.login);

router.get('/me', requireAuth, authController.me);
router.get('/admin-check', requireAuth, requireRole('admin'), authController.adminCheck);

export default router;
