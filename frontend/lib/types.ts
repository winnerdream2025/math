export type UserRole = 'ADMIN' | 'EMPLOYEE';

export type TimesheetStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type PayPeriod = 'WEEKLY' | 'BI_WEEKLY';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeNumber?: string;
  isActive: boolean;
  createdAt: string;
  activatedAt?: string;
}

export interface Timesheet {
  id: string;
  userId: string;
  user?: User;
  status: TimesheetStatus;
  payPeriodType: PayPeriod;
  payPeriodStart: string;
  payPeriodEnd: string;
  jobNumber?: string;
  location?: string;
  foremanName?: string;
  dailyHours: DailyHours[];
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  employeeComment?: string;
  adminComment?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyHours {
  id?: string;
  date: string;
  hours: number;
  dayOfWeek: string;
  jobNumber?: string;
  location?: string;
  foremanName?: string;
}

export interface Invitation {
  id: string;
  user: User;
  invitedBy: User;
  expiresAt: string;
  status: 'PENDING' | 'EXPIRED' | 'USED' | 'REVOKED';
  createdAt: string;
}

export interface TimesheetFormData {
  payPeriodType: PayPeriod;
  payPeriodStart: string;
  payPeriodEnd: string;
  jobNumber?: string;
  location?: string;
  foremanName?: string;
  dailyHours: { date: string; hours: number; dayOfWeek: string; jobNumber?: string; location?: string; foremanName?: string }[];
  employeeComment?: string;
}
