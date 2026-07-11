import { Request, Response } from 'express';
import { callsService } from './calls.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const callsController = {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const result = await callsService.list(req.organization!.id, { page, limit, status });
    
    ApiResponse.success(res, result.items, {
      meta: ApiResponse.paginationMeta(result.total, result.page, result.limit)
    });
  },

  async get(req: Request, res: Response) {
    const call = await callsService.get(req.organization!.id, req.params.id);
    ApiResponse.success(res, call);
  },

  async triggerOutboundCall(req: Request, res: Response) {
    const call = await callsService.triggerOutboundCall(req.organization!.id, req.body);
    ApiResponse.created(res, call, 'Outbound call queued successfully');
  },

  async getRecording(req: Request, res: Response) {
    const { url } = await callsService.getRecordingUrl(req.organization!.id, req.params.id);
    ApiResponse.success(res, { url });
  }
};
