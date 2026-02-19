import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Timesheet } from '../timesheets/entities/timesheet.entity';
import { TimesheetStatus } from '../../common/enums/timesheet-status.enum';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(Timesheet)
    private readonly timesheetRepository: Repository<Timesheet>,
  ) {}

  private formatDayName(dayOfWeek?: string): string {
    return dayOfWeek ? dayOfWeek.charAt(0) + dayOfWeek.slice(1).toLowerCase() : '';
  }

  private sortDailyHours(dailyHours: any[]): any[] {
    return [...(dailyHours || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  private getStatusArgb(status: string): string {
    const map: Record<string, string> = {
      APPROVED: 'FF16A34A',
      PENDING: 'FFCA8A04',
      REJECTED: 'FFDC2626',
    };
    return map[status] || 'FF1F2937';
  }

  private async queryTimesheets(startDate: string, endDate: string, status?: string, userIds?: string[]): Promise<Timesheet[]> {
    const qb = this.timesheetRepository
      .createQueryBuilder('timesheet')
      .leftJoinAndSelect('timesheet.dailyHours', 'dailyHours')
      .leftJoinAndSelect('timesheet.user', 'user');

    if (status) {
      qb.where('timesheet.status = :status', { status });
    } else {
      qb.where('timesheet.status = :status', { status: TimesheetStatus.APPROVED });
    }

    if (startDate) {
      qb.andWhere('timesheet.payPeriodStart >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('timesheet.payPeriodEnd <= :endDate', { endDate });
    }
    if (userIds && userIds.length > 0) {
      qb.andWhere('timesheet.userId IN (:...userIds)', { userIds });
    }

    qb.orderBy('user.lastName', 'ASC').addOrderBy('timesheet.payPeriodStart', 'ASC');
    return qb.getMany();
  }

  async preview(startDate: string, endDate: string, status?: string, userIds?: string[]) {
    const timesheets = await this.queryTimesheets(startDate, endDate, status, userIds);
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    const rows = timesheets.map((ts) => {
      totalHours += Number(ts.totalHours);
      regularHours += Number(ts.regularHours);
      overtimeHours += Number(ts.overtimeHours);
      return {
        id: ts.id,
        employee: ts.user ? `${ts.user.lastName}, ${ts.user.firstName}` : 'N/A',
        employeeNumber: ts.user?.employeeNumber || '',
        periodStart: ts.payPeriodStart,
        periodEnd: ts.payPeriodEnd,
        jobNumber: ts.jobNumber || '',
        location: ts.location || '',
        foremanName: ts.foremanName || '',
        totalHours: Number(ts.totalHours),
        regularHours: Number(ts.regularHours),
        overtimeHours: Number(ts.overtimeHours),
        status: ts.status,
      };
    });
    return {
      count: timesheets.length,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        regularHours: Math.round(regularHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
      },
      rows,
    };
  }

  async generateExcel(startDate: string, endDate: string, status?: string, userIds?: string[]): Promise<Buffer> {
    const timesheets = await this.queryTimesheets(startDate, endDate, status, userIds);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Math & Fils Timesheet System';
    workbook.created = new Date();

    // --- Summary Sheet ---
    const summary = workbook.addWorksheet('Summary');
    summary.columns = [
      { header: 'Employee', key: 'employee', width: 28 },
      { header: 'Emp #', key: 'employeeNumber', width: 12 },
      { header: 'Period Start', key: 'periodStart', width: 14 },
      { header: 'Period End', key: 'periodEnd', width: 14 },
      { header: 'Job #', key: 'jobNumber', width: 14 },
      { header: 'Location', key: 'location', width: 18 },
      { header: 'Foreman', key: 'foremanName', width: 18 },
      { header: 'Total Hrs', key: 'totalHours', width: 11 },
      { header: 'Regular Hrs', key: 'regularHours', width: 12 },
      { header: 'OT Hrs', key: 'overtimeHours', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    // Style header row
    const headerRow = summary.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 24;

    let grandTotal = 0;
    let grandRegular = 0;
    let grandOvertime = 0;

    for (const ts of timesheets) {
      const total = Number(ts.totalHours);
      const regular = Number(ts.regularHours);
      const overtime = Number(ts.overtimeHours);
      grandTotal += total;
      grandRegular += regular;
      grandOvertime += overtime;

      const row = summary.addRow({
        employee: ts.user ? `${ts.user.lastName}, ${ts.user.firstName}` : 'N/A',
        employeeNumber: ts.user?.employeeNumber || '',
        periodStart: ts.payPeriodStart,
        periodEnd: ts.payPeriodEnd,
        jobNumber: ts.jobNumber || '',
        location: ts.location || '',
        foremanName: ts.foremanName || '',
        totalHours: total,
        regularHours: regular,
        overtimeHours: overtime,
        status: ts.status,
      });

      // Highlight overtime
      if (overtime > 0) {
        row.getCell('overtimeHours').font = { bold: true, color: { argb: 'FFEA580C' } };
      }
    }

    // Totals row
    const totalsRow = summary.addRow({
      employee: 'TOTALS',
      totalHours: Math.round(grandTotal * 100) / 100,
      regularHours: Math.round(grandRegular * 100) / 100,
      overtimeHours: Math.round(grandOvertime * 100) / 100,
    });
    totalsRow.font = { bold: true };
    totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    totalsRow.border = {
      top: { style: 'medium' },
    };

    // Auto-filter
    summary.autoFilter = { from: 'A1', to: `K${timesheets.length + 1}` };

    // --- Daily Detail Sheet ---
    const detail = workbook.addWorksheet('Daily Detail');
    detail.columns = [
      { header: 'Employee', key: 'employee', width: 28 },
      { header: 'Emp #', key: 'employeeNumber', width: 12 },
      { header: 'Week Start', key: 'periodStart', width: 14 },
      { header: 'Day', key: 'dayOfWeek', width: 12 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Foreman / Lead', key: 'foremanName', width: 18 },
      { header: 'Location', key: 'location', width: 18 },
      { header: 'Job #', key: 'jobNumber', width: 14 },
      { header: 'Hours', key: 'hours', width: 10 },
    ];

    const detailHeader = detail.getRow(1);
    detailHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    detailHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    detailHeader.height = 24;

    for (const ts of timesheets) {
      const sortedHours = this.sortDailyHours(ts.dailyHours);
      for (const dh of sortedHours) {
        const row = detail.addRow({
          employee: ts.user ? `${ts.user.lastName}, ${ts.user.firstName}` : 'N/A',
          employeeNumber: ts.user?.employeeNumber || '',
          periodStart: ts.payPeriodStart,
          dayOfWeek: this.formatDayName(dh.dayOfWeek),
          date: dh.date,
          foremanName: dh.foremanName || ts.foremanName || '',
          location: dh.location || ts.location || '',
          jobNumber: dh.jobNumber || ts.jobNumber || '',
          hours: Number(dh.hours),
        });
        if (Number(dh.hours) > 8) {
          row.getCell('hours').font = { bold: true, color: { argb: 'FFEA580C' } };
        }
      }
    }

    detail.autoFilter = { from: 'A1', to: 'I1' };

    // --- Payroll Summary Sheet ---
    const payroll = workbook.addWorksheet('Payroll Summary');
    payroll.columns = [
      { header: 'Employee', key: 'employee', width: 28 },
      { header: 'Emp #', key: 'employeeNumber', width: 12 },
      { header: 'Total Hours', key: 'totalHours', width: 12 },
      { header: 'Regular Hours', key: 'regularHours', width: 14 },
      { header: 'Overtime Hours', key: 'overtimeHours', width: 14 },
      { header: 'Timesheets', key: 'timesheetCount', width: 12 },
    ];

    const payrollHeader = payroll.getRow(1);
    payrollHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    payrollHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    payrollHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    payrollHeader.height = 24;

    // Group by employee
    const byEmployee = new Map<string, { name: string; empNum: string; total: number; regular: number; overtime: number; count: number }>();
    for (const ts of timesheets) {
      const key = ts.userId;
      const existing = byEmployee.get(key);
      if (existing) {
        existing.total += Number(ts.totalHours);
        existing.regular += Number(ts.regularHours);
        existing.overtime += Number(ts.overtimeHours);
        existing.count++;
      } else {
        byEmployee.set(key, {
          name: ts.user ? `${ts.user.lastName}, ${ts.user.firstName}` : 'N/A',
          empNum: ts.user?.employeeNumber || '',
          total: Number(ts.totalHours),
          regular: Number(ts.regularHours),
          overtime: Number(ts.overtimeHours),
          count: 1,
        });
      }
    }

    for (const emp of byEmployee.values()) {
      payroll.addRow({
        employee: emp.name,
        employeeNumber: emp.empNum,
        totalHours: Math.round(emp.total * 100) / 100,
        regularHours: Math.round(emp.regular * 100) / 100,
        overtimeHours: Math.round(emp.overtime * 100) / 100,
        timesheetCount: emp.count,
      });
    }

    const payrollTotals = payroll.addRow({
      employee: 'TOTALS',
      totalHours: Math.round(grandTotal * 100) / 100,
      regularHours: Math.round(grandRegular * 100) / 100,
      overtimeHours: Math.round(grandOvertime * 100) / 100,
      timesheetCount: timesheets.length,
    });
    payrollTotals.font = { bold: true };
    payrollTotals.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    payrollTotals.border = { top: { style: 'medium' } };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async generateWeeklyExcel(startDate: string, endDate: string, status?: string, userIds?: string[]): Promise<Buffer> {
    const timesheets = await this.queryTimesheets(startDate, endDate, status, userIds);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Math & Fils Timesheet System';
    workbook.created = new Date();

    for (const ts of timesheets) {
      const empName = ts.user ? `${ts.user.firstName} ${ts.user.lastName}` : 'N/A';
      const empNum = ts.user?.employeeNumber || '';
      const sheetName = empName.substring(0, 28).replace(/[\\/*?:\[\]]/g, '');
      const ws = workbook.addWorksheet(sheetName);

      // --- Header Section ---
      ws.mergeCells('A1:F1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'Math & Fils – Weekly Timesheet';
      titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 32;

      // --- Employee Info ---
      const infoFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF3F4F6' } };
      const infoFont = { size: 10 };
      const boldFont = { size: 10, bold: true };

      ws.getCell('A3').value = 'Employee:';
      ws.getCell('A3').font = boldFont;
      ws.getCell('B3').value = empName;
      ws.getCell('B3').font = infoFont;
      ws.getCell('D3').value = 'Employee #:';
      ws.getCell('D3').font = boldFont;
      ws.getCell('E3').value = empNum || '—';
      ws.getCell('E3').font = infoFont;

      ws.getCell('A4').value = 'Week:';
      ws.getCell('A4').font = boldFont;
      ws.getCell('B4').value = `${ts.payPeriodStart} to ${ts.payPeriodEnd}`;
      ws.getCell('B4').font = infoFont;
      ws.getCell('D4').value = 'Status:';
      ws.getCell('D4').font = boldFont;
      ws.getCell('E4').value = ts.status;
      ws.getCell('E4').font = { size: 10, bold: true, color: { argb: this.getStatusArgb(ts.status) } };

      ws.getCell('A5').value = 'Job #:';
      ws.getCell('A5').font = boldFont;
      ws.getCell('B5').value = ts.jobNumber || '—';
      ws.getCell('B5').font = infoFont;
      ws.getCell('D5').value = 'Foreman:';
      ws.getCell('D5').font = boldFont;
      ws.getCell('E5').value = ts.foremanName || '—';
      ws.getCell('E5').font = infoFont;

      ws.getCell('A6').value = 'Location:';
      ws.getCell('A6').font = boldFont;
      ws.getCell('B6').value = ts.location || '—';
      ws.getCell('B6').font = infoFont;

      // Apply info background to rows 3-6
      for (let r = 3; r <= 6; r++) {
        for (let c = 1; c <= 6; c++) {
          ws.getRow(r).getCell(c).fill = infoFill;
        }
      }

      // --- Daily Hours Table ---
      const tableStartRow = 8;
      const headers = ['Day', 'Date', 'Foreman / Lead', 'Location', 'Job #', 'Hours'];
      const headerRow = ws.getRow(tableStartRow);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF1F2937' } } };
      });
      headerRow.height = 22;

      ws.getColumn(1).width = 14;
      ws.getColumn(2).width = 14;
      ws.getColumn(3).width = 20;
      ws.getColumn(4).width = 20;
      ws.getColumn(5).width = 14;
      ws.getColumn(6).width = 12;

      const sortedHours = this.sortDailyHours(ts.dailyHours);

      let rowIdx = tableStartRow + 1;
      for (const dh of sortedHours) {
        const hours = Number(dh.hours);
        const dayName = this.formatDayName(dh.dayOfWeek);
        const row = ws.getRow(rowIdx);

        row.getCell(1).value = dayName;
        row.getCell(2).value = dh.date;
        row.getCell(3).value = dh.foremanName || ts.foremanName || '—';
        row.getCell(4).value = dh.location || ts.location || '—';
        row.getCell(5).value = dh.jobNumber || ts.jobNumber || '—';
        row.getCell(6).value = hours;

        // Alternating row colors
        const rowFill = (rowIdx - tableStartRow) % 2 === 0
          ? { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF9FAFB' } }
          : undefined;
        for (let c = 1; c <= 6; c++) {
          row.getCell(c).font = { size: 10 };
          row.getCell(c).alignment = { horizontal: 'center' };
          if (rowFill) row.getCell(c).fill = rowFill;
          row.getCell(c).border = {
            bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          };
        }

        // Highlight overtime hours in orange
        if (hours > 8) {
          row.getCell(6).font = { size: 10, bold: true, color: { argb: 'FFEA580C' } };
        }

        rowIdx++;
      }

      // --- Totals Row ---
      const totalsRow = ws.getRow(rowIdx);
      totalsRow.getCell(1).value = 'TOTALS';
      totalsRow.getCell(1).font = { bold: true, size: 11 };
      totalsRow.getCell(6).value = Number(ts.totalHours);
      totalsRow.getCell(6).font = { bold: true, size: 11 };
      for (let c = 1; c <= 6; c++) {
        totalsRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        totalsRow.getCell(c).border = { top: { style: 'medium', color: { argb: 'FF1F2937' } } };
        totalsRow.getCell(c).alignment = { horizontal: 'center' };
      }
      totalsRow.height = 22;

      // Summary below totals
      rowIdx += 1;
      ws.getCell(`A${rowIdx}`).value = `Regular: ${Number(ts.regularHours).toFixed(1)}h`;
      ws.getCell(`A${rowIdx}`).font = { size: 10, color: { argb: 'FF16A34A' } };
      if (Number(ts.overtimeHours) > 0) {
        ws.getCell(`C${rowIdx}`).value = `Overtime: ${Number(ts.overtimeHours).toFixed(1)}h`;
        ws.getCell(`C${rowIdx}`).font = { size: 10, bold: true, color: { argb: 'FFEA580C' } };
      }

      // Footer
      rowIdx += 2;
      ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
      ws.getCell(`A${rowIdx}`).value = 'Math & Fils Timesheet Management System';
      ws.getCell(`A${rowIdx}`).font = { size: 8, italic: true, color: { argb: 'FF9CA3AF' } };
      ws.getCell(`A${rowIdx}`).alignment = { horizontal: 'center' };

      // Print setup
      ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
    }

    if (timesheets.length === 0) {
      const ws = workbook.addWorksheet('No Data');
      ws.getCell('A1').value = 'No timesheets found for the selected criteria.';
      ws.getCell('A1').font = { size: 14 };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async generatePdf(startDate: string, endDate: string, status?: string, userIds?: string[]): Promise<Buffer> {
    const timesheets = await this.queryTimesheets(startDate, endDate, status, userIds);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const primaryColor = '#1F2937';
      const lightGray = '#F3F4F6';
      const green = '#16A34A';
      const orange = '#EA580C';

      for (let ti = 0; ti < timesheets.length; ti++) {
        const ts = timesheets[ti];
        if (ti > 0) doc.addPage();

        const empName = ts.user ? `${ts.user.firstName} ${ts.user.lastName}` : 'N/A';
        const empNum = ts.user?.employeeNumber || '';

        // Header
        doc.rect(40, 40, 532, 50).fill(primaryColor);
        doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(16)
          .text('Math & Fils – Weekly Timesheet', 50, 52, { width: 512 });
        doc.fontSize(9).font('Helvetica')
          .text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 50, 72, { width: 512, align: 'right' });

        // Employee info box
        let y = 105;
        doc.rect(40, y, 532, 55).fill(lightGray);
        doc.fill(primaryColor).font('Helvetica-Bold').fontSize(12)
          .text(empName, 50, y + 8);
        if (empNum) {
          doc.font('Helvetica').fontSize(9).text(`Employee #: ${empNum}`, 50, y + 24);
        }
        doc.font('Helvetica').fontSize(9)
          .text(`Week: ${ts.payPeriodStart} to ${ts.payPeriodEnd}`, 300, y + 8)
          .text(`Status: ${ts.status}`, 300, y + 22)
          .text(`Job #: ${ts.jobNumber || '—'}  |  Location: ${ts.location || '—'}  |  Foreman: ${ts.foremanName || '—'}`, 50, y + 40);

        y = 175;
        const colX = [40, 120, 210, 310, 410, 490];
        const colW = [80, 90, 100, 100, 80, 82];
        const tableW = 532;

        // Table header
        doc.rect(40, y, tableW, 22).fill(primaryColor);
        doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        const headers = ['Day', 'Date', 'Foreman / Lead', 'Location', 'Job #', 'Hours'];
        headers.forEach((h, i) => doc.text(h, colX[i] + 4, y + 6, { width: colW[i] - 8 }));

        y += 22;
        const sortedHours = this.sortDailyHours(ts.dailyHours);

        sortedHours.forEach((dh, idx) => {
          const hours = Number(dh.hours);

          if (idx % 2 === 0) doc.rect(40, y, tableW, 18).fill('#F9FAFB');
          else doc.rect(40, y, tableW, 18).fill('#FFFFFF');

          doc.fill(primaryColor).font('Helvetica').fontSize(8);
          const dayName = this.formatDayName(dh.dayOfWeek);
          doc.text(dayName, colX[0] + 4, y + 4, { width: colW[0] - 8 });
          doc.text(dh.date, colX[1] + 4, y + 4, { width: colW[1] - 8 });
          doc.text(dh.foremanName || ts.foremanName || '—', colX[2] + 4, y + 4, { width: colW[2] - 8 });
          doc.text(dh.location || ts.location || '—', colX[3] + 4, y + 4, { width: colW[3] - 8 });
          doc.text(dh.jobNumber || ts.jobNumber || '—', colX[4] + 4, y + 4, { width: colW[4] - 8 });
          if (hours > 8) doc.fill(orange).font('Helvetica-Bold');
          else doc.fill(primaryColor).font('Helvetica');
          doc.fontSize(8).text(hours > 0 ? hours.toFixed(1) : '—', colX[5] + 4, y + 4, { width: colW[5] - 8 });
          y += 18;
        });

        // Totals row
        doc.rect(40, y, tableW, 22).fill(lightGray);
        doc.fill(primaryColor).font('Helvetica-Bold').fontSize(9);
        doc.text('TOTALS', colX[0] + 4, y + 5);
        doc.text(`${Number(ts.totalHours).toFixed(1)}h`, colX[5] + 4, y + 5, { width: colW[5] - 8 });

        // Summary line under totals
        y += 24;
        doc.fill(primaryColor).font('Helvetica').fontSize(8);
        doc.text(`Regular: ${Number(ts.regularHours).toFixed(1)}h`, colX[0] + 4, y);
        if (Number(ts.overtimeHours) > 0) {
          doc.fill(orange).font('Helvetica-Bold');
          doc.text(`Overtime: ${Number(ts.overtimeHours).toFixed(1)}h`, colX[1] + 40, y);
        }

        // Footer
        y += 40;
        doc.fill('#9CA3AF').font('Helvetica').fontSize(8)
          .text('Math & Fils Timesheet Management System', 40, y, { width: 532, align: 'center' });
      }

      if (timesheets.length === 0) {
        doc.font('Helvetica').fontSize(14).text('No timesheets found for the selected criteria.', 40, 100);
      }

      doc.end();
    });
  }
}
