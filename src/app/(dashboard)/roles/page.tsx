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
  BookOpen, Trash2, Pencil, Search, Users, MoreVertical, RefreshCw, UserCheck, Power,
} from 'lucide-react';
import toast from 'react-hot-toast';

const gradosDisponibles = ['1°', '2°', '3°', '4°', '5°'];
const seccionesDisponibles = ['Único'];

const roleConfig: Record<string, { label: string; icon: any; empty: string; emptyDesc: string }> = {
  admin: { label: 'Administradores', icon: ShieldCheck, empty: 'No hay administradores', emptyDesc: 'Aún no has registrado ningún administrador en el sistema.' },
  director: { label: 'Directores', icon: UserCircle, empty: 'No hay directores', emptyDesc: 'Aún no has registrado ningún director en el sistema.' },
  tutor: { label: 'Tutores', icon: BookOpen, empty: 'No hay tutores', emptyDesc: 'Aún no has registrado ningún tutor en el sistema.' },
  brigadier: { label: 'Brigadieres', icon: ShieldCheck, empty: 'No hay brigadieres', emptyDesc: 'Aún no has registrado ningún brigadier en el sistema.' },
  alumno: { label: 'Estudiantes', icon: GraduationCap, empty: 'No hay estudiantes', emptyDesc: 'Aún no has registrado ningún estudiante en el sistema.' },
};

