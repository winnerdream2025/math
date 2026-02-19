import { IsOptional, IsString } from 'class-validator';

export class ApproveTimesheetDto {
  @IsString()
  @IsOptional()
  adminComment?: string;
}
