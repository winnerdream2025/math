import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { Timesheet } from '../timesheets/entities/timesheet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Timesheet])],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
