import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('exports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('preview')
  async preview(
    @Body() body: { startDate: string; endDate: string; status?: string; userIds?: string[] },
  ) {
    return this.exportsService.preview(body.startDate, body.endDate, body.status, body.userIds);
  }

  @Post('excel')
  async exportExcel(
    @Body() body: { startDate: string; endDate: string; status?: string; userIds?: string[] },
    @Res() res: Response,
  ) {
    const buffer = await this.exportsService.generateExcel(
      body.startDate,
      body.endDate,
      body.status,
      body.userIds,
    );

    const filename = `timesheets-${body.startDate}-to-${body.endDate}${body.status ? '-' + body.status.toLowerCase() : ''}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Post('weekly-excel')
  async exportWeeklyExcel(
    @Body() body: { startDate: string; endDate: string; status?: string; userIds?: string[] },
    @Res() res: Response,
  ) {
    const buffer = await this.exportsService.generateWeeklyExcel(
      body.startDate,
      body.endDate,
      body.status,
      body.userIds,
    );

    const filename = `weekly-timesheet-${body.startDate}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Post('pdf')
  async exportPdf(
    @Body() body: { startDate: string; endDate: string; status?: string; userIds?: string[] },
    @Res() res: Response,
  ) {
    const buffer = await this.exportsService.generatePdf(
      body.startDate,
      body.endDate,
      body.status,
      body.userIds,
    );

    const filename = `timesheets-${body.startDate}-to-${body.endDate}${body.status ? '-' + body.status.toLowerCase() : ''}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
