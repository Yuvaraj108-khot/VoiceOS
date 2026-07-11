import { Router } from 'express';
import { customersController } from './customers.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticate } from '../../../middleware/authenticate';
import { auditLogger } from '../../../middleware/auditLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import {
  createCustomerSchema,
  updateCustomerSchema,
} from './customers.validator';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(customersController.list));
router.get('/:id', asyncHandler(customersController.get));

router.post(
  '/',
  validateRequest({ body: createCustomerSchema }),
  auditLogger({
    action: 'CREATE',
    resource: 'Customer',
    getResourceId: (req, res) => (res as any).locals?.data?.id
  }),
  asyncHandler(customersController.create)
);

router.put(
  '/:id',
  validateRequest({ body: updateCustomerSchema }),
  auditLogger({ action: 'UPDATE', resource: 'Customer' }),
  asyncHandler(customersController.update)
);

router.delete(
  '/:id',
  auditLogger({ action: 'DELETE', resource: 'Customer' }),
  asyncHandler(customersController.delete)
);

export const customersRoutes = router;
