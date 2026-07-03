'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = loginSchema.safeParse({ dni, password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await login(dni, password);
      toast.success('Inicio de sesión exitoso');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      toast.error(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#faf8f5] p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full border border-[#8B6914]/5 animate-float" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full border border-[#8B6914]/5 animate-float" style={{ animationDuration: '10s' }} />
        <div className="absolute left-1/2 top-0 h-px w-96 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#8B6914]/20 to-transparent" />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="I.E. 30916 San Francisco de Asís"
            width={280}
            height={70}
            className="mx-auto h-auto w-64 transition-all duration-300 hover:scale-105"
            priority
          />
        </div>

        <Card className="border border-[#8B6914]/10 bg-white/90 backdrop-blur-sm shadow-xl shadow-[#8B6914]/5">
          <div className="p-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-semibold tracking-tight text-[#4a4a4a]">
                Iniciar Sesión
              </h1>
              <p className="mt-1 text-sm text-[#8B6914]/70">
                Ingrese su DNI y contraseña
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="animate-scale-in flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="dni" className="text-sm font-medium text-[#4a4a4a]">
                  DNI
                </Label>
                <Input
                  id="dni"
                  placeholder="12345678"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  maxLength={8}
                  disabled={loading}
                  autoComplete="username"
                  className="h-11 rounded-lg border-[#8B6914]/20 bg-white px-4 text-base transition-all duration-200 placeholder:text-[#8B6914]/30 focus:border-[#8B6914] focus:ring-2 focus:ring-[#8B6914]/15"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[#4a4a4a]">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                    className="h-11 w-full rounded-lg border-[#8B6914]/20 bg-white pr-11 pl-4 text-base transition-all duration-200 placeholder:text-[#8B6914]/30 focus:border-[#8B6914] focus:ring-2 focus:ring-[#8B6914]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B6914]/40 transition-all hover:text-[#8B6914] active:scale-90"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-[#8B6914] text-white text-base font-semibold shadow-lg shadow-[#8B6914]/20 transition-all duration-200 hover:bg-[#7a5d12] hover:shadow-xl hover:shadow-[#8B6914]/30 active:scale-[0.97] disabled:opacity-70"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ingresando...
                  </span>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>
          </div>

          <div className="flex items-center justify-center gap-2 border-t border-[#8B6914]/10 px-8 py-4">
            <Shield className="h-3.5 w-3.5 text-[#8B6914]/40" />
            <Link
              href="/recuperar"
              className="text-xs text-[#8B6914]/60 transition-all hover:text-[#8B6914] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-[#8B6914]/30">
          I.E. 30916 San Francisco de Asís · Sistema de Control de Asistencia
        </p>
      </div>
    </div>
  );
}
