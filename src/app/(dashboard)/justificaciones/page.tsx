'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Search, FileEdit, Upload, FileText, Loader2, FileCheck, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { getEstadoLabel, formatTime } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const estadoIcon: Record<string, any> = {
  falta_injustificada: XCircle,
  falta_justificada: CheckCircle2,
};

export default function JustificacionesPage() {
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [estadoNuevo, setEstadoNuevo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [evidencia, setEvidencia] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  const fetchAsistencias = useCallback(async (signal: AbortSignal) => {
    try {
      let query = supabase
        .from('asistencias')
        .select('*, alumno:perfiles!asistencias_alumno_id_fkey(nombres, apellidos, dni), justificaciones(id, motivo, created_at, brigadier_id, perfiles!justificaciones_brigadier_id_fkey(nombres, apellidos))')
        .in('estado', ['falta_injustificada', 'falta_justificada'])
        .order('fecha', { ascending: false });

      if (search) {
        const { data: perfiles } = await supabase
          .from('perfiles')
          .select('id')
          .or(`dni.ilike.%${search}%,nombres.ilike.%${search}%,apellidos.ilike.%${search}%`);
        if (perfiles && perfiles.length > 0) {
          query = query.in('alumno_id', perfiles.map(p => p.id));
        } else {
          setAsistencias([]);
          setLoading(false);
          return;
        }
      }

      const { data } = await query;
      if (signal.aborted) return;
      setAsistencias(data || []);
    } catch {
      if (signal.aborted) return;
      toast.error('Error al cargar asistencias');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchAsistencias(abortController.signal);
    return () => abortController.abort();
  }, [fetchAsistencias]);

  const handleJustificar = async () => {
    if (!selectedId || !estadoNuevo || !motivo || !user) {
      toast.error('Completa todos los campos');
      return;
    }

    setSubiendo(true);
    try {
      const { data: rpcResult, error } = await supabase.rpc('justificar_asistencia', {
        p_asistencia_id: selectedId,
        p_brigadier_id: user.id,
        p_estado_nuevo: estadoNuevo,
        p_motivo: motivo,
      });

      if (error) throw error;

      if (evidencia && rpcResult?.exito) {
        const { data: justificaciones } = await supabase
          .from('justificaciones')
          .select('id')
          .eq('asistencia_id', selectedId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (justificaciones && justificaciones.length > 0) {
          const fileName = `evidencia-${selectedId}-${Date.now()}.${evidencia.name.split('.').pop()}`;
          const { error: uploadError } = await supabase.storage
            .from('evidencias')
            .upload(fileName, evidencia);

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(fileName);
            await supabase.from('evidencias').insert({
              justificacion_id: justificaciones[0].id,
              nombre_archivo: evidencia.name,
              url: urlData.publicUrl,
              tipo_mime: evidencia.type,
              tamano_bytes: evidencia.size,
            });
          }
        }
      }

      toast.success('Justificación registrada');
      setDialogOpen(false);
      setSelectedId(null);
      setEstadoNuevo('');
      setMotivo('');
      setEvidencia(null);
      setLoading(true);
      fetchAsistencias(new AbortController().signal);
    } catch (err: any) {
      toast.error(err.message || 'Error al justificar');
    } finally {
      setSubiendo(false);
    }
  };

  const openDialog = (id: string) => {
    setSelectedId(id);
    setEstadoNuevo('');
    setMotivo('');
    setEvidencia(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Justificaciones</h1>
        <p className="text-sm text-muted-foreground">Gestionar justificación de faltas</p>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por DNI, nombres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-border bg-background pl-10 text-sm transition-all duration-200 placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-foreground">DNI</TableHead>
                  <TableHead className="font-semibold text-foreground">Estudiante</TableHead>
                  <TableHead className="font-semibold text-foreground">Fecha</TableHead>
                  <TableHead className="font-semibold text-foreground">Hora</TableHead>
                  <TableHead className="font-semibold text-foreground">Estado</TableHead>
                  <TableHead className="font-semibold text-foreground">Justificado por</TableHead>
                  <TableHead className="font-semibold text-foreground">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex items-center justify-center gap-2 py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Cargando...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : asistencias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <FileCheck className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">Sin faltas registradas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  asistencias.map((a) => {
                    const Icon = estadoIcon[a.estado] || AlertCircle;
                    return (
                      <TableRow key={a.id} className="transition-colors hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground">{a.alumno?.dni}</TableCell>
                        <TableCell className="text-muted-foreground">{a.alumno?.nombres} {a.alumno?.apellidos}</TableCell>
                        <TableCell className="text-muted-foreground">{a.fecha}</TableCell>
                        <TableCell className="text-muted-foreground">{formatTime(a.hora)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={a.estado === 'falta_justificada' ? 'outline' : 'destructive'}
                            className="gap-1 rounded-md px-2.5 py-0.5 text-xs font-medium"
                          >
                            <Icon className={`h-3 w-3 ${a.estado === 'falta_justificada' ? 'text-blue-500' : ''}`} />
                            {getEstadoLabel(a.estado)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.estado === 'falta_justificada' && a.justificaciones?.[0]?.perfiles
                            ? `${a.justificaciones[0].perfiles.nombres} ${a.justificaciones[0].perfiles.apellidos}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 rounded-lg btn-press"
                            onClick={() => openDialog(a.id)}
                          >
                            <FileEdit className="h-4 w-4" />
                            {a.estado === 'falta_injustificada' ? 'Justificar' : 'Revisar'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Justificar Falta</DialogTitle>
            <DialogDescription>
              Cambia el estado de la falta del estudiante seleccionado.
            </DialogDescription>
          </DialogHeader>
          {selectedId && (() => {
            const asistencia = asistencias.find(a => a.id === selectedId);
            if (!asistencia) return null;
            return (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-sm font-medium text-foreground">
                    {asistencia.alumno?.nombres} {asistencia.alumno?.apellidos}
                  </p>
                  <p className="text-xs text-muted-foreground">DNI: {asistencia.alumno?.dni}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Estado actual:</span>
                  <Badge
                    variant={asistencia.estado === 'falta_justificada' ? 'outline' : 'destructive'}
                    className="gap-1 rounded-md"
                  >
                    {getEstadoLabel(asistencia.estado)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nuevo Estado</Label>
                  <Select value={estadoNuevo} onValueChange={setEstadoNuevo}>
                    <SelectTrigger className="rounded-xl border-border">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                      <SelectItem value="falta_injustificada">Falta Injustificada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Motivo</Label>
                  <Textarea
                    placeholder="Describe el motivo de la justificación..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={3}
                    className="rounded-xl border-border transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Evidencia (opcional)</Label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                    <Upload className="h-4 w-4" />
                    <span>{evidencia ? evidencia.name : 'Subir archivo...'}</span>
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => setEvidencia(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {evidencia && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {evidencia.name}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleJustificar}
                  disabled={subiendo}
                  className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
                >
                  {subiendo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <FileEdit className="h-4 w-4" />
                      Guardar Justificación
                    </>
                  )}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
