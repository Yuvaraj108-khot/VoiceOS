import { Request, Response } from 'express';
import { integrationsService } from './integrations.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const integrationsController = {
  async list(req: Request, res: Response) {
    const items = await integrationsService.list(req.organization!.id);
    ApiResponse.success(res, items);
  },

  async get(req: Request, res: Response) {
    const integration = await integrationsService.get(req.organization!.id, req.params.id);
    ApiResponse.success(res, integration);
  },

  async connect(req: Request, res: Response) {
    const integration = await integrationsService.connect(req.organization!.id, req.body);
    ApiResponse.created(res, integration, 'Integration connected');
  },

  async update(req: Request, res: Response) {
    const integration = await integrationsService.update(req.organization!.id, req.params.id, req.body);
    ApiResponse.success(res, integration, { message: 'Integration updated' });
  },

  async disconnect(req: Request, res: Response) {
    await integrationsService.disconnect(req.organization!.id, req.params.id);
    ApiResponse.noContent(res);
  }
};
