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
import { AlertCircle, Eye, EyeOff, Loader2, GraduationCap, ShieldCheck, CalendarClock, Users, CheckCircle2, ArrowRight } from 'lucide-react';
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

  const features = [
    { icon: Users, text: 'Gestión de estudiantes por grado y sección' },
    { icon: CalendarClock, text: 'Registro diario de asistencia' },
    { icon: ShieldCheck, text: 'Control de brigadieres y justificaciones' },
    { icon: CheckCircle2, text: 'Reportes e historial en tiempo real' },
  ];

  return (
    <div className="relative flex min-h-screen">
      {/* Brand Side - Desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#8B6914] via-[#7a5d12] to-[#5c4510] overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, white 1px, transparent 0)', backgroundSize: '50px 50px' }} />
        </div>

        {/* Glow orbs */}
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#D4A853]/20 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-white/10 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 rounded-full bg-[#D4A853]/10 blur-[80px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full min-h-screen">
          <div className="flex flex-col items-start">
            <div className="rounded-xl bg-white/95 backdrop-blur-sm px-4 py-3 shadow-lg shadow-black/10">
              <Image
                src="/logo.png"
                alt="I.E. 30916 San Francisco de Asís"
                width={200}
                height={50}
                className="h-auto w-44"
                priority
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
                Sistema de Control
                <br />
                <span className="text-[#D4A853]">de Asistencia</span>
              </h1>
              <p className="text-lg text-white/70 max-w-md leading-relaxed">
                Plataforma integral para la gestión de asistencia de la I.E. 30916 San Francisco de Asís
              </p>
            </div>

            <div className="space-y-4">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 group animate-fade-in-up"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 group-hover:bg-white/20 transition-all">
                      <Icon className="h-4 w-4 text-[#D4A853]" />
                    </div>
                    <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">{f.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-sm text-white/30">
            &copy; {new Date().getFullYear()} I.E. 30916 San Francisco de Asís
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="relative flex w-full items-center justify-center bg-gradient-to-br from-[#faf8f5] via-[#f5f0e8] to-[#faf8f5] p-6 lg:w-1/2">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#8B6914]/5 via-transparent to-transparent animate-float" style={{ animationDuration: '12s' }} />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-[#D4A853]/8 via-transparent to-transparent animate-float" style={{ animationDuration: '15s', animationDelay: '-3s' }} />
        </div>

        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <Image
              src="/logo.png"
              alt="I.E. 30916 San Francisco de Asís"
              width={240}
              height={60}
              className="mx-auto h-auto w-52 drop-shadow-sm"
              priority
            />
            <p className="mt-2 text-xs font-medium text-[#8B6914]/60 tracking-wider uppercase">
              Sistema de Control de Asistencia
            </p>
          </div>

          <Card className="overflow-hidden border border-[#8B6914]/10 bg-white/95 backdrop-blur-sm shadow-xl shadow-[#8B6914]/5">
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8B6914] via-[#D4A853] to-[#8B6914]" />

              <div className="p-8">
                {/* Desktop: subtle badge */}
                <div className="hidden lg:flex lg:mb-6 lg:items-center lg:gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B6914]/10 to-[#D4A853]/10">
                    <GraduationCap className="h-4 w-4 text-[#8B6914]" />
                  </div>
                  <span className="text-xs font-semibold text-[#8B6914]/60 tracking-wider uppercase">Acceso al Sistema</span>
                </div>

                <div className="mb-7">
                  <h1 className="text-2xl font-bold tracking-tight text-[#2C2C2C]">
                    Bienvenido
                  </h1>
                  <p className="mt-1.5 text-sm text-[#6B5B4E]">
                    Ingrese sus credenciales para acceder al sistema
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
                      Número de DNI
                    </Label>
                    <div className="group relative">
                      <Input
                        id="dni"
                        placeholder="Ingrese su DNI"
                        value={dni}
                        onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        maxLength={8}
                        disabled={loading}
                        autoComplete="username"
                        className="h-12 w-full rounded-xl border-[#E0D5C0] bg-white pl-4 pr-12 text-base transition-all duration-200 placeholder:text-[#6B5B4E]/30 focus:border-[#8B6914] focus:ring-2 focus:ring-[#8B6914]/15 focus:outline-none"
                      />
                      {dni.length === 8 && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium text-[#4a4a4a]">
                        Contraseña
                      </Label>
                    </div>
                    <div className="group relative">
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
                    className="relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#8B6914] to-[#a8882c] text-white text-base font-semibold shadow-lg shadow-[#8B6914]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#8B6914]/35 hover:from-[#7a5d12] hover:to-[#8B6914] active:scale-[0.98] disabled:opacity-70 disabled:hover:shadow-lg group"
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
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>

              <div className="flex items-center justify-between border-t border-[#E0D5C0]/50 bg-[#FAF8F5]/50 px-8 py-4">
                <span className="text-xs text-[#6B5B4E]/40">¿Problemas con tu cuenta?</span>
                <Link
                  href="/recuperar"
                  className="text-xs font-medium text-[#8B6914] transition-all hover:text-[#7a5d12] hover:underline"
                >
                  Recuperar acceso
                </Link>
              </div>
            </div>
          </Card>

          <p className="mt-8 text-center text-xs text-[#6B5B4E]/30 lg:hidden">
            I.E. 30916 San Francisco de Asís &mdash; Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
