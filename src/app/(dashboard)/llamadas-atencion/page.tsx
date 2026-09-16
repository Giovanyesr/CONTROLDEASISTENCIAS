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
  AlertTriangle, Plus, Search, Loader2, ArrowLeft, Eye, CheckCircle2, Bell,
} from 'lucide-react';
import { getPeruDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function LlamadasAtencionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const esBrigadier = user?.rol === 'brigadier' || user?.es_brigadier === true;
  const esTutor = user?.rol === 'tutor';
  const esDirector = user?.rol === 'director';
  const puedeCrear = esBrigadier;

  const [llamadas, setLlamadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLlamada, setSelectedLlamada] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    alumno_dni: '',
    motivo: '',
    descripcion: '',
    fecha: getPeruDate(),
  });
  const [formError, setFormError] = useState('');

  const fetchLlamadas = useCallback(async () => {
    try {
      let query = supabase
        .from('llamadas_atencion')
        .select('*')
        .order('created_at', { ascending: false });

      if (esTutor && user?.id) {
        const { data: asignaciones } = await supabase
          .from('tutor_asignaciones')
          .select('grado, seccion')
          .eq('tutor_id', user.id);
        if (asignaciones && asignaciones.length > 0) {
          const pairs = asignaciones.map((a: any) => ({ grado: a.grado, seccion: a.seccion }));
          const { data: alumnos } = await supabase
            .from('alumnos')
            .select('perfil_id, grado, seccion');
          const ids = (alumnos || [])
            .filter((a: any) => pairs.some((p: any) => p.grado === a.grado && p.seccion === a.seccion))
            .map((a: any) => a.perfil_id);
          if (ids.length > 0) {
            query = query.in('alumno_id', ids);
          } else {
            setLlamadas([]);
            setLoading(false);
            return;
          }
        }
      } else if (!esDirector && !esBrigadier) {
        return;
      }

      const { data } = await query;

      let filtered = data || [];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((l: any) =>
          l.alumno_nombre?.toLowerCase().includes(s) ||
          l.alumno_dni?.includes(s) ||
          l.motivo?.toLowerCase().includes(s)
        );
      }

      setLlamadas(filtered);
    } catch {
      toast.error('Error al cargar llamadas de atención');
    } finally {
      setLoading(false);
    }
  }, [search, esTutor, esDirector, esBrigadier, user?.id]);

  useEffect(() => {
    fetchLlamadas();
  }, [fetchLlamadas]);

  const handleCreate = async () => {
    setFormError('');
    if (!form.alumno_dni || form.alumno_dni.length !== 8) { setFormError('DNI debe tener 8 dígitos'); return; }
    if (!form.motivo) { setFormError('El motivo es obligatorio'); return; }

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

      if (esTutor && alumnoInfo && user?.id) {
        const { data: asignaciones } = await supabase
          .from('tutor_asignaciones')
          .select('grado, seccion')
          .eq('tutor_id', user.id);
        const match = (asignaciones || []).some((a: any) => a.grado === alumnoInfo.grado && a.seccion === alumnoInfo.seccion);
        if (!match) { setFormError('Este alumno no pertenece a tus grados asignados'); setSubmitting(false); return; }
      }

      const { error } = await supabase.from('llamadas_atencion').insert({
        alumno_id: alumno.id,
        alumno_nombre: `${alumno.apellidos} ${alumno.nombres}`,
        alumno_dni: form.alumno_dni,
        grado: alumnoInfo?.grado,
        seccion: alumnoInfo?.seccion,
        motivo: form.motivo,
        descripcion: form.descripcion,
        fecha: form.fecha,
        registrado_por: user?.id,
        registrado_por_nombre: `${user?.apellidos} ${user?.nombres}`,
      });

      if (error) throw error;
      toast.success('Llamada de atención registrada');
      setOpen(false);
      setForm({ alumno_dni: '', motivo: '', descripcion: '', fecha: getPeruDate() });
      fetchLlamadas();
    } catch (err: any) {
      setFormError(err.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const marcarLeido = async (id: string) => {
    try {
      await supabase.from('llamadas_atencion').update({ leido: true }).eq('id', id);
      fetchLlamadas();
    } catch {}
  };

  const noLeidas = llamadas.filter(l => !l.leido).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Llamadas de Atención</h1>
            <p className="text-sm text-muted-foreground">
              {llamadas.length} registros
              {noLeidas > 0 && <span className="ml-2 text-red-500 font-medium">({noLeidas} sin leer)</span>}
            </p>
          </div>
        </div>
        {puedeCrear && (
          <Button className="gap-2 rounded-xl btn-press" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva Llamada
          </Button>
        )}
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI o motivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-xl border-border bg-background pl-10 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Cargando...</span>
            </div>
          ) : llamadas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No hay llamadas de atención registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Alumno</TableHead>
                    <TableHead className="font-semibold">Grado</TableHead>
                    <TableHead className="font-semibold">Motivo</TableHead>
                    <TableHead className="font-semibold">Registrado por</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {llamadas.map((ll) => (
                    <TableRow key={ll.id} className={`hover:bg-muted/30 ${!ll.leido ? 'bg-red-50/50' : ''}`}>
                      <TableCell>
                        {ll.leido ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{ll.fecha}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{ll.alumno_nombre}</p>
                        <p className="text-xs text-muted-foreground">DNI {ll.alumno_dni}</p>
                      </TableCell>
                      <TableCell className="text-sm">{ll.grado} {ll.seccion}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{ll.motivo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ll.registrado_por_nombre}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedLlamada(ll); setDetailOpen(true); if (!ll.leido) marcarLeido(ll.id); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
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
            <DialogTitle>Nueva Llamada de Atención</DialogTitle>
            <DialogDescription>Registrar una llamada de atención para un alumno</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="space-y-2">
              <Label>DNI del Alumno</Label>
              <Input placeholder="12345678" value={form.alumno_dni} onChange={(e) => setForm({ ...form, alumno_dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} maxLength={8} />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input placeholder="Motivo de la llamada de atención" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea placeholder="Detalles adicionales..." value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} />
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
          {selectedLlamada && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Llamada de Atención
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Alumno</p>
                    <p className="text-sm font-medium mt-1">{selectedLlamada.alumno_nombre}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">DNI</p>
                    <p className="text-sm font-medium mt-1">{selectedLlamada.alumno_dni}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Fecha</p>
                    <p className="text-sm font-medium mt-1">{selectedLlamada.fecha}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Grado</p>
                    <p className="text-sm font-medium mt-1">{selectedLlamada.grado} {selectedLlamada.seccion}</p>
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Motivo</p>
                  <p className="text-sm mt-1">{selectedLlamada.motivo}</p>
                </div>
                {selectedLlamada.descripcion && (
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Descripción</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{selectedLlamada.descripcion}</p>
                  </div>
                )}
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Registrado por</p>
                  <p className="text-sm font-medium mt-1">{selectedLlamada.registrado_por_nombre}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
