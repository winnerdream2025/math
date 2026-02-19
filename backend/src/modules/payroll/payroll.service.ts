import { Injectable } from '@nestjs/common';
import { PayPeriodType } from '../../common/enums/pay-period-type.enum';

@Injectable()
export class PayrollService {
  calculate(dailyHours: number[], payPeriodType: PayPeriodType) {
    const totalHours = dailyHours.reduce((sum, h) => sum + h, 0);
    const regularCap = payPeriodType === PayPeriodType.BI_WEEKLY ? 80 : 40;
    const regularHours = Math.min(totalHours, regularCap);
    const overtimeHours = Math.max(totalHours - regularCap, 0);
    return { totalHours, regularHours, overtimeHours };
  }
}
