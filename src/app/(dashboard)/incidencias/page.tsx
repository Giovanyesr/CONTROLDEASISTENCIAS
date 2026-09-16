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
  AlertTriangle, Plus, Search, Loader2, ArrowLeft, Filter,
  Clock, User, GraduationCap, ShieldCheck, Eye, Trash2,
} from 'lucide-react';
import { getPeruDate, getPeruCalendarDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const tipoLabel: Record<string, string> = {
  conducta: 'Conducta',
  academica: 'Académica',
  disciplinaria: 'Disciplinaria',
  otra: 'Otra',
};

const tipoBadge: Record<string, string> = {
  conducta: 'bg-orange-100 text-orange-700',
  academica: 'bg-blue-100 text-blue-700',
  disciplinaria: 'bg-red-100 text-red-700',
  otra: 'bg-gray-100 text-gray-700',
};

const grados = ['1°', '2°', '3°', '4°', '5°'];

export default function IncidenciasPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const esDirector = user?.rol === 'director';
  const esTutor = user?.rol === 'tutor';
  const esBrigadier = user?.rol === 'brigadier' || user?.es_brigadier === true;
  const puedeCrear = esDirector || esTutor || esBrigadier;

  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroGrado, setFiltroGrado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIncidencia, setSelectedIncidencia] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    alumno_dni: '',
    alumno_nombre: '',
    grado: '',
    tipo: 'conducta',
    titulo: '',
    descripcion: '',
    fecha: getPeruDate(),
  });
  const [formError, setFormError] = useState('');
  const [tutorGrados, setTutorGrados] = useState<string[]>([]);

  const fetchIncidencias = useCallback(async () => {
    try {
      let query = supabase
        .from('incidencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (esTutor && user?.id) {
        const { data: asignaciones } = await supabase
          .from('tutor_asignaciones')
          .select('grado')
          .eq('tutor_id', user.id);
        if (asignaciones && asignaciones.length > 0) {
          const grados = [...new Set(asignaciones.map((a: any) => a.grado))];
          const { data: alumnos } = await supabase
            .from('alumnos')
            .select('perfil_id, grado');
          const ids = (alumnos || [])
            .filter((a: any) => grados.includes(a.grado))
            .map((a: any) => a.perfil_id);
          if (ids.length > 0) {
            query = query.in('alumno_id', ids);
          } else {
            setIncidencias([]);
            setLoading(false);
            return;
          }
        }
      } else if (!esDirector) {
        query = query.eq('registrado_por', user?.id);
      }

      const { data } = await query;

      const enriched = (data || []).map((inc: any) => ({
        ...inc,
        registrado_por_nombre: inc.registrado_por_nombre || '—',
      }));

      let filtered = enriched;
      if (search) {
        const s = search.toLowerCase();
        filtered = enriched.filter((inc: any) =>
          inc.alumno_nombre?.toLowerCase().includes(s) ||
          inc.alumno_dni?.includes(s) ||
          inc.titulo?.toLowerCase().includes(s)
        );
      }
      if (filtroGrado) {
        filtered = filtered.filter((inc: any) => inc.grado === filtroGrado);
      }
      if (filtroTipo) {
        filtered = filtered.filter((inc: any) => inc.tipo === filtroTipo);
      }

      setIncidencias(filtered);
    } catch {
      toast.error('Error al cargar incidencias');
    } finally {
      setLoading(false);
    }
  }, [search, filtroGrado, filtroTipo, esDirector, user?.id]);

  useEffect(() => {
    fetchIncidencias();
  }, [fetchIncidencias]);

  useEffect(() => {
    if (esTutor && user?.id) {
      supabase
        .from('tutor_asignaciones')
        .select('grado')
        .eq('tutor_id', user.id)
        .then(({ data }) => {
          if (data) setTutorGrados([...new Set(data.map((a: any) => a.grado))]);
        });
    }
  }, [esTutor, user?.id]);

  const handleCreate = async () => {
    setFormError('');
    if (!form.alumno_dni || form.alumno_dni.length !== 8) { setFormError('DNI debe tener 8 dígitos'); return; }
    if (!form.titulo) { setFormError('El título es obligatorio'); return; }
    if (!form.descripcion) { setFormError('La descripción es obligatoria'); return; }

    setSubmitting(true);
    try {
      const { data: alumno } = await supabase
        .from('perfiles')
        .select('id, nombres, apellidos')
        .eq('dni', form.alumno_dni)
        .maybeSingle();

      if (!alumno) { setFormError('No se encontró alumno con ese DNI'); setSubmitting(false); return; }

      if (esTutor && form.grado && user?.id) {
        const { data: asignaciones } = await supabase
          .from('tutor_asignaciones')
          .select('grado')
          .eq('tutor_id', user.id);
        const { data: alumnoInfo } = await supabase
          .from('alumnos')
          .select('grado')
          .eq('perfil_id', alumno.id)
          .maybeSingle();
        const match = alumnoInfo && (asignaciones || []).some((a: any) => a.grado === alumnoInfo.grado);
        if (!match) { setFormError('Este alumno no pertenece a tus grados asignados'); setSubmitting(false); return; }
      }

      const { error } = await supabase.from('incidencias').insert({
        alumno_id: alumno.id,
        alumno_nombre: `${alumno.apellidos} ${alumno.nombres}`,
        alumno_dni: form.alumno_dni,
        grado: form.grado,
        tipo: form.tipo,
        titulo: form.titulo,
        descripcion: form.descripcion,
        fecha: form.fecha,
        registrado_por: user?.id,
        registrado_por_nombre: `${user?.apellidos} ${user?.nombres}`,
      });

      if (error) throw error;
      toast.success('Incidencia registrada');
      setOpen(false);
      setForm({ alumno_dni: '', alumno_nombre: '', grado: '', tipo: 'conducta', titulo: '', descripcion: '', fecha: getPeruDate() });
      fetchIncidencias();
    } catch (err: any) {
      setFormError(err.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('incidencias').delete().eq('id', id);
      if (error) throw error;
      toast.success('Incidencia eliminada');
      fetchIncidencias();
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Incidencias</h1>
            <p className="text-sm text-muted-foreground">{incidencias.length} incidencias registradas</p>
          </div>
        </div>
        {puedeCrear && (
          <Button className="gap-2 rounded-xl btn-press" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva Incidencia
          </Button>
        )}
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI o título..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-xl border-border bg-background pl-10 text-sm"
              />
            </div>
            <Select value={filtroGrado} onValueChange={setFiltroGrado}>
              <SelectTrigger className="h-10 w-full rounded-xl border-border sm:w-28">
                <SelectValue placeholder="Grado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {grados.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="h-10 w-full rounded-xl border-border sm:w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="conducta">Conducta</SelectItem>
                <SelectItem value="academica">Académica</SelectItem>
                <SelectItem value="disciplinaria">Disciplinaria</SelectItem>
                <SelectItem value="otra">Otra</SelectItem>
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
          ) : incidencias.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No hay incidencias registradas</p>
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
                    <TableHead className="font-semibold">Título</TableHead>
                    <TableHead className="font-semibold">Registrado por</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidencias.map((inc) => (
                    <TableRow key={inc.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{inc.fecha}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{inc.alumno_nombre}</p>
                        <p className="text-xs text-muted-foreground">DNI {inc.alumno_dni}</p>
                      </TableCell>
                      <TableCell className="text-sm">{inc.grado}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-md text-xs ${tipoBadge[inc.tipo] || ''}`}>
                          {tipoLabel[inc.tipo] || inc.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{inc.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inc.registrado_por_nombre}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => { setSelectedIncidencia(inc); setDetailOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {esDirector && (
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(inc.id)}
                            >
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
            <DialogTitle>Nueva Incidencia</DialogTitle>
            <DialogDescription>Registrar una incidencia de comportamiento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI del Alumno</Label>
                <Input placeholder="12345678" value={form.alumno_dni} onChange={(e) => setForm({ ...form, alumno_dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} maxLength={8} />
              </div>
              <div className="space-y-2">
                <Label>Grado</Label>
                <Select value={form.grado} onValueChange={(v) => setForm({ ...form, grado: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(esTutor && tutorGrados.length > 0 ? tutorGrados : grados).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conducta">Conducta</SelectItem>
                    <SelectItem value="academica">Académica</SelectItem>
                    <SelectItem value="disciplinaria">Disciplinaria</SelectItem>
                    <SelectItem value="otra">Otra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="Breve descripción del incidente" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descripción detallada</Label>
              <Textarea placeholder="Describe los detalles de la incidencia..." value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={4} />
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
          {selectedIncidencia && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  {selectedIncidencia.titulo}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Alumno</p>
                    <p className="text-sm font-medium mt-1">{selectedIncidencia.alumno_nombre}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">DNI</p>
                    <p className="text-sm font-medium mt-1">{selectedIncidencia.alumno_dni}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Grado</p>
                    <p className="text-sm font-medium mt-1">{selectedIncidencia.grado}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Fecha</p>
                    <p className="text-sm font-medium mt-1">{selectedIncidencia.fecha}</p>
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Tipo</p>
                  <Badge className={`mt-1 rounded-md text-xs ${tipoBadge[selectedIncidencia.tipo] || ''}`}>
                    {tipoLabel[selectedIncidencia.tipo] || selectedIncidencia.tipo}
                  </Badge>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Descripción</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedIncidencia.descripcion}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Registrado por</p>
                  <p className="text-sm font-medium mt-1">{selectedIncidencia.registrado_por_nombre}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
