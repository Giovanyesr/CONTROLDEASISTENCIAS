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
import {
  AlertCircle, Eye, EyeOff, Loader2, GraduationCap,
  Users, CalendarClock, ShieldCheck, BarChart3, ArrowRight,
  CheckCircle2, BookOpen,
} from 'lucide-react';
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
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setLoading(true);
    try {
      await login(dni, password);
      toast.success('Inicio de sesión exitoso');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      toast.error(err.message || 'Error al iniciar sesión');
    } finally { setLoading(false); }
  };

  const features = [
    { icon: Users, label: 'Gestión de estudiantes' },
    { icon: CalendarClock, label: 'Registro diario de asistencia' },
    { icon: ShieldCheck, label: 'Control de brigadieres' },
    { icon: BarChart3, label: 'Reportes e historial' },
  ];

  return (
    <div className="relative flex min-h-screen bg-[#f5f2ed]">
      {/* ===== LEFT COLUMN — Branding Institucional ===== */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between bg-gradient-to-br from-[#8B6914] via-[#6d5510] to-[#4d3c0b] p-14 overflow-hidden">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#D4A853]/12 blur-[130px]" />
          <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-white/5 blur-[100px]" />
          <div className="absolute top-1/4 left-1/2 h-px w-96 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#D4A853]/15 to-transparent" />
          <svg className="absolute bottom-0 left-0 w-full h-48 opacity-[0.04]" viewBox="0 0 800 200" preserveAspectRatio="none">
            <path d="M0,120 C200,40 400,180 800,80 L800,200 L0,200 Z" fill="white" />
          </svg>
          <div className="absolute top-1/3 right-12 h-28 w-28 rounded-full border border-white/[0.06]" />
          <div className="absolute bottom-1/3 left-12 h-20 w-20 rounded-2xl border border-white/[0.06] rotate-12" />
        </div>

        {/* Logo + Nombre */}
        <div className="relative z-10">
          <div className="flex flex-col items-center">
            <div className="rounded-2xl bg-white/[0.96] backdrop-blur-sm px-8 py-4 shadow-2xl shadow-black/25 ring-1 ring-white/20">
              <Image
                src="/logo.png"
                alt="I.E. 30916 San Francisco de Asís"
                width={220}
                height={55}
                className="h-auto w-48"
                priority
              />
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-semibold text-white/90 tracking-wide">
                I.E. 30916 San Francisco de Asís
              </p>
              <p className="text-xs text-[#D4A853]/70 tracking-wider mt-0.5">
                Puente Capelo
              </p>
            </div>
          </div>
        </div>

        {/* Middle content */}
        <div className="relative z-10 space-y-8 -mt-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1 text-[11px] font-medium text-white/60 tracking-wider backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              Plataforma institucional
            </span>
            <h1 className="text-[2.5rem] font-bold tracking-tight text-white leading-[1.15]">
              Control de
              <br />
              <span className="text-[#D4A853]">Asistencia</span>
            </h1>
            <p className="text-[15px] text-white/60 leading-relaxed max-w-sm">
              Plataforma institucional para el registro, control y seguimiento de asistencia estudiantil.
            </p>
          </div>

          <div className="space-y-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-center gap-3.5 group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] ring-1 ring-white/[0.08] group-hover:bg-white/[0.12] group-hover:ring-white/[0.15] transition-all duration-300">
                    <Icon className="h-4 w-4 text-[#D4A853]" />
                  </div>
                  <span className="text-sm text-white/55 group-hover:text-white/75 transition-colors duration-300">{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/20">
          <span>&copy; {new Date().getFullYear()} I.E. 30916 San Francisco de Asís</span>
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>v2.0</span>
          </div>
        </div>
      </div>

      {/* ===== RIGHT COLUMN — Formulario de Login ===== */}
      <div className="relative flex w-full items-center justify-center p-5 lg:w-[55%]">
        {/* Mobile branding header */}
        <div className="absolute left-0 right-0 top-0 flex flex-col items-center pt-10 pb-6 lg:hidden">
          <Image
            src="/logo.png"
            alt="I.E. 30916 San Francisco de Asís"
            width={200}
            height={50}
            className="h-auto w-40 drop-shadow-sm"
            priority
          />
          <p className="mt-2 text-[11px] font-semibold text-[#8B6914]/50 tracking-[0.15em] uppercase">
            Control de Asistencia
          </p>
        </div>

        <div className="w-full max-w-sm mt-24 lg:mt-0">
          <Card className="overflow-hidden border border-[#E0D5C0]/50 bg-white shadow-[0_12px_50px_-12px_rgba(0,0,0,0.18)]">
            <div className="relative">
              {/* Gold top bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#8B6914] via-[#D4A853] to-[#8B6914]" />

              <div className="p-8 sm:p-10">
                {/* Badge */}
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B6914]/10 to-[#D4A853]/10 ring-1 ring-[#8B6914]/10">
                    <GraduationCap className="h-3.5 w-3.5 text-[#8B6914]" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#8B6914]/45 tracking-[0.18em] uppercase">
                    Acceso al Sistema
                  </span>
                </div>

                {/* Title */}
                <div className="mb-8">
                  <h1 className="text-[1.6rem] font-bold tracking-tight text-[#2C2C2C]">
                    Iniciar sesión
                  </h1>
                  <p className="mt-1.5 text-sm text-[#6B5B4E]/60">
                    Accede al sistema de asistencia con tu DNI y contraseña
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="animate-scale-in flex items-center gap-2.5 rounded-xl border border-red-200/80 bg-red-50/90 p-3.5 text-sm text-red-700 shadow-sm">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </div>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* DNI */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dni" className="text-sm font-medium text-[#4a4a4a]/70">
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
                        autoComplete="username"
                        className="h-12 w-full rounded-xl border bg-white pl-4 pr-12 text-[15px] shadow-sm transition-all duration-200 placeholder:text-[#6B5B4E]/25 focus:border-[#8B6914] focus:ring-[3px] focus:ring-[#8B6914]/10 focus:shadow-md focus:outline-none"
                        style={{ borderColor: '#E0D5C0' }}
                      />
                      {dni.length === 8 && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium text-[#4a4a4a]/70">
                        Contraseña
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Ingrese su contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        autoComplete="current-password"
                        className="h-12 w-full rounded-xl border bg-white pr-12 pl-4 text-[15px] shadow-sm transition-all duration-200 placeholder:text-[#6B5B4E]/25 focus:border-[#8B6914] focus:ring-[3px] focus:ring-[#8B6914]/10 focus:shadow-md focus:outline-none"
                        style={{ borderColor: '#E0D5C0' }}
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

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#8B6914] to-[#a8882c] text-white text-[15px] font-semibold shadow-lg shadow-[#8B6914]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#8B6914]/30 hover:from-[#7a5d12] hover:to-[#8B6914] active:scale-[0.98] disabled:opacity-70 group"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Ingresando...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>Ingresar al sistema</span>
                        <ArrowRight className="h-4 w-4 transition-all duration-300 group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>

              {/* Footer link */}
              <div className="flex items-center justify-center gap-1.5 border-t border-[#E0D5C0]/40 bg-[#FAF8F5]/50 px-8 py-4">
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
