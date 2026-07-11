import { Request, Response } from 'express';
import { authService } from './auth.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    
    // Set HttpOnly refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    ApiResponse.created(res, {
      accessToken: result.accessToken,
      user: result.user,
      organization: result.organization,
    }, 'Registration successful');
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body, req.ip, req.headers['user-agent']);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    ApiResponse.success(res, {
      accessToken: result.accessToken,
      user: result.user,
      organization: result.organization,
    }, { message: 'Login successful' });
  },

  async refresh(req: Request, res: Response) {
    const oldToken = req.cookies?.refreshToken;
    if (!oldToken) {
      ApiResponse.success(res, null, { statusCode: 401, message: 'Refresh token required' });
      return;
    }

    const result = await authService.refresh(oldToken, req.ip, req.headers['user-agent']);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    ApiResponse.success(res, { accessToken: result.accessToken });
  },

  async logout(req: Request, res: Response) {
    const token = req.headers.authorization?.slice(7);
    const payload = require('jsonwebtoken').decode(token) as any;
    const refreshToken = req.cookies?.refreshToken;

    if (payload?.jti) {
      await authService.logout(req.user!.id, payload.jti, refreshToken);
    }
    
    res.clearCookie('refreshToken');
    ApiResponse.noContent(res);
  },

  async getMe(req: Request, res: Response) {
    ApiResponse.success(res, {
      user: req.user,
      organization: req.organization,
      member: req.member,
    });
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    // Always return success to prevent email enumeration
    ApiResponse.success(res, null, { message: 'If that email exists, a reset link has been sent' });
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body.token, req.body);
    ApiResponse.success(res, null, { message: 'Password reset successfully' });
  },

  async verifyEmail(req: Request, res: Response) {
    const token = req.query.token as string;
    await authService.verifyEmail(token);
    ApiResponse.success(res, null, { message: 'Email verified successfully' });
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(req.user!.id, req.body);
    ApiResponse.success(res, null, { message: 'Password changed successfully' });
  },

  async updateProfile(req: Request, res: Response) {
    const user = await authService.updateProfile(req.user!.id, req.body);
    ApiResponse.success(res, { user });
  }
};
