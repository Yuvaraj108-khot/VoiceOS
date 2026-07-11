import { Request, Response } from 'express';
import { teamService } from './team.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const teamController = {
  async listMembers(req: Request, res: Response) {
    const members = await teamService.listMembers(req.organization!.id);
    ApiResponse.success(res, members);
  },

  async getMember(req: Request, res: Response) {
    const member = await teamService.getMember(req.organization!.id, req.params.id);
    ApiResponse.success(res, member);
  },

  async inviteMember(req: Request, res: Response) {
    const invite = await teamService.inviteMember(
      req.organization!.id,
      req.user!.id,
      req.body
    );
    ApiResponse.created(res, invite, 'Invitation sent successfully');
  },

  async updateRole(req: Request, res: Response) {
    const member = await teamService.updateRole(
      req.organization!.id,
      req.params.id,
      req.body.role
    );
    ApiResponse.success(res, member, { message: 'Role updated successfully' });
  },

  async removeMember(req: Request, res: Response) {
    await teamService.removeMember(req.organization!.id, req.params.id);
    ApiResponse.noContent(res);
  },

  async listInvites(req: Request, res: Response) {
    const invites = await teamService.listInvites(req.organization!.id);
    ApiResponse.success(res, invites);
  },

  async revokeInvite(req: Request, res: Response) {
    await teamService.revokeInvite(req.organization!.id, req.params.id);
    ApiResponse.noContent(res);
  },

  // Public endpoint
  async acceptInvite(req: Request, res: Response) {
    const result = await teamService.acceptInvite(req.body);
    ApiResponse.success(res, result, { message: 'Invite accepted successfully' });
  }
};
