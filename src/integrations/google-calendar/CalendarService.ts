import { logger } from '../../lib/logger';

export class CalendarService {
  async listEvents(integrationId: string) {
    logger.info('Fetching events from Google Calendar');
    return [];
  }
}

export const calendarService = new CalendarService();
