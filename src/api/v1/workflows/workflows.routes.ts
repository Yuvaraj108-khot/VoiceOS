import { Router } from 'express';
import { workflowsController } from './workflows.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticate } from '../../../middleware/authenticate';
import { requireAdmin } from '../../../middleware/authorize';
import { auditLogger } from '../../../middleware/auditLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
} from './workflows.validator';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(workflowsController.list));
router.get('/:id', asyncHandler(workflowsController.get));

router.post(
  '/',
  requireAdmin,
  validateRequest({ body: createWorkflowSchema }),
  auditLogger({
    action: 'CREATE',
    resource: 'Workflow',
    getResourceId: (req, res) => (res as any).locals?.data?.id
  }),
  asyncHandler(workflowsController.create)
);

router.put(
  '/:id',
  requireAdmin,
  validateRequest({ body: updateWorkflowSchema }),
  auditLogger({ action: 'UPDATE', resource: 'Workflow' }),
  asyncHandler(workflowsController.update)
);

router.delete(
  '/:id',
  requireAdmin,
  auditLogger({ action: 'DELETE', resource: 'Workflow' }),
  asyncHandler(workflowsController.delete)
);

export const workflowsRoutes = router;
