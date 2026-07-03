'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { recoverySchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, CheckCircle2, QrCode, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RecuperarPage() {
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { recoveryPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = recoverySchema.safeParse({ dni });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await recoveryPassword(dni);
      setSuccess(true);
      toast.success('Revisa tu correo electrónico');
    } catch (err: any) {
      setError(err.message || 'Error al recuperar contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-950 p-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
        </div>
        <div className="w-full max-w-md animate-scale-in">
          <Card className="glass border-none shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-foreground">Correo Enviado</CardTitle>
              <CardDescription className="text-balance">
                Se ha enviado un enlace de recuperación a tu correo electrónico institucional.
                Revisa tu bandeja de entrada.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 pb-6">
              <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {dni}@colegio.local
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-950 p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
      </div>
      <div className="w-full max-w-md animate-scale-in">
        <Card className="glass border-none shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
              <QrCode className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-foreground">Recuperar Contraseña</CardTitle>
            <CardDescription>
              Ingresa tu DNI para recibir un enlace de recuperación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="dni" className="text-sm font-medium">DNI</Label>
                <Input
                  id="dni"
                  placeholder="12345678"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  maxLength={8}
                  disabled={loading}
                  className="h-11 w-full rounded-xl border-border bg-background/50 px-4 text-base transition-all duration-200 placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-70"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  'Enviar enlace de recuperación'
                )}
              </Button>
            </form>
          </CardContent>
          <CardContent className="pt-0 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
