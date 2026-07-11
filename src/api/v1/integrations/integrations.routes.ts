import { Router } from 'express';
import { integrationsController } from './integrations.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticate } from '../../../middleware/authenticate';
import { requireAdmin } from '../../../middleware/authorize';
import { auditLogger } from '../../../middleware/auditLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import {
  connectIntegrationSchema,
  updateIntegrationSchema,
} from './integrations.validator';

const router = Router();

router.use(authenticate);

// List integrations
router.get('/', asyncHandler(integrationsController.list));

// Get single integration (returns decrypted config, be careful)
router.get('/:id', requireAdmin, asyncHandler(integrationsController.get));

// Connect a new integration
router.post(
  '/',
  requireAdmin,
  validateRequest({ body: connectIntegrationSchema }),
  auditLogger({ action: 'CONFIGURE', resource: 'Integration' }),
  asyncHandler(integrationsController.connect)
);

// Update integration config/status
router.put(
  '/:id',
  requireAdmin,
  validateRequest({ body: updateIntegrationSchema }),
  auditLogger({ action: 'CONFIGURE', resource: 'Integration' }),
  asyncHandler(integrationsController.update)
);

// Disconnect integration
router.delete(
  '/:id',
  requireAdmin,
  auditLogger({ action: 'DELETE', resource: 'Integration' }),
  asyncHandler(integrationsController.disconnect)
);

export const integrationsRoutes = router;