const rolSingular: Record<string, string> = {
  admin: 'Administrador', director: 'Director', tutor: 'Tutor', brigadier: 'Brigadier', alumno: 'Estudiante',
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

export default function RolesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('brigadier');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<any>({ dni: '', nombres: '', apellidos: '', celular: '', genero: '', grado: '', seccion: '', password: '' });
  const [asignaciones, setAsignaciones] = useState<{ grado: string; seccion: string }[]>([]);
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({ nombres: '', apellidos: '', celular: '', genero: '', estado: '', grado: '', seccion: '' });
  const [editAsignaciones, setEditAsignaciones] = useState<{ id?: string; grado: string; seccion: string }[]>([]);
  const [editGrado, setEditGrado] = useState('');
  const [editSeccion, setEditSeccion] = useState('');

  // Tutor assignment
  const [tutorAssignOpen, setTutorAssignOpen] = useState(false);
  const [assignTutorId, setAssignTutorId] = useState<string | null>(null);
  const [assignGrado, setAssignGrado] = useState('');
  const [assignSeccion, setAssignSeccion] = useState('');
  const [tutorAsignaciones, setTutorAsignaciones] = useState<any[]>([]);

  const esAdmin = !authLoading && user?.rol === 'admin';

  const fetchUsers = useCallback(async (rol: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/usuarios?rol=${rol}`);
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
    fetchUsers(activeTab);
  }, [user, authLoading, activeTab, esAdmin, router, fetchUsers]);

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
    setAsignaciones([]);
    setSearch('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.dni || form.dni.length !== 8) { toast.error('El DNI debe tener 8 digitos'); return; }
    if (!form.nombres || !form.apellidos) { toast.error('Completa nombres y apellidos'); return; }
    if (!form.password || form.password.length < 6) { toast.error('La contrasena debe tener minimo 6 caracteres'); return; }
    if (activeTab !== 'director' && activeTab !== 'admin') {
      if (activeTab === 'tutor') {
        if (asignaciones.length === 0) { toast.error('Agrega al menos un grado/seccion'); return; }
      } else {
        if (!form.grado || !form.seccion) { toast.error('Selecciona grado y seccion'); return; }
      }
    }

    setSubmitting(true);
    try {
      const payload: any = { ...form, rol: activeTab, genero: form.genero || null, grado: form.grado || null, seccion: form.seccion || null };
      if (activeTab === 'tutor') {
        payload.asignaciones = asignaciones;
        delete payload.grado;
        delete payload.seccion;
      }
      const res = await fetch('/api/auth/crear-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(`${rolSingular[activeTab]} creado correctamente`);
      setCreateOpen(false);
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
        body: JSON.stringify({ id: editTarget.id, ...editForm }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }

      if (activeTab === 'tutor') {
        for (const a of editAsignaciones) {
          if (!a.id) {
            const r = await fetch('/api/tutores/asignar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tutor_id: editTarget.id, asignaciones: [{ grado: a.grado, seccion: a.seccion }] }),
            });
            if (!r.ok) { const err = await r.json(); toast.error(err.error); }
          }
        }
      }

      toast.success('Usuario actualizado correctamente');
      setEditOpen(false);
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
        body: JSON.stringify({ id: u.id, estado: nuevo }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(nuevo === 'activo' ? 'Usuario activado' : 'Usuario desactivado');
      fetchUsers(activeTab);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggleBrigadier = async (u: any) => {
    const actual = u.roles_funcionales?.some((r: any) => r.rol === 'brigadier' && r.activo);
    try {
      const res = await fetch('/api/auth/asignar-brigadier', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: u.id, activo: !actual }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(actual ? 'Rol funcional retirado' : 'Rol funcional brigadier asignado');
      fetchUsers(activeTab);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteUser = async (u: any) => {
    if (!confirm(`¿Eliminar a ${u.nombres} ${u.apellidos}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/auth/eliminar-alumno?id=${u.id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Usuario eliminado correctamente');
      fetchUsers(activeTab);
    } catch (err: any) { toast.error(err.message); }
  };

  const fetchTutorAsignaciones = async (tutorId: string) => {
    const res = await fetch(`/api/tutores/asignar?tutor_id=${tutorId}`);
    if (res.ok) setTutorAsignaciones(await res.json());
  };

  const handleAssignTutor = async () => {
    if (!assignGrado || !assignSeccion) { toast.error('Selecciona grado y seccion'); return; }
    if (tutorAsignaciones.length >= 3) { toast.error('El tutor ya tiene 3 grados asignados'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/tutores/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutor_id: assignTutorId, asignaciones: [{ grado: assignGrado, seccion: assignSeccion }] }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Docente asignado correctamente');
      setAssignGrado('');
      setAssignSeccion('');
      fetchTutorAsignaciones(assignTutorId!);
      fetchUsers(activeTab);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleRemoveAsignacion = async (id: string) => {
    if (!confirm('Eliminar esta asignacion?')) return;
    try {
      const res = await fetch('/api/tutores/asignar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Asignacion eliminada');
      if (assignTutorId) fetchTutorAsignaciones(assignTutorId);
      if (editTarget) {
        const r = await fetch(`/api/tutores/asignar?tutor_id=${editTarget.id}`);
        if (r.ok) setEditAsignaciones(await r.json());
      }
      fetchUsers(activeTab);
    } catch (err: any) { toast.error(err.message); }
  };

  if (authLoading) return <div className="flex items-center justify-center gap-2 py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Cargando...</span></div>;

  const current = roleConfig[activeTab];
  const CurrentIcon = current.icon;
  const tabKeys = Object.keys(roleConfig);

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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Administra los usuarios, perfiles y accesos del sistema.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-lg btn-press self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Nuevo {rolSingular[activeTab]}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in-up">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex w-max gap-1 rounded-xl bg-muted p-1">
            {tabKeys.map((key) => {
              const Icon = roleConfig[key].icon;
              return (
                <TabsTrigger key={key} value={key} className="gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors">
                  <Icon className="h-4 w-4" />
                  <span>{roleConfig[key].label}</span>
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
                    <p className="text-base font-semibold text-foreground">No pudimos cargar los {roleConfig[key].label.toLowerCase()}</p>
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
                    <p className="text-base font-semibold text-foreground">{current.empty}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{current.emptyDesc}</p>
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
                        <TableHead className="font-semibold text-foreground/70">Grado / Sección</TableHead>
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
                              <p className="text-xs text-muted-foreground">No se encontró ningún usuario con &quot;{search}&quot;</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filtered.map((u: any) => (
                        <TableRow key={u.id} className="group transition-colors hover:bg-muted/40">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 ring-1 ring-border">
                                {u.foto_url ? <AvatarImage src={`/api/fotos/${u.id}`} alt="" /> : (
                                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-xs font-bold text-primary-foreground">
                                    {u.nombres?.charAt(0)}{u.apellidos?.charAt(0)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{u.apellidos} {u.nombres}</p>
                                <p className="truncate text-xs text-muted-foreground">{u.genero ? u.genero[0].toUpperCase() + u.genero.slice(1) : '—'}</p>
                                {u.roles_funcionales?.some((r: any) => r.rol === 'brigadier' && r.activo) && <Badge variant="outline" className="mt-1 rounded-md px-1.5 py-0 text-[10px] text-amber-700">Brigadier funcional</Badge>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">{u.dni}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.dni}@colegio.local</TableCell>
                          <TableCell className="text-sm">
                            {key === 'tutor' ? (
                              u.asignaciones && u.asignaciones.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {u.asignaciones.map((a: any, i: number) => (
                                    <Badge key={i} variant="secondary" className="rounded-md font-medium">{a.grado} · {a.seccion}</Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground/60">Sin grado asignado</span>
                              )
                            ) : u.alumno?.grado ? (
                              <Badge variant="secondary" className="rounded-md font-medium">{u.alumno.grado} · {u.alumno.seccion}</Badge>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </TableCell>
                          <TableCell>{estadoBadge(u.estado)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {key === 'tutor' && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Asignar grado/seccion" onClick={() => { setAssignTutorId(u.id); setTutorAsignaciones([]); setTutorAssignOpen(true); fetchTutorAsignaciones(u.id); }}>
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
                                  <DropdownMenuItem className="gap-2 rounded-lg" onClick={async () => {
                                    setEditTarget(u);
                                    setEditForm({ nombres: u.nombres, apellidos: u.apellidos, celular: u.celular || '', genero: u.genero || '', estado: u.estado || 'activo', grado: u.alumno?.grado || '', seccion: u.alumno?.seccion || '' });
                                    if (activeTab === 'tutor') {
                                      const res = await fetch(`/api/tutores/asignar?tutor_id=${u.id}`);
                                      if (res.ok) setEditAsignaciones(await res.json());
                                      else setEditAsignaciones([]);
                                    } else {
                                      setEditAsignaciones([]);
                                    }
                                    setEditGrado('');
                                    setEditSeccion('');
                                    setEditOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => handleToggleEstado(u)}>
                                    <Power className="h-4 w-4" /> {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                                  </DropdownMenuItem>
                                  {key === 'alumno' && <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => handleToggleBrigadier(u)}>
                                    <ShieldCheck className="h-4 w-4" /> {u.roles_funcionales?.some((r: any) => r.rol === 'brigadier' && r.activo) ? 'Quitar brigadier' : 'Asignar brigadier'}
                                  </DropdownMenuItem>}
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
            {activeTab !== 'director' && activeTab !== 'admin' && activeTab !== 'tutor' && (
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
                  <Label>Seccion</Label>
                  <Select value={form.seccion} onValueChange={(v) => setForm({ ...form, seccion: v })}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {seccionesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {activeTab === 'tutor' && (
              <div className="space-y-3">
                <Label>Grados asignados (maximo 3)</Label>
                {asignaciones.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="min-w-[60px] text-sm font-medium text-foreground">{a.grado} · {a.seccion}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => setAsignaciones(asignaciones.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {asignaciones.length < 3 && (
                  <div className="flex gap-2">
                    <Select value={form.grado} onValueChange={(v) => setForm({ ...form, grado: v })}>
                      <SelectTrigger className="h-9 rounded-lg w-32"><SelectValue placeholder="Grado" /></SelectTrigger>
                      <SelectContent>
                        {gradosDisponibles.filter(g => !asignaciones.some(a => a.grado === g)).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={form.seccion} onValueChange={(v) => setForm({ ...form, seccion: v })}>
                      <SelectTrigger className="h-9 rounded-lg w-28"><SelectValue placeholder="Seccion" /></SelectTrigger>
                      <SelectContent>
                        {seccionesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg gap-1" disabled={!form.grado || !form.seccion}
                      onClick={() => {
                        if (form.grado && form.seccion && !asignaciones.some(a => a.grado === form.grado && a.seccion === form.seccion)) {
                          setAsignaciones([...asignaciones, { grado: form.grado, seccion: form.seccion }]);
                          setForm({ ...form, grado: '', seccion: '' });
                        }
                      }}>
                      <Plus className="h-3.5 w-3.5" /> Agregar
                    </Button>
                  </div>
                )}
                {asignaciones.length === 0 && <p className="text-xs text-muted-foreground">Selecciona un grado y seccion, luego haz clic en Agregar</p>}
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
            {activeTab !== 'director' && activeTab !== 'admin' && activeTab !== 'tutor' && (
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
                  <Label>Seccion</Label>
                  <Select value={editForm.seccion} onValueChange={(v) => setEditForm({ ...editForm, seccion: v })}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {seccionesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {activeTab === 'tutor' && (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Grados asignados ({editAsignaciones.length}/3)</Label>
                {editAsignaciones.map((a) => (
                  <div key={a.id || `${a.grado}-${a.seccion}`} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                    <span className="text-sm font-medium">{a.grado} · {a.seccion}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => {
                      if (a.id) {
                        handleRemoveAsignacion(a.id);
                      } else {
                        setEditAsignaciones(editAsignaciones.filter((x) => !(x.grado === a.grado && x.seccion === a.seccion)));
                      }
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {editAsignaciones.length < 3 && (
                  <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                    <div className="flex gap-2">
                      <Select value={editGrado} onValueChange={setEditGrado}>
                        <SelectTrigger className="h-9 rounded-lg w-32"><SelectValue placeholder="Grado" /></SelectTrigger>
                        <SelectContent>
                          {gradosDisponibles.filter(g => !editAsignaciones.some(a => a.grado === g)).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={editSeccion} onValueChange={setEditSeccion}>
                        <SelectTrigger className="h-9 rounded-lg w-28"><SelectValue placeholder="Seccion" /></SelectTrigger>
                        <SelectContent>
                          {seccionesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" className="h-9 rounded-lg gap-1" disabled={!editGrado || !editSeccion}
                        onClick={() => {
                          if (editGrado && editSeccion && !editAsignaciones.some(a => a.grado === editGrado && a.seccion === editSeccion)) {
                            setEditAsignaciones([...editAsignaciones, { grado: editGrado, seccion: editSeccion }]);
                            setEditGrado('');
                            setEditSeccion('');
                          }
                        }}>
                        <Plus className="h-3.5 w-3.5" /> Agregar grado
                      </Button>
                    </div>
                  </div>
                )}
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
            <DialogTitle className="text-xl">Asignar Docente a Grado/Seccion</DialogTitle>
            <DialogDescription>Grados actuales y nueva asignacion.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {tutorAsignaciones.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Grados actuales ({tutorAsignaciones.length}/3)</Label>
                {tutorAsignaciones.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                    <span className="text-sm font-medium">{a.grado} · {a.seccion}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleRemoveAsignacion(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {tutorAsignaciones.length < 3 && (
              <>
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
                  <Label>Seccion</Label>
                  <Select value={assignSeccion} onValueChange={setAssignSeccion}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {seccionesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {tutorAsignaciones.length >= 3 && (
              <p className="text-xs text-muted-foreground text-center py-2">Este docente ya tiene los 3 grados asignados.</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" className="rounded-lg" onClick={() => setTutorAssignOpen(false)}>Cerrar</Button>
            {tutorAsignaciones.length < 3 && (
              <Button className="gap-2 rounded-lg" onClick={handleAssignTutor} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Asignando...' : 'Agregar'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
