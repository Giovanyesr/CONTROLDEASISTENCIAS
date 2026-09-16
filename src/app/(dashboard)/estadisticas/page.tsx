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
  GraduationCap, Loader2, ArrowLeft, Trophy, Target,
} from 'lucide-react';
import { getPeruDate, getPeruCalendarDate } from '@/lib/utils';

export default function EstadisticasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const esDirector = user?.rol === 'director';

  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState(getPeruCalendarDate().getMonth().toString());
  const [filtroAno, setFiltroAno] = useState(getPeruCalendarDate().getFullYear().toString());

  const [topFaltas, setTopFaltas] = useState<any[]>([]);
  const [topTardanzas, setTopTardanzas] = useState<any[]>([]);
  const [porGrado, setPorGrado] = useState<Record<string, any>>({});
  const [resumenGeneral, setResumenGeneral] = useState({ totalAlumnos: 0, asistenciaGeneral: 0, totalFaltas: 0, totalTardanzas: 0 });

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
        .select('perfil_id, grado, seccion');

      const alumnoGradoMap: Record<string, { grado: string; seccion: string }> = {};
      (alumnosData || []).forEach((a: any) => {
        alumnoGradoMap[a.perfil_id] = { grado: a.grado, seccion: a.seccion };
      });

      const { data: asistencias } = await supabase
        .from('asistencias')
        .select('alumno_id, estado, fecha')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDiaStr)
        .range(0, 9999);

      const statsMap: Record<string, { faltas: number; tardanzas: number; presentes: number; total: number; nombre: string; dni: string; grado: string }> = {};
      (asistencias || []).forEach((r: any) => {
        if (!statsMap[r.alumno_id]) {
          const info = alumnoGradoMap[r.alumno_id] || { grado: '?', seccion: '?' };
          statsMap[r.alumno_id] = { faltas: 0, tardanzas: 0, presentes: 0, total: 0, nombre: '', dni: '', grado: info.grado };
        }
        statsMap[r.alumno_id].total++;
        if (r.estado === 'presente') statsMap[r.alumno_id].presentes++;
        else if (r.estado === 'tardanza') statsMap[r.alumno_id].tardanzas++;
        else statsMap[r.alumno_id].faltas++;
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
      const sortedFaltas = [...todosAlumnos].sort((a, b) => b.faltas - a.faltas).slice(0, 10);
      const sortedTardanzas = [...todosAlumnos].sort((a, b) => b.tardanzas - a.tardanzas).slice(0, 10);

      setTopFaltas(sortedFaltas);
      setTopTardanzas(sortedTardanzas);

      const gradoStats: Record<string, { presentes: number; tardanzas: number; faltas: number; total: number }> = {};
      todosAlumnos.forEach(a => {
        const g = a.grado || 'Sin grado';
        if (!gradoStats[g]) gradoStats[g] = { presentes: 0, tardanzas: 0, faltas: 0, total: 0 };
        gradoStats[g].presentes += a.presentes;
        gradoStats[g].tardanzas += a.tardanzas;
        gradoStats[g].faltas += a.faltas;
        gradoStats[g].total += a.total;
      });
      setPorGrado(gradoStats);

      const totalAlumnos = todosAlumnos.length;
      const totalPresentes = todosAlumnos.reduce((s, a) => s + a.presentes, 0);
      const totalRegistros = todosAlumnos.reduce((s, a) => s + a.total, 0);
      const totalFaltas = todosAlumnos.reduce((s, a) => s + a.faltas, 0);
      const totalTardanzas = todosAlumnos.reduce((s, a) => s + a.tardanzas, 0);
      setResumenGeneral({
        totalAlumnos,
        asistenciaGeneral: totalRegistros > 0 ? Math.round(((totalPresentes + totalTardanzas) / totalRegistros) * 100) : 0,
        totalFaltas,
        totalTardanzas,
      });

      setLoading(false);
    };

    fetchData();
  }, [authLoading, filtroMes, filtroAno, esDirector, router]);

  const anos = Array.from({ length: 5 }, (_, i) => getPeruCalendarDate().getFullYear() - i);

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{resumenGeneral.totalAlumnos}</p>
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
                    <p className={`text-2xl font-bold ${resumenGeneral.asistenciaGeneral >= 80 ? 'text-green-600' : resumenGeneral.asistenciaGeneral >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{resumenGeneral.asistenciaGeneral}%</p>
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
                    <p className="text-2xl font-bold text-red-600">{resumenGeneral.totalFaltas}</p>
                    <p className="text-xs font-medium text-muted-foreground">Total faltas</p>
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
                    <p className="text-2xl font-bold text-amber-600">{resumenGeneral.totalTardanzas}</p>
                    <p className="text-xs font-medium text-muted-foreground">Total tardanzas</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Top 10 - Más Faltas
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
                    <Badge variant="destructive" className="rounded-md">{a.faltas} faltas</Badge>
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

          {Object.keys(porGrado).length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Asistencia por Grado - {mesesNombres[parseInt(filtroMes)]} {filtroAno}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(porGrado).sort(([a], [b]) => a.localeCompare(b)).map(([grado, stats]) => {
                    const pct = stats.total > 0 ? Math.round(((stats.presentes + stats.tardanzas) / stats.total) * 100) : 0;
                    return (
                      <div key={grado} className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-foreground">{grado}</p>
                          <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} /></div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />{stats.presentes} P</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{stats.tardanzas} T</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{stats.faltas} F</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
