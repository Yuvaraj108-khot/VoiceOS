import { Request, Response } from 'express';
import { settingsService } from './settings.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const settingsController = {
  async getUnifiedSettings(req: Request, res: Response) {
    const settings = await settingsService.getUnifiedSettings(req.user!.id, req.organization!.id);
    ApiResponse.success(res, settings);
  }
};
