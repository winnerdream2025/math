import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimesheetsService } from './timesheets.service';
import { TimesheetsCronService } from './timesheets-cron.service';
import { TimesheetsController } from './timesheets.controller';
import { Timesheet } from './entities/timesheet.entity';
import { DailyHours } from './entities/daily-hours.entity';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Timesheet, DailyHours]),
    AuditModule,
    EmailModule,
    UsersModule,
  ],
  controllers: [TimesheetsController],
  providers: [TimesheetsService, TimesheetsCronService],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
