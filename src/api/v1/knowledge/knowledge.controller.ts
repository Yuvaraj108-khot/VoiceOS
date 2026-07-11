import { Request, Response } from 'express';
import { knowledgeService } from './knowledge.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const knowledgeController = {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const employeeId = req.query.employeeId as string;

    const result = await knowledgeService.list(req.organization!.id, { employeeId, page, limit, search });
    
    ApiResponse.success(res, result.items, {
      meta: ApiResponse.paginationMeta(result.total, result.page, result.limit)
    });
  },

  async get(req: Request, res: Response) {
    const doc = await knowledgeService.get(req.organization!.id, req.params.id);
    ApiResponse.success(res, doc);
  },

  async create(req: Request, res: Response) {
    const doc = await knowledgeService.create(req.organization!.id, req.body, req.file);
    ApiResponse.created(res, doc);
  },

  async update(req: Request, res: Response) {
    const doc = await knowledgeService.update(req.organization!.id, req.params.id, req.body);
    ApiResponse.success(res, doc);
  },

  async delete(req: Request, res: Response) {
    await knowledgeService.delete(req.organization!.id, req.params.id);
    ApiResponse.success(res, null, { message: 'Knowledge Document deleted' });
  }
};
