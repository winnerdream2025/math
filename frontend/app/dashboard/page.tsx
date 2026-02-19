'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileSpreadsheet,
  UserPlus,
  TrendingUp,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { Navbar } from '@/components/navbar';

export default function DashboardPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingTimesheets: 0,
    approvedTimesheets: 0,
    draftTimesheets: 0,
    rejectedTimesheets: 0,
    totalTimesheets: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'ADMIN') {
      router.push('/timesheets');
      return;
    }

    const fetchData = async () => {
      try {
        const [usersRes, timesheetsRes] = await Promise.all([
          api.get('/users'),
          api.get('/timesheets'),
        ]);
        const users = usersRes.data.data || usersRes.data;
        const timesheets = timesheetsRes.data.data || timesheetsRes.data;
        const tsList = Array.isArray(timesheets) ? timesheets : [];
        setStats({
          totalUsers: Array.isArray(users) ? users.length : 0,
          pendingTimesheets: tsList.filter((t: any) => t.status === 'PENDING').length,
          approvedTimesheets: tsList.filter((t: any) => t.status === 'APPROVED').length,
          draftTimesheets: tsList.filter((t: any) => t.status === 'DRAFT').length,
          rejectedTimesheets: tsList.filter((t: any) => t.status === 'REJECTED').length,
          totalTimesheets: tsList.length,
        });
      } catch (err) {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, user, router]);

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
        <div className="relative rounded-2xl overflow-hidden mb-8">
          <img src="/images/datacenter.jpg" alt="" className="w-full h-44 sm:h-52 object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
          <div className="absolute inset-0 flex items-center px-8">
            <div className="text-white">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-white/70 mt-1 text-sm sm:text-base">
                Welcome back, {user?.firstName}. Here&apos;s your overview.
              </p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">Employees</p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              {stats.pendingTimesheets > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                  {stats.pendingTimesheets}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.pendingTimesheets}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending Review</p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">This period</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.approvedTimesheets}</p>
            <p className="text-xs text-muted-foreground mt-1">Approved</p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.totalTimesheets}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Timesheets</p>
          </div>
        </div>

        {/* Pending alert */}
        {stats.pendingTimesheets > 0 && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  {stats.pendingTimesheets} timesheet{stats.pendingTimesheets !== 1 ? 's' : ''} awaiting approval
                </p>
                <p className="text-xs text-amber-700 mt-0.5">Review and approve pending timesheets to keep payroll on schedule.</p>
              </div>
            </div>
            <Link
              href="/timesheets?status=PENDING"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors w-full sm:w-auto sm:mt-3"
            >
              Review Timesheets
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Quick actions */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/timesheets"
              className="group flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">View Timesheets</p>
                <p className="text-xs text-muted-foreground mt-0.5">Review, approve, or reject submissions</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              href="/users"
              className="group flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">Manage Users</p>
                <p className="text-xs text-muted-foreground mt-0.5">Add employees, manage accounts</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-purple-600 transition-colors" />
            </Link>

            <Link
              href="/exports"
              className="group flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">Export Payroll</p>
                <p className="text-xs text-muted-foreground mt-0.5">Download Excel reports with hours</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-green-600 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Status Breakdown</h2>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-3">
              {[
                { label: 'Approved', count: stats.approvedTimesheets, color: 'bg-green-500', textColor: 'text-green-700' },
                { label: 'Pending', count: stats.pendingTimesheets, color: 'bg-amber-500', textColor: 'text-amber-700' },
                { label: 'Draft', count: stats.draftTimesheets, color: 'bg-gray-400', textColor: 'text-gray-600' },
                { label: 'Rejected', count: stats.rejectedTimesheets, color: 'bg-red-500', textColor: 'text-red-700' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-20">{item.label}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: stats.totalTimesheets > 0 ? `${(item.count / stats.totalTimesheets) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className={`text-sm font-semibold w-8 text-right ${item.textColor}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
