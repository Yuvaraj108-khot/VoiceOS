import { logger } from '../../lib/logger';

export class EmailService {
  /**
   * Sends an email via SendGrid or similar provider.
   */
  async sendEmail(to: string, subject: string, body: string) {
    logger.info(`Sending email to ${to}: ${subject}`);
    // Scaffold: email sending logic
    return true;
  }
}

export const emailService = new EmailService();
