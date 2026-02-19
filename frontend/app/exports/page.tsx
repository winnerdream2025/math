'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Eye, Download, Filter, Info } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { Navbar } from '@/components/navbar';

export default function ExportsPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('APPROVED');
  const [exporting, setExporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  useEffect(() => {
    if (!token || user?.role !== 'ADMIN') return;
    api.get('/users').then((r) => {
      const data = r.data.data || r.data;
      setEmployees(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [token, user]);

  if (!token || user?.role !== 'ADMIN') {
    if (typeof window !== 'undefined') router.push('/login');
    return null;
  }

  const getPayload = () => ({
    startDate,
    endDate,
    status: status || undefined,
    userIds: selectedEmployees.length > 0 ? selectedEmployees : undefined,
  });

  const handlePreview = async () => {
    if (!startDate || !endDate) {
      toast.error('Select both start and end dates');
      return;
    }
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await api.post('/exports/preview', getPayload());
      setPreview(res.data);
      if (res.data.count === 0) {
        toast('No timesheets match your filters', { icon: '⚠️' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Select both start and end dates');
      return;
    }
    setExporting(true);
    try {
      const res = await api.post('/exports/excel', getPayload(), { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const statusSuffix = status ? `-${status.toLowerCase()}` : '';
      link.setAttribute('download', `timesheets-${startDate}-to-${endDate}${statusSuffix}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded — 3 sheets: Summary, Daily Detail, Payroll');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
    setPreview(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero banner */}
        <div className="relative rounded-2xl overflow-hidden mb-6">
          <img src="/images/datacenter.jpg" alt="" className="w-full h-44 sm:h-52 object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="absolute inset-0 flex items-center px-8">
            <div className="text-white">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Export Timesheets</h1>
              <p className="text-white/70 mt-1 text-sm">Download timesheet data as Excel reports</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Filters panel */}
          <div className="md:col-span-1 space-y-5">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </h2>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreview(null); }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">End Date</label>
                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPreview(null); }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPreview(null); }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow">
                  <option value="">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="DRAFT">Draft</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Employees</label>
                <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                  {employees.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  ) : (
                    employees.map((emp) => (
                      <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                        <input type="checkbox" checked={selectedEmployees.includes(emp.id)}
                          onChange={() => toggleEmployee(emp.id)}
                          className="rounded border-input" />
                        {emp.firstName} {emp.lastName}
                        {emp.employeeNumber && <span className="text-xs text-muted-foreground">({emp.employeeNumber})</span>}
                      </label>
                    ))
                  )}
                </div>
                {selectedEmployees.length > 0 && (
                  <button onClick={() => { setSelectedEmployees([]); setPreview(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground">Clear selection</button>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handlePreview} disabled={previewing || !startDate || !endDate}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors">
                  <Eye className="h-4 w-4" />
                  {previewing ? 'Loading...' : 'Preview'}
                </button>
                <button onClick={handleExport} disabled={exporting || !startDate || !endDate}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  <Download className="h-4 w-4" />
                  {exporting ? 'Generating...' : 'Download'}
                </button>
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-foreground text-sm"><Info className="h-3.5 w-3.5" /> Excel includes 3 sheets:</p>
              <p><strong>Summary</strong> — one row per timesheet with totals</p>
              <p><strong>Daily Detail</strong> — per-day hours breakdown</p>
              <p><strong>Payroll Summary</strong> — grouped by employee</p>
            </div>
          </div>

          {/* Preview panel */}
          <div className="md:col-span-2">
            {!preview ? (
              <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium mb-1">No preview yet</p>
                <p className="text-sm">Select your date range and click <strong>Preview</strong> to see what will be exported.</p>
              </div>
            ) : preview.count === 0 ? (
              <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
                <p className="text-lg font-medium mb-1">No timesheets found</p>
                <p className="text-sm">Try adjusting your date range or status filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">Timesheets</p>
                    <p className="text-xl sm:text-2xl font-bold">{preview.count}</p>
                  </div>
                  <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">Total Hours</p>
                    <p className="text-xl sm:text-2xl font-bold">{preview.summary.totalHours}</p>
                  </div>
                  <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">Regular</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{preview.summary.regularHours}</p>
                  </div>
                  <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">Overtime</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">{preview.summary.overtimeHours}</p>
                  </div>
                </div>

                {/* Preview table */}
                <div className="rounded-xl border overflow-x-auto shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Employee</th>
                        <th className="px-3 py-2 text-left font-medium">Period</th>
                        <th className="px-3 py-2 text-left font-medium">Job #</th>
                        <th className="px-3 py-2 text-left font-medium">Location</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                        <th className="px-3 py-2 text-right font-medium">Reg</th>
                        <th className="px-3 py-2 text-right font-medium">OT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.rows.map((r: any) => (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2">{r.employee}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.periodStart} — {r.periodEnd}</td>
                          <td className="px-3 py-2">{r.jobNumber || '—'}</td>
                          <td className="px-3 py-2">{r.location || '—'}</td>
                          <td className="px-3 py-2 text-right font-medium">{r.totalHours.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right text-green-600">{r.regularHours.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right text-orange-600">{r.overtimeHours > 0 ? r.overtimeHours.toFixed(1) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button onClick={handleExport} disabled={exporting}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  <Download className="h-4 w-4" />
                  {exporting ? 'Generating...' : `Download Excel (${preview.count} timesheets)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
