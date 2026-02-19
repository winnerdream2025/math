import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TimesheetsService } from './timesheets.service';

@Injectable()
export class TimesheetsCronService {
  private readonly logger = new Logger(TimesheetsCronService.name);

  constructor(private readonly timesheetsService: TimesheetsService) {}

  // Every Sunday at 6:00 PM (Eastern Time)
  @Cron('0 18 * * 0', { timeZone: 'America/New_York' })
  async handleTimesheetReminder() {
    this.logger.log('Running scheduled timesheet reminder (Sunday 6 PM)...');
    try {
      const result = await this.timesheetsService.sendReminder();
      this.logger.log(`Scheduled reminder sent to ${result.sent} employee(s)`);
    } catch (error) {
      this.logger.error(`Scheduled reminder failed: ${error.message}`);
    }
  }
}
