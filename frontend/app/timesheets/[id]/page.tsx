'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Pencil,
  Send,
  Calendar,
  Briefcase,
  MapPin,
  User,
  Clock,
  Timer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  MessageSquare,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { Navbar } from '@/components/navbar';

const statusConfig: Record<string, { class: string; icon: any; label: string }> = {
  DRAFT: { class: 'bg-gray-100 text-gray-700 border-gray-200', icon: FileText, label: 'Draft' },
  PENDING: { class: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'Pending Review' },
  APPROVED: { class: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2, label: 'Approved' },
  REJECTED: { class: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Rejected' },
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function TimesheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const [ts, setTs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    const fetchTimesheet = async () => {
      try {
        const res = await api.get(`/timesheets/${params.id}`);
        setTs(res.data);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load timesheet');
        router.push('/timesheets');
      } finally {
        setLoading(false);
      }
    };
    fetchTimesheet();
  }, [token, params.id, router]);

  if (loading || !ts) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const sortedHours = [...(ts.dailyHours || [])].sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const sc = statusConfig[ts.status] || statusConfig.DRAFT;
  const StatusIcon = sc.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <button
          onClick={() => router.push('/timesheets')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Timesheets
        </button>

        {/* Header card */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-muted/30 px-6 py-5 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Timesheet Details</h1>
                {ts.user && (
                  <p className="text-sm text-muted-foreground mt-0.5">{ts.user.firstName} {ts.user.lastName}</p>
                )}
              </div>
              <div className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-sm font-medium ${sc.class}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {sc.label}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Period</p>
                  <p className="text-sm font-medium mt-0.5">{ts.payPeriodStart} — {ts.payPeriodEnd}</p>
                </div>
              </div>
              {ts.jobNumber && (
                <div className="flex items-start gap-2.5">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Job Number</p>
                    <p className="text-sm font-medium mt-0.5">{ts.jobNumber}</p>
                  </div>
                </div>
              )}
              {ts.location && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Location</p>
                    <p className="text-sm font-medium mt-0.5">{ts.location}</p>
                  </div>
                </div>
              )}
              {ts.foremanName && (
                <div className="flex items-start gap-2.5">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Foreman</p>
                    <p className="text-sm font-medium mt-0.5">{ts.foremanName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Hours summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border bg-muted/20 p-3 sm:p-4 text-center">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-1">
                  <Timer className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{Number(ts.totalHours).toFixed(1)}<span className="text-xs sm:text-sm font-normal text-muted-foreground">h</span></p>
              </div>
              <div className="rounded-xl border bg-green-50/50 p-3 sm:p-4 text-center">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-1">
                  <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600" />
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-green-700 font-medium">Regular</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{Number(ts.regularHours).toFixed(1)}<span className="text-xs sm:text-sm font-normal text-green-500">h</span></p>
              </div>
              <div className="rounded-xl border bg-orange-50/50 p-3 sm:p-4 text-center">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-1">
                  <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-600" />
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-orange-700 font-medium">Overtime</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{Number(ts.overtimeHours).toFixed(1)}<span className="text-xs sm:text-sm font-normal text-orange-500">h</span></p>
              </div>
            </div>

            {/* Daily hours table */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Daily Breakdown</h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-xs">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Day</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Foreman</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Location</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Job #</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedHours.map((dh: any, i: number) => (
                      <tr key={dh.id || i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-semibold">{DAYS[i] || dh.dayOfWeek?.slice(0, 3)}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{dh.date}</td>
                        <td className="px-4 py-2.5 text-xs">{dh.foremanName || ts.foremanName || '—'}</td>
                        <td className="px-4 py-2.5 text-xs">{dh.location || ts.location || '—'}</td>
                        <td className="px-4 py-2.5 text-xs">{dh.jobNumber || ts.jobNumber || '—'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                            Number(dh.hours) > 8
                              ? 'bg-orange-100 text-orange-700'
                              : Number(dh.hours) > 0
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-muted-foreground'
                          }`}>
                            {Number(dh.hours).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comments */}
            {(ts.employeeComment || ts.adminComment) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                </h3>
                {ts.employeeComment && (
                  <div className="rounded-lg bg-muted/40 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Employee</p>
                    <p className="text-sm">{ts.employeeComment}</p>
                  </div>
                )}
                {ts.adminComment && (
                  <div className="rounded-lg bg-primary/5 border-l-4 border-l-primary p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Admin</p>
                    <p className="text-sm">{ts.adminComment}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions for DRAFT timesheets */}
            {ts.status === 'DRAFT' && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => router.push(`/timesheets/${ts.id}/edit`)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={async () => {
                    try {
                      await api.post(`/timesheets/${ts.id}/submit`);
                      toast.success('Timesheet submitted for approval');
                      router.push('/timesheets');
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || 'Failed to submit');
                    }
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Submit for Approval
                </button>
              </div>
            )}

            {/* Metadata footer */}
            <div className="text-xs text-muted-foreground space-y-1.5 border-t pt-4">
              {ts.submittedAt && <p>Submitted: {new Date(ts.submittedAt).toLocaleString()}</p>}
              {ts.approvedAt && <p>Approved: {new Date(ts.approvedAt).toLocaleString()}</p>}
              <p>Created: {new Date(ts.createdAt).toLocaleString()}</p>
              {ts.isLocked && (
                <p className="flex items-center gap-1.5 text-amber-600 font-medium">
                  <Lock className="h-3.5 w-3.5" />
                  This timesheet is locked
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
