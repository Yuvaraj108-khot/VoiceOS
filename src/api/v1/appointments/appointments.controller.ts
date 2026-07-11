import { Request, Response } from 'express';
import { appointmentsService } from './appointments.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const appointmentsController = {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const result = await appointmentsService.list(req.organization!.id, { page, limit, status, from, to });
    
    ApiResponse.success(res, result.items, {
      meta: ApiResponse.paginationMeta(result.total, result.page, result.limit)
    });
  },

  async get(req: Request, res: Response) {
    const appointment = await appointmentsService.get(req.organization!.id, req.params.id);
    ApiResponse.success(res, appointment);
  },

  async create(req: Request, res: Response) {
    const appointment = await appointmentsService.create(req.organization!.id, req.body);
    ApiResponse.created(res, appointment, 'Appointment scheduled');
  },

  async update(req: Request, res: Response) {
    const appointment = await appointmentsService.update(req.organization!.id, req.params.id, req.body);
    ApiResponse.success(res, appointment, { message: 'Appointment updated' });
  },

  async delete(req: Request, res: Response) {
    await appointmentsService.delete(req.organization!.id, req.params.id);
    ApiResponse.noContent(res);
  }
};
