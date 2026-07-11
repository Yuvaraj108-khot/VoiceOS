import { Request, Response } from 'express';
import { organizationsService } from './organizations.service';
import { ApiResponse } from '../../../utils/ApiResponse';
import { tokenService } from '../../../lib/tokenService';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';

export const organizationsController = {
  async getCurrent(req: Request, res: Response) {
    const org = await organizationsService.getOrganization(req.organization!.id);
    ApiResponse.success(res, org);
  },

  async updateCurrent(req: Request, res: Response) {
    const org = await organizationsService.updateOrganization(req.organization!.id, req.body);
    ApiResponse.success(res, org, { message: 'Organization updated' });
  },

  async updateSettings(req: Request, res: Response) {
    const settings = await organizationsService.updateBusinessSettings(req.organization!.id, req.body);
    ApiResponse.success(res, settings, { message: 'Settings updated' });
  },

  async getStats(req: Request, res: Response) {
    const stats = await organizationsService.getStats(req.organization!.id);
    ApiResponse.success(res, stats);
  },

  async listMine(req: Request, res: Response) {
    const orgs = await organizationsService.listUserOrganizations(req.user!.id);
    ApiResponse.success(res, orgs);
  },

  async switchOrg(req: Request, res: Response) {
    const targetOrgId = req.body.organizationId;
    
    // Check if user is a member of the target org
    const membership = await prisma.teamMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrgId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw ApiError.forbidden('You do not have access to this organization');
    }

    // Re-issue access token for new org context
    const accessToken = tokenService.signAccessToken({
      sub: req.user!.id,
      org: targetOrgId,
      role: membership.role,
      email: req.user!.email,
    });

    ApiResponse.success(res, { accessToken });
  }
};
