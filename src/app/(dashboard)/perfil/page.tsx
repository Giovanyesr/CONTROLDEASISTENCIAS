'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QRDisplay } from '@/components/qr/qr-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Download, QrCode, User, Phone, Fingerprint, Lock, Loader2, Camera, Pencil, GraduationCap, Contact, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { PwaInstallButton } from '@/components/PwaInstallButton';

export default function PerfilPage() {
  const { user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [celularOpen, setCelularOpen] = useState(false);
  const [celularValue, setCelularValue] = useState('');
  const [celularSaving, setCelularSaving] = useState(false);
  const [apoOpen, setApoOpen] = useState(false);
  const [apoValue, setApoValue] = useState('');
  const [apoSaving, setApoSaving] = useState(false);
  const [apoNombreOpen, setApoNombreOpen] = useState(false);
  const [apoNombreValue, setApoNombreValue] = useState('');
  const [apoNombreSaving, setApoNombreSaving] = useState(false);
  const [alumnoData, setAlumnoData] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    if (user?.rol === 'alumno') {
      supabase.from('alumnos').select('*').eq('perfil_id', user.id).maybeSingle().then(({ data }) => setAlumnoData(data));
    }
  }, [user]);

  if (!user) return null;

  const downloadQR = () => {
    const svg = document.querySelector('.qr-code-svg svg') as SVGElement;
    if (!svg) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const serializer = new XMLSerializer();
    const svgBlob = new Blob([serializer.serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx!.scale(2, 2);
      ctx!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `qr-${user.dni}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR descargado');
    };
    img.src = url;
  };

  const downloadCard = async () => {
    const card = document.getElementById('carnet-qr') as HTMLElement;
    if (!card) return;
    try {
      const img = card.querySelector('img');
      let originalSrc = '';
      if (img) {
        originalSrc = img.src;
        const resp = await fetch(originalSrc);
        const blob = await resp.blob();
        const dataUri = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        img.src = dataUri;
      }
      const { toPng } = await import('html-to-image');
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(card, { quality: 0.95, pixelRatio: 2 });
      if (img && originalSrc) img.src = originalSrc;
      const link = document.createElement('a');
      link.download = `carnet-${user.dni}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Carnet descargado');
    } catch {
      toast.error('Error al generar carnet');
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (!pwCurrent) { setPwError('Ingresa tu contraseña actual'); return; }
    if (pwNew.length < 6) { setPwError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (pwNew !== pwConfirm) { setPwError('Las contraseñas no coinciden'); return; }
    setPwSaving(true);
    try {
      const { error: signInError } = await (await import('@/lib/supabase/client')).createClient().auth.signInWithPassword({
        email: `${user.dni}@colegio.local`,
        password: pwCurrent,
      });
      if (signInError) { setPwError('Contraseña actual incorrecta'); setPwSaving(false); return; }
      const { error: updateError } = await (await import('@/lib/supabase/client')).createClient().auth.updateUser({ password: pwNew });
      if (updateError) throw updateError;
      toast.success('Contraseña actualizada correctamente');
      setPasswordOpen(false);
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 2MB');
      return;
    }
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);
      const res = await fetch('/api/auth/subir-foto', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshProfile();
      toast.success('Foto actualizada');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir foto');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApoNombreUpdate = async () => {
    if (!apoNombreValue.trim()) {
      toast.error('El nombre del apoderado no puede estar vacío');
      return;
    }
    setApoNombreSaving(true);
    try {
      const res = await fetch('/api/auth/actualizar-perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, apoderado_nombre: apoNombreValue.trim() }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const { data } = await supabase.from('alumnos').select('*').eq('perfil_id', user.id).maybeSingle();
      setAlumnoData(data);
      toast.success('Nombre del apoderado actualizado');
      setApoNombreOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setApoNombreSaving(false);
    }
  };

  const handleApoUpdate = async () => {
    const cel = apoValue.replace(/\D/g, '').slice(0, 9);
    if (cel.length !== 9 && cel.length !== 0) {
      toast.error('El celular debe tener 9 dígitos');
      return;
    }
    setApoSaving(true);
    try {
      const res = await fetch('/api/auth/actualizar-perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, apoderado_celular: cel || null }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const { data } = await supabase.from('alumnos').select('*').eq('perfil_id', user.id).maybeSingle();
      setAlumnoData(data);
      toast.success('Celular del apoderado actualizado');
      setApoOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setApoSaving(false);
    }
  };

  const handleCelularUpdate = async () => {
    const cel = celularValue.replace(/\D/g, '').slice(0, 9);
    if (cel.length !== 9 && cel.length !== 0) {
      toast.error('El celular debe tener 9 dígitos');
      return;
    }
    setCelularSaving(true);
    try {
      const res = await fetch('/api/auth/actualizar-perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, celular: cel || null }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      await refreshProfile();
      toast.success('Celular actualizado');
      setCelularOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCelularSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground">Información personal y código QR</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-md lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5 text-primary" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-4 ring-border">
                  {user.foto_url ? (
                    <AvatarImage src={user.foto_url} alt="Foto de perfil" />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-2xl font-bold text-primary-foreground">
                      {user.nombres.charAt(0)}{user.apellidos.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary-dark disabled:opacity-50"
                >
                  {photoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{user.nombres} {user.apellidos}</h2>
                <Badge variant="outline" className="mt-1.5 capitalize rounded-md">
                  {user.rol === 'brigadier' ? 'Brigadier' : 'Alumno'}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Fingerprint className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">DNI</p>
                  <p className="font-semibold text-foreground">{user.dni}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Celular</p>
                  <p className="font-semibold text-foreground">{user.celular || 'No registrado'}</p>
                </div>
                <button
                  onClick={() => { setCelularValue(user.celular || ''); setCelularOpen(true); }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {user.rol === 'alumno' && alumnoData && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Información Académica
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Grado</p>
                      <p className="font-semibold text-foreground">{alumnoData.grado}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sección</p>
                      <p className="font-semibold text-foreground">{alumnoData.seccion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Contact className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Apoderado</p>
                      <p className="font-semibold text-foreground">{alumnoData?.apoderado_nombre || 'Sin registro'}</p>
                    </div>
                    <button
                      onClick={() => { setApoNombreValue(alumnoData?.apoderado_nombre || ''); setApoNombreOpen(true); }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Celular del Apoderado</p>
                    <p className="font-semibold text-foreground">{alumnoData?.apoderado_celular || 'No registrado'}</p>
                  </div>
                  <button
                    onClick={() => { setApoValue(alumnoData?.apoderado_celular || ''); setApoOpen(true); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <Dialog open={apoOpen} onOpenChange={setApoOpen}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Editar Celular del Apoderado</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Número de celular del apoderado</Label>
                      <Input
                        value={apoValue}
                        onChange={(e) => setApoValue(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="999888777"
                        maxLength={9}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => setApoOpen(false)} disabled={apoSaving}>Cancelar</Button>
                      <Button onClick={handleApoUpdate} disabled={apoSaving} className="gap-2">
                        {apoSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {apoSaving ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={apoNombreOpen} onOpenChange={setApoNombreOpen}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Editar Nombre del Apoderado</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Nombre completo del apoderado</Label>
                      <Input
                        value={apoNombreValue}
                        onChange={(e) => setApoNombreValue(e.target.value)}
                        placeholder="Carlos Rodríguez"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => setApoNombreOpen(false)} disabled={apoNombreSaving}>Cancelar</Button>
                      <Button onClick={handleApoNombreUpdate} disabled={apoNombreSaving} className="gap-2">
                        {apoNombreSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {apoNombreSaving ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {user.dni === '75185427' && (
                <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 rounded-xl">
                      <Lock className="h-4 w-4" />
                      Cambiar Contraseña
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Cambiar Contraseña</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      {pwError && <p className="text-sm text-destructive">{pwError}</p>}
                      <div className="space-y-2">
                        <Label>Contraseña actual</Label>
                        <Input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="••••••••" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nueva contraseña</Label>
                        <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="Mínimo 6 caracteres" />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirmar nueva contraseña</Label>
                        <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Repite la nueva contraseña" />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setPasswordOpen(false)} disabled={pwSaving}>Cancelar</Button>
                        <Button onClick={handleChangePassword} disabled={pwSaving} className="gap-2">
                          {pwSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                          {pwSaving ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={celularOpen} onOpenChange={setCelularOpen}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Editar Celular</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Número de celular</Label>
                      <Input
                        value={celularValue}
                        onChange={(e) => setCelularValue(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="999888777"
                        maxLength={9}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => setCelularOpen(false)} disabled={celularSaving}>Cancelar</Button>
                      <Button onClick={handleCelularUpdate} disabled={celularSaving} className="gap-2">
                        {celularSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {celularSaving ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <QrCode className="h-5 w-5 text-primary" />
              Código QR
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="qr-code-svg rounded-xl border bg-white p-4">
              <QRDisplay uuid={user.uuid_qr} size={180} />
            </div>
            <Button onClick={downloadQR} className="w-full gap-2 rounded-xl" variant="outline">
              <Download className="h-4 w-4" />
              Descargar QR
            </Button>
            <Dialog open={cardOpen} onOpenChange={setCardOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2 rounded-xl">
                  <Download className="h-4 w-4" />
                  Descargar Carnet
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                  <DialogTitle>Carnet de Asistencia</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <div id="carnet-qr" className="flex flex-col items-center gap-3 rounded-2xl border-2 border-primary/30 bg-white p-6 shadow-lg">
                    {user.foto_url ? (
                      <img
                        src={user.foto_url}
                        alt="Foto"
                        className="h-16 w-16 rounded-full border-2 border-primary/30 object-cover shadow-sm"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-xl font-bold text-primary-foreground shadow-sm">
                        {user.nombres.charAt(0)}{user.apellidos.charAt(0)}
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-base font-bold text-foreground">{user.nombres} {user.apellidos}</p>
                      <p className="text-sm text-muted-foreground">DNI: {user.dni}</p>
                      <Badge variant="outline" className="mt-1 capitalize rounded-md text-xs">
                        {user.rol === 'brigadier' ? 'Brigadier' : 'Alumno'}
                      </Badge>
                    </div>
                    <div className="rounded-xl border bg-white p-2">
                      <QRDisplay uuid={user.uuid_qr} size={130} showLabel={false} />
                    </div>
                  </div>
                  <Button onClick={downloadCard} className="w-full gap-2 rounded-xl">
                    <Download className="h-4 w-4" />
                    Descargar PNG
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <p className="text-center text-xs text-muted-foreground">
              Muestra este código al brigadier para registrar tu asistencia
            </p>
          </CardContent>
        </Card>

        <PwaInstallButton />
      </div>
    </div>
  );
}