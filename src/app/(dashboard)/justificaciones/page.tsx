'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Loader2, CheckCircle2, XCircle, Clock, Upload, FileText, Plus, Search, Inbox, ShieldAlert, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

const estadoBadge = (estado?: string) => {
  const cfg: Record<string, { label: string; cls: string; dot: string }> = {
    pendiente: { label: 'Pendiente', cls: 'text-amber-700 border-amber-200 bg-amber-50', dot: 'bg-amber-500' },
    aprobada: { label: 'Aprobada', cls: 'text-emerald-700 border-emerald-200 bg-emerald-50', dot: 'bg-emerald-500' },
    rechazada: { label: 'Rechazada', cls: 'text-red-700 border-red-200 bg-red-50', dot: 'bg-red-500' },
  };
  const c = cfg[estado || ''] || cfg.pendiente;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.cls}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

export default function JustificacionesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [soloPendientes, setSoloPendientes] = useState(true);

  // Director review
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rechazoMotivo, setRechazoMotivo] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Student request
  const [reqOpen, setReqOpen] = useState(false);
  const [faltas, setFaltas] = useState<any[]>([]);
  const [reqAsistencia, setReqAsistencia] = useState('');
  const [reqMotivo, setReqMotivo] = useState('');
  const [reqEvidencia, setReqEvidencia] = useState<File | null>(null);
  const [reqSubiendo, setReqSubiendo] = useState(false);

  const esDirector = user?.rol === 'director';
  const esAlumno = user?.rol === 'alumno';

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('justificaciones')
        .select(`
          *,
          alumno:alumno_id(nombres, apellidos, dni),
          asistencia:asistencia_id(fecha, hora),
          evidencias(id, nombre_archivo, url)
        `)
        .order('created_at', { ascending: false });

      if (esAlumno) query = query.eq('alumno_id', user?.id);
      else if (soloPendientes) query = query.eq('estado', 'pendiente');

      const { data } = await query;
      setItems(data || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [esAlumno, soloPendientes, user?.id, supabase]);

  useEffect(() => {
    if (!user) return;
    fetchItems();
  }, [user, fetchItems]);

  const cargarFaltas = async () => {
    if (!esAlumno) return;
    const { data: asis } = await supabase
      .from('asistencias')
      .select('id, fecha, hora')
      .eq('alumno_id', user?.id)
      .eq('estado', 'falta_injustificada')
      .order('fecha', { ascending: false });

    const { data: pend } = await supabase
      .from('justificaciones')
      .select('asistencia_id')
      .eq('alumno_id', user?.id)
      .eq('estado', 'pendiente');

    const pendIds = new Set((pend || []).map((p: any) => p.asistencia_id));
    setFaltas((asis || []).filter((a: any) => !pendIds.has(a.id)));
  };

  const openNueva = async () => {
    setReqAsistencia(''); setReqMotivo(''); setReqEvidencia(null);
    await cargarFaltas();
    setReqOpen(true);
  };

  const enviarSolicitud = async () => {
    if (!reqAsistencia || !reqMotivo.trim()) { toast.error('Selecciona la falta y escribe el motivo'); return; }
    setReqSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('asistencia_id', reqAsistencia);
      fd.append('motivo', reqMotivo.trim());
      if (reqEvidencia) fd.append('file', reqEvidencia);
      const res = await fetch('/api/justificaciones/solicitar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.mensaje || 'Solicitud enviada');
      setReqOpen(false);
      fetchItems();
    } catch (err: any) { toast.error(err.message); }
    finally { setReqSubiendo(false); }
  };

  const revisar = async (decision: 'aprobada' | 'rechazada') => {
    if (decision === 'rechazada' && !rechazoMotivo.trim()) { toast.error('Indica el motivo del rechazo'); return; }
    setReviewing(true);
    try {
      const res = await fetch('/api/justificaciones/revisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justificacion_id: reviewTarget.id, decision, motivo_rechazo: rechazoMotivo.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.mensaje);
      setReviewOpen(false);
      setRechazoMotivo('');
      fetchItems();
    } catch (err: any) { toast.error(err.message); }
    finally { setReviewing(false); }
  };

  const abrirRevision = (it: any) => {
    setReviewTarget(it);
    setRechazoMotivo('');
    setReviewOpen(true);
  };

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Justificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {esDirector
              ? 'Revisa y resuelve las solicitudes de justificación de tus estudiantes.'
              : esAlumno
                ? 'Consulta y envía tus solicitudes de justificación.'
                : 'Consulta las solicitudes de justificación.'}
          </p>
        </div>
        {esAlumno ? (
          <Button onClick={openNueva} className="gap-2 rounded-lg self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Nueva solicitud
          </Button>
        ) : esDirector && (
          <div className="flex items-center gap-2">
            <Button variant={soloPendientes ? 'default' : 'outline'} size="sm" className="gap-2 rounded-lg" onClick={() => setSoloPendientes(true)}>
              <Clock className="h-4 w-4" /> Pendientes
            </Button>
            <Button variant={!soloPendientes ? 'default' : 'outline'} size="sm" className="gap-2 rounded-lg" onClick={() => setSoloPendientes(false)}>
              <Eye className="h-4 w-4" /> Todas
            </Button>
          </div>
        )}
      </div>

      <Card className="shadow-card overflow-hidden">
        {loading ? (
          <CardContent className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded-lg" />
            ))}
          </CardContent>
        ) : items.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">No hay solicitudes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {esDirector ? 'No tienes solicitudes pendientes por revisar.' : 'No hay solicitudes registradas.'}
              </p>
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-semibold text-foreground/70">Alumno</TableHead>
                  <TableHead className="font-semibold text-foreground/70">DNI</TableHead>
                  <TableHead className="font-semibold text-foreground/70">Fecha</TableHead>
                  <TableHead className="font-semibold text-foreground/70">Motivo</TableHead>
                  <TableHead className="font-semibold text-foreground/70">Evidencia</TableHead>
                  <TableHead className="font-semibold text-foreground/70">Estado</TableHead>
                  <TableHead className="text-right font-semibold text-foreground/70">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it: any) => (
                  <TableRow key={it.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="text-sm font-medium text-foreground">
                      {it.alumno?.nombres} {it.alumno?.apellidos}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">{it.alumno?.dni}</TableCell>
                    <TableCell className="text-sm">{it.asistencia?.fecha || it.fecha}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{it.motivo}</TableCell>
                    <TableCell>
                      {it.evidencias?.length ? (
                        <a href={it.evidencias[0].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <FileText className="h-3.5 w-3.5" /> {it.evidencias[0].nombre_archivo}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell>{estadoBadge(it.estado)}</TableCell>
                    <TableCell className="text-right">
                      {esDirector && it.estado === 'pendiente' && (
                        <Button size="sm" variant="outline" className="gap-2 rounded-lg" onClick={() => abrirRevision(it)}>
                          <ShieldAlert className="h-4 w-4" /> Revisar
                        </Button>
                      )}
                      {!esDirector && it.estado === 'rechazada' && it.motivo_rechazo && (
                        <span className="text-xs text-red-600" title={it.motivo_rechazo}>{it.motivo_rechazo}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Review Dialog (director) */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Revisar solicitud</DialogTitle>
            <DialogDescription>Aprueba o rechaza la justificación de la inasistencia.</DialogDescription>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted p-4">
                <p className="font-semibold text-foreground">{reviewTarget.alumno?.nombres} {reviewTarget.alumno?.apellidos}</p>
                <p className="text-sm text-muted-foreground">DNI: {reviewTarget.alumno?.dni} · Fecha: {reviewTarget.asistencia?.fecha || reviewTarget.fecha}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Motivo</p>
                <p className="mt-1 rounded-lg border bg-card p-3 text-sm text-muted-foreground">{reviewTarget.motivo}</p>
              </div>
              {reviewTarget.evidencias?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground">Evidencias</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {reviewTarget.evidencias.map((e: any) => (
                      <a key={e.id} href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-primary hover:bg-primary/5">
                        <FileText className="h-3.5 w-3.5" /> {e.nombre_archivo}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="rechazo-motivo">Motivo del rechazo (si corresponde)</Label>
                <Textarea id="rechazo-motivo" rows={2} value={rechazoMotivo} onChange={(e) => setRechazoMotivo(e.target.value)} placeholder="La evidencia presentada no permite justificar la inasistencia." />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" className="gap-2 rounded-lg text-red-600 hover:bg-red-50" disabled={reviewing} onClick={() => revisar('rechazada')}>
                  {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Rechazar
                </Button>
                <Button className="gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700" disabled={reviewing} onClick={() => revisar('aprobada')}>
                  {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Aprobar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nueva solicitud (alumno) */}
      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Nueva solicitud de justificación</DialogTitle>
            <DialogDescription>Selecciona la falta, indica el motivo y adjunta una evidencia si tienes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Falta a justificar</Label>
              <Select value={reqAsistencia} onValueChange={setReqAsistencia}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {faltas.length === 0 && <SelectItem value="__none" disabled>No tienes faltas por justificar</SelectItem>}
                  {faltas.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.fecha} · {f.hora?.slice(0, 5)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-motivo">Motivo</Label>
              <Textarea id="req-motivo" rows={3} value={reqMotivo} onChange={(e) => setReqMotivo(e.target.value)} placeholder="Describe el motivo de tu inasistencia..." className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label>Evidencia (opcional)</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <Upload className="h-4 w-4" />
                <span>{reqEvidencia ? reqEvidencia.name : 'Adjuntar archivo...'}</span>
                <Input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setReqEvidencia(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" className="rounded-lg" onClick={() => setReqOpen(false)} disabled={reqSubiendo}>Cancelar</Button>
            <Button className="gap-2 rounded-lg" onClick={enviarSolicitud} disabled={reqSubiendo}>
              {reqSubiendo && <Loader2 className="h-4 w-4 animate-spin" />}
              {reqSubiendo ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}