import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromName: string;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST') || 'smtp.gmail.com',
      port: Number(this.configService.get('SMTP_PORT') || 587),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER') || '',
        pass: this.configService.get('SMTP_PASS') || '',
      },
    });
    this.fromName = this.configService.get('SMTP_FROM_NAME') || 'Math & Fils';
    this.fromEmail = this.configService.get('SMTP_USER') || 'noreply@mathfils.com';
    this.frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
  }

  private get from(): string {
    return `"${this.fromName}" <${this.fromEmail}>`;
  }

  private esc(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private wrap(body: string): string {
    return `
      <div style="background-color: #F3F4F6; padding: 32px 16px; font-family: 'Segoe UI', Arial, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1F2937; letter-spacing: -0.5px;">
              Math &amp; Fils
            </h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px;">
              Timesheet Management
            </p>
          </div>
          <!-- Body card -->
          <div style="background-color: #FFFFFF; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            ${body}
          </div>
          <!-- Footer -->
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #9CA3AF; font-size: 11px; margin: 0;">
              &copy; ${new Date().getFullYear()} Math &amp; Fils. All rights reserved.
            </p>
            <p style="color: #D1D5DB; font-size: 10px; margin: 6px 0 0;">
              This is an automated message. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Account Invitation ──────────────────────────────────────────
  async sendInvitationEmail(
    to: string,
    firstName: string,
    activationToken: string,
  ): Promise<void> {
    const activateLink = `${this.frontendUrl}/activate?token=${activationToken}`;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'You\'re Invited — Math & Fils Timesheet',
        html: this.wrap(`
          <h2 style="color: #1F2937; margin-bottom: 16px;">Welcome to Math &amp; Fils!</h2>
          <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
            Hi <strong>${this.esc(firstName)}</strong>,
          </p>
          <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
            You've been invited to join the Math &amp; Fils Timesheet system.
            Click the button below to set up your password and activate your account.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${activateLink}"
               style="background-color: #1F2937; color: #FFFFFF; padding: 14px 36px; border-radius: 8px;
                      text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              Activate My Account
            </a>
          </div>
          <p style="color: #9CA3AF; font-size: 12px; line-height: 1.5;">
            This invitation expires in <strong>7 days</strong>. If you didn't expect this email, you can safely ignore it.
          </p>
        `),
      });
      this.logger.log(`Invitation email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${to}: ${error.message}`);
      throw error;
    }
  }

  // ─── Password Reset ───────────────────────────────────────────────
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'Password Reset — Math & Fils Timesheet',
        html: this.wrap(`
          <h2 style="color: #1F2937; margin-bottom: 16px;">Password Reset</h2>
          <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
            You requested a password reset for your Math &amp; Fils Timesheet account.
            Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}"
               style="background-color: #1F2937; color: #FFFFFF; padding: 12px 32px; border-radius: 6px;
                      text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #9CA3AF; font-size: 12px; line-height: 1.5;">
            If you didn't request this, you can safely ignore this email.
          </p>
        `),
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
    }
  }

  // ─── Timesheet Submitted → notify admins ──────────────────────────
  async sendTimesheetSubmittedEmail(
    adminEmails: string[],
    employeeName: string,
    period: string,
    totalHours: number,
    timesheetId: string,
  ): Promise<void> {
    const link = `${this.frontendUrl}/timesheets/${timesheetId}`;
    const subject = `Timesheet Submitted — ${this.esc(employeeName)} (${this.esc(period)})`;
    const html = this.wrap(`
      <h2 style="color: #1F2937; margin-bottom: 16px;">New Timesheet Submitted</h2>
      <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
        <strong>${this.esc(employeeName)}</strong> has submitted a timesheet for review.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #6B7280;">Period</td><td style="padding: 8px 0; color: #1F2937; font-weight: 600;">${this.esc(period)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6B7280;">Total Hours</td><td style="padding: 8px 0; color: #1F2937; font-weight: 600;">${totalHours.toFixed(1)}h</td></tr>
      </table>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${link}"
           style="background-color: #1F2937; color: #FFFFFF; padding: 12px 32px; border-radius: 6px;
                  text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
          Review Timesheet
        </a>
      </div>
    `);

    for (const email of adminEmails) {
      try {
        await this.transporter.sendMail({ from: this.from, to: email, subject, html });
        this.logger.log(`Timesheet submitted notification sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send submit notification to ${email}: ${error.message}`);
      }
    }
  }

  // ─── Timesheet Approved → notify employee ─────────────────────────
  async sendTimesheetApprovedEmail(
    to: string,
    employeeName: string,
    period: string,
    totalHours: number,
    adminComment: string | null,
    timesheetId: string,
  ): Promise<void> {
    const link = `${this.frontendUrl}/timesheets/${timesheetId}`;
    const commentBlock = adminComment
      ? `<tr><td style="padding: 8px 0; color: #6B7280;">Admin Comment</td><td style="padding: 8px 0; color: #1F2937;">${this.esc(adminComment)}</td></tr>`
      : '';
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: `Timesheet Approved — ${this.esc(period)}`,
        html: this.wrap(`
          <h2 style="color: #16A34A; margin-bottom: 16px;">✅ Timesheet Approved</h2>
          <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
            Hi <strong>${this.esc(employeeName)}</strong>, your timesheet has been approved.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #6B7280;">Period</td><td style="padding: 8px 0; color: #1F2937; font-weight: 600;">${this.esc(period)}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Total Hours</td><td style="padding: 8px 0; color: #1F2937; font-weight: 600;">${totalHours.toFixed(1)}h</td></tr>
            ${commentBlock}
          </table>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${link}"
               style="background-color: #16A34A; color: #FFFFFF; padding: 12px 32px; border-radius: 6px;
                      text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              View Timesheet
            </a>
          </div>
        `),
      });
      this.logger.log(`Timesheet approved notification sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send approval notification to ${to}: ${error.message}`);
    }
  }

  // ─── Timesheet Rejected → notify employee ─────────────────────────
  async sendTimesheetRejectedEmail(
    to: string,
    employeeName: string,
    period: string,
    adminComment: string | null,
    timesheetId: string,
  ): Promise<void> {
    const link = `${this.frontendUrl}/timesheets/${timesheetId}`;
    const commentBlock = adminComment
      ? `<p style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px 16px; color: #991B1B; font-size: 14px; margin: 16px 0; border-radius: 4px;">${this.esc(adminComment)}</p>`
      : '';
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: `Timesheet Rejected — ${this.esc(period)}`,
        html: this.wrap(`
          <h2 style="color: #DC2626; margin-bottom: 16px;">❌ Timesheet Rejected</h2>
          <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
            Hi <strong>${this.esc(employeeName)}</strong>, your timesheet for <strong>${this.esc(period)}</strong> was rejected and requires changes.
          </p>
          ${commentBlock}
          <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
            Please review the feedback, edit your timesheet, and resubmit.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${link}"
               style="background-color: #DC2626; color: #FFFFFF; padding: 12px 32px; border-radius: 6px;
                      text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              View & Edit Timesheet
            </a>
          </div>
        `),
      });
      this.logger.log(`Timesheet rejected notification sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send rejection notification to ${to}: ${error.message}`);
    }
  }

  // ─── General Reminder → all employees to submit timesheets ────────
  async sendTimesheetReminderEmail(
    employees: { email: string; firstName: string }[],
  ): Promise<number> {
    const subject = 'Reminder: Please Submit Your Timesheet — Math & Fils';
    let sent = 0;

    for (const emp of employees) {
      const html = this.wrap(`
        <h2 style="color: #1F2937; margin-bottom: 16px;">⏰ Timesheet Reminder</h2>
        <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
          Hi <strong>${this.esc(emp.firstName)}</strong>,
        </p>
        <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
          This is a friendly reminder to submit your timesheet for the current pay period.
          Please log in and make sure your hours are recorded and submitted.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${this.frontendUrl}/timesheets"
             style="background-color: #1F2937; color: #FFFFFF; padding: 12px 32px; border-radius: 6px;
                    text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
            Go to Timesheets
          </a>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; line-height: 1.5; font-style: italic;">
          If you have already submitted your timesheet, please disregard this message.
        </p>
      `);

      try {
        await this.transporter.sendMail({ from: this.from, to: emp.email, subject, html });
        this.logger.log(`Timesheet reminder sent to ${emp.email}`);
        sent++;
      } catch (error) {
        this.logger.error(`Failed to send reminder to ${emp.email}: ${error.message}`);
      }
    }

    return sent;
  }
}
