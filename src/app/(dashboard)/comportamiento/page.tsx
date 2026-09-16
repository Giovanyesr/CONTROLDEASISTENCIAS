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
  GraduationCap, Search, Loader2, ArrowLeft, Edit2, Save, FileText,
  CheckCircle2, AlertTriangle, XCircle, Clock, Users, BarChart3,
} from 'lucide-react';
import { getPeruDate, getPeruCalendarDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const bimestres = [1, 2, 3, 4];

function getNotaColor(nota: number | null): string {
  if (nota === null) return '';
  if (nota >= 18) return 'text-green-600 bg-green-50';
  if (nota >= 14) return 'text-blue-600 bg-blue-50';
  if (nota >= 11) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

function getNotaLabel(nota: number | null): string {
  if (nota === null) return 'Sin nota';
  if (nota >= 18) return 'AD';
  if (nota >= 14) return 'A';
  if (nota >= 11) return 'B';
  return 'C';
}

type GradoResumen = {
  grado: string;
  totalAlumnos: number;
  promedioNota: number | null;
  totalFaltas: number;
  totalTardanzas: number;
  totalIncidencias: number;
};

export default function ComportamientoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const esTutor = user?.rol === 'tutor';
  const esDirector = user?.rol === 'director';

  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notas, setNotas] = useState<Record<string, any>>({});
  const [incidenciasCount, setIncidenciasCount] = useState<Record<string, number>>({});
  const [faltasCount, setFaltasCount] = useState<Record<string, number>>({});
  const [tardanzasCount, setTardanzasCount] = useState<Record<string, number>>({});

  const [editando, setEditando] = useState<string | null>(null);
  const [notaEdit, setNotaEdit] = useState('');
  const [obsEdit, setObsEdit] = useState('');
  const [saving, setSaving] = useState(false);

  const [bimestreActual, setBimestreActual] = useState(Math.ceil((getPeruCalendarDate().getMonth() + 1) / 3));
  const anoActual = getPeruCalendarDate().getFullYear();
  const [tutorAsignaciones, setTutorAsignaciones] = useState<{ grado: string; seccion: string }[]>([]);

  const [filtroGrado, setFiltroGrado] = useState('');
  const [resumenPorGrado, setResumenPorGrado] = useState<GradoResumen[]>([]);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportAlumno, setReportAlumno] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    const fetchTutorInfo = async () => {
      if (esTutor && user?.id) {
        const { data } = await supabase
          .from('tutor_asignaciones')
          .select('grado, seccion')
          .eq('tutor_id', user.id);
        if (data && data.length > 0) {
          setTutorAsignaciones(data);
        }
      }
    };
    fetchTutorInfo();
  }, [esTutor, user?.id]);

  const fetchData = useCallback(async () => {
    try {
      let alumnosData: any[] = [];
      if (esTutor && tutorAsignaciones.length > 0) {
        const grados = [...new Set(tutorAsignaciones.map((a: any) => a.grado))];
        const { data } = await supabase
          .from('alumnos')
          .select('perfil_id, grado')
          .in('grado', grados);
        if (data) alumnosData = data;
      } else if (!esTutor) {
        const { data } = await supabase
          .from('alumnos')
          .select('perfil_id, grado, seccion');
        if (data) alumnosData = data;
      }
      if (alumnosData.length === 0 && esTutor) { setLoading(false); return; }
      const ids = (alumnosData || []).map((a: any) => a.perfil_id);
      const alumnoInfoMap: Record<string, any> = {};
      (alumnosData || []).forEach((a: any) => { alumnoInfoMap[a.perfil_id] = a; });

      if (ids.length === 0) { setLoading(false); return; }

      const { data: perfiles } = await supabase
        .from('perfiles')
        .select('id, nombres, apellidos, dni')
        .in('id', ids);
      const perfilMap: Record<string, any> = {};
      (perfiles || []).forEach((p: any) => { perfilMap[p.id] = p; });

      const { data: notasData } = await supabase
        .from('notas_comportamiento')
        .select('*')
        .in('alumno_id', ids)
        .eq('ano', anoActual);
      const notasMap: Record<string, any> = {};
      (notasData || []).forEach((n: any) => {
        notasMap[`${n.alumno_id}-${n.bimestre}`] = n;
      });
      setNotas(notasMap);

      const { data: incidenciasData } = await supabase
        .from('incidencias')
        .select('alumno_id')
        .in('alumno_id', ids);
      const incCount: Record<string, number> = {};
      (incidenciasData || []).forEach((i: any) => {
        incCount[i.alumno_id] = (incCount[i.alumno_id] || 0) + 1;
      });
      setIncidenciasCount(incCount);

      const { data: faltasData } = await supabase
        .from('asistencias')
        .select('alumno_id, estado')
        .in('alumno_id', ids)
        .eq('estado', 'falta_injustificada');
      const fCount: Record<string, number> = {};
      (faltasData || []).forEach((f: any) => {
        fCount[f.alumno_id] = (fCount[f.alumno_id] || 0) + 1;
      });
      setFaltasCount(fCount);

      const { data: tardanzasData } = await supabase
        .from('asistencias')
        .select('alumno_id')
        .in('alumno_id', ids)
        .eq('estado', 'tardanza');
      const tCount: Record<string, number> = {};
      (tardanzasData || []).forEach((t: any) => {
        tCount[t.alumno_id] = (tCount[t.alumno_id] || 0) + 1;
      });
      setTardanzasCount(tCount);

      const lista = ids.map(id => {
        const perfil = perfilMap[id];
        const info = alumnoInfoMap[id];
        return {
          id,
          nombre: perfil ? `${perfil.apellidos} ${perfil.nombres}` : id,
          dni: perfil?.dni || '—',
          grado: info?.grado,
          seccion: info?.seccion,
        };
      }).filter(a => a.nombre !== a.id);

      setAlumnos(lista);

      const gradoMap: Record<string, { alumnos: number; faltas: number; tardanzas: number; incidencias: number; notas: number[] }> = {};
      lista.forEach(a => {
        const g = a.grado || '?';
        if (!gradoMap[g]) gradoMap[g] = { alumnos: 0, faltas: 0, tardanzas: 0, incidencias: 0, notas: [] };
        gradoMap[g].alumnos++;
        gradoMap[g].faltas += fCount[a.id] || 0;
        gradoMap[g].tardanzas += tCount[a.id] || 0;
        gradoMap[g].incidencias += incCount[a.id] || 0;
        const notaData = notasMap[`${a.id}-${bimestreActual}`];
        if (notaData?.nota != null) gradoMap[g].notas.push(notaData.nota);
      });

      const resumen: GradoResumen[] = Object.entries(gradoMap).map(([grado, data]) => ({
        grado,
        totalAlumnos: data.alumnos,
        promedioNota: data.notas.length > 0 ? Math.round(data.notas.reduce((s, n) => s + n, 0) / data.notas.length * 10) / 10 : null,
        totalFaltas: data.faltas,
        totalTardanzas: data.tardanzas,
        totalIncidencias: data.incidencias,
      })).sort((a, b) => a.grado.localeCompare(b.grado, undefined, { numeric: true }));

      setResumenPorGrado(resumen);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [esTutor, tutorAsignaciones, anoActual, bimestreActual]);

  useEffect(() => {
    if (tutorAsignaciones.length > 0 || !esTutor) fetchData();
  }, [fetchData, tutorAsignaciones, esTutor]);

  const handleSaveNota = async (alumnoId: string) => {
    setSaving(true);
    try {
      const nota = notaEdit ? parseFloat(notaEdit) : null;
      if (nota !== null && (nota < 0 || nota > 20)) {
        toast.error('La nota debe estar entre 0 y 20');
        setSaving(false);
        return;
      }

      const existing = notas[`${alumnoId}-${bimestreActual}`];
      const alumno = alumnos.find(a => a.id === alumnoId);

      if (existing) {
        const { error } = await supabase
          .from('notas_comportamiento')
          .update({ nota, observaciones: obsEdit, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notas_comportamiento').insert({
          alumno_id: alumnoId,
          alumno_nombre: alumno?.nombre || '',
          alumno_dni: alumno?.dni || '',
          grado: alumno?.grado,
          seccion: alumno?.seccion,
          bimestre: bimestreActual,
          ano: anoActual,
          nota,
          observaciones: obsEdit,
          registrado_por: user?.id,
          registrado_por_nombre: `${user?.apellidos} ${user?.nombres}`,
        });
        if (error) throw error;
      }

      toast.success('Nota guardada');
      setEditando(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const openReporte = async (alumno: any) => {
    setReportAlumno(alumno);

    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('fecha, estado')
      .eq('alumno_id', alumno.id);

    const { data: incData } = await supabase
      .from('incidencias')
      .select('*')
      .eq('alumno_id', alumno.id)
      .order('fecha', { ascending: false });

    const { data: obsData } = await supabase
      .from('observaciones')
      .select('*')
      .eq('alumno_id', alumno.id)
      .order('fecha', { ascending: false });

    const { data: notasData } = await supabase
      .from('notas_comportamiento')
      .select('*')
      .eq('alumno_id', alumno.id)
      .eq('ano', anoActual);

    const { data: alumnoInfo } = await supabase
      .from('alumnos')
      .select('firma_apoderado, apoderado_nombre, apoderado_celular')
      .eq('perfil_id', alumno.id)
      .maybeSingle();

    setReportData({
      asistencias: asistencias || [],
      incidencias: incData || [],
      observaciones: obsData || [],
      notas: notasData || [],
      firmaApoderado: alumnoInfo?.firma_apoderado,
      apoderadoNombre: alumnoInfo?.apoderado_nombre,
    });
    setReportOpen(true);
  };

  const exportReportPDF = () => {
    if (!reportAlumno || !reportData) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Reporte Integral - ${reportAlumno.nombre}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`DNI: ${reportAlumno.dni} · Grado: ${reportAlumno.grado} · Sección: ${reportAlumno.seccion}`, 14, 22);
    doc.text(`Fecha: ${getPeruDate()}`, 14, 28);

    let y = 38;
    doc.setFontSize(12);
    doc.text('Resumen de Asistencia', 14, y);
    y += 8;
    const conteo = { presente: 0, tardanza: 0, falta_justificada: 0, falta_injustificada: 0 };
    reportData.asistencias.forEach((a: any) => { conteo[a.estado as keyof typeof conteo] = (conteo[a.estado as keyof typeof conteo] || 0) + 1; });
    doc.setFontSize(10);
    doc.text(`Presentes: ${conteo.presente} | Tardanzas: ${conteo.tardanza} | Justificadas: ${conteo.falta_justificada} | Injustificadas: ${conteo.falta_injustificada}`, 14, y);
    y += 10;

    if (reportData.incidencias.length > 0) {
      doc.setFontSize(12);
      doc.text('Incidencias', 14, y);
      y += 8;
      (doc as any).autoTable({
        head: [['Fecha', 'Tipo', 'Título', 'Descripción']],
        body: reportData.incidencias.map((i: any) => [i.fecha, i.tipo, i.titulo, i.descripcion?.slice(0, 50)]),
        startY: y,
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportData.observaciones.length > 0) {
      doc.setFontSize(12);
      doc.text('Observaciones', 14, y);
      y += 8;
      (doc as any).autoTable({
        head: [['Fecha', 'Tipo', 'Observación']],
        body: reportData.observaciones.map((o: any) => [o.fecha, o.tipo, o.observacion?.slice(0, 60)]),
        startY: y,
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportData.notas.length > 0) {
      doc.setFontSize(12);
      doc.text('Notas de Comportamiento', 14, y);
      y += 8;
      (doc as any).autoTable({
        head: [['Bimestre', 'Nota', 'Observaciones']],
        body: reportData.notas.map((n: any) => [`B${n.bimestre}`, n.nota?.toString() || '—', n.observaciones?.slice(0, 50) || '']),
        startY: y,
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportData.apoderadoNombre) {
      doc.setFontSize(10);
      doc.text(`Apoderado: ${reportData.apoderadoNombre}`, 14, y);
      y += 6;
      if (reportData.firmaApoderado) {
        doc.text('Firma del apoderado: _______________________', 14, y);
      } else {
        doc.text('Firma del apoderado: (pendiente)', 14, y);
      }
    }

    doc.save(`reporte-${reportAlumno.dni}-${getPeruDate()}.pdf`);
    toast.success('Reporte exportado');
  };

  const filteredAlumnos = alumnos.filter(a => {
    if (filtroGrado && a.grado !== filtroGrado) return false;
    if (search) {
      const s = search.toLowerCase();
      return a.nombre.toLowerCase().includes(s) || a.dni.includes(s);
    }
    return true;
  });

  const getNotaBadge = (nota: number | null) => {
    if (nota === null) return <span className="text-xs text-muted-foreground">—</span>;
    return <Badge variant="outline" className={`rounded-md text-xs font-bold ${getNotaColor(nota)}`}>{getNotaLabel(nota)} ({nota})</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Comportamiento</h1>
            <p className="text-sm text-muted-foreground">Bimestre {bimestreActual} - {anoActual}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {esDirector && (
            <Select value={filtroGrado || 'all'} onValueChange={(v) => setFiltroGrado(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-10 rounded-xl border-border sm:w-28">
                <SelectValue placeholder="Grado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {resumenPorGrado.map(r => <SelectItem key={r.grado} value={r.grado}>{r.grado}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={bimestreActual.toString()} onValueChange={(v) => setBimestreActual(parseInt(v))}>
            <SelectTrigger className="h-10 rounded-xl border-border sm:w-36">
              <SelectValue placeholder="Bimestre" />
            </SelectTrigger>
            <SelectContent>
              {bimestres.map(b => <SelectItem key={b} value={b.toString()}>{b}° Bimestre</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      ) : (
        <>
          {resumenPorGrado.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Resumen por Grado</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {resumenPorGrado.map(r => (
                  <Card key={r.grado} className={`shadow-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/30 ${filtroGrado === r.grado ? 'ring-2 ring-primary' : ''}`} onClick={() => setFiltroGrado(filtroGrado === r.grado ? '' : r.grado)}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <GraduationCap className="h-4 w-4 text-primary" />
                          </div>
                          <p className="font-bold text-foreground">{r.grado}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{r.totalAlumnos} alumnos</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-green-50 p-2 text-center">
                          <p className="font-bold text-green-700">{r.totalAlumnos - r.totalFaltas}</p>
                          <p className="text-green-600">Asistencia</p>
                        </div>
                        <div className="rounded-lg bg-red-50 p-2 text-center">
                          <p className="font-bold text-red-700">{r.totalFaltas}</p>
                          <p className="text-red-600">Faltas</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-2 text-center">
                          <p className="font-bold text-amber-700">{r.totalTardanzas}</p>
                          <p className="text-amber-600">Tardanzas</p>
                        </div>
                        <div className="rounded-lg bg-orange-50 p-2 text-center">
                          <p className="font-bold text-orange-700">{r.totalIncidencias}</p>
                          <p className="text-orange-600">Incidencias</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                        <span className="text-xs text-muted-foreground">Promedio nota</span>
                        {r.promedioNota !== null ? (
                          <Badge variant="outline" className={`text-xs font-bold ${getNotaColor(r.promedioNota)}`}>{r.promedioNota}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Card className="shadow-card">
            <CardHeader className="pb-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  {filtroGrado ? `Grado ${filtroGrado}` : 'Todos los Grados'} — {filteredAlumnos.length} alumnos
                </CardTitle>
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar alumno..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 rounded-xl border-border bg-background pl-10 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Alumno</TableHead>
                      <TableHead className="font-semibold text-center">Grado</TableHead>
                      <TableHead className="font-semibold text-center">Faltas</TableHead>
                      <TableHead className="font-semibold text-center">Tardanzas</TableHead>
                      <TableHead className="font-semibold text-center">Incidencias</TableHead>
                      <TableHead className="font-semibold text-center">Nota</TableHead>
                      <TableHead className="font-semibold">Observaciones</TableHead>
                      <TableHead className="font-semibold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlumnos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <div className="flex flex-col items-center gap-2 py-8 text-center">
                            <GraduationCap className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No hay alumnos</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAlumnos.map((alumno) => {
                        const notaData = notas[`${alumno.id}-${bimestreActual}`];
                        const estaEditando = editando === alumno.id;
                        return (
                          <TableRow key={alumno.id} className="hover:bg-muted/30">
                            <TableCell>
                              <p className="text-sm font-medium">{alumno.nombre}</p>
                              <p className="text-xs text-muted-foreground">DNI {alumno.dni}</p>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="rounded-md text-xs">{alumno.grado}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-sm font-bold ${(faltasCount[alumno.id] || 0) > 3 ? 'text-red-600' : 'text-foreground'}`}>
                                {faltasCount[alumno.id] || 0}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-bold">{tardanzasCount[alumno.id] || 0}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-sm font-bold ${(incidenciasCount[alumno.id] || 0) > 2 ? 'text-red-600' : 'text-foreground'}`}>
                                {incidenciasCount[alumno.id] || 0}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {estaEditando ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.1"
                                  value={notaEdit}
                                  onChange={(e) => setNotaEdit(e.target.value)}
                                  className="h-8 w-16 text-center text-sm mx-auto"
                                />
                              ) : (
                                getNotaBadge(notaData?.nota ?? null)
                              )}
                            </TableCell>
                            <TableCell>
                              {estaEditando ? (
                                <Input
                                  value={obsEdit}
                                  onChange={(e) => setObsEdit(e.target.value)}
                                  placeholder="Observaciones..."
                                  className="h-8 text-xs"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                                  {notaData?.observaciones || '—'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {estaEditando ? (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleSaveNota(alumno.id)} disabled={saving}>
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditando(null)}>
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                      setEditando(alumno.id);
                                      setNotaEdit(notaData?.nota?.toString() || '');
                                      setObsEdit(notaData?.observaciones || '');
                                    }}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openReporte(alumno)}>
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
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
        </>
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {reportAlumno && reportData && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Reporte Integral - {reportAlumno.nombre}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border bg-muted/30 p-3 text-center">
                    <p className="text-lg font-bold text-red-600">{faltasCount[reportAlumno.id] || 0}</p>
                    <p className="text-xs text-muted-foreground">Faltas</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{tardanzasCount[reportAlumno.id] || 0}</p>
                    <p className="text-xs text-muted-foreground">Tardanzas</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3 text-center">
                    <p className="text-lg font-bold text-orange-600">{incidenciasCount[reportAlumno.id] || 0}</p>
                    <p className="text-xs text-muted-foreground">Incidencias</p>
                  </div>
                </div>

                {reportData.notas.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Notas por bimestre</p>
                    <div className="grid grid-cols-4 gap-2">
                      {reportData.notas.map((n: any) => (
                        <div key={n.bimestre} className={`rounded-lg p-2 text-center ${getNotaColor(n.nota)}`}>
                          <p className="text-xs font-medium">B{n.bimestre}</p>
                          <p className="text-lg font-bold">{n.nota?.toString() || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.incidencias.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Incidencias ({reportData.incidencias.length})</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {reportData.incidencias.slice(0, 5).map((inc: any) => (
                        <div key={inc.id} className="rounded-lg border p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{inc.fecha}</span>
                            <Badge variant="secondary" className="text-[10px]">{inc.tipo}</Badge>
                          </div>
                          <p className="text-xs mt-1">{inc.titulo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.observaciones.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Observaciones ({reportData.observaciones.length})</p>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {reportData.observaciones.slice(0, 3).map((obs: any) => (
                        <div key={obs.id} className="rounded-lg border p-2">
                          <span className="text-xs text-muted-foreground">{obs.fecha}</span>
                          <p className="text-xs mt-1">{obs.observacion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Apoderado</p>
                  <p className="text-sm font-medium mt-1">{reportData.apoderadoNombre || '—'}</p>
                  {reportData.firmaApoderado ? (
                    <p className="text-xs text-green-600 mt-1">✓ Firma registrada</p>
                  ) : (
                    <p className="text-xs text-amber-600 mt-1">Firma pendiente</p>
                  )}
                </div>

                <Button onClick={exportReportPDF} className="w-full gap-2 rounded-xl">
                  <FileText className="h-4 w-4" />
                  Exportar Reporte PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
