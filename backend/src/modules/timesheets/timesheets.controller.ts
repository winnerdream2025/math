import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { ApproveTimesheetDto } from './dto/approve-timesheet.dto';
import { TimesheetQueryDto } from './dto/timesheet-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('timesheets')
@UseGuards(JwtAuthGuard)
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateTimesheetDto) {
    return this.timesheetsService.create(user.id, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: any, @Query() query: TimesheetQueryDto) {
    return this.timesheetsService.findAllPaginated(user.id, user.role, query);
  }

  @Post('send-reminder')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async sendReminder() {
    return this.timesheetsService.sendReminder();
  }

  @Get('submission-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getSubmissionStatus() {
    return this.timesheetsService.getSubmissionStatus();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.timesheetsService.findOneForUser(id, user.id, user.role);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<CreateTimesheetDto>,
  ) {
    return this.timesheetsService.update(id, user.id, dto);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.timesheetsService.submit(id, user.id);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ApproveTimesheetDto,
  ) {
    return this.timesheetsService.approve(id, user.id, dto);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ApproveTimesheetDto,
  ) {
    return this.timesheetsService.reject(id, user.id, dto);
  }

  @Post(':id/resubmit')
  async resubmit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.timesheetsService.resubmit(id, user.id);
  }

  @Post(':id/lock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async lock(@Param('id') id: string) {
    return this.timesheetsService.lock(id);
  }

  @Post(':id/unlock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async unlock(@Param('id') id: string) {
    return this.timesheetsService.unlock(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.timesheetsService.remove(id, user.id, user.role);
  }
}
