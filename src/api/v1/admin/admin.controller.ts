import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const adminController = {
  async getSystemStats(req: Request, res: Response) {
    const stats = await adminService.getSystemStats();
    ApiResponse.success(res, stats);
  },

  async listOrganizations(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    const result = await adminService.listOrganizations({ page, limit, search });
    
    ApiResponse.success(res, result.items, {
      meta: ApiResponse.paginationMeta(result.total, result.page, result.limit)
    });
  },

  async suspendOrganization(req: Request, res: Response) {
    await adminService.suspendOrganization(req.params.id);
    ApiResponse.success(res, null, { message: 'Organization suspended' });
  },

  async unsuspendOrganization(req: Request, res: Response) {
    await adminService.unsuspendOrganization(req.params.id);
    ApiResponse.success(res, null, { message: 'Organization unsuspended' });
  }
};
