import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Timesheet } from './timesheet.entity';
import { DayOfWeek } from '../../../common/enums/day-of-week.enum';

@Entity('daily_hours')
export class DailyHours {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'timesheet_id' })
  timesheetId: string;

  @ManyToOne(() => Timesheet, (timesheet) => timesheet.dailyHours, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timesheet_id' })
  timesheet: Timesheet;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
  hours: number;

  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek: DayOfWeek;

  @Column({ name: 'job_number', nullable: true })
  jobNumber: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'foreman_name', nullable: true })
  foremanName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
