'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Save, Send, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { Navbar } from '@/components/navbar';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function EditTimesheetPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();

  const [jobNumber, setJobNumber] = useState('');
  const [location, setLocation] = useState('');
  const [foremanName, setForemanName] = useState('');
  const [employeeComment, setEmployeeComment] = useState('');
  const [hours, setHours] = useState<number[]>(new Array(7).fill(0));
  const [dailyJobNumbers, setDailyJobNumbers] = useState<string[]>(new Array(7).fill(''));
  const [dailyLocations, setDailyLocations] = useState<string[]>(new Array(7).fill(''));
  const [dailyForemen, setDailyForemen] = useState<string[]>(new Array(7).fill(''));
  const [showDailyOverrides, setShowDailyOverrides] = useState(false);
  const [dates, setDates] = useState<{ date: string; dayOfWeek: string }[]>([]);
  const [ts, setTs] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    const fetchTimesheet = async () => {
      try {
        const res = await api.get(`/timesheets/${params.id}`);
        const data = res.data;
        if (data.status !== 'DRAFT') {
          toast.error('Only draft timesheets can be edited');
          router.push(`/timesheets/${params.id}`);
          return;
        }
        setTs(data);
        setJobNumber(data.jobNumber || '');
        setLocation(data.location || '');
        setForemanName(data.foremanName || '');
        setEmployeeComment(data.employeeComment || '');

        // Sort daily hours by date
        const sorted = [...(data.dailyHours || [])].sort(
          (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        const h = new Array(7).fill(0);
        const dj = new Array(7).fill('');
        const dl = new Array(7).fill('');
        const df = new Array(7).fill('');
        const d: { date: string; dayOfWeek: string }[] = [];

        sorted.forEach((dh: any, i: number) => {
          if (i < 7) {
            h[i] = Number(dh.hours) || 0;
            dj[i] = dh.jobNumber && dh.jobNumber !== data.jobNumber ? dh.jobNumber : '';
            dl[i] = dh.location && dh.location !== data.location ? dh.location : '';
            df[i] = dh.foremanName && dh.foremanName !== data.foremanName ? dh.foremanName : '';
            d.push({ date: dh.date, dayOfWeek: dh.dayOfWeek || DAYS[i] });
          }
        });

        setHours(h);
        setDailyJobNumbers(dj);
        setDailyLocations(dl);
        setDailyForemen(df);
        setDates(d);

        // Show daily overrides if any per-day values differ
        if (dj.some(Boolean) || dl.some(Boolean) || df.some(Boolean)) {
          setShowDailyOverrides(true);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load timesheet');
        router.push('/timesheets');
      } finally {
        setLoading(false);
      }
    };
    fetchTimesheet();
  }, [token, params.id, router]);

  const buildPayload = () => {
    const dailyHours = dates.map((wd, i) => ({
      date: wd.date,
      dayOfWeek: wd.dayOfWeek,
      hours: hours[i],
      ...(dailyJobNumbers[i] ? { jobNumber: dailyJobNumbers[i] } : {}),
      ...(dailyLocations[i] ? { location: dailyLocations[i] } : {}),
      ...(dailyForemen[i] ? { foremanName: dailyForemen[i] } : {}),
    }));
    return {
      jobNumber: jobNumber.trim(),
      location: location.trim(),
      foremanName: foremanName || undefined,
      employeeComment: employeeComment || undefined,
      dailyHours,
    };
  };

  const handleSave = async () => {
    setError('');
    if (!jobNumber.trim()) { setError('Job number is required'); return; }
    if (!location.trim()) { setError('Location is required'); return; }
    setSaving(true);
    try {
      await api.patch(`/timesheets/${params.id}`, buildPayload());
      toast.success('Timesheet saved');
      router.push('/timesheets');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    setError('');
    if (!jobNumber.trim()) { setError('Job number is required'); return; }
    if (!location.trim()) { setError('Location is required'); return; }
    setSaving(true);
    try {
      await api.patch(`/timesheets/${params.id}`, buildPayload());
      await api.post(`/timesheets/${params.id}/submit`);
      toast.success('Timesheet submitted for approval');
      router.push('/timesheets');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !ts) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <button onClick={() => router.push(`/timesheets/${params.id}`)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Details
        </button>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Edit Timesheet</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {ts.payPeriodStart} — {ts.payPeriodEnd} · <span className="inline-flex rounded-full bg-gray-100 text-gray-800 px-2 py-0.5 text-xs font-medium">DRAFT</span>
        </p>

        <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Number <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Foreman Name</label>
              <input
                type="text"
                value={foremanName}
                onChange={(e) => setForemanName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comment</label>
              <input
                type="text"
                value={employeeComment}
                onChange={(e) => setEmployeeComment(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Optional note"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Daily Hours</h3>
              <button
                type="button"
                onClick={() => setShowDailyOverrides(!showDailyOverrides)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {showDailyOverrides ? <><ChevronUp className="h-3 w-3" /> Hide daily details</> : <><ChevronDown className="h-3 w-3" /> Different job/location per day?</>}
              </button>
            </div>

            {!showDailyOverrides ? (
              <div className="grid grid-cols-7 gap-2">
                {DAY_LABELS.map((day, i) => (
                  <div key={day} className="space-y-1 text-center">
                    <label className="text-xs font-medium text-muted-foreground">{day}</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      value={hours[i]}
                      onChange={(e) => {
                        const updated = [...hours];
                        updated[i] = parseFloat(e.target.value) || 0;
                        setHours(updated);
                      }}
                      className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-center"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {DAY_LABELS.map((day, i) => (
                  <div key={day} className="grid grid-cols-12 gap-2 items-center rounded-md border p-2">
                    <span className="col-span-1 text-xs font-medium text-muted-foreground">{day}</span>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      value={hours[i]}
                      onChange={(e) => {
                        const updated = [...hours];
                        updated[i] = parseFloat(e.target.value) || 0;
                        setHours(updated);
                      }}
                      placeholder="Hrs"
                      className="col-span-2 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-center"
                    />
                    <input
                      type="text"
                      value={dailyJobNumbers[i]}
                      onChange={(e) => {
                        const updated = [...dailyJobNumbers];
                        updated[i] = e.target.value;
                        setDailyJobNumbers(updated);
                      }}
                      placeholder={jobNumber || 'Job #'}
                      className="col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={dailyLocations[i]}
                      onChange={(e) => {
                        const updated = [...dailyLocations];
                        updated[i] = e.target.value;
                        setDailyLocations(updated);
                      }}
                      placeholder={location || 'Location'}
                      className="col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={dailyForemen[i]}
                      onChange={(e) => {
                        const updated = [...dailyForemen];
                        updated[i] = e.target.value;
                        setDailyForemen(updated);
                      }}
                      placeholder={foremanName || 'Foreman'}
                      className="col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Total: {hours.reduce((a, b) => a + b, 0).toFixed(2)} hours
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAndSubmit}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
              {saving ? 'Submitting...' : 'Save & Submit'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/timesheets/${params.id}`)}
              className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
