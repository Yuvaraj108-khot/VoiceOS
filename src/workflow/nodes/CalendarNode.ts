import { logger } from '../../lib/logger';

export const calendarNode = {
  async execute(data: any, context: Record<string, any>) {
    logger.info(`Executing Calendar Node: Booking appointment at ${data.time}`);
    // Simulate booking calendar event
    return {
      output: {
        appointmentBooked: true,
        time: data.time
      }
    };
  }
};
