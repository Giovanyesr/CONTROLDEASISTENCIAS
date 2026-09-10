'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Loader2, Plus, GraduationCap, ArrowLeft, X,
  CalendarDays, Clock, UserCheck, AlertCircle, FileText, ShieldCheck,
  RefreshCw, ChevronLeft, ChevronRight, Eye, EyeOff, Trash2, Download, Lock,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';
import { getPeruDate, getPeruCalendarDate } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


const gradosMap: Record<string, string> = { '1': '1°', '2': '2°', '3': '3°', '4': '4°', '5': '5°' };
const gradosList = ['1°', '2°', '3°', '4°', '5°'];
const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];

const estadoColor: Record<string, string> = {
  presente: 'bg-emerald-500',
  tardanza: 'bg-amber-400',
  falta_justificada: 'bg-blue-400',
  falta_injustificada: 'bg-red-500',
};
const estadoLabel: Record<string, string> = {
  presente: 'Asistió', tardanza: 'Tardanza',
  falta_justificada: 'Justificada', falta_injustificada: 'Falta',
};
const estadoShort: Record<string, string> = {
  presente: 'A', tardanza: 'T',
  falta_justificada: 'J', falta_injustificada: 'F',
};
const estadoBadge: Record<string, string> = {
  presente: 'default', tardanza: 'secondary',
  falta_justificada: 'outline', falta_injustificada: 'destructive',
};

const peruNow = getPeruCalendarDate();

