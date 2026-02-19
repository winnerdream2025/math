'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  CheckCircle2,
  X,
  AlertTriangle,
  Mail,
  RefreshCw,
  XCircle,
  Clock,
  Send,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { Navbar } from '@/components/navbar';

export default function UsersPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [invitationSent, setInvitationSent] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    employeeNumber: '',
    role: 'EMPLOYEE',
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      const data = res.data.data || res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    setInvitationsLoading(true);
    try {
      const res = await api.get('/invitations');
      setInvitations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to fetch invitations');
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    fetchUsers();
    fetchInvitations();
  }, [token, user, router]);

  const handleResend = async (id: string) => {
    try {
      await api.post(`/invitations/${id}/resend`);
      toast.success('Invitation resent!');
      fetchInvitations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend invitation');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.patch(`/invitations/${id}/revoke`);
      toast.success('Invitation revoked');
      fetchInvitations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revoke invitation');
    }
  };

  const pendingInvitations = invitations.filter((i) => i.status === 'PENDING');

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/users/${id}/status`, { isActive: !isActive });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isActive: !isActive } : u)),
      );
      toast.success(isActive ? 'User deactivated' : 'User activated');
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.firstName || !form.lastName) {
      toast.error('Email, first name, and last name are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
      };
      if (form.employeeNumber.trim()) payload.employeeNumber = form.employeeNumber.trim();
      const res = await api.post('/invitations', payload);
      setInvitationSent(res.data);
      toast.success('Invitation sent!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    if (invitationSent) fetchInvitations();
    setShowAddModal(false);
    setInvitationSent(null);
    setForm({ email: '', firstName: '', lastName: '', employeeNumber: '', role: 'EMPLOYEE' });
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setConfirmDeleteId(null);
      toast.success('User deleted');
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const filtered = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.employeeNumber?.toLowerCase().includes(q)
    );
  });

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{users.length} users · {pendingInvitations.length} pending invitations</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors self-start"
          >
            <Send className="h-4 w-4" />
            Invite Employee
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b mb-5">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'invitations'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="h-4 w-4" />
            Invitations
            {pendingInvitations.length > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5">
                {pendingInvitations.length}
              </span>
            )}
          </button>
        </div>

        {/* Search (users tab only) */}
        {activeTab === 'users' && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or employee number..."
              className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
            />
          </div>
        )}

        {/* ─── INVITATIONS TAB ─── */}
        {activeTab === 'invitations' && (
          <div>
            {invitationsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-lg mb-1">No invitations yet</p>
                <p className="text-sm">Click "Invite Employee" to send the first invitation.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Invitee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Sent</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Expires</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-card">
                      {invitations.map((inv) => {
                        const isExpired = inv.status === 'PENDING' && new Date(inv.expiresAt) < new Date();
                        const statusColor = inv.status === 'USED' ? 'bg-green-50 text-green-700'
                          : inv.status === 'REVOKED' ? 'bg-red-50 text-red-700'
                          : isExpired ? 'bg-orange-50 text-orange-700'
                          : 'bg-blue-50 text-blue-700';
                        const statusLabel = isExpired ? 'EXPIRED' : inv.status;
                        return (
                          <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xs font-bold shrink-0">
                                  {inv.firstName?.[0]}{inv.lastName?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{inv.firstName} {inv.lastName}</p>
                                  <p className="text-xs text-muted-foreground">{inv.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${inv.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                                {inv.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
                                {statusLabel === 'PENDING' && <Clock className="h-3 w-3" />}
                                {statusLabel === 'USED' && <CheckCircle2 className="h-3 w-3" />}
                                {statusLabel === 'REVOKED' && <XCircle className="h-3 w-3" />}
                                {statusLabel === 'EXPIRED' && <AlertTriangle className="h-3 w-3" />}
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {inv.status === 'PENDING' && !isExpired && (
                                  <>
                                    <button
                                      onClick={() => handleResend(inv.id)}
                                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                      Resend
                                    </button>
                                    <button
                                      onClick={() => handleRevoke(inv.id)}
                                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Revoke
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {invitations.map((inv) => {
                    const isExpired = inv.status === 'PENDING' && new Date(inv.expiresAt) < new Date();
                    const statusColor = inv.status === 'USED' ? 'bg-green-50 text-green-700'
                      : inv.status === 'REVOKED' ? 'bg-red-50 text-red-700'
                      : isExpired ? 'bg-orange-50 text-orange-700'
                      : 'bg-blue-50 text-blue-700';
                    const statusLabel = isExpired ? 'EXPIRED' : inv.status;
                    return (
                      <div key={inv.id} className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-sm font-bold shrink-0">
                            {inv.firstName?.[0]}{inv.lastName?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{inv.firstName} {inv.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${inv.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                            {inv.role}
                          </span>
                          <span>Sent {new Date(inv.createdAt).toLocaleDateString()}</span>
                          <span>· Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                        </div>
                        {inv.status === 'PENDING' && !isExpired && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResend(inv.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Resend
                            </button>
                            <button
                              onClick={() => handleRevoke(inv.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Revoke
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── USERS TAB ─── */}
        {activeTab === 'users' && (
        <>
        {/* Users table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-card">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {u.role === 'ADMIN' ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.employeeNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => toggleActive(u.id, u.isActive)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          u.isActive
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {u.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {u.id !== user?.id && (
                        confirmDeleteId === u.id ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => handleDelete(u.id)} className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs text-white font-medium hover:bg-red-700 transition-colors">
                              <AlertTriangle className="h-3 w-3" />
                              Confirm
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border px-2.5 py-1.5 text-xs hover:bg-accent transition-colors">Cancel</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(u.id)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filtered.map((u) => (
            <div key={u.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                  {u.role === 'ADMIN' ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                  {u.role}
                </span>
                {u.employeeNumber && <span className="text-xs text-muted-foreground">#{u.employeeNumber}</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(u.id, u.isActive)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                    u.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {u.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
                {u.id !== user?.id && (
                  confirmDeleteId === u.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(u.id)} className="rounded-lg bg-red-600 px-3 py-2 text-xs text-white font-medium">Confirm</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border px-3 py-2 text-xs">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(u.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-1">No users found</p>
            <p className="text-sm">Try adjusting your search query.</p>
          </div>
        )}
        </>
        )}
      </main>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={resetModal}>
          <div className="bg-card border rounded-xl p-6 w-full max-w-md shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            {!invitationSent ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold">Invite Employee</h3>
                  </div>
                  <button onClick={resetModal} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleInviteEmployee} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">First Name *</label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Last Name *</label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                      placeholder="employee@mathfils.com"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Employee #</label>
                      <input
                        type="text"
                        value={form.employeeNumber}
                        onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                        placeholder="EMP-001"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Role</label>
                      <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                      >
                        <option value="EMPLOYEE">Employee</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">An activation email will be sent to set up their password.</p>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={resetModal} className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
                    <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {submitting ? 'Sending...' : 'Send Invitation'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-5">
                  <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Invitation Sent!</h3>
                  <p className="text-sm text-muted-foreground mt-1">An activation email has been sent.</p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{invitationSent.firstName} {invitationSent.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{invitationSent.email}</span>
                  </div>
                  {invitationSent.employeeNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Employee #</span>
                      <span className="font-medium">{invitationSent.employeeNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium">{invitationSent.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                      {invitationSent.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="font-medium text-xs">{new Date(invitationSent.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs text-blue-800">
                    The employee will receive an email with a link to set their password and activate their account. The link expires in 7 days.
                  </p>
                </div>

                <button onClick={resetModal} className="w-full mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
