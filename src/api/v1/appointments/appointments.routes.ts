import { Router } from 'express';
import { appointmentsController } from './appointments.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticate } from '../../../middleware/authenticate';
import { auditLogger } from '../../../middleware/auditLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from './appointments.validator';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(appointmentsController.list));
router.get('/:id', asyncHandler(appointmentsController.get));

router.post(
  '/',
  validateRequest({ body: createAppointmentSchema }),
  auditLogger({
    action: 'CREATE',
    resource: 'Appointment',
    getResourceId: (req, res) => (res as any).locals?.data?.id
  }),
  asyncHandler(appointmentsController.create)
);

router.put(
  '/:id',
  validateRequest({ body: updateAppointmentSchema }),
  auditLogger({ action: 'UPDATE', resource: 'Appointment' }),
  asyncHandler(appointmentsController.update)
);

router.delete(
  '/:id',
  auditLogger({ action: 'DELETE', resource: 'Appointment' }),
  asyncHandler(appointmentsController.delete)
);

export const appointmentsRoutes = router;
