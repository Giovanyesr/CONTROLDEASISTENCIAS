'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BookOpen, Plus, Search, Loader2, ArrowLeft, Trash2, Eye, FileText,
} from 'lucide-react';
import { getPeruDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const tipoOptions = [
  { value: 'general', label: 'General' },
  { value: 'academica', label: 'Académica' },
  { value: 'conducta', label: 'Conducta' },
  { value: 'participacion', label: 'Participación' },
  { value: 'tarea', label: 'Tarea' },
  { value: 'otra', label: 'Otra' },
];

export default function AgendaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const esTutor = user?.rol === 'tutor';
  const esDirector = user?.rol === 'director';

  const [observaciones, setObservaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedObs, setSelectedObs] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tutorGrado, setTutorGrado] = useState('');
  const [tutorSeccion, setTutorSeccion] = useState('');

  const [form, setForm] = useState({
    alumno_dni: '',
    tipo: 'general',
    observacion: '',
    fecha: getPeruDate(),
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const fetchTutorInfo = async () => {
      if (esTutor && user?.id) {
        const { data } = await supabase
          .from('tutor_asignaciones')
          .select('grado, seccion')
          .eq('tutor_id', user.id)
          .maybeSingle();
        if (data) {
          setTutorGrado(data.grado);
          setTutorSeccion(data.seccion);
        }
      }
    };
    fetchTutorInfo();
  }, [esTutor, user?.id]);

  const fetchObservaciones = useCallback(async () => {
    try {
      let query = supabase
        .from('observaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (esTutor && tutorGrado) {
        query = query.eq('grado', tutorGrado);
      } else if (!esDirector) {
        query = query.eq('registrado_por', user?.id);
      }

      const { data } = await query;

      let filtered = data || [];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((o: any) =>
          o.alumno_nombre?.toLowerCase().includes(s) ||
          o.alumno_dni?.includes(s) ||
          o.observacion?.toLowerCase().includes(s)
        );
      }
      if (filtroTipo) {
        filtered = filtered.filter((o: any) => o.tipo === filtroTipo);
      }

      setObservaciones(filtered);
    } catch {
      toast.error('Error al cargar observaciones');
    } finally {
      setLoading(false);
    }
  }, [search, filtroTipo, esTutor, esDirector, tutorGrado, user?.id]);

  useEffect(() => {
    if (tutorGrado || !esTutor) fetchObservaciones();
  }, [fetchObservaciones, tutorGrado, esTutor]);

  const handleCreate = async () => {
    setFormError('');
    if (!form.alumno_dni || form.alumno_dni.length !== 8) { setFormError('DNI debe tener 8 dígitos'); return; }
    if (!form.observacion) { setFormError('La observación es obligatoria'); return; }

    setSubmitting(true);
    try {
      const { data: alumno } = await supabase
        .from('perfiles')
        .select('id, nombres, apellidos')
        .eq('dni', form.alumno_dni)
        .maybeSingle();

      if (!alumno) { setFormError('No se encontró alumno con ese DNI'); setSubmitting(false); return; }

      const { data: alumnoInfo } = await supabase
        .from('alumnos')
        .select('grado, seccion')
        .eq('perfil_id', alumno.id)
        .maybeSingle();

      const { error } = await supabase.from('observaciones').insert({
        alumno_id: alumno.id,
        alumno_nombre: `${alumno.apellidos} ${alumno.nombres}`,
        alumno_dni: form.alumno_dni,
        grado: alumnoInfo?.grado || tutorGrado,
        seccion: alumnoInfo?.seccion || tutorSeccion,
        observacion: form.observacion,
        tipo: form.tipo,
        fecha: form.fecha,
        registrado_por: user?.id,
        registrado_por_nombre: `${user?.apellidos} ${user?.nombres}`,
      });

      if (error) throw error;
      toast.success('Observación registrada');
      setOpen(false);
      setForm({ alumno_dni: '', tipo: 'general', observacion: '', fecha: getPeruDate() });
      fetchObservaciones();
    } catch (err: any) {
      setFormError(err.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('observaciones').delete().eq('id', id);
      if (error) throw error;
      toast.success('Observación eliminada');
      fetchObservaciones();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Agenda Digital</h1>
            <p className="text-sm text-muted-foreground">{observaciones.length} observaciones registradas</p>
          </div>
        </div>
        <Button className="gap-2 rounded-xl btn-press" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva Observación
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI o contenido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-xl border-border bg-background pl-10 text-sm"
              />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="h-10 w-full rounded-xl border-border sm:w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {tipoOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Cargando...</span>
            </div>
          ) : observaciones.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No hay observaciones registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Alumno</TableHead>
                    <TableHead className="font-semibold">Grado</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Observación</TableHead>
                    <TableHead className="font-semibold">Registrado por</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observaciones.map((obs) => (
                    <TableRow key={obs.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{obs.fecha}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{obs.alumno_nombre}</p>
                        <p className="text-xs text-muted-foreground">DNI {obs.alumno_dni}</p>
                      </TableCell>
                      <TableCell className="text-sm">{obs.grado} {obs.seccion}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-md text-xs">
                          {tipoOptions.find(t => t.value === obs.tipo)?.label || obs.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">{obs.observacion}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{obs.registrado_por_nombre}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedObs(obs); setDetailOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(esTutor || esDirector) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(obs.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Observación</DialogTitle>
            <DialogDescription>Registrar una observación en la agenda digital</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI del Alumno</Label>
                <Input placeholder="12345678" value={form.alumno_dni} onChange={(e) => setForm({ ...form, alumno_dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} maxLength={8} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tipoOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea placeholder="Escribe la observación sobre el alumno..." value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} rows={5} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Registrando...' : 'Registrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedObs && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Observación
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Alumno</p>
                    <p className="text-sm font-medium mt-1">{selectedObs.alumno_nombre}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">DNI</p>
                    <p className="text-sm font-medium mt-1">{selectedObs.alumno_dni}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Fecha</p>
                    <p className="text-sm font-medium mt-1">{selectedObs.fecha}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Tipo</p>
                    <Badge variant="secondary" className="mt-1 rounded-md text-xs">
                      {tipoOptions.find(t => t.value === selectedObs.tipo)?.label || selectedObs.tipo}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Observación</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedObs.observacion}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Registrado por</p>
                  <p className="text-sm font-medium mt-1">{selectedObs.registrado_por_nombre}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
