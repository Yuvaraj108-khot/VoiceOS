import { Request, Response } from 'express';
import { callsService } from './calls.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const callsController = {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const orgId = req.organization?.id || '94f4f54e-27db-4b98-9e5c-71f583343350';

    const result = await callsService.list(orgId, { page, limit, status });
    
    ApiResponse.success(res, result.items, {
      meta: ApiResponse.paginationMeta(result.total, result.page, result.limit)
    });
  },

  async getActiveCall(req: Request, res: Response) {
    const orgId = req.organization?.id || '94f4f54e-27db-4b98-9e5c-71f583343350';
    const activeCall = await callsService.getActiveCall(orgId);
    ApiResponse.success(res, activeCall);
  },

  async get(req: Request, res: Response) {
    const orgId = req.organization?.id || '94f4f54e-27db-4b98-9e5c-71f583343350';
    const call = await callsService.get(orgId, req.params.id);
    ApiResponse.success(res, call);
  },

  async triggerOutboundCall(req: Request, res: Response) {
    const orgId = req.organization?.id || '94f4f54e-27db-4b98-9e5c-71f583343350';
    const call = await callsService.triggerOutboundCall(orgId, req.body);
    ApiResponse.created(res, call, 'Outbound call queued successfully');
  },


  async getRecording(req: Request, res: Response) {
    const { url } = await callsService.getRecordingUrl(req.organization!.id, req.params.id);
    ApiResponse.success(res, { url });
  },

  async transfer(req: Request, res: Response) {
    const orgId = req.organization?.id || '94f4f54e-27db-4b98-9e5c-71f583343350';
    const result = await callsService.transferCall(orgId, req.params.id, req.body);
    ApiResponse.success(res, result, { message: 'Call transferred successfully' });
  },

  async takeOver(req: Request, res: Response) {
    const orgId = req.organization?.id || '94f4f54e-27db-4b98-9e5c-71f583343350';
    const result = await callsService.takeOverCall(orgId, req.params.id);
    ApiResponse.success(res, result, { message: 'Operator takeover active' });
  }
};
