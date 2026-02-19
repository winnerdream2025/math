'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Clock,
  Users,
  Download,
  UserCircle,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    logout();
    toast.success('Logged out');
    window.location.href = '/login';
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const navLinkClass = (href: string) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive(href)
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    }`;

  const adminLinks = user?.role === 'ADMIN';

  return (
    <nav className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold transition-transform group-hover:scale-105">
            MF
          </div>
          <div className="hidden sm:block">
            <span className="text-base font-bold tracking-tight">Math & Fils</span>
            <span className="block text-[10px] leading-none text-muted-foreground -mt-0.5">Timesheet</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {adminLinks && (
            <Link href="/dashboard" className={navLinkClass('/dashboard')}>
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          )}
          <Link href="/timesheets" className={navLinkClass('/timesheets')}>
            <Clock className="h-4 w-4" />
            Timesheets
          </Link>
          {adminLinks && (
            <Link href="/users" className={navLinkClass('/users')}>
              <Users className="h-4 w-4" />
              Users
            </Link>
          )}
          {adminLinks && (
            <Link href="/exports" className={navLinkClass('/exports')}>
              <Download className="h-4 w-4" />
              Export
            </Link>
          )}
        </div>

        {/* Desktop user section */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/profile"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive('/profile')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="text-left">
              <span className="block text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</span>
              <span className="block text-[10px] text-muted-foreground leading-tight mt-0.5">{user?.role}</span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline">Logout</span>
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg hover:bg-accent transition-colors"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-card animate-in slide-in-from-top-2 duration-200">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {/* Mobile user info */}
            <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg bg-muted/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-muted-foreground">{user?.role}</p>
              </div>
            </div>
            {adminLinks && (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className={navLinkClass('/dashboard')}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}
            <Link href="/timesheets" onClick={() => setMobileOpen(false)} className={navLinkClass('/timesheets')}>
              <Clock className="h-4 w-4" />
              Timesheets
            </Link>
            {adminLinks && (
              <Link href="/users" onClick={() => setMobileOpen(false)} className={navLinkClass('/users')}>
                <Users className="h-4 w-4" />
                Users
              </Link>
            )}
            {adminLinks && (
              <Link href="/exports" onClick={() => setMobileOpen(false)} className={navLinkClass('/exports')}>
                <Download className="h-4 w-4" />
                Export
              </Link>
            )}
            <div className="border-t my-2" />
            <Link href="/profile" onClick={() => setMobileOpen(false)} className={navLinkClass('/profile')}>
              <UserCircle className="h-4 w-4" />
              Profile
            </Link>
            <button
              onClick={() => { setMobileOpen(false); handleLogout(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
