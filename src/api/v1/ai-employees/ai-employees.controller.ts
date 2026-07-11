import { Request, Response } from 'express';
import { aiEmployeesService } from './ai-employees.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const aiEmployeesController = {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const result = await aiEmployeesService.list(req.organization!.id, { page, limit, search });
    
    ApiResponse.success(res, result.items, {
      meta: ApiResponse.paginationMeta(result.total, result.page, result.limit)
    });
  },

  async get(req: Request, res: Response) {
    const employee = await aiEmployeesService.get(req.organization!.id, req.params.id);
    ApiResponse.success(res, employee);
  },

  async create(req: Request, res: Response) {
    const employee = await aiEmployeesService.create(req.organization!.id, req.user!.id, req.body);
    ApiResponse.created(res, employee, 'AI Employee created');
  },

  async update(req: Request, res: Response) {
    const employee = await aiEmployeesService.update(req.organization!.id, req.params.id, req.body);
    ApiResponse.success(res, employee, { message: 'AI Employee updated' });
  },

  async delete(req: Request, res: Response) {
    await aiEmployeesService.delete(req.organization!.id, req.params.id);
    ApiResponse.noContent(res);
  }
};
