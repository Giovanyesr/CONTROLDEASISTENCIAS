'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  ShieldCheck, GraduationCap, UserCircle, Eye, EyeOff, Loader2, Plus,
  BookOpen, Trash2, Pencil, Search, Users, MoreVertical, RefreshCw, UserCheck, Power, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

const gradosDisponibles = ['1°', '2°', '3°', '4°', '5°'];
const seccionesDisponibles = ['Único'];

type RolKey = 'brigadier' | 'tutor' | 'director' | 'alumno';

const secciones: Record<RolKey, { label: string; icon: any; empty: string; emptyDesc: string }> = {
  brigadier: { label: 'Brigadieres', icon: ShieldCheck, empty: 'No hay brigadieres', emptyDesc: 'Aún no has registrado ningún brigadier en el sistema.' },
  tutor: { label: 'Docentes', icon: BookOpen, empty: 'No hay docentes', emptyDesc: 'Aún no has registrado ningún docente en el sistema.' },
  director: { label: 'Directores', icon: UserCircle, empty: 'No hay directores', emptyDesc: 'Aún no has registrado ningún director en el sistema.' },
  alumno: { label: 'Alumnos', icon: GraduationCap, empty: 'No hay alumnos', emptyDesc: 'Aún no has registrado ningún alumno en el sistema.' },
};

const rolSingular: Record<string, string> = {
  brigadier: 'Brigadier', tutor: 'Docente', director: 'Director', alumno: 'Alumno',
};

