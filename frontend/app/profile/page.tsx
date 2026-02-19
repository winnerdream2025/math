'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Mail, Shield, Hash, Calendar, Clock, KeyRound, Save } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { Navbar } from '@/components/navbar';

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, setAuth } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/me');
        setProfile(res.data);
        setFirstName(res.data.firstName || '');
        setLastName(res.data.lastName || '');
      } catch (err) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/users/me', { firstName, lastName });
      setProfile(res.data);
      if (user) {
        setAuth(token!, { ...user, firstName: res.data.firstName, lastName: res.data.lastName });
      }
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
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
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <h1 className="text-2xl font-bold tracking-tight mb-6">My Profile</h1>

        {/* Avatar + name header */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="relative px-6 py-6 flex items-center gap-4 border-b overflow-hidden">
            <img src="/images/fmf_DjDaj3Q.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-10" />
            <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold shrink-0">
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
            <div className="relative z-10">
              <p className="text-lg font-semibold">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Info rows */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Email</p>
                  <p className="text-sm font-medium truncate">{profile?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Role</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${
                    profile?.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {profile?.role}
                  </span>
                </div>
              </div>

              {profile?.employeeNumber && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employee Number</p>
                    <p className="text-sm font-medium">{profile.employeeNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Edit form */}
            <form onSubmit={handleSave} className="space-y-4 border-t pt-5">
              <p className="text-sm font-semibold">Edit Information</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Update Profile'}
              </button>
            </form>

            {/* Security section */}
            <div className="border-t pt-5">
              <p className="text-sm font-semibold mb-3">Security</p>
              <Link
                href="/change-password"
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your account password</p>
                </div>
              </Link>
            </div>

            {/* Metadata */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
              </div>
              {profile?.lastLoginAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Last login: {new Date(profile.lastLoginAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
