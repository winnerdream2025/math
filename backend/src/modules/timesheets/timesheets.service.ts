import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Timesheet } from './entities/timesheet.entity';
import { DailyHours } from './entities/daily-hours.entity';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { ApproveTimesheetDto } from './dto/approve-timesheet.dto';
import { TimesheetQueryDto } from './dto/timesheet-query.dto';
import { TimesheetStatus } from '../../common/enums/timesheet-status.enum';
import { PayPeriodType } from '../../common/enums/pay-period-type.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class TimesheetsService {
  constructor(
    @InjectRepository(Timesheet)
    private readonly timesheetRepository: Repository<Timesheet>,
    @InjectRepository(DailyHours)
    private readonly dailyHoursRepository: Repository<DailyHours>,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  private calculatePayroll(hours: number[], payPeriodType: PayPeriodType) {
    const totalHours = hours.reduce((sum, h) => sum + h, 0);
    const regularCap = payPeriodType === PayPeriodType.BI_WEEKLY ? 80 : 40;
    const regularHours = Math.min(totalHours, regularCap);
    const overtimeHours = Math.max(totalHours - regularCap, 0);
    return { totalHours, regularHours, overtimeHours };
  }

  async create(userId: string, dto: CreateTimesheetDto): Promise<Timesheet> {
    // Prevent overlapping timesheets for the same user and pay period
    const overlap = await this.timesheetRepository
      .createQueryBuilder('ts')
      .where('ts.userId = :userId', { userId })
      .andWhere('ts.payPeriodStart = :start AND ts.payPeriodEnd = :end', {
        start: dto.payPeriodStart,
        end: dto.payPeriodEnd,
      })
      .andWhere('ts.status != :rejected', { rejected: TimesheetStatus.REJECTED })
      .getOne();

    if (overlap) {
      throw new ConflictException('A timesheet already exists for this pay period');
    }

    const hoursValues = dto.dailyHours.map((dh) => Number(dh.hours));
    const { totalHours, regularHours, overtimeHours } = this.calculatePayroll(
      hoursValues,
      dto.payPeriodType,
    );

    const timesheet = this.timesheetRepository.create({
      userId,
      payPeriodType: dto.payPeriodType,
      payPeriodStart: dto.payPeriodStart,
      payPeriodEnd: dto.payPeriodEnd,
      jobNumber: dto.jobNumber,
      location: dto.location,
      foremanName: dto.foremanName,
      employeeComment: dto.employeeComment,
      status: TimesheetStatus.DRAFT,
      totalHours,
      regularHours,
      overtimeHours,
    });

    const savedTimesheet = await this.timesheetRepository.save(timesheet);

    const dailyHoursEntities = dto.dailyHours.map((dh) =>
      this.dailyHoursRepository.create({
        timesheetId: savedTimesheet.id,
        date: dh.date,
        hours: dh.hours,
        dayOfWeek: dh.dayOfWeek,
        jobNumber: dh.jobNumber || dto.jobNumber || null,
        location: dh.location || dto.location || null,
        foremanName: dh.foremanName || dto.foremanName || null,
      }),
    );
    await this.dailyHoursRepository.save(dailyHoursEntities);

    return this.findOne(savedTimesheet.id);
  }

  async findAllPaginated(
    userId: string,
    role: UserRole,
    query: TimesheetQueryDto,
  ): Promise<PaginatedResult<Timesheet>> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.timesheetRepository
      .createQueryBuilder('timesheet')
      .leftJoinAndSelect('timesheet.dailyHours', 'dailyHours')
      .leftJoinAndSelect('timesheet.user', 'user');

    if (role !== UserRole.ADMIN) {
      qb.where('timesheet.userId = :userId', { userId });
    }

    if (query.status) {
      qb.andWhere('timesheet.status = :status', { status: query.status });
    }
    if (query.userId && role === UserRole.ADMIN) {
      qb.andWhere('timesheet.userId = :filterUserId', { filterUserId: query.userId });
    }
    if (query.startDate) {
      qb.andWhere('timesheet.payPeriodStart >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('timesheet.payPeriodEnd <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('timesheet.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<Timesheet> {
    const timesheet = await this.timesheetRepository.findOne({
      where: { id },
      relations: ['dailyHours', 'user'],
    });
    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }
    return timesheet;
  }

  async findOneForUser(id: string, userId: string, role: UserRole): Promise<Timesheet> {
    const timesheet = await this.findOne(id);
    if (role !== UserRole.ADMIN && timesheet.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this timesheet');
    }
    return timesheet;
  }

  async update(id: string, userId: string, dto: Partial<CreateTimesheetDto>): Promise<Timesheet> {
    const timesheet = await this.findOne(id);
    if (timesheet.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this timesheet');
    }
    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT timesheets can be edited');
    }
    if (timesheet.isLocked) {
      throw new BadRequestException('Timesheet is locked');
    }

    // Update scalar fields first
    if (dto.employeeComment !== undefined) timesheet.employeeComment = dto.employeeComment;
    if (dto.jobNumber !== undefined) timesheet.jobNumber = dto.jobNumber;
    if (dto.location !== undefined) timesheet.location = dto.location;
    if (dto.foremanName !== undefined) timesheet.foremanName = dto.foremanName;

    if (dto.dailyHours) {
      await this.dailyHoursRepository.delete({ timesheetId: id });
      const hoursValues = dto.dailyHours.map((dh) => Number(dh.hours));
      const { totalHours, regularHours, overtimeHours } = this.calculatePayroll(
        hoursValues,
        timesheet.payPeriodType,
      );
      timesheet.totalHours = totalHours;
      timesheet.regularHours = regularHours;
      timesheet.overtimeHours = overtimeHours;

      // Clear stale relation reference before saving timesheet
      timesheet.dailyHours = [];
      await this.timesheetRepository.save(timesheet);

      const dailyHoursEntities = dto.dailyHours.map((dh) =>
        this.dailyHoursRepository.create({
          timesheetId: id,
          date: dh.date,
          hours: dh.hours,
          dayOfWeek: dh.dayOfWeek,
          jobNumber: dh.jobNumber || dto.jobNumber || timesheet.jobNumber || null,
          location: dh.location || dto.location || timesheet.location || null,
          foremanName: dh.foremanName || dto.foremanName || timesheet.foremanName || null,
        }),
      );
      await this.dailyHoursRepository.save(dailyHoursEntities);
    } else {
      await this.timesheetRepository.save(timesheet);
    }
    return this.findOne(id);
  }

  async submit(id: string, userId: string): Promise<Timesheet> {
    const timesheet = await this.findOne(id);
    if (timesheet.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }
    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT timesheets can be submitted');
    }
    timesheet.status = TimesheetStatus.PENDING;
    timesheet.submittedAt = new Date();
    const saved = await this.timesheetRepository.save(timesheet);

    // Notify all admins
    const employeeName = timesheet.user
      ? `${timesheet.user.firstName} ${timesheet.user.lastName}`
      : 'Employee';
    const period = `${timesheet.payPeriodStart} — ${timesheet.payPeriodEnd}`;
    const admins = await this.usersService.findByRole(UserRole.ADMIN);
    const adminEmails = admins.map((a) => a.email);
    if (adminEmails.length > 0) {
      this.emailService
        .sendTimesheetSubmittedEmail(adminEmails, employeeName, period, Number(timesheet.totalHours), id)
        .catch(() => {});
    }

    return saved;
  }

  async approve(id: string, adminId: string, dto: ApproveTimesheetDto): Promise<Timesheet> {
    const timesheet = await this.findOne(id);
    if (timesheet.status !== TimesheetStatus.PENDING) {
      throw new BadRequestException('Only PENDING timesheets can be approved');
    }
    timesheet.status = TimesheetStatus.APPROVED;
    timesheet.approvedAt = new Date();
    timesheet.approvedBy = adminId;
    timesheet.isLocked = true;
    if (dto.adminComment) timesheet.adminComment = dto.adminComment;
    const saved = await this.timesheetRepository.save(timesheet);
    await this.auditService.log({
      userId: adminId,
      action: 'APPROVE_TIMESHEET',
      entityType: 'timesheet',
      entityId: id,
      changes: { status: 'APPROVED', adminComment: dto.adminComment },
    });

    // Notify employee
    if (timesheet.user?.email) {
      const empName = `${timesheet.user.firstName} ${timesheet.user.lastName}`;
      const period = `${timesheet.payPeriodStart} — ${timesheet.payPeriodEnd}`;
      this.emailService
        .sendTimesheetApprovedEmail(timesheet.user.email, empName, period, Number(timesheet.totalHours), dto.adminComment || null, id)
        .catch(() => {});
    }

    return saved;
  }

  async reject(id: string, adminId: string, dto: ApproveTimesheetDto): Promise<Timesheet> {
    const timesheet = await this.findOne(id);
    if (timesheet.status !== TimesheetStatus.PENDING) {
      throw new BadRequestException('Only PENDING timesheets can be rejected');
    }
    timesheet.status = TimesheetStatus.REJECTED;
    if (dto.adminComment) timesheet.adminComment = dto.adminComment;
    const saved = await this.timesheetRepository.save(timesheet);
    await this.auditService.log({
      userId: adminId,
      action: 'REJECT_TIMESHEET',
      entityType: 'timesheet',
      entityId: id,
      changes: { status: 'REJECTED', adminComment: dto.adminComment },
    });

    // Notify employee
    if (timesheet.user?.email) {
      const empName = `${timesheet.user.firstName} ${timesheet.user.lastName}`;
      const period = `${timesheet.payPeriodStart} — ${timesheet.payPeriodEnd}`;
      this.emailService
        .sendTimesheetRejectedEmail(timesheet.user.email, empName, period, dto.adminComment || null, id)
        .catch(() => {});
    }

    return saved;
  }

  // Rejected → back to DRAFT for re-editing
  async resubmit(id: string, userId: string): Promise<Timesheet> {
    const timesheet = await this.findOne(id);
    if (timesheet.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }
    if (timesheet.status !== TimesheetStatus.REJECTED) {
      throw new BadRequestException('Only REJECTED timesheets can be moved back to DRAFT');
    }
    timesheet.status = TimesheetStatus.DRAFT;
    timesheet.adminComment = null;
    return this.timesheetRepository.save(timesheet);
  }

  // Admin lock/unlock
  async lock(id: string): Promise<Timesheet> {
    const timesheet = await this.findOne(id);
    if (timesheet.status !== TimesheetStatus.APPROVED) {
      throw new BadRequestException('Only APPROVED timesheets can be locked');
    }
    timesheet.isLocked = true;
    const saved = await this.timesheetRepository.save(timesheet);
    await this.auditService.log({
      userId: 'system',
      action: 'LOCK_TIMESHEET',
      entityType: 'timesheet',
      entityId: id,
    });
    return saved;
  }

  async unlock(id: string): Promise<Timesheet> {
    const timesheet = await this.findOne(id);
    if (!timesheet.isLocked) {
      throw new BadRequestException('Timesheet is not locked');
    }
    timesheet.isLocked = false;
    const saved = await this.timesheetRepository.save(timesheet);
    await this.auditService.log({
      userId: 'system',
      action: 'UNLOCK_TIMESHEET',
      entityType: 'timesheet',
      entityId: id,
    });
    return saved;
  }

  async getSubmissionStatus(): Promise<{
    weekStart: string;
    weekEnd: string;
    employees: {
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      status: 'SUBMITTED' | 'DRAFT' | 'MISSING';
      timesheetId: string | null;
      timesheetStatus: string | null;
    }[];
  }> {
    // Calculate current week (Monday–Sunday)
    const now = new Date();
    const day = now.getDay(); // 0=Sun..6=Sat
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekStart = monday.toISOString().slice(0, 10);
    const weekEnd = sunday.toISOString().slice(0, 10);

    const employees = await this.usersService.findByRole(UserRole.EMPLOYEE);

    const results = await Promise.all(
      employees.map(async (emp) => {
        const ts = await this.timesheetRepository.findOne({
          where: {
            userId: emp.id,
            payPeriodStart: weekStart,
            payPeriodEnd: weekEnd,
          },
        });

        let status: 'SUBMITTED' | 'DRAFT' | 'MISSING' = 'MISSING';
        if (ts) {
          status =
            ts.status === TimesheetStatus.DRAFT
              ? 'DRAFT'
              : 'SUBMITTED';
        }

        return {
          userId: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          status,
          timesheetId: ts?.id || null,
          timesheetStatus: ts?.status || null,
        };
      }),
    );

    return { weekStart, weekEnd, employees: results };
  }

  async sendReminder(): Promise<{ sent: number }> {
    const employees = await this.usersService.findByRole(UserRole.EMPLOYEE);
    const list = employees.map((e) => ({ email: e.email, firstName: e.firstName }));
    const sent = await this.emailService.sendTimesheetReminderEmail(list);
    return { sent };
  }

  async remove(id: string, userId: string, role: UserRole): Promise<void> {
    const timesheet = await this.findOne(id);
    if (role !== UserRole.ADMIN && timesheet.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }
    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT timesheets can be deleted');
    }
    await this.timesheetRepository.softRemove(timesheet);
  }
}
