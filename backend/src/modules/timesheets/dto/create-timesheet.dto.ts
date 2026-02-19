import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PayPeriodType } from '../../../common/enums/pay-period-type.enum';
import { DayOfWeek } from '../../../common/enums/day-of-week.enum';

export class DailyHoursDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsNumber({}, { message: 'Hours must be a number' })
  @Min(0, { message: 'Hours cannot be negative' })
  @Max(24, { message: 'Hours cannot exceed 24 per day' })
  hours: number;

  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsString()
  @IsOptional()
  jobNumber?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  foremanName?: string;
}

export class CreateTimesheetDto {
  @IsEnum(PayPeriodType)
  payPeriodType: PayPeriodType;

  @IsDateString({}, { message: 'payPeriodStart must be a valid date (YYYY-MM-DD)' })
  @IsNotEmpty()
  payPeriodStart: string;

  @IsDateString({}, { message: 'payPeriodEnd must be a valid date (YYYY-MM-DD)' })
  @IsNotEmpty()
  payPeriodEnd: string;

  @IsString()
  @IsNotEmpty({ message: 'Job number is required' })
  jobNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  location: string;

  @IsString()
  @IsOptional()
  foremanName?: string;

  @IsString()
  @IsOptional()
  employeeComment?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyHoursDto)
  dailyHours: DailyHoursDto[];
}
