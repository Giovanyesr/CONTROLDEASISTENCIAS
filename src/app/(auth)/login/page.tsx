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
import { AlertCircle, Eye, EyeOff, Loader2, GraduationCap, ShieldCheck, CalendarClock, Users, CheckCircle2, ArrowRight, BookOpen, Clock, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [focusedField, setFocusedField] = useState<'dni' | 'password' | null>(null);

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
    { icon: Users, text: 'Gestión de estudiantes' },
    { icon: CalendarClock, text: 'Registro de asistencia diario' },
    { icon: ShieldCheck, text: 'Control de brigadieres' },
    { icon: BarChart3, text: 'Reportes e historial' },
  ];

  return (
    <div className="relative flex min-h-screen bg-[#faf8f5]">
      {/* Brand Side - Desktop */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-[#8B6914] via-[#6d5510] to-[#4d3c0b] overflow-hidden">
        {/* Abstract geometric shapes */}
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#D4A853]/15 blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-white/5 blur-[100px]" />
          <svg className="absolute bottom-0 left-0 w-full h-64 opacity-[0.04]" viewBox="0 0 800 200" preserveAspectRatio="none">
            <path d="M0,100 C200,0 400,200 800,100 L800,200 L0,200 Z" fill="white" />
          </svg>
          <svg className="absolute top-0 right-0 w-72 h-72 opacity-[0.03]" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" fill="none" stroke="white" strokeWidth="0.5" />
            <circle cx="150" cy="150" r="100" fill="none" stroke="white" strokeWidth="0.5" />
            <circle cx="150" cy="150" r="60" fill="none" stroke="white" strokeWidth="0.5" />
          </svg>
          <div className="absolute top-1/3 right-10 w-32 h-32 border border-white/10 rounded-3xl rotate-12" />
          <div className="absolute bottom-1/4 left-10 w-24 h-24 border border-white/10 rounded-full" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-14 w-full min-h-screen">
          <div className="flex justify-center w-full">
            <div className="rounded-2xl bg-white/95 backdrop-blur-sm px-6 py-3.5 shadow-2xl shadow-black/20">
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

          <div className="space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sistema activo
              </div>
              <h1 className="text-[2.75rem] font-bold tracking-tight text-white leading-[1.1]">
                Control de
                <br />
                <span className="text-[#D4A853]">Asistencia</span>
              </h1>
              <p className="text-base text-white/60 max-w-md leading-relaxed">
                Plataforma integral para la gestión educativa de la I.E. 30916 San Francisco de Asís
              </p>
            </div>

            <div className="space-y-3">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="flex items-center gap-3.5 group" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 group-hover:bg-white/20 group-hover:ring-white/30 transition-all duration-300">
                      <Icon className="h-4 w-4 text-[#D4A853]" />
                    </div>
                    <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors duration-300">{f.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/25">
            <span>&copy; {new Date().getFullYear()} I.E. 30916 San Francisco de Asís</span>
            <div className="flex items-center gap-3">
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>v2.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="relative flex w-full items-center justify-center p-6 lg:w-[55%]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#8B6914]/5 via-transparent to-transparent" />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-[#D4A853]/8 via-transparent to-transparent" />
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 text-center lg:hidden">
            <Image
              src="/logo.png"
              alt="I.E. 30916 San Francisco de Asís"
              width={240}
              height={60}
              className="mx-auto h-auto w-52 drop-shadow-sm"
              priority
            />
            <p className="mt-2 text-xs font-medium text-[#8B6914]/60 tracking-widest uppercase">
              Control de Asistencia
            </p>
          </div>

          <Card className="overflow-hidden border border-[#E0D5C0]/60 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8B6914] via-[#D4A853] to-[#8B6914]" />

              <div className="p-7 sm:p-8">
                {/* Badge */}
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B6914]/10 to-[#D4A853]/10 ring-1 ring-[#8B6914]/10">
                    <GraduationCap className="h-3.5 w-3.5 text-[#8B6914]" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#8B6914]/50 tracking-[0.15em] uppercase">Acceso al Sistema</span>
                </div>

                <div className="mb-7">
                  <h1 className="text-[1.65rem] font-bold tracking-tight text-[#2C2C2C]">
                    Bienvenido
                  </h1>
                  <p className="mt-1.5 text-sm text-[#6B5B4E]/70">
                    Ingrese sus credenciales para continuar
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="animate-scale-in flex items-center gap-2.5 rounded-xl border border-red-200/80 bg-red-50/90 p-3.5 text-sm text-red-700 shadow-sm">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </div>
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="dni" className="text-sm font-medium text-[#4a4a4a]/80">
                      Número de DNI
                    </Label>
                    <div className="relative">
                      <Input
                        id="dni"
                        placeholder="Ingrese su DNI"
                        value={dni}
                        onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        maxLength={8}
                        disabled={loading}
                        onFocus={() => setFocusedField('dni')}
                        onBlur={() => setFocusedField(null)}
                        autoComplete="username"
                        className="h-12 w-full rounded-xl border bg-white pl-4 pr-12 text-base shadow-sm transition-all duration-200 placeholder:text-[#6B5B4E]/25 focus:border-[#8B6914] focus:ring-[3px] focus:ring-[#8B6914]/10 focus:shadow-md focus:outline-none"
                        style={{ borderColor: focusedField === 'dni' ? '#8B6914' : '#E0D5C0' }}
                      />
                      {dni.length === 8 && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium text-[#4a4a4a]/80">
                        Contraseña
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        autoComplete="current-password"
                        className="h-12 w-full rounded-xl border bg-white pr-12 pl-4 text-base shadow-sm transition-all duration-200 placeholder:text-[#6B5B4E]/25 focus:border-[#8B6914] focus:ring-[3px] focus:ring-[#8B6914]/10 focus:shadow-md focus:outline-none"
                        style={{ borderColor: focusedField === 'password' ? '#8B6914' : '#E0D5C0' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B5B4E]/35 transition-all hover:text-[#8B6914] active:scale-90"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#8B6914] to-[#a8882c] text-white text-base font-semibold shadow-lg shadow-[#8B6914]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#8B6914]/30 hover:from-[#7a5d12] hover:to-[#8B6914] active:scale-[0.98] disabled:opacity-70 disabled:hover:shadow-lg group"
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
                        <ArrowRight className="h-4 w-4 transition-all duration-300 group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>

              <div className="flex items-center justify-center gap-1.5 border-t border-[#E0D5C0]/40 bg-[#FAF8F5]/70 px-8 py-4">
                <span className="text-xs text-[#6B5B4E]/40">¿Problemas para ingresar?</span>
                <Link
                  href="/recuperar"
                  className="text-xs font-medium text-[#8B6914] transition-all hover:text-[#7a5d12]"
                >
                  Recuperar acceso
                </Link>
              </div>
            </div>
          </Card>

          <p className="mt-8 text-center text-xs text-[#6B5B4E]/25 lg:hidden">
            I.E. 30916 San Francisco de Asís &mdash; Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
