'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Save, Send, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { Navbar } from '@/components/navbar';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function getWeekDates(startDate: string) {
  const dates: { date: string; dayOfWeek: string }[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push({
      date: d.toISOString().split('T')[0],
      dayOfWeek: DAYS[i],
    });
  }
  return dates;
}

export default function NewTimesheetPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [payPeriodStart, setPayPeriodStart] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [location, setLocation] = useState('');
  const [foremanName, setForemanName] = useState('');
  const [hours, setHours] = useState<number[]>(new Array(7).fill(0));
  const [dailyJobNumbers, setDailyJobNumbers] = useState<string[]>(new Array(7).fill(''));
  const [dailyLocations, setDailyLocations] = useState<string[]>(new Array(7).fill(''));
  const [dailyForemen, setDailyForemen] = useState<string[]>(new Array(7).fill(''));
  const [showDailyOverrides, setShowDailyOverrides] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    router.push('/login');
    return null;
  }

  const buildPayload = () => {
    if (!payPeriodStart) return null;
    if (!jobNumber.trim()) return null;
    if (!location.trim()) return null;
    const weekDates = getWeekDates(payPeriodStart);
    const endDate = weekDates[6].date;
    const dailyHours = weekDates.map((wd, i) => ({
      date: wd.date,
      dayOfWeek: wd.dayOfWeek,
      hours: hours[i],
      ...(dailyJobNumbers[i] ? { jobNumber: dailyJobNumbers[i] } : {}),
      ...(dailyLocations[i] ? { location: dailyLocations[i] } : {}),
      ...(dailyForemen[i] ? { foremanName: dailyForemen[i] } : {}),
    }));
    return {
      payPeriodType: 'WEEKLY',
      payPeriodStart,
      payPeriodEnd: endDate,
      jobNumber: jobNumber.trim(),
      location: location.trim(),
      foremanName: foremanName || undefined,
      dailyHours,
    };
  };

  const handleSaveDraft = async () => {
    setError('');
    if (!payPeriodStart) { setError('Please select a period start date'); return; }
    if (!jobNumber.trim()) { setError('Job number is required'); return; }
    if (!location.trim()) { setError('Location is required'); return; }
    setLoading(true);
    try {
      const payload = buildPayload();
      await api.post('/timesheets', payload);
      toast.success('Timesheet saved as draft');
      router.push('/timesheets');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save timesheet');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    setError('');
    if (!payPeriodStart) { setError('Please select a period start date'); return; }
    if (!jobNumber.trim()) { setError('Job number is required'); return; }
    if (!location.trim()) { setError('Location is required'); return; }
    setLoading(true);
    try {
      const payload = buildPayload();
      const res = await api.post('/timesheets', payload);
      const tsId = res.data.id;
      await api.post(`/timesheets/${tsId}/submit`);
      toast.success('Timesheet submitted for approval');
      router.push('/timesheets');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit timesheet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <button onClick={() => router.push('/timesheets')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Timesheets
        </button>
        <h1 className="text-2xl font-bold tracking-tight mb-6">New Timesheet</h1>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Period Start (Monday)</label>
              <input
                type="date"
                value={payPeriodStart}
                onChange={(e) => setPayPeriodStart(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
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
                {DAYS.map((day, i) => (
                  <div key={day} className="space-y-1 text-center">
                    <label className="text-xs font-medium text-muted-foreground">
                      {day.slice(0, 3)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      value={hours[i]}
                      onChange={(e) => {
                        const newHours = [...hours];
                        newHours[i] = parseFloat(e.target.value) || 0;
                        setHours(newHours);
                      }}
                      className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-center"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {DAYS.map((day, i) => (
                  <div key={day} className="grid grid-cols-12 gap-2 items-center rounded-md border p-2">
                    <span className="col-span-1 text-xs font-medium text-muted-foreground">{day.slice(0, 3)}</span>
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
              disabled={loading}
              onClick={handleSaveDraft}
              className="flex items-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSaveAndSubmit}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Submitting...' : 'Save & Submit'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/timesheets')}
              className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
