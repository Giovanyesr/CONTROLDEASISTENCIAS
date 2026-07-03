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
import { AlertCircle, Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react';
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#faf8f5] via-[#f5f0e8] to-[#faf8f5] p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#8B6914]/5 via-transparent to-transparent animate-float" style={{ animationDuration: '12s' }} />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-[#D4A853]/8 via-transparent to-transparent animate-float" style={{ animationDuration: '15s', animationDelay: '-3s' }} />
        <div className="absolute left-1/3 top-1/4 h-64 w-64 rounded-full bg-[#8B6914]/3 animate-float" style={{ animationDuration: '18s', animationDelay: '-6s' }} />
        <div className="absolute left-1/2 top-0 h-px w-96 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#8B6914]/20 to-transparent" />
        <div className="absolute bottom-0 left-1/4 h-px w-64 bg-gradient-to-r from-transparent via-[#D4A853]/20 to-transparent" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-10 text-center animate-slide-up">
          <div className="mb-5 inline-flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="I.E. 30916 San Francisco de Asís"
              width={280}
              height={70}
              className="h-auto w-64 transition-all duration-500 hover:scale-105 drop-shadow-sm"
              priority
            />
          </div>
          <h2 className="text-lg font-medium text-[#8B6914]/70 tracking-wide">
            Sistema de Control de Asistencia
          </h2>
        </div>

        <Card className="overflow-hidden border border-[#8B6914]/10 bg-white/95 backdrop-blur-sm shadow-xl shadow-[#8B6914]/5">
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8B6914] via-[#D4A853] to-[#8B6914]" />
            <div className="p-8">
              <div className="mb-7 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B6914]/10 to-[#D4A853]/10 ring-1 ring-[#8B6914]/10">
                  <GraduationCap className="h-6 w-6 text-[#8B6914]" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-[#2C2C2C]">
                  Bienvenido
                </h1>
                <p className="mt-1 text-sm text-[#6B5B4E]">
                  Ingrese sus credenciales para acceder
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="animate-scale-in flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
                      <AlertCircle className="h-3.5 w-3.5" />
                    </div>
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="dni" className="text-sm font-medium text-[#4a4a4a]">
                    DNI
                  </Label>
                  <div className="input-glow group relative">
                    <Input
                      id="dni"
                      placeholder="12345678"
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      maxLength={8}
                      disabled={loading}
                      autoComplete="username"
                      className="h-12 w-full rounded-xl border-[#E0D5C0] bg-white pl-4 pr-4 text-base transition-all duration-200 placeholder:text-[#6B5B4E]/30 focus:border-[#8B6914] focus:ring-2 focus:ring-[#8B6914]/15 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-[#4a4a4a]">
                    Contraseña
                  </Label>
                  <div className="input-glow group relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                      className="h-12 w-full rounded-xl border-[#E0D5C0] bg-white pr-12 pl-4 text-base transition-all duration-200 placeholder:text-[#6B5B4E]/30 focus:border-[#8B6914] focus:ring-2 focus:ring-[#8B6914]/15 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B5B4E]/40 transition-all hover:text-[#8B6914] active:scale-90"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#8B6914] to-[#a8882c] text-white text-base font-semibold shadow-lg shadow-[#8B6914]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#8B6914]/35 hover:from-[#7a5d12] hover:to-[#8B6914] active:scale-[0.98] disabled:opacity-70 disabled:hover:shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Ingresando...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>Ingresar</span>
                    </span>
                  )}
                </Button>
              </form>
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-[#E0D5C0]/50 bg-[#FAF8F5]/50 px-8 py-4">
              <div className="flex items-center gap-2 text-xs text-[#6B5B4E]/50">
                <span>¿Olvidaste tu contraseña?</span>
                <Link
                  href="/recuperar"
                  className="font-medium text-[#8B6914] transition-all hover:text-[#7a5d12] hover:underline"
                >
                  Recuperar acceso
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <p className="mt-8 text-center text-xs text-[#6B5B4E]/30">
          I.E. 30916 San Francisco de Asís &mdash; Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