const estadoBadge = (estado?: string) => {
  const activo = estado === 'activo';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <span className={activo ? 'text-emerald-700' : 'text-red-600'}>{activo ? 'Activo' : 'Inactivo'}</span>
    </span>
  );
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [resumen, setResumen] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<RolKey>('brigadier');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<any>({ dni: '', nombres: '', apellidos: '', celular: '', genero: '', grado: '', seccion: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({ nombres: '', apellidos: '', celular: '', genero: '', estado: '', grado: '', seccion: '' });

  // Tutor assignment
  const [tutorAssignOpen, setTutorAssignOpen] = useState(false);
  const [assignTutorId, setAssignTutorId] = useState<string | null>(null);
  const [assignGrado, setAssignGrado] = useState('');
  const [assignSeccion, setAssignSeccion] = useState('');

  const esAdmin = !authLoading && user && (user.rol === 'admin' || ['75185427', '30916', '00030916'].includes(user.dni));

  const fetchResumen = useCallback(async () => {
    const res = await fetch('/api/admin/resumen', { headers: { 'x-admin-dni': user?.dni || '' } });
    if (res.ok) setResumen(await res.json());
  }, [user]);

  const fetchUsers = useCallback(async (rol: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/usuarios?rol=${rol}`, { headers: { 'x-admin-dni': user?.dni || '' } });
      if (!res.ok) throw new Error('Error');
      setUsers(await res.json());
    } catch {
      setError(true);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!esAdmin) { router.replace('/dashboard'); return; }
    fetchResumen();
    fetchUsers(activeTab);
  }, [user, authLoading, activeTab, esAdmin, router, fetchResumen, fetchUsers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter((u: any) => {
      const correo = `${u.dni}@colegio.local`;
      return `${u.apellidos} ${u.nombres}`.toLowerCase().includes(q)
        || (u.dni || '').includes(q)
        || correo.toLowerCase().includes(q);
    });
  }, [users, search]);

  const openCreate = () => {
    setForm({ dni: '', nombres: '', apellidos: '', celular: '', genero: '', grado: '', seccion: '', password: '' });
    setSearch('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.dni || form.dni.length !== 8) { toast.error('El DNI debe tener 8 dígitos'); return; }
    if (!form.nombres || !form.apellidos) { toast.error('Completa nombres y apellidos'); return; }
    if (!form.password || form.password.length < 6) { toast.error('La contraseña debe tener mínimo 6 caracteres'); return; }
    if (activeTab !== 'director' && (!form.grado || !form.seccion)) { toast.error('Selecciona grado y sección'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/crear-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminDni: user?.dni, ...form, rol: activeTab, genero: form.genero || null, grado: form.grado || null, seccion: form.seccion || null }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(`${rolSingular[activeTab]} creado correctamente`);
      setCreateOpen(false);
      fetchResumen();
      fetchUsers(activeTab);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleSaveEdit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/actualizar-perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, adminDni: user?.dni, ...editForm }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Usuario actualizado correctamente');
      setEditOpen(false);
      fetchResumen();
      fetchUsers(activeTab);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleToggleEstado = async (u: any) => {
    const nuevo = u.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      const res = await fetch('/api/auth/actualizar-perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, adminDni: user?.dni, estado: nuevo }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(nuevo === 'activo' ? 'Usuario activado' : 'Usuario desactivado');
      fetchUsers(activeTab);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteUser = async (u: any) => {
    if (!confirm(`¿Eliminar a ${u.nombres} ${u.apellidos}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/auth/eliminar-alumno?id=${u.id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Usuario eliminado correctamente');
      fetchResumen();
      fetchUsers(activeTab);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAssignTutor = async () => {
    if (!assignGrado || !assignSeccion) { toast.error('Selecciona grado y sección'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/tutores/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminDni: user?.dni, tutor_id: assignTutorId, grado: assignGrado, seccion: assignSeccion }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Docente asignado correctamente');
      setTutorAssignOpen(false);
      fetchUsers(activeTab);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  if (authLoading) return <div className="flex items-center justify-center gap-2 py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Cargando...</span></div>;

  const tabKeys = Object.keys(secciones) as RolKey[];
  const current = secciones[activeTab];
  const CurrentIcon = current.icon;

  const stats = [
    { label: 'Brigadieres', value: resumen?.counts?.brigadier ?? 0, icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Docentes', value: resumen?.counts?.tutor ?? 0, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Directores', value: resumen?.counts?.director ?? 0, icon: UserCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Alumnos', value: resumen?.counts?.alumno ?? 0, icon: GraduationCap, color: 'text-sky-600', bg: 'bg-sky-100' },
    { label: 'Alumnos Activos', value: resumen?.alumnosActivos ?? 0, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Presentes Hoy', value: resumen?.asistenciaHoy?.presentes ?? 0, icon: Activity, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Tardanzas Hoy', value: resumen?.asistenciaHoy?.tardanzas ?? 0, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Faltas Hoy', value: (resumen?.asistenciaHoy?.faltas_justificadas ?? 0) + (resumen?.asistenciaHoy?.faltas_injustificadas ?? 0), icon: Activity, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  const TableSkeleton = () => (
    <Card className="shadow-card overflow-hidden">
      <div className="space-y-0 p-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex items-center gap-4 px-5 ${i !== 5 ? 'border-b border-border/60' : ''}`}>
            <div className="flex items-center gap-3 py-4 flex-1">
              <div className="skeleton skeleton-circle h-10 w-10 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="skeleton skeleton-sm" />
                <div className="skeleton skeleton-md" />
              </div>
            </div>
            <div className="skeleton skeleton-sm hidden md:block w-24" />
            <div className="skeleton skeleton-sm hidden lg:block w-28" />
            <div className="skeleton skeleton-sm w-20" />
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Panel de Administración</h1>
          <p className="mt-1 text-sm text-muted-foreground">Control total de brigadieres, docentes, directores y alumnos.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-lg btn-press self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Nuevo {rolSingular[activeTab]}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-fade-in-up">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-card" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between p-4 sm:p-5">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{s.value}</p>
                  <p className="text-xs font-medium text-muted-foreground/80">{s.label}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RolKey)} className="animate-fade-in-up">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex w-max gap-1 rounded-xl bg-muted p-1">
            {tabKeys.map((key) => {
              const Icon = secciones[key].icon;
              return (
                <TabsTrigger key={key} value={key} className="gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors">
                  <Icon className="h-4 w-4" />
                  <span>{secciones[key].label}</span>
                  <span className="ml-0.5 rounded-md bg-background/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                    {resumen?.counts?.[key] ?? 0}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {tabKeys.map((key) => (
          <TabsContent key={key} value={key} className="mt-6">
            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                    <UserCheck className="h-7 w-7 text-red-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">No pudimos cargar los {secciones[key].label.toLowerCase()}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Verifica la conexión e inténtalo nuevamente.</p>
                  </div>
                  <Button variant="outline" className="gap-2 rounded-lg" onClick={() => fetchUsers(key)}>
                    <RefreshCw className="h-4 w-4" /> Reintentar
                  </Button>
                </CardContent>
              </Card>
            ) : users.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <CurrentIcon className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">{secciones[key].empty}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{secciones[key].emptyDesc}</p>
                  </div>
                  <Button onClick={openCreate} className="mt-1 gap-2 rounded-lg">
                    <Plus className="h-4 w-4" /> Nuevo {rolSingular[key]}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nombre, DNI o correo..."
                      className="pl-9 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground tabular-nums">{filtered.length}</span> de {users.length} registros
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="font-semibold text-foreground/70">Nombre completo</TableHead>
                        <TableHead className="font-semibold text-foreground/70">DNI</TableHead>
                        <TableHead className="font-semibold text-foreground/70">Correo</TableHead>
                        <TableHead className="font-semibold text-foreground/70">Sección</TableHead>
                        <TableHead className="font-semibold text-foreground/70">Estado</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Search className="h-6 w-6 text-muted-foreground/40" />
                              <p className="text-sm font-medium text-foreground">Sin resultados</p>
                              <p className="text-xs text-muted-foreground">No se encontró ningún usuario con "{search}"</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filtered.map((u: any) => (
                        <TableRow key={u.id} className="group transition-colors hover:bg-muted/40">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 ring-1 ring-border">
                                {u.foto_url ? <AvatarImage src={u.foto_url} alt="" /> : (
                                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-xs font-bold text-primary-foreground">
                                    {u.nombres?.charAt(0)}{u.apellidos?.charAt(0)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{u.apellidos} {u.nombres}</p>
                                <p className="truncate text-xs text-muted-foreground">{u.genero ? u.genero[0].toUpperCase() + u.genero.slice(1) : '—'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">{u.dni}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.dni}@colegio.local</TableCell>
                          <TableCell className="text-sm">
                            {u.alumno?.grado ? (
                              <Badge variant="secondary" className="rounded-md font-medium">{u.alumno.grado} · {u.alumno.seccion}</Badge>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </TableCell>
                          <TableCell>{estadoBadge(u.estado)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {key === 'tutor' && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Asignar grado/sección" onClick={() => { setAssignTutorId(u.id); setAssignGrado(u.alumno?.grado || ''); setAssignSeccion(u.alumno?.seccion || ''); setTutorAssignOpen(true); }}>
                                  <BookOpen className="h-4 w-4" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Acciones">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                  <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => { setEditTarget(u); setEditForm({ nombres: u.nombres, apellidos: u.apellidos, celular: u.celular || '', genero: u.genero || '', estado: u.estado || 'activo', grado: u.alumno?.grado || '', seccion: u.alumno?.seccion || '' }); setEditOpen(true); }}>
                                    <Pencil className="h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => handleToggleEstado(u)}>
                                    <Power className="h-4 w-4" /> {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                                  </DropdownMenuItem>
                                  <Separator className="my-1" />
                                  <DropdownMenuItem className="gap-2 rounded-lg text-red-600 focus:text-red-600" onClick={() => handleDeleteUser(u)}>
                                    <Trash2 className="h-4 w-4" /> Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Nuevo {rolSingular[activeTab]}</DialogTitle>
            <DialogDescription>Registra los datos del {rolSingular[activeTab].toLowerCase()}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-dni">DNI</Label>
                <Input id="c-dni" placeholder="12345678" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} maxLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-cel">Celular (opcional)</Label>
                <Input id="c-cel" placeholder="999888777" value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value.replace(/\D/g, '').slice(0, 9) })} maxLength={9} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-nombres">Nombres</Label>
                <Input id="c-nombres" placeholder="Carlos" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-apellidos">Apellidos</Label>
                <Input id="c-apellidos" placeholder="Rodríguez" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-genero">Género (opcional)</Label>
              <select id="c-genero" value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="">Seleccionar...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            {activeTab !== 'director' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grado</Label>
                  <Select value={form.grado} onValueChange={(v) => setForm({ ...form, grado: v })}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {gradosDisponibles.map(g => <SelectItem key={g} value={g}>{g} Grado</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sección</Label>
                  <Select value={form.seccion} onValueChange={(v) => setForm({ ...form, seccion: v })}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {seccionesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="c-pwd">Contraseña</Label>
              <div className="relative">
                <Input id="c-pwd" type={showPwd ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-11 rounded-lg" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1} aria-label="Mostrar contraseña">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" className="rounded-lg" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button className="gap-2 rounded-lg" onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Creando...' : 'Crear usuario'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar {editTarget?.apellidos} {editTarget?.nombres}</DialogTitle>
            <DialogDescription>Actualiza la información del usuario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="e-nombres">Nombres</Label><Input id="e-nombres" value={editForm.nombres} onChange={(e) => setEditForm({ ...editForm, nombres: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="e-apellidos">Apellidos</Label><Input id="e-apellidos" value={editForm.apellidos} onChange={(e) => setEditForm({ ...editForm, apellidos: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="e-cel">Celular</Label><Input id="e-cel" value={editForm.celular} onChange={(e) => setEditForm({ ...editForm, celular: e.target.value.replace(/\D/g, '').slice(0, 9) })} maxLength={9} /></div>
              <div className="space-y-2">
                <Label htmlFor="e-genero">Género</Label>
                <select id="e-genero" value={editForm.genero} onChange={(e) => setEditForm({ ...editForm, genero: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-estado">Estado</Label>
              <select id="e-estado" value={editForm.estado} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            {activeTab !== 'director' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grado</Label>
                  <Select value={editForm.grado} onValueChange={(v) => setEditForm({ ...editForm, grado: v })}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {gradosDisponibles.map(g => <SelectItem key={g} value={g}>{g} Grado</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sección</Label>
                  <Select value={editForm.seccion} onValueChange={(v) => setEditForm({ ...editForm, seccion: v })}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {seccionesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" className="rounded-lg" onClick={() => setEditOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button className="gap-2 rounded-lg" onClick={handleSaveEdit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tutor Assignment Dialog */}
      <Dialog open={tutorAssignOpen} onOpenChange={setTutorAssignOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Asignar Docente a Grado/Sección</DialogTitle>
            <DialogDescription>Selecciona el grado y la sección del docente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Grado</Label>
              <Select value={assignGrado} onValueChange={setAssignGrado}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {gradosDisponibles.map(g => <SelectItem key={g} value={g}>{g} Grado</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sección</Label>
              <Select value={assignSeccion} onValueChange={setAssignSeccion}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {seccionesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" className="rounded-lg" onClick={() => setTutorAssignOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button className="gap-2 rounded-lg" onClick={handleAssignTutor} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Asignando...' : 'Asignar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}