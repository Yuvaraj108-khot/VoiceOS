import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/overview', asyncHandler(analyticsController.getOverview));
router.get('/trend', asyncHandler(analyticsController.getTrend));

export const analyticsRoutes = router;
