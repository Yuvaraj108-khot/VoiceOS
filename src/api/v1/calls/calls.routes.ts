import { Router } from 'express';
import { callsController } from './calls.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { optionalAuthenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../utils/asyncHandler';
import { triggerCallSchema } from './calls.validator';

const router = Router();

router.use(optionalAuthenticate);

router.get('/', asyncHandler(callsController.list));
router.get('/:id', asyncHandler(callsController.get));

router.post(
  '/trigger',
  validateRequest({ body: triggerCallSchema }),
  asyncHandler(callsController.triggerOutboundCall)
);

router.get('/:id/recording', asyncHandler(callsController.getRecording));

export const callsRoutes = router;

