import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(notificationsController.list));
router.post('/mark-all-read', asyncHandler(notificationsController.markAllAsRead));
router.put('/:id/read', asyncHandler(notificationsController.markAsRead));

export const notificationsRoutes = router;
