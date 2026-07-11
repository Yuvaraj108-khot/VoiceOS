import { Router } from 'express';
import { aiEmployeesController } from './ai-employees.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticate } from '../../../middleware/authenticate';
import { requireAdmin } from '../../../middleware/authorize';
import { auditLogger } from '../../../middleware/auditLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from './ai-employees.validator';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(aiEmployeesController.list));
router.get('/:id', asyncHandler(aiEmployeesController.get));

router.post(
  '/',
  requireAdmin,
  validateRequest({ body: createEmployeeSchema }),
  auditLogger({
    action: 'CREATE',
    resource: 'AIEmployee',
    getResourceId: (req, res) => (res as any).locals?.data?.id
  }),
  asyncHandler(aiEmployeesController.create)
);

router.put(
  '/:id',
  requireAdmin,
  validateRequest({ body: updateEmployeeSchema }),
  auditLogger({ action: 'UPDATE', resource: 'AIEmployee' }),
  asyncHandler(aiEmployeesController.update)
);

router.delete(
  '/:id',
  requireAdmin,
  auditLogger({ action: 'DELETE', resource: 'AIEmployee' }),
  asyncHandler(aiEmployeesController.delete)
);

export const aiEmployeesRoutes = router;