export default function GradoPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const gradoId = params?.grado as string;
  const gradoLabel = gradosMap[gradoId] || `${gradoId}°`;

  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialMes, setHistorialMes] = useState(peruNow.getMonth());
  const [historialAno, setHistorialAno] = useState(peruNow.getFullYear());
  const [mesAsistencias, setMesAsistencias] = useState<Record<string, string>>({});
  const [historialLoading, setHistorialLoading] = useState(false);
  const [statsHistorial, setStatsHistorial] = useState({ presentes: 0, tardanzas: 0, justificadas: 0, faltas: 0, total: 0 });

  const [tutorSection, setTutorSection] = useState<string | null>(null);

  const [diaSeleccionado, setDiaSeleccionado] = useState<{ fecha: string; estado?: string; alumno_id?: string; hora?: string; brigadier_nombre?: string } | null>(null);
  const [diaOpen, setDiaOpen] = useState(false);
  const [justificationInfo, setJustificationInfo] = useState<{ motivo: string; evidencias: { id: string; nombre: string }[]; brigadier_nombre?: string } | null>(null);
  const [loadingJustInfo, setLoadingJustInfo] = useState(false);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tipoRegistro, setTipoRegistro] = useState<'estudiante' | 'brigadier'>('estudiante');
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState<any>({
    dni: '', nombres: '', apellidos: '', celular: '', genero: '',
    grado: '', seccion: '', apoderado_nombre: '', apoderado_celular: '',
    password: '',
  });
  const [formError, setFormError] = useState('');

  const [roleChangeOpen, setRoleChangeOpen] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<any>(null);
  const [roleChanging, setRoleChanging] = useState(false);

  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdNew, setResetPwdNew] = useState('');
  const [resetPwdConfirm, setResetPwdConfirm] = useState('');
  const [resetPwdSaving, setResetPwdSaving] = useState(false);
  const [resetPwdError, setResetPwdError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [noLaborables, setNoLaborables] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchDias = async () => {
      try {
        const sup = createClient();
        const { data } = await sup.from('dias_no_laborables').select('fecha');
        setNoLaborables(new Set((data || []).map((r: any) => r.fecha)));
      } catch { /* table may not exist */ }
    };
    fetchDias();
  }, []);

  const esLaborable = (fecha: string) => {
    const d = new Date(fecha + 'T12:00:00');
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return false;
    if (noLaborables.has(fecha)) return false;
    return true;
  };

  const normalizeGrado = (g: string) => gradosMap[g.replace(/[^\d]/g, '')] || g;

  const fetchPersonas = useCallback(async () => {
    const { data: perfiles } = await supabase
      .from('perfiles')
      .select('*, alumno:alumnos(*), roles_funcionales(rol, activo)')
      .in('rol', ['alumno', 'brigadier'])
      .order('apellidos', { ascending: true });

    const filtered = (perfiles || []).filter((e: any) => {
      if (e.alumno?.grado) return normalizeGrado(e.alumno.grado) === gradoLabel;
      return false;
    }).filter((e: any) => {
      if (!tutorSection) return true;
      return e.alumno?.seccion?.toUpperCase() === tutorSection.toUpperCase();
    });

    const ids = filtered.map((e: any) => e.id);
    let asistenciasMap: Record<string, any[]> = {};

    const fechaRegistroMap: Record<string, string> = {};
    filtered.forEach((e: any) => {
      if (e.alumno?.created_at) {
        fechaRegistroMap[e.id] = getPeruDate(e.alumno.created_at);
      }
    });

    if (ids.length > 0) {
      const { data: records } = await supabase
        .from('asistencias')
        .select('*')
        .in('alumno_id', ids)
        .order('fecha', { ascending: false });

      const lookup: Record<string, Record<string, any>> = {};
      (records || []).forEach(r => {
        if (!lookup[r.alumno_id]) lookup[r.alumno_id] = {};
        lookup[r.alumno_id][r.fecha] = r;
      });

      const last5Days: string[] = [];
      const todayStr = getPeruDate();
      const cursor = new Date(peruNow);
      while (last5Days.length < 5) {
        const d = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        if (esLaborable(d)) {
          last5Days.push(d);
        }
        cursor.setDate(cursor.getDate() - 1);
      }
      last5Days.reverse();

      asistenciasMap = Object.fromEntries(
        ids.map(id => {
          const studentLookup = lookup[id] || {};
          const registroFecha = fechaRegistroMap[id];
          return [id, last5Days.map(fecha => {
            const existing = studentLookup[fecha];
            if (existing) return existing;
            if (registroFecha && fecha < registroFecha) return null;
            return fecha < todayStr ? { fecha, estado: 'falta_injustificada', alumno_id: id, id: `auto-${id}-${fecha}` } : null;
          }).filter(Boolean)];
        })
      );
    }

    setEstudiantes(filtered);
    setAsistencias(asistenciasMap);
  }, [gradoLabel, tutorSection]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      if (currentUser?.rol === 'tutor') {
        const { data } = await supabase
          .from('tutor_asignaciones')
          .select('seccion, grado')
          .eq('tutor_id', currentUser.id)
          .maybeSingle();
        if (data) {
          setTutorSection(data.seccion);
          const num = data.grado.replace(/[^\d]/g, '');
          if (num && num !== gradoId) {
            router.replace(`/estudiantes/${num}`);
            return;
          }
        }
      }

      await fetchPersonas();
      setLoading(false);
    };
    load();

    const canal = supabase
      .channel('grado-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencias' }, () => fetchPersonas())
      .subscribe();

    const intervalo = setInterval(() => fetchPersonas(), 30000);

    return () => { supabase.removeChannel(canal); clearInterval(intervalo); };
  }, [fetchPersonas]);

  const filteredEstudiantes = useMemo(() => {
    if (!search) return estudiantes;
    const s = search.toLowerCase();
    return estudiantes.filter(e =>
      e.dni.includes(s) ||
      e.nombres.toLowerCase().includes(s) ||
      e.apellidos.toLowerCase().includes(s)
    );
  }, [estudiantes, search]);

  const fetchMesAsistencias = useCallback(async (alumnoId: string, mes: number, ano: number, fechaRegistro?: string) => {
    const primerDiaStr = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
    setHistorialLoading(true);
    const { data } = await supabase
      .from('asistencias')
      .select('*')
      .eq('alumno_id', alumnoId)
      .gte('fecha', primerDiaStr)
      .order('fecha', { ascending: false });
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(r => { map[r.fecha] = r.estado; });

      const diasEnMes = new Date(ano, mes + 1, 0).getDate();
      let presentes = 0, tardanzas = 0, justificadas = 0, faltas = 0;

      for (let d = 1; d <= diasEnMes; d++) {
        const fecha = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!esLaborable(fecha)) continue;
        if (fecha > getPeruDate()) continue;
        if (fechaRegistro && fecha < fechaRegistro) continue;

        const estado = map[fecha] || 'falta_injustificada';
        map[fecha] = estado;
        if (estado === 'presente') presentes++;
        else if (estado === 'tardanza') tardanzas++;
        else if (estado === 'falta_justificada') justificadas++;
        else faltas++;
      }

      setMesAsistencias(map);
      setStatsHistorial({ presentes, tardanzas, justificadas, faltas, total: presentes + tardanzas + justificadas + faltas });
    }
    setHistorialLoading(false);
  }, []);

  const openDetail = async (est: any) => {
    setSelectedStudentDetail(est);
    setDetailOpen(true);
  };

  const openHistorial = async (est: any) => {
    setSelectedStudent(est);
    setHistorialMes(peruNow.getMonth());
    setHistorialAno(peruNow.getFullYear());
    setHistorialOpen(true);
    await fetchMesAsistencias(est.id, peruNow.getMonth(), peruNow.getFullYear(), est.alumno?.created_at ? getPeruDate(est.alumno.created_at) : undefined);
  };

  const cambiarMes = async (delta: number) => {
    const nuevoMes = historialMes + delta;
    if (nuevoMes < 0) {
      setHistorialAno(historialAno - 1);
      setHistorialMes(11);
      if (selectedStudent) await fetchMesAsistencias(selectedStudent.id, 11, historialAno - 1, selectedStudent.alumno?.created_at ? getPeruDate(selectedStudent.alumno.created_at) : undefined);
    } else if (nuevoMes > 11) {
      setHistorialAno(historialAno + 1);
      setHistorialMes(0);
      if (selectedStudent) await fetchMesAsistencias(selectedStudent.id, 0, historialAno + 1, selectedStudent.alumno?.created_at ? getPeruDate(selectedStudent.alumno.created_at) : undefined);
    } else {
      setHistorialMes(nuevoMes);
      if (selectedStudent) await fetchMesAsistencias(selectedStudent.id, nuevoMes, historialAno, selectedStudent.alumno?.created_at ? getPeruDate(selectedStudent.alumno.created_at) : undefined);
    }
  };

  const exportPdfHistorial = () => {
    if (!selectedStudent) return;
    const doc = new jsPDF();
    doc.text(`Historial de Asistencias - ${selectedStudent.apellidos} ${selectedStudent.nombres}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`DNI: ${selectedStudent.dni} · Grado: ${selectedStudent.alumno?.grado} · Sección: ${selectedStudent.alumno?.seccion || '-'}`, 14, 22);

    const rows = Object.entries(mesAsistencias)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, estado]) => {
        const d = new Date(fecha + 'T00:00:00');
        return [`${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`, estadoLabel[estado] || estado];
      });

    (doc as any).autoTable({
      head: [['Fecha', 'Estado']],
      body: rows,
      startY: 30,
    });
    doc.save(`historial-${selectedStudent.dni}-${mesesNombres[historialMes].toLowerCase()}-${historialAno}.pdf`);
    toast.success('PDF exportado');
  };

  const diasEnMes = new Date(historialAno, historialMes + 1, 0).getDate();
  const primerDiaSem = new Date(historialAno, historialMes, 1).getDay();

  const handleRoleChange = async () => {
    if (!roleChangeTarget) return;
    const nuevoRol = roleChangeTarget.rol === 'alumno' ? 'brigadier' : 'alumno';
    setRoleChanging(true);
    try {
      const res = await fetch('/api/auth/cambiar-rol', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: roleChangeTarget.id, nuevo_rol: nuevoRol }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(`Rol cambiado a ${nuevoRol === 'brigadier' ? 'Brigadier' : 'Alumno'}`);
      setRoleChangeOpen(false);
      setRoleChangeTarget(null);
      setLoading(true);
      await fetchPersonas();
      setLoading(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setRoleChanging(false); }
  };

  useEffect(() => {
    if (!diaOpen || !diaSeleccionado || diaSeleccionado.estado !== 'falta_justificada' || !diaSeleccionado.alumno_id) {
      if (!diaOpen) setJustificationInfo(null);
      return;
    }
    const fetchJustInfo = async () => {
      setLoadingJustInfo(true);
      const sup = createClient();
      const { data: asis } = await sup
        .from('asistencias')
        .select('id')
        .eq('alumno_id', diaSeleccionado.alumno_id!)
        .eq('fecha', diaSeleccionado.fecha)
        .maybeSingle();
      if (!asis) { setLoadingJustInfo(false); return; }
      const { data: justs } = await sup
        .from('justificaciones')
        .select('id, motivo, brigadier_id, perfiles!justificaciones_brigadier_id_fkey(nombres, apellidos)')
        .eq('asistencia_id', asis.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!justs || justs.length === 0) { setLoadingJustInfo(false); return; }
      const { data: evids } = await sup
        .from('evidencias')
        .select('id, nombre_archivo')
        .eq('justificacion_id', justs[0].id);
      const j = justs[0] as any;
      setJustificationInfo({
        motivo: j.motivo,
        evidencias: (evids || []).map(e => ({ id: e.id, nombre: e.nombre_archivo })),
        brigadier_nombre: j.perfiles ? `${j.perfiles.nombres} ${j.perfiles.apellidos}` : undefined,
      });
      setLoadingJustInfo(false);
    };
    fetchJustInfo();
  }, [diaOpen, diaSeleccionado]);

  const handleRegister = async () => {
    setFormError('');
    if (!form.dni || form.dni.length !== 8) { setFormError('DNI debe tener 8 dígitos'); return; }
    if (!form.nombres || !form.apellidos) { setFormError('Nombres y apellidos son obligatorios'); return; }
    if (!form.password || form.password.length < 6) { setFormError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (!form.seccion) { setFormError('Sección es obligatoria'); return; }
    setSubmitting(true);
    try {
      const endpoint = tipoRegistro === 'estudiante' ? '/api/auth/crear-alumno' : '/api/auth/crear-brigadier';
      const body = { ...form, grado: gradoLabel };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error al registrar'); }
      toast.success(tipoRegistro === 'estudiante' ? 'Alumno registrado correctamente' : 'Brigadier registrado correctamente');
      setOpen(false);
      window.location.reload();
    } catch (err: any) { setFormError(err.message); }
    finally { setSubmitting(false); }
  };

  const clearSearch = () => setSearch('');

  const handleResetPassword = async () => {
    if (!resetPwdNew || resetPwdNew.length < 6) { setResetPwdError('Mínimo 6 caracteres'); return; }
    if (resetPwdNew !== resetPwdConfirm) { setResetPwdError('Las contraseñas no coinciden'); return; }
    setResetPwdSaving(true);
    setResetPwdError('');
    try {
      const res = await fetch('/api/auth/restablecer-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: selectedStudentDetail?.id, password: resetPwdNew }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error'); }
      toast.success('Contraseña restablecida correctamente');
      setResetPwdOpen(false);
      setResetPwdNew('');
      setResetPwdConfirm('');
    } catch (err: any) { setResetPwdError(err.message); }
    finally { setResetPwdSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 animate-fade-in-up">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl active:scale-95" onClick={() => router.push('/estudiantes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{gradoLabel} Grado</h1>
              {tutorSection && (
                <Badge variant="outline" className="ml-2 rounded-md bg-green-50 text-green-700 border-green-200">
                  Sección {tutorSection}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{filteredEstudiantes.length} registros</p>
          </div>
        </div>
        {currentUser?.rol === 'admin' && (
        <Button className="gap-2 rounded-xl btn-press" onClick={() => { setForm({ dni: '', nombres: '', apellidos: '', celular: '', genero: '', grado: gradoLabel, seccion: '', apoderado_nombre: '', apoderado_celular: '', password: '' }); setFormError(''); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Registrar
        </Button>
        )}
      </div>

      <div className="relative input-glow">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por DNI, nombres o apellidos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-xl border-border bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground/60"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      ) : filteredEstudiantes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center animate-fade-in-up">
          <GraduationCap className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay registros en {gradoLabel} Grado</p>
        </div>
      ) : (
        <Card className="shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 w-8 sm:w-10"></th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3">Apellidos y Nombres</th>
                  <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3">Rol</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center" colSpan={5}>
                    <span className="hidden sm:inline">Últimos 5 días</span>
                    <span className="sm:hidden">5d</span>
                    <div className="flex items-center justify-center gap-1 sm:gap-2 mt-1">
                      <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-sm bg-emerald-500" title="Asistió" />
                      <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-sm bg-amber-400" title="Tardanza" />
                      <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-sm bg-red-500" title="Falta" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEstudiantes.map((est: any, idx: number) => {
                  const records = asistencias[est.id] || [];
                  return (
                    <tr
                      key={est.id}
                      className="border-b last:border-0 transition-all duration-150 hover:bg-muted/20 cursor-pointer active:scale-[0.99]"
                      onClick={() => openDetail(est)}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-border">
                          {est.foto_url ? <AvatarImage src={`/api/fotos/${est.id}`} alt="" className="object-cover" /> : (
                            <AvatarFallback className="bg-primary/10 text-[10px] sm:text-xs font-medium text-primary">
                              {est.nombres?.charAt(0)}{est.apellidos?.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 max-w-[120px] sm:max-w-none">
                        <div className="truncate font-medium text-foreground text-sm sm:text-base">
                          {est.apellidos} {est.nombres}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{est.dni} · {est.alumno?.seccion || 'Sin sección'}</div>
                        {/* Mobile role indicator */}
                        <div className="flex items-center gap-1 sm:hidden mt-1">
                          {est.roles_funcionales?.some((r: any) => r.rol === 'brigadier' && r.activo) ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium text-purple-600">
                              <ShieldCheck className="h-2.5 w-2.5" /> BRI
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                              <GraduationCap className="h-2.5 w-2.5" /> EST
                            </span>
                          )}
                          {currentUser?.rol === 'admin' && (<>
                          <button
                            className="ml-auto text-muted-foreground/60 hover:text-foreground transition-colors"
                            onClick={(e) => { e.stopPropagation(); setRoleChangeTarget(est); setRoleChangeOpen(true); }}
                            title={est.rol === 'alumno' ? 'Convertir a Brigadier' : 'Convertir a Alumno'}
                          >
                            <RefreshCw className="h-2.5 w-2.5" />
                          </button>
                          <button
                            className="ml-1 text-muted-foreground/40 hover:text-red-500 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(est); setDeleteOpen(true); }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                          </>)}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-1.5">
                          {est.roles_funcionales?.some((r: any) => r.rol === 'brigadier' && r.activo) ? (
                            <Badge variant="default" className="gap-1 rounded-md text-[10px] px-2 py-0.5 bg-purple-500 hover:bg-purple-600">
                              <ShieldCheck className="h-3 w-3" /> Brigadier
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="rounded-md text-[10px] px-2 py-0.5">
                              <GraduationCap className="h-3 w-3" /> Estudiante
                            </Badge>
                          )}
                          {currentUser?.rol === 'admin' && (<>
                          <button
                            className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all"
                            onClick={(e) => { e.stopPropagation(); setRoleChangeTarget(est); setRoleChangeOpen(true); }}
                            title={est.rol === 'alumno' ? 'Convertir a Brigadier' : 'Convertir a Alumno'}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                          <button
                            className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 transition-all"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(est); setDeleteOpen(true); }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          </>)}
                        </div>
                      </td>
                      {[0, 1, 2, 3, 4].map(i => {
                        const r = records[i];
                        return (
                          <td key={i} className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                            {r ? (
                              <div className={`mx-auto h-6 w-6 sm:h-8 sm:w-8 rounded-lg ${estadoColor[r.estado] || 'bg-gray-300'} shadow-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md`}>
                                <span className="text-[9px] sm:text-[10px] font-bold text-white">{r.fecha?.slice(8, 10)}</span>
                              </div>
                            ) : (
                              <div className="mx-auto h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-muted border border-dashed border-border flex items-center justify-center">
                                <span className="text-[9px] sm:text-[10px] text-muted-foreground/40">-</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Student Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {selectedStudentDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                    {selectedStudentDetail.foto_url ? (
                        <AvatarImage src={`/api/fotos/${selectedStudentDetail.id}`} alt="" className="object-cover" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-sm font-semibold text-primary-foreground">
                        {selectedStudentDetail.nombres?.charAt(0)}{selectedStudentDetail.apellidos?.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg truncate">{selectedStudentDetail.apellidos} {selectedStudentDetail.nombres}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedStudentDetail.roles_funcionales?.some((r: any) => r.rol === 'brigadier' && r.activo) ? (
                        <Badge variant="default" className="gap-1 rounded-md text-[10px] px-2 py-0.5 bg-purple-500 hover:bg-purple-600">
                          <ShieldCheck className="h-3 w-3" /> Brigadier
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-md text-[10px] px-2 py-0.5">
                          <GraduationCap className="h-3 w-3" /> Estudiante
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">DNI: {selectedStudentDetail.dni}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 animate-fade-in-up">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Celular</p>
                    <p className="text-sm font-medium text-foreground mt-1">{selectedStudentDetail.celular || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Género</p>
                    <p className="text-sm font-medium text-foreground mt-1 capitalize">{selectedStudentDetail.genero || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estado</p>
                    <Badge variant={selectedStudentDetail.estado === 'activo' ? 'default' : 'secondary'} className="rounded-md text-xs mt-1">
                      {selectedStudentDetail.estado || 'activo'}
                    </Badge>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Grado</p>
                    <p className="text-sm font-medium text-foreground mt-1">{selectedStudentDetail.alumno?.grado || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sección</p>
                    <p className="text-sm font-medium text-foreground mt-1">{selectedStudentDetail.alumno?.seccion || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Apoderado</p>
                    <p className="text-sm font-medium text-foreground mt-1">{selectedStudentDetail.alumno?.apoderado_nombre || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cel. Apoderado</p>
                    <p className="text-sm font-medium text-foreground mt-1">{selectedStudentDetail.alumno?.apoderado_celular || '—'}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Correo</p>
                  <p className="text-sm font-mono text-foreground mt-1">{selectedStudentDetail.dni}@colegio.local</p>
                </div>

                {/* QR */}
                <div className="flex flex-col items-center rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Código QR</p>
                  {selectedStudentDetail.uuid_qr && (
                    <>
                      <img
                        id={`qr-${selectedStudentDetail.id}`}
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${selectedStudentDetail.uuid_qr}`}
                        alt="QR"
                        className="h-28 w-28 rounded-xl"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const img = document.getElementById(`qr-${selectedStudentDetail.id}`) as HTMLImageElement;
                          if (!img) return;
                          const link = document.createElement('a');
                          link.download = `QR-${selectedStudentDetail.dni}-${selectedStudentDetail.apellidos}.png`;
                          link.href = img.src;
                          link.click();
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar QR
                      </Button>
                    </>
                  )}
                </div>

                {/* Ver historial */}
                <Button
                  className="w-full gap-2 rounded-xl btn-press"
                  onClick={() => {
                    setDetailOpen(false);
                    openHistorial(selectedStudentDetail);
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                  Ver historial de asistencias
                </Button>

                {currentUser?.rol === 'admin' && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-xl"
                    onClick={() => { setResetPwdNew(''); setResetPwdConfirm(''); setResetPwdError(''); setResetPwdOpen(true); }}
                  >
                    <Lock className="h-4 w-4" />
                    Restablecer Contraseña
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Restablecer Contraseña</DialogTitle>
            <DialogDescription>
              Nueva contraseña para {selectedStudentDetail?.nombres} {selectedStudentDetail?.apellidos}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {resetPwdError && <p className="text-sm text-destructive">{resetPwdError}</p>}
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <Input type="password" value={resetPwdNew} onChange={(e) => setResetPwdNew(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar contraseña</Label>
              <Input type="password" value={resetPwdConfirm} onChange={(e) => setResetPwdConfirm(e.target.value)} placeholder="Repite la contraseña" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setResetPwdOpen(false)} disabled={resetPwdSaving}>Cancelar</Button>
              <Button onClick={handleResetPassword} disabled={resetPwdSaving} className="gap-2">
                {resetPwdSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {resetPwdSaving ? 'Restableciendo...' : 'Restablecer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Historial Dialog */}
      <Dialog open={historialOpen} onOpenChange={setHistorialOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    {selectedStudent.foto_url ? <AvatarImage src={`/api/fotos/${selectedStudent.id}`} alt="" className="object-cover" /> : (
                      <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                        {selectedStudent.nombres?.charAt(0)}{selectedStudent.apellidos?.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="truncate">{selectedStudent.apellidos} {selectedStudent.nombres}</DialogTitle>
                    <DialogDescription>
                      {selectedStudent.dni} · {selectedStudent.alumno?.grado} · Sec. {selectedStudent.alumno?.seccion || '-'}
                    </DialogDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl shrink-0 btn-press" onClick={exportPdfHistorial}>
                    <FileText className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                </div>
              </DialogHeader>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Asistió', value: statsHistorial.presentes, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Tardanza', value: statsHistorial.tardanzas, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Justificada', value: statsHistorial.justificadas, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Falta', value: statsHistorial.faltas, color: 'text-red-600', bg: 'bg-red-50' },
                ].map(s => (
                  <div key={s.label} className={`text-center rounded-lg p-2 ${s.bg} animate-scale-in`}>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="h-8 w-8 active:scale-95" onClick={() => cambiarMes(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-sm font-semibold animate-fade-in" key={`${historialMes}-${historialAno}`}>{mesesNombres[historialMes]} {historialAno}</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 active:scale-95" onClick={() => cambiarMes(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar */}
              {historialLoading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Cargando...</span>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1 text-center text-xs animate-fade-in" key={`cal-${historialMes}-${historialAno}`}>
                  {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => (
                    <div key={d} className="py-1.5 font-medium text-muted-foreground text-[11px]">{d}</div>
                  ))}
                  {Array.from({ length: primerDiaSem }).map((_, i) => (
                    <div key={`e-${i}`} />
                  ))}
                  {Array.from({ length: diasEnMes }, (_, i) => {
                    const dia = i + 1;
                    const diaSem = (primerDiaSem + i) % 7;
                    const fecha = `${historialAno}-${String(historialMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                    const rawEstado = mesAsistencias[fecha];
                    const noLaborable = !esLaborable(fecha);
                    const esFuturo = fecha > getPeruDate();
                    const esPasadoLaborable = !esFuturo && !noLaborable;
                                const fechaRegistroEst = selectedStudent?.alumno?.created_at ? getPeruDate(selectedStudent.alumno.created_at) : null;
                    const antesDeRegistro = fechaRegistroEst && fecha < fechaRegistroEst;
                    const estado = rawEstado || (esPasadoLaborable && !antesDeRegistro ? 'falta_injustificada' : undefined);
                    const clickable = !!estado;
                    return (
                      <div
                        key={dia}
                        onClick={async () => {
                          if (clickable && estado && selectedStudent) {
                            setDiaSeleccionado({ fecha, estado, alumno_id: selectedStudent.id });
                            setDiaOpen(true);
                            if (rawEstado && (estado === 'presente' || estado === 'tardanza')) {
                              try {
                                const { data, error } = await supabase
                                  .from('asistencias')
                                  .select('hora, brigadier_id')
                                  .eq('alumno_id', selectedStudent.id)
                                  .eq('fecha', fecha)
                                  .maybeSingle();
                                if (data && !error) {
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
                        className={`relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition-all duration-150
                          ${clickable && rawEstado ? 'cursor-pointer hover:ring-1 hover:ring-primary/40 hover:scale-110' : ''}
                          ${noLaborable ? 'text-muted-foreground/30' : ''}
                          ${esFuturo ? 'text-muted-foreground/20' : ''}
                        `}
                      >
                        {estado ? (
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${estadoColor[estado]} text-white text-xs font-bold shadow-sm transition-transform duration-150`}>
                            {estadoShort[estado]}
                          </div>
                        ) : (
                          <span className={`text-xs ${esPasadoLaborable ? 'text-muted-foreground' : 'text-muted-foreground/30'}`}>
                            {dia}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 pt-1 pb-2">
                {[
                  { color: 'bg-emerald-500', label: 'Asistió' },
                  { color: 'bg-amber-400', label: 'Tardanza' },
                  { color: 'bg-blue-400', label: 'Justificada' },
                  { color: 'bg-red-500', label: 'Falta' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 rounded-sm ${l.color}`} />
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Day detail */}
      <Dialog open={diaOpen} onOpenChange={setDiaOpen}>
        <DialogContent className="sm:max-w-sm">
          {diaSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {(() => {
                    const d = new Date(diaSeleccionado.fecha + 'T00:00:00');
                    return `${d.getDate()} de ${mesesNombres[d.getMonth()]} ${d.getFullYear()}`;
                  })()}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4 animate-scale-in">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${estadoColor[diaSeleccionado.estado || '']} shadow-lg`}>
                  {diaSeleccionado.estado === 'presente' ? <UserCheck className="h-8 w-8 text-white" /> :
                   diaSeleccionado.estado === 'tardanza' ? <Clock className="h-8 w-8 text-white" /> :
                   <AlertCircle className="h-8 w-8 text-white" />}
                </div>
                <p className="text-lg font-semibold text-foreground">{estadoLabel[diaSeleccionado.estado || '']}</p>
                <Badge variant={(estadoBadge[diaSeleccionado.estado || ''] || 'secondary') as any} className="rounded-md px-3 py-1 text-sm">
                  {diaSeleccionado.estado?.replace(/_/g, ' ')}
                </Badge>

                {(diaSeleccionado.hora || diaSeleccionado.brigadier_nombre) && (
                  <div className="w-full space-y-2 pt-2 border-t border-border animate-fade-in-up">
                    {diaSeleccionado.hora && (
                      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-2.5">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-sm text-foreground">
                          <span className="text-muted-foreground">Registrado a las </span>
                          <span className="font-medium">{diaSeleccionado.hora}</span>
                        </p>
                      </div>
                    )}
                    {diaSeleccionado.brigadier_nombre && (
                      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-2.5">
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-sm text-foreground">
                          <span className="text-muted-foreground">Registrado por: </span>
                          <span className="font-medium">{diaSeleccionado.brigadier_nombre}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {diaSeleccionado.estado === 'falta_justificada' && (
                  <div className="w-full space-y-3 pt-2 border-t border-border animate-fade-in-up">
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
                              <a key={i} href={`/api/evidencias/${ev.id}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-xl border bg-card p-2.5 text-sm text-foreground transition-all hover:bg-muted/50 hover:border-primary/30">
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

              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Role change confirmation */}
      <AlertDialog open={roleChangeOpen} onOpenChange={setRoleChangeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar Rol</AlertDialogTitle>
            <AlertDialogDescription>
              {roleChangeTarget && (
                <>¿Estás seguro de convertir a <strong>{roleChangeTarget.nombres} {roleChangeTarget.apellidos}</strong> de <strong>{roleChangeTarget.rol === 'alumno' ? 'Estudiante' : 'Brigadier'}</strong> a <strong>{roleChangeTarget.rol === 'alumno' ? 'Brigadier' : 'Estudiante'}</strong>?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={roleChanging}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange} disabled={roleChanging}>
              {roleChanging ? 'Cambiando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Estudiante</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>¿Estás seguro de eliminar a <strong>{deleteTarget.nombres} {deleteTarget.apellidos}</strong> (DNI: {deleteTarget.dni})? Se eliminarán todos sus registros de asistencia y no se puede deshacer.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                setDeleting(true);
                try {
                  const res = await fetch(`/api/auth/eliminar-alumno?id=${deleteTarget.id}`, { method: 'DELETE' });
                  if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
                  toast.success('Estudiante eliminado correctamente');
                  setDeleteOpen(false);
                  setDeleteTarget(null);
                  fetchPersonas();
                } catch (err: any) {
                  toast.error(err.message);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Register Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {tipoRegistro === 'estudiante' ? `Registrar Alumno - ${gradoLabel} Grado` : `Registrar Brigadier - ${gradoLabel} Grado`}
            </DialogTitle>
            <DialogDescription>
              Selecciona el tipo de usuario a registrar
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {formError && <p className="text-sm text-destructive flex items-center gap-1.5"><AlertCircle className="h-4 w-4" />{formError}</p>}

            {/* Role toggle */}
            <div className="flex rounded-xl border border-border p-1 bg-muted/50">
              <button
                type="button"
                onClick={() => setTipoRegistro('estudiante')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all btn-press ${
                  tipoRegistro === 'estudiante' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Estudiante
              </button>
              <button
                type="button"
                onClick={() => setTipoRegistro('brigadier')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all btn-press ${
                  tipoRegistro === 'brigadier' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Brigadier
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>DNI</Label><Input placeholder="12345678" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} maxLength={8} className="input-glow" /></div>
              <div className="space-y-2"><Label>Celular (opcional)</Label><Input placeholder="999888777" value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value.replace(/\D/g, '').slice(0, 9) })} maxLength={9} className="input-glow" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nombres</Label><Input placeholder="Carlos" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} className="input-glow" /></div>
              <div className="space-y-2"><Label>Apellidos</Label><Input placeholder="Rodríguez" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} className="input-glow" /></div>
            </div>

            <div className="space-y-2">
              <Label>Género (opcional)</Label>
              <select
                value={form.genero}
                onChange={(e) => setForm({ ...form, genero: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Seleccionar...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Grado</Label><Input value={gradoLabel} disabled className="bg-muted" /></div>
              <div className="space-y-2"><Label>Sección</Label><Input placeholder="Único" value={form.seccion} onChange={(e) => setForm({ ...form, seccion: e.target.value })} className="input-glow" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Apoderado (opcional)</Label><Input placeholder="Nombre del apoderado" value={form.apoderado_nombre} onChange={(e) => setForm({ ...form, apoderado_nombre: e.target.value })} className="input-glow" /></div>
              <div className="space-y-2"><Label>Cel. Apoderado (opcional)</Label><Input placeholder="999888777" value={form.apoderado_celular} onChange={(e) => setForm({ ...form, apoderado_celular: e.target.value.replace(/\D/g, '').slice(0, 9) })} maxLength={9} className="input-glow" /></div>
            </div>

            <div className="space-y-2">
              <Label>Contraseña</Label>
              <div className="relative">
                <Input type={showPwd ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11 w-full rounded-xl border-border pr-11 input-glow" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="btn-press">Cancelar</Button>
            <Button onClick={handleRegister} disabled={submitting} className="gap-2 btn-press">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
