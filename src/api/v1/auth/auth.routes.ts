import { Router } from 'express';
import { authController } from './auth.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticate } from '../../../middleware/authenticate';
import { authRateLimiter, sensitiveRateLimiter } from '../../../middleware/rateLimiter';
import { asyncHandler } from '../../../utils/asyncHandler';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from './auth.validator';

const router = Router();

// Public routes
router.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  asyncHandler(authController.register),
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  asyncHandler(authController.login),
);

router.post('/refresh', asyncHandler(authController.refresh));

router.post(
  '/forgot-password',
  sensitiveRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword),
);

router.post(
  '/reset-password',
  sensitiveRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
);

router.get('/verify-email', asyncHandler(authController.verifyEmail));

// Protected routes
router.use(authenticate);

router.post('/logout', asyncHandler(authController.logout));
router.get('/me', asyncHandler(authController.getMe));

router.put(
  '/me',
  validateRequest({ body: updateProfileSchema }),
  asyncHandler(authController.updateProfile),
);

router.post(
  '/change-password',
  sensitiveRateLimiter,
  validateRequest({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
);

export const authRoutes = router;
