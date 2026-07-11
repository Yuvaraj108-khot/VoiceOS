import { Router } from 'express';
import { organizationsController } from './organizations.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticate } from '../../../middleware/authenticate';
import { requireAdmin } from '../../../middleware/authorize';
import { auditLogger } from '../../../middleware/auditLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import {
  updateOrganizationSchema,
  updateBusinessSettingsSchema,
  switchOrganizationSchema,
} from './organizations.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Current Org context routes
router.get('/current', asyncHandler(organizationsController.getCurrent));
router.get('/current/stats', asyncHandler(organizationsController.getStats));

router.put(
  '/current',
  requireAdmin,
  validateRequest({ body: updateOrganizationSchema }),
  auditLogger({ action: 'UPDATE', resource: 'Organization' }),
  asyncHandler(organizationsController.updateCurrent),
);

router.put(
  '/current/settings',
  requireAdmin,
  validateRequest({ body: updateBusinessSettingsSchema }),
  auditLogger({ action: 'CONFIGURE', resource: 'BusinessSettings' }),
  asyncHandler(organizationsController.updateSettings),
);

// User's multi-org routes
router.get('/mine', asyncHandler(organizationsController.listMine));

router.post(
  '/switch',
  validateRequest({ body: switchOrganizationSchema }),
  asyncHandler(organizationsController.switchOrg),
);

export const organizationsRoutes = router;
