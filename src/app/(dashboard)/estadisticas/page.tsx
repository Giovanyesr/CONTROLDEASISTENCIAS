'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3, Users, Clock, XCircle, TrendingUp, AlertTriangle,
  GraduationCap, Loader2, ArrowLeft, Trophy, Target, CheckCircle2,
} from 'lucide-react';
import { getPeruCalendarDate } from '@/lib/utils';

type GradoStats = {
  totalAlumnos: number;
  presentes: number;
  tardanzas: number;
  justificadas: number;
  injustificadas: number;
  total: number;
  asistenciaPct: number;
};

export default function EstadisticasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const esDirector = user?.rol === 'director';

  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState(getPeruCalendarDate().getMonth().toString());
  const [filtroAno, setFiltroAno] = useState(getPeruCalendarDate().getFullYear().toString());

  const [resumen, setResumen] = useState({
    totalAlumnos: 0,
    totalRegistros: 0,
    presentes: 0,
    tardanzas: 0,
    justificadas: 0,
    injustificadas: 0,
    asistenciaPct: 0,
  });
  const [porGrado, setPorGrado] = useState<Record<string, GradoStats>>({});
  const [topFaltas, setTopFaltas] = useState<any[]>([]);
  const [topTardanzas, setTopTardanzas] = useState<any[]>([]);

  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];

  useEffect(() => {
    if (authLoading) return;
    if (!esDirector) {
      router.replace('/dashboard');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const mes = parseInt(filtroMes) + 1;
      const primerDia = `${filtroAno}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(parseInt(filtroAno), parseInt(filtroMes) + 1, 0).getDate();
      const ultimoDiaStr = `${filtroAno}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

      const { data: alumnosData } = await supabase
        .from('alumnos')
        .select('perfil_id, grado');

      const alumnoGradoMap: Record<string, string> = {};
      (alumnosData || []).forEach((a: any) => {
        alumnoGradoMap[a.perfil_id] = a.grado || '?';
      });

      const totalAlumnosActivos = (alumnosData || []).length;

      const { data: asistencias } = await supabase
        .from('asistencias')
        .select('alumno_id, estado, fecha')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDiaStr)
        .range(0, 9999);

      const statsMap: Record<string, { faltas: number; tardanzas: number; presentes: number; justificadas: number; injustificadas: number; total: number; nombre: string; dni: string; grado: string }> = {};
      (asistencias || []).forEach((r: any) => {
        if (!statsMap[r.alumno_id]) {
          statsMap[r.alumno_id] = { faltas: 0, tardanzas: 0, presentes: 0, justificadas: 0, injustificadas: 0, total: 0, nombre: '', dni: '', grado: alumnoGradoMap[r.alumno_id] || '?' };
        }
        statsMap[r.alumno_id].total++;
        if (r.estado === 'presente') statsMap[r.alumno_id].presentes++;
        else if (r.estado === 'tardanza') statsMap[r.alumno_id].tardanzas++;
        else if (r.estado === 'falta_justificada') statsMap[r.alumno_id].justificadas++;
        else statsMap[r.alumno_id].injustificadas++;
      });

      const perfilesIds = Object.keys(statsMap);
      if (perfilesIds.length > 0) {
        const { data: perfiles } = await supabase
          .from('perfiles')
          .select('id, nombres, apellidos, dni')
          .in('id', perfilesIds);
        (perfiles || []).forEach((p: any) => {
          if (statsMap[p.id]) {
            statsMap[p.id].nombre = `${p.apellidos} ${p.nombres}`;
            statsMap[p.id].dni = p.dni;
          }
        });
      }

      const todosAlumnos = Object.values(statsMap);
      const totalRegistros = todosAlumnos.reduce((s, a) => s + a.total, 0);
      const totalPresentes = todosAlumnos.reduce((s, a) => s + a.presentes, 0);
      const totalTardanzas = todosAlumnos.reduce((s, a) => s + a.tardanzas, 0);
      const totalJustificadas = todosAlumnos.reduce((s, a) => s + a.justificadas, 0);
      const totalInjustificadas = todosAlumnos.reduce((s, a) => s + a.injustificadas, 0);

      setResumen({
        totalAlumnos: totalAlumnosActivos,
        totalRegistros,
        presentes: totalPresentes,
        tardanzas: totalTardanzas,
        justificadas: totalJustificadas,
        injustificadas: totalInjustificadas,
        asistenciaPct: totalRegistros > 0 ? Math.round(((totalPresentes + totalTardanzas) / totalRegistros) * 100) : 0,
      });

      const gradoStats: Record<string, GradoStats> = {};
      const gradoAlumnosCount: Record<string, Set<string>> = {};
      todosAlumnos.forEach(a => {
        const g = a.grado;
        if (!gradoStats[g]) gradoStats[g] = { totalAlumnos: 0, presentes: 0, tardanzas: 0, justificadas: 0, injustificadas: 0, total: 0, asistenciaPct: 0 };
        if (!gradoAlumnosCount[g]) gradoAlumnosCount[g] = new Set();
        gradoAlumnosCount[g].add(a.nombre || a.dni);
        gradoStats[g].presentes += a.presentes;
        gradoStats[g].tardanzas += a.tardanzas;
        gradoStats[g].justificadas += a.justificadas;
        gradoStats[g].injustificadas += a.injustificadas;
        gradoStats[g].total += a.total;
      });
      Object.keys(gradoStats).forEach(g => {
        gradoStats[g].totalAlumnos = gradoAlumnosCount[g]?.size || 0;
        gradoStats[g].asistenciaPct = gradoStats[g].total > 0
          ? Math.round(((gradoStats[g].presentes + gradoStats[g].tardanzas) / gradoStats[g].total) * 100)
          : 0;
      });
      setPorGrado(gradoStats);

      setTopFaltas([...todosAlumnos].sort((a, b) => b.injustificadas - a.injustificadas).slice(0, 10));
      setTopTardanzas([...todosAlumnos].sort((a, b) => b.tardanzas - a.tardanzas).slice(0, 10));

      setLoading(false);
    };

    fetchData();
  }, [authLoading, filtroMes, filtroAno, esDirector, router]);

  const anos = Array.from({ length: 5 }, (_, i) => getPeruCalendarDate().getFullYear() - i);

  const pctColor = (pct: number) => pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
  const pctBg = (pct: number) => pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-500';
  const pctBadge = (pct: number) => pct >= 80 ? 'bg-green-50 text-green-700 border-green-200' : pct >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200';

  if (authLoading || !esDirector) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Estadísticas</h1>
            <p className="text-sm text-muted-foreground">Análisis de asistencia institucional</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={filtroMes} onValueChange={setFiltroMes}>
            <SelectTrigger className="h-10 rounded-xl border-border sm:w-36">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {mesesNombres.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger className="h-10 rounded-xl border-border sm:w-28">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando estadísticas...</span>
        </div>
      ) : (
        <>
          {/* RESUMEN GENERAL */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Resumen General</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{resumen.totalAlumnos}</p>
                      <p className="text-xs font-medium text-muted-foreground">Alumnos activos</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100">
                      <Users className="h-5 w-5 text-sky-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-2xl font-bold ${pctColor(resumen.asistenciaPct)}`}>{resumen.asistenciaPct}%</p>
                      <p className="text-xs font-medium text-muted-foreground">Asistencia general</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
                      <Target className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-red-600">{resumen.injustificadas}</p>
                      <p className="text-xs font-medium text-muted-foreground">Faltas injustificadas</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{resumen.tardanzas}</p>
                      <p className="text-xs font-medium text-muted-foreground">Tardanzas</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* DETALLE GENERAL - Barras de distribución */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Distribución de Asistencia - {mesesNombres[parseInt(filtroMes)]} {filtroAno}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumen.totalRegistros === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sin datos para este período</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-green-500" />Presentes</span>
                        <span className="font-semibold text-foreground">{resumen.presentes}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${resumen.totalRegistros > 0 ? (resumen.presentes / resumen.totalRegistros) * 100 : 0}%` }} /></div>
                      <p className="text-xs text-muted-foreground">{resumen.totalRegistros > 0 ? Math.round((resumen.presentes / resumen.totalRegistros) * 100) : 0}%</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Tardanzas</span>
                        <span className="font-semibold text-foreground">{resumen.tardanzas}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${resumen.totalRegistros > 0 ? (resumen.tardanzas / resumen.totalRegistros) * 100 : 0}%` }} /></div>
                      <p className="text-xs text-muted-foreground">{resumen.totalRegistros > 0 ? Math.round((resumen.tardanzas / resumen.totalRegistros) * 100) : 0}%</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" />Justificadas</span>
                        <span className="font-semibold text-foreground">{resumen.justificadas}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${resumen.totalRegistros > 0 ? (resumen.justificadas / resumen.totalRegistros) * 100 : 0}%` }} /></div>
                      <p className="text-xs text-muted-foreground">{resumen.totalRegistros > 0 ? Math.round((resumen.justificadas / resumen.totalRegistros) * 100) : 0}%</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Injustificadas</span>
                        <span className="font-semibold text-foreground">{resumen.injustificadas}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${resumen.totalRegistros > 0 ? (resumen.injustificadas / resumen.totalRegistros) * 100 : 0}%` }} /></div>
                      <p className="text-xs text-muted-foreground">{resumen.totalRegistros > 0 ? Math.round((resumen.injustificadas / resumen.totalRegistros) * 100) : 0}%</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ESTADÍSTICAS POR GRADO */}
          {Object.keys(porGrado).length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Estadísticas por Grado</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(porGrado).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([grado, stats]) => (
                  <Card key={grado} className="shadow-card">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <GraduationCap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{grado}</p>
                            <p className="text-xs text-muted-foreground">{stats.totalAlumnos} alumnos</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`rounded-lg text-sm font-bold ${pctBadge(stats.asistenciaPct)}`}>
                          {stats.asistenciaPct}%
                        </Badge>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full transition-all ${pctBg(stats.asistenciaPct)}`} style={{ width: `${stats.asistenciaPct}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /><span className="text-muted-foreground">Presentes:</span> <span className="font-medium">{stats.presentes}</span></div>
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="text-muted-foreground">Tardanzas:</span> <span className="font-medium">{stats.tardanzas}</span></div>
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /><span className="text-muted-foreground">Justificadas:</span> <span className="font-medium">{stats.justificadas}</span></div>
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-muted-foreground">Injustificadas:</span> <span className="font-medium">{stats.injustificadas}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TOP 10 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Top 10 - Más Faltas Injustificadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topFaltas.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sin datos para este período</p>
                ) : topFaltas.map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${i < 3 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.nombre}</p>
                        <p className="text-xs text-muted-foreground">DNI {a.dni} · {a.grado}</p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="rounded-md">{a.injustificadas} faltas</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Top 10 - Más Tardanzas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topTardanzas.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sin datos para este período</p>
                ) : topTardanzas.map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.nombre}</p>
                        <p className="text-xs text-muted-foreground">DNI {a.dni} · {a.grado}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-md bg-amber-100 text-amber-700">{a.tardanzas} tardanzas</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
