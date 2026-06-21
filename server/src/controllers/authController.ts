import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import type { LoginDto, SignupDto } from '../dtos/authDto.js';

const authService = new AuthService();

export const authController = {
  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.signup(req.body as SignupDto);
      return res.status(201).json({
        ok: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body as LoginDto);
      return res.json({
        ok: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response) {
    return res.json({
      ok: true,
      user: req.auth
    });
  },

  async adminCheck(req: Request, res: Response) {
    return res.json({
      ok: true,
      message: 'Admin access confirmed.',
      user: req.auth
    });
  }
};
