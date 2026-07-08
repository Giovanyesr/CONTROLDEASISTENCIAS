'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, ShieldCheck, GraduationCap, UserCircle, Eye, EyeOff, Loader2, Plus, BookOpen, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const gradosDisponibles = ['1°', '2°', '3°', '4°', '5°'];
const seccionesDisponibles = ['A'];

const roleConfig: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: 'Administradores', color: 'text-red-600 bg-red-50 border-red-200', icon: ShieldCheck },
  director: { label: 'Directores', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: UserCircle },
  tutor: { label: 'Tutores', color: 'text-green-600 bg-green-50 border-green-200', icon: BookOpen },
  brigadier: { label: 'Brigadieres', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: ShieldCheck },
  alumno: { label: 'Estudiantes', color: 'text-sky-600 bg-sky-50 border-sky-200', icon: GraduationCap },
};

const roleLabels: Record<string, string> = {
  admin: 'Administrador', director: 'Director', tutor: 'Tutor', brigadier: 'Brigadier', alumno: 'Estudiante',
};

export default function RolesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('director');

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<any>({ dni: '', nombres: '', apellidos: '', celular: '', genero: '', grado: '', seccion: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tutor assignment
  const [tutorAssignOpen, setTutorAssignOpen] = useState(false);
  const [assignTutorId, setAssignTutorId] = useState<string | null>(null);
  const [assignGrado, setAssignGrado] = useState('');
  const [assignSeccion, setAssignSeccion] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.rol !== 'admin' && !['75185427', '30916'].includes(user.dni))) {
      router.replace('/dashboard');
      return;
    }
    fetchUsers(activeTab);
  }, [user, authLoading, activeTab]);

  const fetchUsers = async (rol: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usuarios?rol=${rol}`, {
        headers: { 'x-admin-dni': user?.dni || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.dni || form.dni.length !== 8) { toast.error('DNI debe tener 8 dígitos'); return; }
    if (!form.nombres || !form.apellidos) { toast.error('Nombres y apellidos requeridos'); return; }
    if (!form.password || form.password.length < 6) { toast.error('Contraseña mínimo 6 caracteres'); return; }
    if (activeTab === 'tutor' && !form.grado) { toast.error('Selecciona un grado'); return; }
    if (activeTab === 'tutor' && !form.seccion) { toast.error('Selecciona una sección'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/crear-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminDni: user?.dni,
          ...form,
          rol: activeTab,
          genero: form.genero || null,
          grado: form.grado || null,
          seccion: form.seccion || null,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(`${roleLabels[activeTab]} creado correctamente`);
      setCreateOpen(false);
      setForm({ dni: '', nombres: '', apellidos: '', celular: '', genero: '', grado: '', seccion: '', password: '' });
      fetchUsers(activeTab);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
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
      toast.success('Tutor asignado correctamente');
      setTutorAssignOpen(false);
      fetchUsers(activeTab);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/auth/eliminar-alumno?id=${uid}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Usuario eliminado');
      fetchUsers(activeTab);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center gap-2 py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Cargando...</span></div>;

  const currentRole = roleConfig[activeTab];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Roles</h1>
          <p className="text-sm text-muted-foreground">Administra todos los usuarios del sistema</p>
        </div>
        <Button onClick={() => { setForm({ dni: '', nombres: '', apellidos: '', celular: '', genero: '', grado: '', seccion: '', password: '' }); setCreateOpen(true); }} className="gap-2 rounded-xl btn-press">
          <Plus className="h-4 w-4" /> Nuevo {roleLabels[activeTab]}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in-up">
        <TabsList className="grid w-full grid-cols-5 rounded-xl">
          {Object.entries(roleConfig).map(([key, cfg]) => (
            <TabsTrigger key={key} value={key} className="gap-2 rounded-lg text-xs sm:text-sm">
              <cfg.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{cfg.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.keys(roleConfig).map((key) => (
          <TabsContent key={key} value={key} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Cargando...</span>
              </div>
            ) : users.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-foreground">No hay {currentRole.label.toLowerCase()}</p>
                  <p className="text-sm text-muted-foreground">Crea el primer {roleLabels[key]} con el botón superior</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {users.map((u: any) => (
                  <Card key={u.id} className="card-hover-lift">
                    <CardContent className="flex items-center gap-4 p-4">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        {u.foto_url ? <AvatarImage src={u.foto_url} alt="" /> : (
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-xs font-bold text-primary-foreground">
                            {u.nombres?.charAt(0)}{u.apellidos?.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{u.apellidos} {u.nombres}</p>
                        <p className="text-xs text-muted-foreground">DNI: {u.dni} {u.alumno?.grado ? `· ${u.alumno.grado} · Sec. ${u.alumno.seccion}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {key === 'tutor' && (
                          <Button variant="outline" size="sm" className="gap-1 rounded-lg text-xs" onClick={() => { setAssignTutorId(u.id); setAssignGrado(u.alumno?.grado || ''); setAssignSeccion(u.alumno?.seccion || ''); setTutorAssignOpen(true); }}>
                            <BookOpen className="h-3 w-3" /> Asignar
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg" onClick={() => handleDeleteUser(u.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo {roleLabels[activeTab]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input placeholder="12345678" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} maxLength={8} />
              </div>
              <div className="space-y-2">
                <Label>Celular (opcional)</Label>
                <Input placeholder="999888777" value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value.replace(/\D/g, '').slice(0, 9) })} maxLength={9} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Género (opcional)</Label>
              <select value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="">Seleccionar...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombres</Label>
                <Input placeholder="Carlos" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Apellidos</Label>
                <Input placeholder="Rodríguez" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
              </div>
            </div>
            {activeTab !== 'director' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grado</Label>
                  <Select value={form.grado} onValueChange={(v) => setForm({ ...form, grado: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {gradosDisponibles.map(g => <SelectItem key={g} value={g}>{g} Grado</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sección</Label>
                  <Select value={form.seccion} onValueChange={(v) => setForm({ ...form, seccion: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {seccionesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <div className="relative">
                <Input type={showPwd ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-11" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Creando...' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tutor Assignment Dialog */}
      <Dialog open={tutorAssignOpen} onOpenChange={setTutorAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar Tutor a Grado/Sección</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Grado</Label>
              <Select value={assignGrado} onValueChange={setAssignGrado}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {gradosDisponibles.map(g => <SelectItem key={g} value={g}>{g} Grado</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sección</Label>
              <Select value={assignSeccion} onValueChange={setAssignSeccion}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {seccionesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setTutorAssignOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleAssignTutor} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Asignando...' : 'Asignar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
