import { Router } from 'express';
import { knowledgeController } from './knowledge.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticate } from '../../../middleware/authenticate';
import { auditLogger } from '../../../middleware/auditLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import { createKnowledgeDocumentSchema, updateKnowledgeDocumentSchema } from './knowledge.validator';
import { uploadMiddleware } from '../../../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(knowledgeController.list));
router.get('/:id', asyncHandler(knowledgeController.get));

router.post(
  '/',
  uploadMiddleware.single('file'),
  validateRequest({ body: createKnowledgeDocumentSchema }),
  auditLogger({ action: 'CREATE', resource: 'KnowledgeDocument' }),
  asyncHandler(knowledgeController.create)
);

router.patch(
  '/:id',
  validateRequest({ body: updateKnowledgeDocumentSchema }),
  auditLogger({ action: 'UPDATE', resource: 'KnowledgeDocument' }),
  asyncHandler(knowledgeController.update)
);

router.delete(
  '/:id',
  auditLogger({ action: 'DELETE', resource: 'KnowledgeDocument' }),
  asyncHandler(knowledgeController.delete)
);

export const knowledgeRoutes = router;
