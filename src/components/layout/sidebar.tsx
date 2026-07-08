'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  QrCode,
  Users,
  History,
  FileCheck,
  UserCircle,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
  CalendarOff,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'director', 'tutor', 'brigadier', 'alumno'] },
  { href: '/escaner', label: 'Escáner QR', icon: QrCode, roles: ['brigadier'] },
  { href: '/estudiantes', label: 'Estudiantes', icon: Users, roles: ['admin', 'director', 'tutor', 'brigadier'] },
  { href: '/historial', label: 'Historial', icon: History, roles: ['admin', 'director', 'tutor', 'brigadier', 'alumno'] },
  { href: '/justificaciones', label: 'Justificaciones', icon: FileCheck, roles: ['admin', 'director', 'tutor', 'brigadier'] },
  { href: '/perfil', label: 'Mi Perfil', icon: UserCircle, roles: ['admin', 'director', 'tutor', 'brigadier', 'alumno'] },
  { href: '/dias-no-laborables', label: 'Días No Laborables', icon: CalendarOff, roles: ['admin'] },
  { href: '/roles', label: 'Roles', icon: UserCog, roles: ['admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.rol || ''));

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary/40 active:scale-95 hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-card border-r border-border shadow-sidebar transition-all duration-300 ease-out lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col border-b border-border p-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group"
              onClick={() => setOpen(false)}
            >
              <Image
                src="/logo.png"
                alt="Logo"
                width={160}
                height={40}
                className="h-8 w-auto transition-opacity duration-200 group-hover:opacity-80"
                priority
              />
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-foreground lg:hidden"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs font-medium text-primary/60 tracking-wider uppercase">
            I.E. 30916 San Francisco de Asís
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-4">
          {filteredNav.map((item, idx) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 animate-fade-in',
                  active
                    ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground'
                )}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                  active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-transparent group-hover:bg-primary/10'
                )}>
                  <Icon className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-200',
                    !active && 'group-hover:scale-110'
                  )} />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}

        </nav>

        {user && (
          <div className="border-t border-border p-3">
            <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-primary/[0.03] transition-colors">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                {user.foto_url ? (
                  <AvatarImage src={user.foto_url} alt="Foto" className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-xs font-semibold text-primary-foreground">
                    {user.nombres?.charAt(0)}{user.apellidos?.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.nombres} {user.apellidos}
                </p>
                <p className="truncate text-xs capitalize text-muted-foreground/70 flex items-center gap-1">
                  <span className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full',
                    user.rol === 'brigadier' && 'bg-amber-500',
                    user.rol === 'admin' && 'bg-red-500',
                    user.rol === 'director' && 'bg-blue-500',
                    user.rol === 'tutor' && 'bg-green-500',
                    user.rol === 'alumno' && 'bg-sky-500',
                  )} />
                  {user.rol === 'admin' ? 'Administrador' :
                   user.rol === 'director' ? 'Director' :
                   user.rol === 'tutor' ? 'Tutor' :
                   user.rol === 'brigadier' ? 'Brigadier' : 'Alumno'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 rounded-lg text-muted-foreground/70 transition-all duration-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}