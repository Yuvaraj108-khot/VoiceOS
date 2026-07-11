import { Request, Response } from 'express';
import { workflowsService } from './workflows.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const workflowsController = {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await workflowsService.list(req.organization!.id, { page, limit });
    
    ApiResponse.success(res, result.items, {
      meta: ApiResponse.paginationMeta(result.total, result.page, result.limit)
    });
  },

  async get(req: Request, res: Response) {
    const workflow = await workflowsService.get(req.organization!.id, req.params.id);
    ApiResponse.success(res, workflow);
  },

  async create(req: Request, res: Response) {
    const workflow = await workflowsService.create(req.organization!.id, req.body);
    ApiResponse.created(res, workflow, 'Workflow created');
  },

  async update(req: Request, res: Response) {
    const workflow = await workflowsService.update(req.organization!.id, req.params.id, req.body);
    ApiResponse.success(res, workflow, { message: 'Workflow updated' });
  },

  async delete(req: Request, res: Response) {
    await workflowsService.delete(req.organization!.id, req.params.id);
    ApiResponse.noContent(res);
  }
};
