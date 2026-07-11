import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate } from '../../../middleware/authenticate';
import { requireSuperAdmin } from '../../../middleware/authorize';
import { auditLogger } from '../../../middleware/auditLogger';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();

// Super admin only routes
router.use(authenticate);
router.use(requireSuperAdmin);

router.get('/stats', asyncHandler(adminController.getSystemStats));
router.get('/organizations', asyncHandler(adminController.listOrganizations));

router.put(
  '/organizations/:id/suspend',
  auditLogger({ action: 'UPDATE', resource: 'Organization' }),
  asyncHandler(adminController.suspendOrganization)
);

router.put(
  '/organizations/:id/unsuspend',
  auditLogger({ action: 'UPDATE', resource: 'Organization' }),
  asyncHandler(adminController.unsuspendOrganization)
);

export const adminRoutes = router;
