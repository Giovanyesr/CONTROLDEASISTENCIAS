'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CrearAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!user || !['75185427', '30916'].includes(user.dni)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold">Acceso restringido</p>
            <p className="text-sm text-muted-foreground mt-2">Solo administradores pueden acceder aquí.</p>
            <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard')}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.dni === '30916') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
            <p className="text-lg font-semibold">Ya eres superadmin</p>
            <p className="text-sm text-muted-foreground mt-2">Usuario 30916 ya está activo.</p>
            <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard')}>Ir al Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreate = async () => {
    setStatus('creating');
    setMessage('');
    try {
      const res = await fetch('/api/auth/crear-superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminDni: user.dni }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setStatus('success');
      setMessage(`✅ Usuario creado: DNI 30916 / Contraseña: 123456`);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#faf8f5] to-[#f5f0e8]">
      <Card className="max-w-md w-full shadow-xl border-[#8B6914]/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B6914]/10 to-[#D4A853]/10 ring-1 ring-[#8B6914]/10">
            <ShieldCheck className="h-8 w-8 text-[#8B6914]" />
          </div>
          <CardTitle className="text-xl">Crear Superadmin</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Crea un nuevo administrador con DNI <strong>30916</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-sm text-success text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2" />
              {message}
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              {message}
            </div>
          )}
          <Button
            className="w-full h-12 gap-2 rounded-xl text-base font-semibold"
            onClick={handleCreate}
            disabled={status === 'creating'}
          >
            {status === 'creating' ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Creando...</>
            ) : (
              <><ShieldCheck className="h-5 w-5" /> Crear Superadmin 30916</>
            )}
          </Button>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => router.push('/dashboard')}>
            Volver al Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
