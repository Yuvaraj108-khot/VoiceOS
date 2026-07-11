import { Request, Response } from 'express';
import { customersService } from './customers.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const customersController = {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const result = await customersService.list(req.organization!.id, { page, limit, search });
    
    ApiResponse.success(res, result.items, {
      meta: ApiResponse.paginationMeta(result.total, result.page, result.limit)
    });
  },

  async get(req: Request, res: Response) {
    const customer = await customersService.get(req.organization!.id, req.params.id);
    ApiResponse.success(res, customer);
  },

  async create(req: Request, res: Response) {
    const customer = await customersService.create(req.organization!.id, req.body);
    ApiResponse.created(res, customer, 'Customer created');
  },

  async update(req: Request, res: Response) {
    const customer = await customersService.update(req.organization!.id, req.params.id, req.body);
    ApiResponse.success(res, customer, { message: 'Customer updated' });
  },

  async delete(req: Request, res: Response) {
    await customersService.delete(req.organization!.id, req.params.id);
    ApiResponse.noContent(res);
  }
};
