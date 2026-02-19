import { IsOptional, IsEnum, IsString, IsUUID } from 'class-validator';
import { TimesheetStatus } from '../../../common/enums/timesheet-status.enum';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class TimesheetQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TimesheetStatus)
  status?: TimesheetStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
