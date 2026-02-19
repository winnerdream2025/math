'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Bell,
  Download,
  ChevronRight,
  ChevronDown,
  Users,
  Timer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  XCircle,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { Navbar } from '@/components/navbar';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
};

const STATUSES = ['ALL', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED'];

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const words = q.split(/\s+/);
  return words.every((word) => t.includes(word));
}

function formatWeek(start: string, end: string): string {
  try {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  } catch {
    return `${start} – ${end}`;
  }
}

export default function TimesheetsPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string; comment?: string } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [showStatusTable, setShowStatusTable] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchTimesheets = useCallback(async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/timesheets', { params });
      const data = res.data.data || res.data;
      setTimesheets(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to fetch timesheets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchSubmissionStatus = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const res = await api.get('/timesheets/submission-status');
      setSubmissionStatus(res.data);
    } catch {}
  }, [user?.role]);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetchTimesheets();
    fetchSubmissionStatus();
  }, [token, router, fetchTimesheets, fetchSubmissionStatus]);

  // Fuzzy-filtered timesheets
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return timesheets;
    return timesheets.filter((ts) => {
      const searchable = [
        ts.user?.firstName, ts.user?.lastName, ts.user?.employeeNumber,
        ts.jobNumber, ts.location, ts.foremanName,
        ts.payPeriodStart, ts.payPeriodEnd,
      ].filter(Boolean).join(' ');
      return fuzzyMatch(searchable, searchQuery);
    });
  }, [timesheets, searchQuery]);

  // Group filtered timesheets by employee
  const employeeGroups = useMemo(() => {
    const map = new Map<string, { name: string; firstName: string; lastName: string; empNum: string; userId: string; timesheets: any[] }>();
    for (const ts of filtered) {
      const uid = ts.user?.id || ts.userId || 'unknown';
      if (!map.has(uid)) {
        map.set(uid, {
          name: ts.user ? `${ts.user.firstName} ${ts.user.lastName}` : 'N/A',
          firstName: ts.user?.firstName || '',
          lastName: ts.user?.lastName || '',
          empNum: ts.user?.employeeNumber || '',
          userId: uid,
          timesheets: [],
        });
      }
      map.get(uid)!.timesheets.push(ts);
    }
    // Sort each employee's timesheets by pay period (newest first)
    const groups = Array.from(map.values());
    groups.forEach((g) => g.timesheets.sort((a: any, b: any) => b.payPeriodStart.localeCompare(a.payPeriodStart)));
    // Sort employees alphabetically by last name
    groups.sort((a, b) => a.lastName.localeCompare(b.lastName));
    return groups;
  }, [filtered]);

  const handleAction = async (id: string, action: string, comment?: string) => {
    try {
      if (action === 'approve') {
        await api.post(`/timesheets/${id}/approve`, { adminComment: comment });
        toast.success('Timesheet approved');
      } else if (action === 'reject') {
        await api.post(`/timesheets/${id}/reject`, { adminComment: comment });
        toast.success('Timesheet rejected');
      } else if (action === 'submit') {
        await api.post(`/timesheets/${id}/submit`);
        toast.success('Timesheet submitted for approval');
      } else if (action === 'resubmit') {
        await api.post(`/timesheets/${id}/resubmit`);
        toast.success('Timesheet moved back to draft');
      } else if (action === 'delete') {
        await api.delete(`/timesheets/${id}`);
        toast.success('Timesheet deleted');
      }
      setConfirmAction(null);
      setActionComment('');
      fetchTimesheets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to ${action}`);
    }
  };

  const handleDownloadEmployee = async (userId: string, employeeName: string) => {
    const empTs = filtered.filter((t) => (t.user?.id || t.userId) === userId);
    if (empTs.length === 0) return;
    setDownloadingId(userId);
    try {
      const starts = empTs.map((t: any) => t.payPeriodStart).sort();
      const ends = empTs.map((t: any) => t.payPeriodEnd).sort();
      const startDate = starts[0];
      const endDate = ends[ends.length - 1];
      const payload: any = { startDate, endDate, userIds: [userId] };
      if (statusFilter !== 'ALL') payload.status = statusFilter;
      const res = await api.post('/exports/excel', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = employeeName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      link.setAttribute('download', `timesheet-${safeName}-${startDate}-to-${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${employeeName}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (filtered.length === 0) return;
    setDownloadingId('all');
    try {
      const starts = filtered.map((t) => t.payPeriodStart).sort();
      const ends = filtered.map((t) => t.payPeriodEnd).sort();
      const startDate = starts[0];
      const endDate = ends[ends.length - 1];
      const userIds = [...new Set(filtered.map((t) => t.user?.id || t.userId).filter(Boolean))];
      const payload: any = { startDate, endDate, userIds };
      if (statusFilter !== 'ALL') payload.status = statusFilter;
      const res = await api.post('/exports/excel', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const statusSuffix = statusFilter !== 'ALL' ? `-${statusFilter.toLowerCase()}` : '';
      link.setAttribute('download', `timesheets-${startDate}-to-${endDate}${statusSuffix}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel downloaded');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  // Download a single weekly timesheet (Excel or PDF)
  const handleDownloadWeekly = async (ts: any, format: 'excel' | 'pdf') => {
    const uid = ts.user?.id || ts.userId;
    const empName = ts.user ? `${ts.user.firstName}-${ts.user.lastName}` : 'employee';
    const safeName = empName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const key = `${ts.id}-${format}`;
    setDownloadingId(key);
    try {
      const endpoint = format === 'pdf' ? '/exports/pdf' : '/exports/weekly-excel';
      const payload: any = { startDate: ts.payPeriodStart, endDate: ts.payPeriodEnd, userIds: [uid] };
      if (statusFilter !== 'ALL') payload.status = statusFilter;
      const res = await api.post(endpoint, payload, { responseType: 'blob' });
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timesheet-${safeName}-${ts.payPeriodStart}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `${format.toUpperCase()} download failed`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Summary helpers
  const totalHours = filtered.reduce((s, t) => s + Number(t.totalHours), 0);
  const regularHours = filtered.reduce((s, t) => s + Number(t.regularHours), 0);
  const overtimeHours = filtered.reduce((s, t) => s + Number(t.overtimeHours), 0);

  const getGroupStatusCounts = (tss: any[]) => {
    const counts: Record<string, number> = {};
    tss.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return counts;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Hero banner */}
        <div className="relative rounded-2xl overflow-hidden mb-6">
          <img src="/images/logindatacenter.png" alt="" className="w-full h-44 sm:h-52 object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="absolute inset-0 flex items-center px-8">
            <div className="text-white">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Timesheets</h1>
              <p className="text-white/70 mt-1 text-sm">{filtered.length} timesheet{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 mb-6">
            {isAdmin && (
              <button
                onClick={async () => {
                  try {
                    const res = await api.post('/timesheets/send-reminder');
                    toast.success(`Reminder sent to ${res.data.sent} employee(s)`);
                  } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Failed to send reminder');
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <Bell className="h-4 w-4" />
                Reminder
              </button>
            )}
            {isAdmin && filtered.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloadingId === 'all'}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                {downloadingId === 'all' ? 'Downloading...' : `Export (${filtered.length})`}
              </button>
            )}
            {user?.role === 'EMPLOYEE' && (
              <button
                onClick={() => router.push('/timesheets/new')}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Timesheet
              </button>
            )}
        </div>

        {/* Search + Status filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {isAdmin && (
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search employee, job #, location, foreman..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-input bg-background pl-9 pr-8 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setLoading(true); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Submission Status Banner + Table */}
        {isAdmin && submissionStatus && (() => {
          const missing = submissionStatus.employees.filter((e: any) => e.status === 'MISSING');
          const drafts = submissionStatus.employees.filter((e: any) => e.status === 'DRAFT');
          const submitted = submissionStatus.employees.filter((e: any) => e.status === 'SUBMITTED');
          const totalEmployees = submissionStatus.employees.length;
          const notSubmittedCount = missing.length + drafts.length;

          return (
            <div className="mb-6">
              {/* Banner */}
              <div
                className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                  totalEmployees === 0
                    ? 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                    : notSubmittedCount > 0
                      ? 'border-red-300 bg-red-50 hover:bg-red-100'
                      : 'border-green-300 bg-green-50 hover:bg-green-100'
                }`}
                onClick={() => setShowStatusTable(!showStatusTable)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{totalEmployees === 0 ? 'ℹ️' : notSubmittedCount > 0 ? '⚠️' : '✅'}</span>
                    <div>
                      <p className="font-semibold text-sm">
                        {totalEmployees === 0
                          ? 'No active employees found'
                          : notSubmittedCount > 0
                            ? `${notSubmittedCount} employee${notSubmittedCount > 1 ? 's' : ''} have not submitted this week`
                            : 'All employees have submitted this week'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Week of {submissionStatus.weekStart} — {submissionStatus.weekEnd}
                        {totalEmployees === 0
                          ? ' · Invite or activate employees to track submissions'
                          : <>{' · '}<span className="text-green-600 font-medium">{submitted.length} submitted</span>
                            {drafts.length > 0 && <>, <span className="text-yellow-600 font-medium">{drafts.length} draft</span></>}
                            {missing.length > 0 && <>, <span className="text-red-600 font-medium">{missing.length} missing</span></>}</>
                        }
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`h-5 w-5 text-muted-foreground transition-transform ${showStatusTable ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expandable Status Table */}
              {showStatusTable && (
                <div className="mt-3 rounded-lg border bg-card overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-2 font-medium">Employee</th>
                        <th className="text-left px-4 py-2 font-medium">Email</th>
                        <th className="text-center px-4 py-2 font-medium">Status</th>
                        <th className="text-center px-4 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...missing, ...drafts, ...submitted].map((emp: any) => (
                        <tr key={emp.userId} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2 font-medium">{emp.firstName} {emp.lastName}</td>
                          <td className="px-4 py-2 text-muted-foreground">{emp.email}</td>
                          <td className="px-4 py-2 text-center">
                            {emp.status === 'SUBMITTED' && (
                              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">
                                ✅ {emp.timesheetStatus}
                              </span>
                            )}
                            {emp.status === 'DRAFT' && (
                              <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 px-2.5 py-0.5 text-xs font-medium">
                                📝 Draft
                              </span>
                            )}
                            {emp.status === 'MISSING' && (
                              <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-medium">
                                ❌ Missing
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {emp.timesheetId ? (
                              <button
                                onClick={() => router.push(`/timesheets/${emp.timesheetId}`)}
                                className="text-xs text-primary hover:underline font-medium"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* Admin summary bar */}
        {isAdmin && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-muted-foreground font-medium">Employees</p>
              </div>
              <p className="text-xl font-bold">{employeeGroups.length}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="h-4 w-4 text-slate-500" />
                <p className="text-xs text-muted-foreground font-medium">Total Hours</p>
              </div>
              <p className="text-xl font-bold">{totalHours.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">h</span></p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground font-medium">Regular</p>
              </div>
              <p className="text-xl font-bold text-green-600">{regularHours.toFixed(1)}<span className="text-sm font-normal text-green-400">h</span></p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <p className="text-xs text-muted-foreground font-medium">Overtime</p>
              </div>
              <p className="text-xl font-bold text-orange-600">{overtimeHours.toFixed(1)}<span className="text-sm font-normal text-orange-400">h</span></p>
            </div>
          </div>
        )}

        {/* Search result info */}
        {isAdmin && searchQuery && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filtered.length} of {timesheets.length} timesheets for &quot;{searchQuery}&quot;
            {filtered.length === 0 && ' — try a different search term'}
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-1">{searchQuery ? 'No timesheets match your search' : 'No timesheets found'}</p>
            <p className="text-sm">{searchQuery ? 'Try a different search term' : 'Timesheets will appear here once created.'}</p>
          </div>
        ) : isAdmin ? (
          <>
            {/* Admin: Employee list — click to expand weekly timesheets */}
            <div className="space-y-3">
              {employeeGroups.map((group) => {
                const isExpanded = expandedEmployee === group.userId;
                const groupTotalHours = group.timesheets.reduce((s: number, t: any) => s + Number(t.totalHours), 0);
                const groupRegHours = group.timesheets.reduce((s: number, t: any) => s + Number(t.regularHours), 0);
                const groupOtHours = group.timesheets.reduce((s: number, t: any) => s + Number(t.overtimeHours), 0);
                const statusCounts = getGroupStatusCounts(group.timesheets);

                return (
                  <div key={group.userId} className="rounded-xl border bg-card overflow-hidden shadow-sm">
                    {/* Employee row — clickable */}
                    <div
                      className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setExpandedEmployee(isExpanded ? null : group.userId)}
                    >
                      {/* Expand icon */}
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      }

                      {/* Avatar circle */}
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {group.firstName.charAt(0)}{group.lastName.charAt(0)}
                      </div>

                      {/* Employee info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{group.name}</span>
                          {group.empNum && <span className="text-xs text-muted-foreground">#{group.empNum}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">{group.timesheets.length} week{group.timesheets.length !== 1 ? 's' : ''}</span>
                          {/* Status pills */}
                          {Object.entries(statusCounts).map(([status, count]) => (
                            <span key={status} className={`inline-flex rounded-full px-1.5 py-0 text-[10px] font-medium ${statusColors[status] || ''}`}>
                              {count} {status.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Hours summary */}
                      <div className="hidden sm:flex items-center gap-4 text-sm flex-shrink-0">
                        <span className="font-bold">{groupTotalHours.toFixed(1)}h</span>
                        <span className="text-green-600 text-xs">{groupRegHours.toFixed(1)} reg</span>
                        {groupOtHours > 0 && <span className="text-orange-600 text-xs">{groupOtHours.toFixed(1)} OT</span>}
                      </div>

                      {/* Export button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadEmployee(group.userId, group.name); }}
                        disabled={downloadingId === group.userId}
                        className="rounded border px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50 flex-shrink-0"
                      >
                        {downloadingId === group.userId ? '...' : 'Export'}
                      </button>
                    </div>

                    {/* Expanded: weekly timesheet list */}
                    {isExpanded && (
                      <div className="border-t bg-muted/10">
                        {/* Mobile hours row */}
                        <div className="sm:hidden flex items-center gap-3 px-4 py-2 bg-muted/20 text-xs">
                          <span className="font-bold">{groupTotalHours.toFixed(1)}h total</span>
                          <span className="text-green-600">{groupRegHours.toFixed(1)}h regular</span>
                          {groupOtHours > 0 && <span className="text-orange-600">{groupOtHours.toFixed(1)}h OT</span>}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden md:block">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/30">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Week</th>
                                <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Job #</th>
                                <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Location</th>
                                <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Foreman</th>
                                <th className="px-4 py-2 text-right font-medium text-xs text-muted-foreground">Total</th>
                                <th className="px-4 py-2 text-right font-medium text-xs text-muted-foreground">Reg</th>
                                <th className="px-4 py-2 text-right font-medium text-xs text-muted-foreground">OT</th>
                                <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Status</th>
                                <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {group.timesheets.map((ts: any) => (
                                <tr key={ts.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => router.push(`/timesheets/${ts.id}`)}>
                                  <td className="px-4 py-2.5 whitespace-nowrap">
                                    <span className="text-sm font-medium">{formatWeek(ts.payPeriodStart, ts.payPeriodEnd)}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{ts.jobNumber || '—'}</td>
                                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{ts.location || '—'}</td>
                                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{ts.foremanName || '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-semibold">{Number(ts.totalHours).toFixed(1)}h</td>
                                  <td className="px-4 py-2.5 text-right text-green-600">{Number(ts.regularHours).toFixed(1)}</td>
                                  <td className="px-4 py-2.5 text-right text-orange-600">{Number(ts.overtimeHours) > 0 ? Number(ts.overtimeHours).toFixed(1) : '—'}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ts.status] || ''}`}>{ts.status}</span>
                                  </td>
                                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5">
                                      {/* Download arrows */}
                                      <button
                                        onClick={() => handleDownloadWeekly(ts, 'excel')}
                                        disabled={downloadingId === `${ts.id}-excel`}
                                        title="Download Excel"
                                        className="rounded p-1 hover:bg-accent disabled:opacity-50"
                                      >
                                        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      </button>
                                      <button
                                        onClick={() => handleDownloadWeekly(ts, 'pdf')}
                                        disabled={downloadingId === `${ts.id}-pdf`}
                                        title="Download PDF"
                                        className="rounded p-1 hover:bg-accent disabled:opacity-50"
                                      >
                                        <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                      </button>
                                      {ts.status === 'PENDING' && (
                                        <>
                                          <button onClick={() => setConfirmAction({ id: ts.id, action: 'approve' })} className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Approve</button>
                                          <button onClick={() => setConfirmAction({ id: ts.id, action: 'reject' })} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Reject</button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden divide-y">
                          {group.timesheets.map((ts: any) => (
                            <div key={ts.id} className="px-4 py-3 cursor-pointer hover:bg-muted/20" onClick={() => router.push(`/timesheets/${ts.id}`)}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{formatWeek(ts.payPeriodStart, ts.payPeriodEnd)}</span>
                                <div className="flex items-center gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); handleDownloadWeekly(ts, 'excel'); }} className="p-1" title="Excel">
                                    <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDownloadWeekly(ts, 'pdf'); }} className="p-1" title="PDF">
                                    <svg className="h-3.5 w-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                  </button>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[ts.status] || ''}`}>{ts.status}</span>
                                </div>
                              </div>
                              {(ts.jobNumber || ts.location) && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  {ts.jobNumber && <span>Job: {ts.jobNumber}</span>}
                                  {ts.jobNumber && ts.location && ' · '}
                                  {ts.location && <span>{ts.location}</span>}
                                </p>
                              )}
                              <div className="flex gap-3 text-xs">
                                <span className="font-semibold">{Number(ts.totalHours).toFixed(1)}h</span>
                                <span className="text-green-600">{Number(ts.regularHours).toFixed(1)} reg</span>
                                {Number(ts.overtimeHours) > 0 && <span className="text-orange-600">{Number(ts.overtimeHours).toFixed(1)} OT</span>}
                              </div>
                              {ts.status === 'PENDING' && (
                                <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => setConfirmAction({ id: ts.id, action: 'approve' })} className="flex-1 rounded bg-green-600 px-2 py-1.5 text-xs text-white">Approve</button>
                                  <button onClick={() => setConfirmAction({ id: ts.id, action: 'reject' })} className="flex-1 rounded bg-red-600 px-2 py-1.5 text-xs text-white">Reject</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Employee view: flat weekly list */}
            <div className="hidden md:block overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium">Week</th>
                    <th className="px-3 py-3 text-right font-medium">Total</th>
                    <th className="px-3 py-3 text-right font-medium">Regular</th>
                    <th className="px-3 py-3 text-right font-medium">OT</th>
                    <th className="px-3 py-3 text-left font-medium">Status</th>
                    <th className="px-3 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((ts) => (
                    <tr key={ts.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/timesheets/${ts.id}`)}>
                      <td className="px-3 py-3 whitespace-nowrap">{formatWeek(ts.payPeriodStart, ts.payPeriodEnd)}</td>
                      <td className="px-3 py-3 text-right font-semibold">{Number(ts.totalHours).toFixed(1)}h</td>
                      <td className="px-3 py-3 text-right text-green-600">{Number(ts.regularHours).toFixed(1)}h</td>
                      <td className="px-3 py-3 text-right text-orange-600">{Number(ts.overtimeHours) > 0 ? `${Number(ts.overtimeHours).toFixed(1)}h` : '—'}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[ts.status] || ''}`}>{ts.status}</span>
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          {ts.status === 'DRAFT' && (
                            <>
                              <button onClick={() => router.push(`/timesheets/${ts.id}/edit`)} className="rounded border border-primary px-2 py-1 text-xs text-primary hover:bg-primary/10">Edit</button>
                              <button onClick={() => setConfirmAction({ id: ts.id, action: 'submit' })} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90">Submit</button>
                              <button onClick={() => setConfirmAction({ id: ts.id, action: 'delete' })} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Delete</button>
                            </>
                          )}
                          {ts.status === 'REJECTED' && (
                            <button onClick={() => setConfirmAction({ id: ts.id, action: 'resubmit' })} className="rounded bg-yellow-600 px-2 py-1 text-xs text-white hover:bg-yellow-700">Edit &amp; Resubmit</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Employee mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((ts) => (
                <div key={ts.id} className="rounded-lg border bg-card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/timesheets/${ts.id}`)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ts.status] || ''}`}>{ts.status}</span>
                    <span className="text-xs text-muted-foreground">{formatWeek(ts.payPeriodStart, ts.payPeriodEnd)}</span>
                  </div>
                  <div className="flex gap-4 text-sm mb-3">
                    <span><strong>{Number(ts.totalHours).toFixed(1)}</strong>h total</span>
                    <span className="text-green-600">{Number(ts.regularHours).toFixed(1)}h reg</span>
                    {Number(ts.overtimeHours) > 0 && <span className="text-orange-600">{Number(ts.overtimeHours).toFixed(1)}h OT</span>}
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {ts.status === 'DRAFT' && (
                      <>
                        <button onClick={() => router.push(`/timesheets/${ts.id}/edit`)} className="flex-1 rounded border border-primary px-2 py-1.5 text-xs text-primary">Edit</button>
                        <button onClick={() => setConfirmAction({ id: ts.id, action: 'submit' })} className="flex-1 rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground">Submit</button>
                        <button onClick={() => setConfirmAction({ id: ts.id, action: 'delete' })} className="flex-1 rounded bg-red-600 px-2 py-1.5 text-xs text-white">Delete</button>
                      </>
                    )}
                    {ts.status === 'REJECTED' && (
                      <button onClick={() => setConfirmAction({ id: ts.id, action: 'resubmit' })} className="flex-1 rounded bg-yellow-600 px-2 py-1.5 text-xs text-white">Edit &amp; Resubmit</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setConfirmAction(null); setActionComment(''); }}>
          <div className="bg-card border rounded-xl p-6 w-full max-w-md shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">
              {confirmAction.action === 'approve' && 'Approve Timesheet?'}
              {confirmAction.action === 'reject' && 'Reject Timesheet?'}
              {confirmAction.action === 'submit' && 'Submit Timesheet?'}
              {confirmAction.action === 'resubmit' && 'Move back to Draft?'}
              {confirmAction.action === 'delete' && 'Delete Timesheet?'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {confirmAction.action === 'delete' ? 'This action cannot be undone.' : 'Are you sure you want to proceed?'}
            </p>
            {confirmAction.action === 'reject' && (
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Reason for rejection (required)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-4 min-h-[80px]"
              />
            )}
            {confirmAction.action === 'approve' && (
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Comment (optional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-4 min-h-[60px]"
              />
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setConfirmAction(null); setActionComment(''); }} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button
                onClick={() => handleAction(confirmAction.id, confirmAction.action, actionComment || undefined)}
                disabled={confirmAction.action === 'reject' && !actionComment.trim()}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  confirmAction.action === 'delete' || confirmAction.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
