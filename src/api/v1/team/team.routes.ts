import { Router } from 'express';
import { teamController } from './team.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticate } from '../../../middleware/authenticate';
import { requireAdmin, requireOwner } from '../../../middleware/authorize';
import { auditLogger } from '../../../middleware/auditLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import {
  inviteMemberSchema,
  updateRoleSchema,
  acceptInviteSchema,
} from './team.validator';

const router = Router();

// Public route for accepting invites
router.post(
  '/invites/accept',
  validateRequest({ body: acceptInviteSchema }),
  asyncHandler(teamController.acceptInvite)
);

// Protected routes
router.use(authenticate);

// Members
router.get('/', asyncHandler(teamController.listMembers));
router.get('/:id', asyncHandler(teamController.getMember));

router.put(
  '/:id/role',
  requireOwner, // Only owners can change roles to prevent privilege escalation
  validateRequest({ body: updateRoleSchema }),
  auditLogger({ action: 'UPDATE', resource: 'TeamMember' }),
  asyncHandler(teamController.updateRole)
);

router.delete(
  '/:id',
  requireAdmin,
  auditLogger({ action: 'DELETE', resource: 'TeamMember' }),
  asyncHandler(teamController.removeMember)
);

// Invites
router.get('/invites', asyncHandler(teamController.listInvites));

router.post(
  '/invites',
  requireAdmin,
  validateRequest({ body: inviteMemberSchema }),
  auditLogger({ action: 'CREATE', resource: 'TeamInvite' }),
  asyncHandler(teamController.inviteMember)
);

router.delete(
  '/invites/:id',
  requireAdmin,
  auditLogger({ action: 'DELETE', resource: 'TeamInvite' }),
  asyncHandler(teamController.revokeInvite)
);

export const teamRoutes = router;
