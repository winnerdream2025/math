import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DailyHours } from './daily-hours.entity';
import { TimesheetStatus } from '../../../common/enums/timesheet-status.enum';
import { PayPeriodType } from '../../../common/enums/pay-period-type.enum';

@Entity('timesheets')
export class Timesheet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.timesheets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'pay_period_type',
    type: 'enum',
    enum: PayPeriodType,
    default: PayPeriodType.WEEKLY,
  })
  payPeriodType: PayPeriodType;

  @Column({ name: 'pay_period_start', type: 'date' })
  payPeriodStart: string;

  @Column({ name: 'pay_period_end', type: 'date' })
  payPeriodEnd: string;

  @Column({ name: 'job_number', nullable: true })
  jobNumber: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'foreman_name', nullable: true })
  foremanName: string;

  @Column({
    type: 'enum',
    enum: TimesheetStatus,
    default: TimesheetStatus.DRAFT,
  })
  status: TimesheetStatus;

  @Column({ name: 'is_locked', default: false })
  isLocked: boolean;

  @Column({ name: 'employee_comment', type: 'text', nullable: true })
  employeeComment: string;

  @Column({ name: 'admin_comment', type: 'text', nullable: true })
  adminComment: string;

  @Column({ name: 'submitted_at', nullable: true })
  submittedAt: Date;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt: Date;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'total_hours', type: 'decimal', precision: 5, scale: 2, default: 0 })
  totalHours: number;

  @Column({ name: 'regular_hours', type: 'decimal', precision: 5, scale: 2, default: 0 })
  regularHours: number;

  @Column({ name: 'overtime_hours', type: 'decimal', precision: 5, scale: 2, default: 0 })
  overtimeHours: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @VersionColumn({ default: 1 })
  version: number;

  @OneToMany(() => DailyHours, (dailyHours) => dailyHours.timesheet, {
    cascade: true,
    eager: true,
  })
  dailyHours: DailyHours[];
}
