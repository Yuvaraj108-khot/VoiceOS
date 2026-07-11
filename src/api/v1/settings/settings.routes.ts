import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(settingsController.getUnifiedSettings));

export const settingsRoutes = router;
