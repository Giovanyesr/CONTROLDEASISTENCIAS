'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardData } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  CheckCircle2,
  Clock,
  UserCheck,
  XCircle,
  FileWarning,
  Percent,
  Activity,
  ShieldCheck,
  TrendingUp,
  Calendar,
  Loader2,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatTime, getPeruDate, getEstadoLabel } from '@/lib/utils';
import { playSuccessBeep } from '@/lib/beep';
import toast from 'react-hot-toast';

function AnimatedValue({ value, label, suffix = '', icon: Icon, color }: { value: number; label: string; suffix?: string; icon?: any; color?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current && displayed === value) return;
    hasAnimated.current = true;
    let start = 0;
    const duration = 800;
    const step = Math.max(1, Math.floor(value / 30));
    if (value === 0) { setDisplayed(0); return; }
    const interval = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(interval);
      } else {
        setDisplayed(start);
      }
    }, duration / (value / step || 1));
    return () => clearInterval(interval);
  }, [value]);

  return (
    <div>
      <p className="text-2xl font-bold tracking-tight text-foreground">
        <span ref={ref}>{displayed}</span>{suffix}
      </p>
      <p className="text-xs font-medium text-muted-foreground/80">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [ultimosRegistros, setUltimosRegistros] = useState<any[]>([]);
  const [misStats, setMisStats] = useState<any>(null);
  const supabase = createClient();

  const esBrigadier = user?.rol === 'brigadier';

  const [mesAsistencias, setMesAsistencias] = useState<Record<string, string>>({});
  const [diaSeleccionado, setDiaSeleccionado] = useState<{ fecha: string; estado?: string; hora?: string; brigadier_nombre?: string } | null>(null);
  const [diaOpen, setDiaOpen] = useState(false);
  const [cerrandoAsistencia, setCerrandoAsistencia] = useState(false);
  const [confirmCerrarOpen, setConfirmCerrarOpen] = useState(false);
  const [fechaRegistro, setFechaRegistro] = useState<string | null>(null);

  const noLaborablesRef = useRef<Set<string>>(new Set());

  const esLaborable = (fecha: string) => {
    const d = new Date(fecha + 'T12:00:00');
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return false;
    if (noLaborablesRef.current.has(fecha)) return false;
    return true;
  };

  const now = new Date();
  const peruOffset = -5 * 60;
  const localOffset = now.getTimezoneOffset();
  const peruNow = new Date(now.getTime() + (localOffset + peruOffset) * 60000);
  const añoActual = peruNow.getFullYear();
  const mesActual = peruNow.getMonth();
  const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
  const primerDia = new Date(añoActual, mesActual, 1).getDay();
  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];
  const estadoColor: Record<string, string> = {
    presente: 'bg-green-500 text-white',
    tardanza: 'bg-amber-400 text-amber-900',
    falta_justificada: 'bg-sky-400 text-white',
    falta_injustificada: 'bg-red-500 text-white',
  };
  const estadoDot: Record<string, string> = {
    presente: 'bg-green-500',
    tardanza: 'bg-amber-400',
    falta_justificada: 'bg-sky-400',
    falta_injustificada: 'bg-red-500',
  };

  useEffect(() => {
    const fetchDias = async () => {
      try {
        const sup = createClient();
        const { data } = await sup.from('dias_no_laborables').select('fecha');
        noLaborablesRef.current = new Set((data || []).map((r: any) => r.fecha));
      } catch { /* table may not exist */ }
    };
    fetchDias();

    const cargarDashboard = async () => {
      if (esBrigadier) {
        const { data: dashboard } = await supabase
          .from('vista_dashboard')
          .select('*')
          .single();
        setData(dashboard);
      }

      if (!esBrigadier && user?.id) {
        const { data: alumno } = await supabase
          .from('alumnos')
          .select('created_at')
          .eq('perfil_id', user.id)
          .single();
        if (alumno?.created_at) {
          setFechaRegistro(new Date(alumno.created_at).toISOString().split('T')[0]);
        }

        const { data: stats } = await supabase
          .from('asistencias')
          .select('estado')
          .eq('alumno_id', user.id);
        setMisStats(stats || []);

        const primerDiaMes = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-01`;
        const { data: mesData } = await supabase
          .from('asistencias')
          .select('fecha, estado')
          .eq('alumno_id', user.id)
          .gte('fecha', primerDiaMes);
        if (mesData) {
          setMesAsistencias(Object.fromEntries(mesData.map(r => [r.fecha, r.estado])));
        }
      }

      const query = supabase
        .from('asistencias')
        .select(`
          *,
          alumno:perfiles!asistencias_alumno_id_fkey(nombres, apellidos, dni)
        `)
        .eq('fecha', getPeruDate())
        .order('created_at', { ascending: false })
        .limit(10);

      if (!esBrigadier && user?.id) {
        query.eq('alumno_id', user.id);
      }

      const { data: registros } = await query;
      setUltimosRegistros(registros || []);
    };

    cargarDashboard().then(() => setDataLoaded(true));

    const canal = supabase
      .channel('dashboard-cambios')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asistencias' },
        () => cargarDashboard()
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [user]);

  const presentes = (misStats ?? []).filter((s: any) => s.estado === 'presente').length;
  const tardanzas = (misStats ?? []).filter((s: any) => s.estado === 'tardanza').length;
  const faltasJustificadas = (misStats ?? []).filter((s: any) => s.estado === 'falta_justificada').length;
  const faltasInjustificadas = (misStats ?? []).filter((s: any) => s.estado === 'falta_injustificada').length;
  const totalAsistencia = (data?.presentes_hoy ?? 0) + (data?.tardanzas_hoy ?? 0);
  const totalEstudiantes = data?.total_estudiantes ?? 1;
  const porcentajeGeneral = Math.round((totalAsistencia / totalEstudiantes) * 100);
  const totalMisRegistros = presentes + tardanzas + faltasJustificadas + faltasInjustificadas;
  const porcentajePersonal = totalMisRegistros > 0 ? Math.round(((presentes + tardanzas) / totalMisRegistros) * 100) : 0;

  const pctValue = esBrigadier ? porcentajeGeneral : porcentajePersonal;
  const pctColor = pctValue >= 80 ? '#22c55e' : pctValue >= 60 ? '#eab308' : '#ef4444';
  const circumference = 2 * Math.PI * 42;

  const dateStr = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const todayRegistros = ultimosRegistros.filter(r => r.fecha === getPeruDate());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {esBrigadier ? 'Panel de Control' : 'Mi Asistencia'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground capitalize">
            {dateStr}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-4 py-2 text-sm shadow-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Hoy</span>
          </div>
          {esBrigadier && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmCerrarOpen(true)}
                disabled={cerrandoAsistencia}
                className="gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 transition-all hover:bg-red-100 hover:border-red-300 active:scale-95 disabled:opacity-50"
              >
                {cerrandoAsistencia ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {cerrandoAsistencia ? 'Cerrando...' : 'Cerrar Asistencia'}
              </Button>
            </>
          )}
        </div>
      </div>

      {esBrigadier && !dataLoaded ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-card overflow-hidden">
              <CardContent className="p-5">
                <div className="skeleton skeleton-sm mb-3" />
                <div className="skeleton skeleton-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : esBrigadier ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: 'Total Estudiantes', value: data?.total_estudiantes ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', gradient: 'from-blue-500/10' },
            { label: 'Presentes', value: data?.presentes_hoy ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', gradient: 'from-green-500/10' },
            { label: 'Tardanzas', value: data?.tardanzas_hoy ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', gradient: 'from-amber-500/10' },
            { label: 'Faltas Justificadas', value: data?.faltas_justificadas_hoy ?? 0, icon: FileWarning, color: 'text-sky-600', bg: 'bg-sky-100', gradient: 'from-sky-500/10' },
            { label: 'Faltas Injustificadas', value: data?.faltas_injustificadas_hoy ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', gradient: 'from-red-500/10' },
            { label: 'Brigadieres', value: data?.brigadieres_conectados ?? 0, icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-100', gradient: 'from-purple-500/10', live: true },
          ].map((stat, index) => {
            const Icon = stat.icon;
            const isLive = 'live' in stat;
            return (
              <Card
                key={stat.label}
                className="card-hover-border animate-fade-in-up shadow-card overflow-hidden"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <CardContent className="relative p-5">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} to-transparent opacity-60`} />
                  <div className="relative flex items-start justify-between">
                    <AnimatedValue value={stat.value} label={stat.label} />
                    <div className="flex flex-col items-end gap-2">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-green-600 font-medium">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-live-pulse" />
                          En vivo
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Presentes', value: presentes, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
            { label: 'Tardanzas', value: tardanzas, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
            { label: 'Faltas Justificadas', value: faltasJustificadas, icon: FileWarning, color: 'text-sky-600', bg: 'bg-sky-100' },
            { label: 'Faltas Injustificadas', value: faltasInjustificadas, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="card-hover-border animate-fade-in-up shadow-card overflow-hidden"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <CardContent className="relative p-5">
                  <div className="flex items-start justify-between">
                    <AnimatedValue value={stat.value} label={stat.label} />
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Percent className="h-5 w-5 text-primary" />
              {esBrigadier ? 'Asistencia General' : 'Mi Asistencia'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center animate-fade-in-up">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke={pctColor}
                    strokeWidth="8"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={`${circumference * (1 - pctValue / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{
                      filter: `drop-shadow(0 0 4px ${pctColor}60)`,
                    }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold tracking-tight text-foreground">
                  {pctValue}%
                </span>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl bg-green-50/80 px-4 py-3 ring-1 ring-green-200/50">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <div>
                    <p className="text-xs text-green-700/70">Presentes</p>
                    <p className="text-sm font-semibold text-green-800">{esBrigadier ? data?.presentes_hoy ?? 0 : presentes}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-amber-50/80 px-4 py-3 ring-1 ring-amber-200/50">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-xs text-amber-700/70">Tardanzas</p>
                    <p className="text-sm font-semibold text-amber-800">{esBrigadier ? data?.tardanzas_hoy ?? 0 : tardanzas}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-red-50/80 px-4 py-3 ring-1 ring-red-200/50">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <div>
                    <p className="text-xs text-red-700/70">Faltas</p>
                    <p className="text-sm font-semibold text-red-800">{esBrigadier ? (data?.faltas_justificadas_hoy ?? 0) + (data?.faltas_injustificadas_hoy ?? 0) : faltasJustificadas + faltasInjustificadas}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Activity className="h-5 w-5 text-primary" />
              <span className="flex items-center gap-2">
                {esBrigadier ? 'Registros de Hoy' : 'Mis Registros Hoy'}
                {todayRegistros.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-normal text-green-600">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-live-pulse" />
                    En vivo
                  </span>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayRegistros.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                    <Activity className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Sin registros hoy</p>
                    <p className="text-xs text-muted-foreground">No se han registrado asistencias todavía</p>
                  </div>
                </div>
              ) : (
                todayRegistros.map((r, i) => (
                  <div
                    key={r.id}
                    className="animate-fade-in-up group flex items-center justify-between rounded-xl border border-border bg-card p-3 transition-all duration-200 hover:border-primary/20 hover:shadow-sm hover:bg-primary/[0.02]"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${estadoDot[r.estado] || 'bg-gray-300'}`} />
                      <div className="min-w-0">
                        {esBrigadier && (
                          <p className="truncate text-sm font-medium text-foreground">
                            {r.alumno?.nombres} {r.alumno?.apellidos}
                          </p>
                        )}
                        {!esBrigadier && (
                          <p className="text-sm font-medium text-foreground">
                            {getEstadoLabel(r.estado)}
                          </p>
                        )}
                        {esBrigadier && (
                          <p className="text-xs text-muted-foreground">DNI: {r.alumno?.dni}</p>
                        )}
                      </div>
                    </div>
                    <div className="ml-3 flex items-center gap-3">
                      <Badge
                        variant={
                          r.estado === 'presente' ? 'default' :
                          r.estado === 'tardanza' ? 'secondary' : 'destructive'
                        }
                        className="rounded-md px-2.5 py-0.5 text-xs font-medium"
                      >
                        {r.estado === 'presente' ? 'Presente' :
                         r.estado === 'tardanza' ? 'Tardanza' :
                         r.estado === 'falta_justificada' ? 'Justificada' : 'Injustificada'}
                      </Badge>
                      <span className="text-xs text-muted-foreground/70 tabular-nums">{formatTime(r.hora)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {!esBrigadier && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5 text-primary" />
              {mesesNombres[mesActual]} {añoActual}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => (
                <div key={d} className="py-1.5 font-medium text-muted-foreground/60">{d}</div>
              ))}
              {Array.from({ length: primerDia }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
               {Array.from({ length: diasEnMes }, (_, i) => {
                const dia = i + 1;
                const fecha = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const rawEstado = mesAsistencias[fecha];
                const noLaborable = !esLaborable(fecha);
                const esFuturo = fecha > peruNow.toISOString().split('T')[0];
                const hoy = fecha === peruNow.toISOString().split('T')[0];
                const esPasadoLaborable = !esFuturo && !noLaborable;
                const antesDeRegistro = fechaRegistro && fecha < fechaRegistro;
                const estado = rawEstado || (esPasadoLaborable && !antesDeRegistro ? 'falta_injustificada' : undefined);
                const clickable = !!estado;
                return (
                  <div
                    key={dia}
                    onClick={async () => {
                      if (clickable && estado) {
                        setDiaSeleccionado({ fecha, estado });
                        setDiaOpen(true);
                        if (rawEstado) {
                          try {
                            const { data } = await supabase
                              .from('asistencias')
                              .select('hora, brigadier_id')
                              .eq('alumno_id', user?.id)
                              .eq('fecha', fecha)
                              .maybeSingle();
                            if (data) {
                              let bNombre: string | undefined;
                              if (data.brigadier_id) {
                                const { data: b } = await supabase
                                  .from('perfiles')
                                  .select('nombres, apellidos')
                                  .eq('id', data.brigadier_id)
                                  .maybeSingle();
                                if (b) bNombre = `${b.nombres} ${b.apellidos}`;
                              }
                              setDiaSeleccionado(prev => prev ? { ...prev, hora: data.hora?.slice(0, 5), brigadier_nombre: bNombre } : prev);
                            }
                          } catch {}
                        }
                      }
                    }}
                    className={`
                      relative flex aspect-square items-center justify-center rounded-xl text-xs font-medium transition-all duration-150
                      ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-primary/30 hover:scale-105 hover:shadow-md' : ''}
                      ${hoy ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                      ${esFuturo ? 'text-muted-foreground/20' : noLaborable ? 'text-muted-foreground/15' : ''}
                      ${estado ? estadoColor[estado] || 'bg-gray-200' : 'text-muted-foreground/20'}
                    `}
                    title={`${dia} de ${mesesNombres[mesActual]}${estado ? ` - ${getEstadoLabel(estado)}` : ''}`}
                  >
                    <span className="relative z-10">{dia}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-md bg-green-500" /> Presente</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-md bg-amber-400" /> Tardanza</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-md bg-sky-400" /> Justificada</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-md bg-red-500" /> Falta</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={diaOpen} onOpenChange={setDiaOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {diaSeleccionado?.fecha
                ? new Date(diaSeleccionado.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : 'Detalle del día'}
            </DialogTitle>
          </DialogHeader>
          <div className="pb-2">
            {diaSeleccionado?.estado ? (
              <div className="flex flex-col items-center gap-4 text-center animate-scale-in">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${estadoColor[diaSeleccionado.estado]} shadow-lg shadow-${diaSeleccionado.estado === 'presente' ? 'green' : diaSeleccionado.estado === 'tardanza' ? 'amber' : 'red'}-500/20`}>
                  {diaSeleccionado.estado === 'presente' ? <CheckCircle2 className="h-8 w-8" /> :
                   diaSeleccionado.estado === 'tardanza' ? <Clock className="h-8 w-8" /> :
                   diaSeleccionado.estado === 'falta_justificada' ? <FileWarning className="h-8 w-8" /> :
                   <XCircle className="h-8 w-8" />}
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{getEstadoLabel(diaSeleccionado.estado)}</p>
                  {diaSeleccionado.hora ? (
                    <div className="mt-3 space-y-2 text-left">
                      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-2.5">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-sm text-foreground">
                          <span className="text-muted-foreground">Registrado a las </span>
                          <span className="font-medium">{diaSeleccionado.hora}</span>
                        </p>
                      </div>
                      {diaSeleccionado.brigadier_nombre && (
                        <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-2.5">
                          <UserCheck className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-sm text-foreground">
                            <span className="text-muted-foreground">Registrado por: </span>
                            <span className="font-medium">{diaSeleccionado.brigadier_nombre}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Todo el día</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <Calendar className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">Sin registro de asistencia este día</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCerrarOpen} onOpenChange={setConfirmCerrarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar Asistencia del Día</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará como <strong>falta injustificada</strong> a todos los estudiantes que no hayan registrado su asistencia hoy. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cerrandoAsistencia}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setCerrandoAsistencia(true);
                try {
                  const res = await fetch('/api/asistencia/cerrar-dia', { method: 'POST' });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  playSuccessBeep();
                  toast.success(data.message);
                  setConfirmCerrarOpen(false);
                  window.location.reload();
                } catch (err: any) {
                  toast.error(err.message);
                  setConfirmCerrarOpen(false);
                } finally {
                  setCerrandoAsistencia(false);
                }
              }}
              disabled={cerrandoAsistencia}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cerrandoAsistencia ? 'Cerrando...' : 'Sí, cerrar asistencia'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
