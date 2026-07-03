'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QRScanner } from '@/components/qr/qr-scanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Clock, UserCheck, ScanLine, RotateCcw, Loader2, Settings2 } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import type { IntervalosAsistencia } from '@/lib/utils';
import { playSuccessBeep, playErrorBeep } from '@/lib/beep';
import toast from 'react-hot-toast';

export default function EscanerPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  const [config, setConfig] = useState<IntervalosAsistencia | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configError, setConfigError] = useState('');
  const [editForm, setEditForm] = useState({ inicio: '', limite_presente: '', limite_tardanza: '' });

  useEffect(() => {
    fetch('/api/configuracion/asistencia')
      .then(r => r.json())
      .then(d => { setConfig(d); setEditForm({ inicio: d.inicio.slice(0, 5), limite_presente: d.limite_presente.slice(0, 5), limite_tardanza: d.limite_tardanza.slice(0, 5) }); })
      .catch(() => {});
  }, []);

  const handleSaveConfig = async () => {
    setConfigError('');
    setSaving(true);
    try {
      const body = {
        inicio: editForm.inicio + ':00',
        limite_presente: editForm.limite_presente + ':00',
        limite_tardanza: editForm.limite_tardanza + ':00',
      };
      const res = await fetch('/api/configuracion/asistencia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfig(body);
      toast.success('Intervalos actualizados');
      setConfigOpen(false);
    } catch (err: any) {
      setConfigError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleScan = useCallback(async (uuid: string) => {
    if (!user) return;
    setLoading(true);
    setScanning(false);

    try {
      const { data, error } = await supabase.rpc('registrar_asistencia', {
        p_alumno_uuid: uuid,
        p_brigadier_id: user.id,
      });

      if (error) throw error;

      setResult(data);

      if (data.exito) {
        playSuccessBeep();
        toast.success(data.mensaje);
      } else if (data.asistencia_existente) {
        playErrorBeep();
        toast.error(data.mensaje);
      } else {
        playErrorBeep();
        toast.error(data.mensaje);
      }
    } catch (err: any) {
      playErrorBeep();
      toast.error(err.message || 'Error al registrar');
      setResult({ exito: false, mensaje: err.message });
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  const handleScanError = (error: string) => {
    toast.error(error);
  };

  const handleReset = () => {
    setResult(null);
    setScanning(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Escáner QR</h1>
          <p className="text-sm text-muted-foreground">
            Escanea el código QR del estudiante para registrar su asistencia
          </p>
        </div>
        {user?.rol === 'brigadier' && (
          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <Settings2 className="h-4 w-4" />
                Configurar Intervalos
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Configurar Intervalos de Asistencia</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {configError && (
                  <p className="text-sm text-destructive">{configError}</p>
                )}
                <div className="space-y-2">
                  <Label>Hora de inicio</Label>
                  <Input
                    type="time"
                    value={editForm.inicio}
                    onChange={(e) => setEditForm({ ...editForm, inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Límite de Presente</Label>
                  <Input
                    type="time"
                    value={editForm.limite_presente}
                    onChange={(e) => setEditForm({ ...editForm, limite_presente: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Límite de Tardanza</Label>
                  <Input
                    type="time"
                    value={editForm.limite_tardanza}
                    onChange={(e) => setEditForm({ ...editForm, limite_tardanza: e.target.value })}
                  />
                </div>
                {config && (
                  <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Vista previa:</p>
                    <p>
                      {editForm.inicio} – {editForm.limite_presente} → <strong>Presente</strong>
                    </p>
                    <p>
                      {editForm.limite_presente} – {editForm.limite_tardanza} → <strong>Tardanza</strong>
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Fuera de {editForm.inicio} – {editForm.limite_tardanza} no se registrará asistencia
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setConfigOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveConfig} disabled={saving} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ScanLine className="h-5 w-5 text-primary" />
              {scanning ? 'Cámara' : 'Resultado'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanning ? (
              <QRScanner onScan={handleScan} onError={handleScanError} />
            ) : (
              <div className="flex flex-col items-center gap-4 py-6">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Registrando asistencia...</p>
                  </div>
                ) : (
                  <>
                    {result?.exito ? (
                      <div className="flex flex-col items-center gap-3 text-center animate-scale-in">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            Asistencia Registrada
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{result.mensaje}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center animate-scale-in">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                          <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                            Error
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{result?.mensaje}</p>
                        </div>
                      </div>
                    )}
                    <Button onClick={handleReset} className="mt-2 gap-2 rounded-xl">
                      <RotateCcw className="h-4 w-4" />
                      Escanear Otro
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {result?.asistencia_existente && (
            <Card className="border-none shadow-sm animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Asistencia Existente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hora registrada</p>
                    <p className="text-lg font-bold text-foreground">{formatTime(result.asistencia_existente.hora)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Badge className="mt-0.5 rounded-md">{result.asistencia_existente.estado}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {result?.estudiante && (
            <Card className="border-none shadow-sm animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Estudiante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-lg font-bold text-primary-foreground shadow-sm">
                    {result.estudiante.nombres?.charAt(0)}{result.estudiante.apellidos?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {result.estudiante.nombres} {result.estudiante.apellidos}
                    </p>
                    <p className="text-sm text-muted-foreground">DNI: {result.estudiante.dni}</p>
                  </div>
                </div>
                {result.asistencia && (
                  <div className="mt-3 rounded-xl bg-green-50 p-4 dark:bg-green-950/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        {result.asistencia.estado === 'presente' ? 'Presente' : 'Tardanza'}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                      {formatTime(result.asistencia.hora)} — {result.asistencia.fecha}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
