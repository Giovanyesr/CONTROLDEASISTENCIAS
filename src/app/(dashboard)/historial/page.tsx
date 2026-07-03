'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, History, Loader2, FileDown, FileText, Calendar, Clock, UserCheck, CheckCircle2, XCircle, FileWarning, ShieldCheck } from 'lucide-react';
import { getEstadoLabel, formatTime } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function HistorialPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroGrado, setFiltroGrado] = useState('');
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth().toString());
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const { user } = useAuth();
  const supabase = createClient();
  const pageSize = 20;

  const [mesAsistencias, setMesAsistencias] = useState<Record<string, any>>({});
  const [diaSeleccionado, setDiaSeleccionado] = useState<any>(null);
  const [diaOpen, setDiaOpen] = useState(false);
  const [justificationInfo, setJustificationInfo] = useState<{ motivo: string; evidencias: { nombre: string; url: string }[]; brigadier_nombre?: string } | null>(null);
  const [loadingJustInfo, setLoadingJustInfo] = useState(false);

  const noLaborablesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchDias = async () => {
      try {
        const sup = createClient();
        const { data } = await sup.from('dias_no_laborables').select('fecha');
        noLaborablesRef.current = new Set((data || []).map((r: any) => r.fecha));
      } catch { /* table may not exist */ }
    };
    fetchDias();
  }, []);

  const esLaborable = (fecha: string) => {
    const d = new Date(fecha + 'T12:00:00');
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return false;
    if (noLaborablesRef.current.has(fecha)) return false;
    return true;
  };

  const esBrigadier = user?.rol === 'brigadier';

  const now = new Date();
  const peruOffset = -5 * 60;
  const localOffset = now.getTimezoneOffset();
  const peruNow = new Date(now.getTime() + (localOffset - peruOffset) * 60000);
  const añoActual = peruNow.getFullYear();
  const mesActual = peruNow.getMonth();
  const diasEnMes = new Date(parseInt(filtroAno), parseInt(filtroMes) + 1, 0).getDate();
  const primerDia = new Date(parseInt(filtroAno), parseInt(filtroMes), 1).getDay();
  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];
  const estadoColor: Record<string, string> = {
    presente: 'bg-green-500 text-white',
    tardanza: 'bg-yellow-400 text-yellow-900',
    falta_justificada: 'bg-blue-400 text-white',
    falta_injustificada: 'bg-red-500 text-white',
  };
  const estadoLabel: Record<string, string> = {
    presente: 'P',
    tardanza: 'T',
    falta_justificada: 'J',
    falta_injustificada: 'F',
  };

  // Fetch justification details when opening a falta_justificada day
  useEffect(() => {
    if (!diaOpen || !diaSeleccionado || diaSeleccionado.estado !== 'falta_justificada') {
      if (!diaOpen) setJustificationInfo(null);
      return;
    }
    const fetchJustInfo = async () => {
      setLoadingJustInfo(true);
      const sup = createClient();
      const { data: justs } = await sup
        .from('justificaciones')
        .select('id, motivo, brigadier_id, perfiles!justificaciones_brigadier_id_fkey(nombres, apellidos)')
        .eq('asistencia_id', diaSeleccionado.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!justs || justs.length === 0) { setLoadingJustInfo(false); return; }
      const j = justs[0] as any;
      const { data: evids } = await sup
        .from('evidencias')
        .select('nombre_archivo, url')
        .eq('justificacion_id', j.id);
      setJustificationInfo({
        motivo: j.motivo,
        evidencias: (evids || []).map(e => ({ nombre: e.nombre_archivo, url: e.url })),
        brigadier_nombre: j.perfiles ? `${j.perfiles.nombres} ${j.perfiles.apellidos}` : undefined,
      });
      setLoadingJustInfo(false);
    };
    fetchJustInfo();
  }, [diaOpen, diaSeleccionado]);

  const fetchHistorial = useCallback(async (signal: AbortSignal) => {
    try {
      let query = supabase
        .from('asistencias')
        .select('*, alumno:perfiles!asistencias_alumno_id_fkey(nombres, apellidos, dni), brigadier:perfiles!asistencias_brigadier_id_fkey(nombres, apellidos)')
        .order('fecha', { ascending: false });

      if (filtroGrado) {
        const { data: gradeIds } = await supabase
          .from('alumnos')
          .select('perfil_id')
          .eq('grado', filtroGrado);
        const ids = (gradeIds || []).map(a => a.perfil_id);
        if (ids.length > 0) {
          query = query.in('alumno_id', ids);
        } else {
          setRegistros([]);
          setMesAsistencias({});
          setTotal(0);
          setLoading(false);
          return;
        }
      }

      if (filtroMes) {
        const mes = parseInt(filtroMes) + 1;
        query = query.gte('fecha', `${filtroAno}-${mes.toString().padStart(2, '0')}-01`);
        const ultimoDia = new Date(parseInt(filtroAno), parseInt(filtroMes) + 1, 0).getDate();
        query = query.lte('fecha', `${filtroAno}-${mes.toString().padStart(2, '0')}-${ultimoDia}`);
      }

      if (filtroEstado) {
        query = query.eq('estado', filtroEstado);
      }

      if (!esBrigadier) {
        query = query.eq('alumno_id', user?.id);
      }

      const { data } = await query;
      if (signal.aborted) return;

      const brigadierIds = [...new Set((data || []).map((r: any) => r.brigadier_id).filter(Boolean))];
      const brigadierMap: Record<string, any> = {};
      if (brigadierIds.length > 0) {
        const { data: brigadierData } = await supabase
          .from('perfiles')
          .select('id, nombres, apellidos')
          .in('id', brigadierIds);
        (brigadierData || []).forEach((b: any) => { brigadierMap[b.id] = b; });
      }

      const calData: Record<string, any> = {};
      (data || []).forEach((r: any) => {
        if (!calData[r.fecha]) {
          calData[r.fecha] = { estado: r.estado, hora: r.hora, brigadier: brigadierMap[r.brigadier_id] || null };
        }
      });
      setMesAsistencias(calData);

      const enriched = (data || []).map((r: any) => ({
        ...r,
        brigadier: brigadierMap[r.brigadier_id] || null,
      }));

      setTotal(enriched.length);
      if (esBrigadier) {
        const paginated = enriched.slice(page * pageSize, (page + 1) * pageSize);
        setRegistros(paginated);
      } else {
        setRegistros(enriched);
      }
    } catch {
      if (signal.aborted) return;
      toast.error('Error al cargar historial');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [filtroEstado, filtroGrado, filtroMes, filtroAno, page, user, esBrigadier]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchHistorial(abortController.signal);
    return () => abortController.abort();
  }, [fetchHistorial]);

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF();
    doc.text('Historial de Asistencias', 14, 15);
    const tableData = registros.map((r) => [
      r.alumno?.dni || '',
      `${r.alumno?.nombres || ''} ${r.alumno?.apellidos || ''}`,
      r.fecha,
      formatTime(r.hora),
      getEstadoLabel(r.estado),
    ]);
    (doc as any).autoTable({
      head: [['DNI', 'Estudiante', 'Fecha', 'Hora', 'Estado']],
      body: tableData,
      startY: 25,
    });
    doc.save(`historial-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exportado');
  }, [registros]);

  const exportToExcel = useCallback(() => {
    const data = registros.map((r) => ({
      DNI: r.alumno?.dni,
      Estudiante: `${r.alumno?.nombres} ${r.alumno?.apellidos}`,
      Fecha: r.fecha,
      Hora: formatTime(r.hora),
      Estado: getEstadoLabel(r.estado),
      Brigadier: r.brigadier ? `${r.brigadier?.nombres} ${r.brigadier?.apellidos}` : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, `historial-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exportado');
  }, [registros]);

  const totalPages = Math.ceil(total / pageSize);
  const colSpan = esBrigadier ? 6 : 4;
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Historial</h1>
          <p className="text-sm text-muted-foreground">{total || Object.keys(mesAsistencias).length} registros encontrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2 rounded-xl btn-press">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2 rounded-xl btn-press">
            <FileDown className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-3 sm:flex-row">
            {esBrigadier && (
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar estudiante..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="h-10 rounded-xl border-border bg-background pl-10 text-sm transition-all duration-200 placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
            {esBrigadier && (
              <Select value={filtroGrado} onValueChange={(v) => { setFiltroGrado(v); setPage(0); }}>
                <SelectTrigger className="h-10 w-full rounded-xl border-border sm:w-28">
                  <SelectValue placeholder="Grado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="1°">1° Grado</SelectItem>
                  <SelectItem value="2°">2° Grado</SelectItem>
                  <SelectItem value="3°">3° Grado</SelectItem>
                  <SelectItem value="4°">4° Grado</SelectItem>
                  <SelectItem value="5°">5° Grado</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={filtroMes} onValueChange={(v) => { setFiltroMes(v); setPage(0); }}>
              <SelectTrigger className="h-10 w-full rounded-xl border-border sm:w-36">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroAno} onValueChange={(v) => { setFiltroAno(v); setPage(0); }}>
              <SelectTrigger className="h-10 w-full rounded-xl border-border sm:w-28">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroEstado} onValueChange={(v) => { setFiltroEstado(v); setPage(0); }}>
              <SelectTrigger className="h-10 w-full rounded-xl border-border sm:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="presente">Presente</SelectItem>
                <SelectItem value="tardanza">Tardanza</SelectItem>
                <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                <SelectItem value="falta_injustificada">Falta Injustificada</SelectItem>
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
          ) : !esBrigadier ? (
            <div className="space-y-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-5 w-5 text-primary" />
                {mesesNombres[parseInt(filtroMes)]} {filtroAno}
              </CardTitle>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => (
                  <div key={d} className="py-1 font-medium text-muted-foreground">{d}</div>
                ))}
                {Array.from({ length: primerDia }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: diasEnMes }, (_, i) => {
                  const dia = i + 1;
                  const fecha = `${filtroAno}-${String(parseInt(filtroMes) + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                  const registro = mesAsistencias[fecha];
                  const noLaborable = !esLaborable(fecha);
                  const esFuturo = fecha > peruNow.toISOString().split('T')[0];
                  const hoy = fecha === peruNow.toISOString().split('T')[0];
                  const clickable = !esFuturo && !noLaborable;
                  return (
                    <div
                      key={dia}
                      onClick={() => {
                        if (clickable) {
                          setDiaSeleccionado({ fecha, ...(registro || {}) });
                          setDiaOpen(true);
                        }
                      }}
                      className={`relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition-colors
                        ${clickable ? 'cursor-pointer hover:ring-1 hover:ring-primary/40' : ''}
                        ${hoy ? 'ring-2 ring-primary ring-offset-1' : ''}
                        ${esFuturo ? 'text-muted-foreground/30' : noLaborable && !registro ? 'text-muted-foreground/20' : ''}
                        ${registro ? estadoColor[registro.estado] || 'bg-gray-200' : !esFuturo && !noLaborable ? 'bg-gray-100 text-gray-400' : ''}
                      `}
                      title={registro ? `${dia} de ${mesesNombres[parseInt(filtroMes)]} - ${getEstadoLabel(registro.estado)}` : `${dia} de ${mesesNombres[parseInt(filtroMes)]}`}
                    >
                      <span className="relative z-10">{dia}</span>
                      {registro && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold">{estadoLabel[registro.estado]}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-green-500" /> Presente</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-yellow-400" /> Tardanza</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-blue-400" /> Justificada</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-red-500" /> Falta</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-foreground">DNI</TableHead>
                      <TableHead className="font-semibold text-foreground">Estudiante</TableHead>
                      <TableHead className="font-semibold text-foreground">Fecha</TableHead>
                      <TableHead className="font-semibold text-foreground">Hora</TableHead>
                      <TableHead className="font-semibold text-foreground">Estado</TableHead>
                      <TableHead className="font-semibold text-foreground">Brigadier</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <History className="h-8 w-8 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">Sin registros</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    registros.map((r) => (
                      <TableRow key={r.id} className="transition-colors hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground">{r.alumno?.dni}</TableCell>
                        <TableCell className="text-muted-foreground">{r.alumno?.nombres} {r.alumno?.apellidos}</TableCell>
                        <TableCell className="text-muted-foreground">{r.fecha}</TableCell>
                        <TableCell className="text-muted-foreground">{formatTime(r.hora)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.estado === 'presente' ? 'default' :
                              r.estado === 'tardanza' ? 'secondary' : 'destructive'
                            }
                            className="rounded-md px-2.5 py-0.5 text-xs font-medium"
                          >
                            {getEstadoLabel(r.estado)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.brigadier?.nombres} {r.brigadier?.apellidos}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

              {esBrigadier && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 animate-fade-in">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-9 rounded-lg px-3 btn-press"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="h-9 rounded-lg px-3 btn-press"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={diaOpen} onOpenChange={setDiaOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {diaSeleccionado?.fecha
                ? new Date(diaSeleccionado.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : 'Detalle del día'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {diaSeleccionado?.estado ? (
              <>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full ${estadoColor[diaSeleccionado.estado]}`}>
                    {diaSeleccionado.estado === 'presente' ? <CheckCircle2 className="h-8 w-8" /> :
                     diaSeleccionado.estado === 'tardanza' ? <Clock className="h-8 w-8" /> :
                     diaSeleccionado.estado === 'falta_justificada' ? <FileWarning className="h-8 w-8" /> :
                     <XCircle className="h-8 w-8" />}
                  </div>
                  <p className="text-lg font-semibold text-foreground">{getEstadoLabel(diaSeleccionado.estado)}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hora de registro</p>
                      <p className="font-semibold text-foreground">{formatTime(diaSeleccionado.hora)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Registrado por</p>
                      <p className="font-semibold text-foreground">
                        {diaSeleccionado.brigadier
                          ? `${diaSeleccionado.brigadier.nombres} ${diaSeleccionado.brigadier.apellidos}`
                          : 'Brigadier'}
                      </p>
                    </div>
                  </div>
                </div>

                {diaSeleccionado.estado === 'falta_justificada' && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <p className="text-sm font-medium text-foreground">Detalle de justificación</p>
                    {loadingJustInfo ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : justificationInfo ? (
                      <>
                        {justificationInfo.brigadier_nombre && (
                          <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-2.5">
                            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                            <p className="text-sm text-foreground">
                              <span className="text-muted-foreground">Justificado por: </span>
                              <span className="font-medium">{justificationInfo.brigadier_nombre}</span>
                            </p>
                          </div>
                        )}
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-xs text-muted-foreground mb-1">Motivo</p>
                          <p className="text-sm text-foreground">{justificationInfo.motivo}</p>
                        </div>
                        {justificationInfo.evidencias.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Evidencias adjuntas</p>
                            {justificationInfo.evidencias.map((ev, i) => (
                              <a key={i} href={ev.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-xl border bg-card p-2.5 text-sm text-foreground transition-colors hover:bg-muted/50">
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                                <span className="truncate">{ev.nombre}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No se encontraron detalles.</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-muted-foreground">Sin registro de asistencia este día</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}