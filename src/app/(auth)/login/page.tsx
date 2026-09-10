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
  IdCard, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getPeruCalendarDate } from '@/lib/utils';

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
    { icon: Users, label: 'Gestión Estudiantil' },
    { icon: CalendarClock, label: 'Control de Asistencia' },
    { icon: ShieldCheck, label: 'Gestión de Brigadieres' },
    { icon: BarChart3, label: 'Reportes e Historial' },
  ];

  return (
    <div className="relative flex min-h-screen bg-[#FDFCFB] overflow-hidden selection:bg-[#D4A853]/30 selection:text-[#4a3b1a]">
      {/* ===== LEFT COLUMN — Branding Institucional ===== */}
      <div className="hidden lg:flex lg:w-[48%] relative flex-col justify-between bg-[#0f0c05] p-12 z-10 overflow-hidden">
        
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#D4A853]/15 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#8B6914]/15 rounded-full blur-[130px] mix-blend-screen" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent_80%)]" />
        </div>

        {/* Wavy edge separator */}
        <div className="absolute right-0 top-0 h-full w-[120px] translate-x-full pointer-events-none z-20">
          <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 1000">
            <path d="M 0 0 C 60 300 60 700 0 1000 Z" fill="#0f0c05" />
            <path d="M 0 0 C 60 300 60 700 0 1000" fill="none" stroke="url(#goldGrad)" strokeWidth="2" opacity="0.5" />
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#D4A853" stopOpacity="0" />
                <stop offset="50%" stopColor="#D4A853" stopOpacity="1" />
                <stop offset="100%" stopColor="#D4A853" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Header / Logo section */}
        <div className="relative z-10 animate-in fade-in slide-in-from-top-8 duration-1000">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 drop-shadow-[0_0_15px_rgba(212,168,83,0.3)]">
              <Image
                src="/logo.png"
                alt="Logo I.E."
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white/90 tracking-wide uppercase">
                I.E. 30916 San Francisco de Asís
              </h2>
              <p className="text-[13px] text-[#D4A853] tracking-widest mt-0.5 uppercase">Puente Capelo</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col justify-center flex-1 my-10 animate-in fade-in slide-in-from-left-8 duration-1000 delay-150 fill-mode-both">
          
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/5 bg-white/[0.03] px-4 py-2 backdrop-blur-xl w-fit mb-8 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
            <span className="text-[12px] text-white/80 font-medium tracking-wide uppercase">Plataforma Institucional</span>
          </div>
          
          <h1 className="text-[3.5rem] font-bold leading-[1.05] tracking-tight mb-6">
            <span className="text-white block">Sistema de</span>
            <span className="bg-gradient-to-r from-[#D4A853] via-[#FFE5A3] to-[#D4A853] bg-clip-text text-transparent block pb-2">
              Asistencia
            </span>
          </h1>
          
          <p className="text-[16px] text-white/60 leading-relaxed max-w-md font-light mb-12">
            Gestión inteligente y control automatizado de asistencia estudiantil. Una solución integral para nuestra comunidad educativa.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.06] hover:border-[#D4A853]/30 hover:shadow-[0_0_30px_rgba(212,168,83,0.1)] hover:-translate-y-1 cursor-default">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/20 text-[#D4A853] shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#D4A853]/10">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors">{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-[12px] text-white/40 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both border-t border-white/10 pt-6">
          <p>&copy; {getPeruCalendarDate().getFullYear()} Todos los derechos reservados.</p>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#D4A853]/60" />
            <span>Sistema Seguro v2.0</span>
          </div>
        </div>
      </div>

      {/* ===== RIGHT COLUMN — Formulario de Login ===== */}
      <div className="relative flex w-full flex-col items-center justify-center p-6 lg:w-[52%] z-10">
        
        {/* Mobile branding header */}
        <div className="absolute left-0 right-0 top-0 flex flex-col items-center pt-8 pb-4 lg:hidden bg-white/80 backdrop-blur-md z-20 border-b border-gray-100">
          <Image src="/logo.png" alt="I.E. 30916 San Francisco de Asís" width={80} height={80} className="h-20 w-20 drop-shadow-sm" priority />
          <p className="mt-2 text-[10px] font-semibold text-[#8B6914] tracking-[0.15em] uppercase">Control de Asistencia</p>
        </div>

        <div className="w-full max-w-[420px] mt-24 lg:mt-0 relative z-30 lg:-ml-8 animate-in fade-in zoom-in-95 duration-700">
          {/* Main Form Card */}
          <Card className="overflow-hidden border-0 bg-white/70 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.08)] rounded-[2rem] ring-1 ring-gray-900/5">
            <div className="p-8 sm:p-10">
              
              {/* Badge Top Card */}
              <div className="mb-10 flex items-center justify-center lg:justify-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4A853]/20 to-[#8B6914]/5 text-[#8B6914] shadow-sm ring-1 ring-[#D4A853]/30">
                  <Lock className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-gray-900 leading-none">Bienvenido</h2>
                  <p className="text-[12px] font-medium text-[#8B6914] uppercase tracking-wider mt-1.5">Acceso al Sistema</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="animate-in slide-in-from-top-2 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-4 text-[13px] text-red-600 shadow-sm">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                {/* DNI Input */}
                <div className="space-y-2 group">
                  <Label htmlFor="dni" className="text-[13px] font-semibold text-gray-600 ml-1 transition-colors group-focus-within:text-[#8B6914]">
                    Documento de Identidad
                  </Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#8B6914]">
                      <IdCard className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <Input
                      id="dni"
                      placeholder="Ingresa tu DNI de 8 dígitos"
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      maxLength={8}
                      disabled={loading}
                      autoComplete="username"
                      className="h-[54px] w-full rounded-2xl border-0 bg-gray-50/80 pl-12 pr-4 text-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ring-1 ring-gray-200 transition-all focus:bg-white focus:ring-2 focus:ring-[#D4A853] hover:bg-gray-50 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2 group">
                  <div className="flex items-center justify-between ml-1">
                    <Label htmlFor="password" className="text-[13px] font-semibold text-gray-600 transition-colors group-focus-within:text-[#8B6914]">
                      Contraseña
                    </Label>
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#8B6914]">
                      <Lock className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                      className="h-[54px] w-full rounded-2xl border-0 bg-gray-50/80 pl-12 pr-12 text-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ring-1 ring-gray-200 transition-all focus:bg-white focus:ring-2 focus:ring-[#D4A853] hover:bg-gray-50 placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                {/* Recuperar enlace */}
                <div className="flex justify-end pt-1">
                  <Link
                    href="/recuperar"
                    className="text-[13px] font-medium text-gray-500 transition-colors hover:text-[#8B6914]"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="relative h-[54px] w-full rounded-2xl bg-[#111827] text-white text-[15px] font-semibold shadow-[0_8px_20px_rgba(17,24,39,0.15)] transition-all duration-300 hover:shadow-[0_12px_25px_rgba(17,24,39,0.25)] hover:-translate-y-0.5 mt-4 hover:bg-[#1f2937]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2 relative z-10">
                      <Loader2 className="h-5 w-5 animate-spin text-[#D4A853]" />
                      <span>Verificando credenciales...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2 relative z-10">
                      <span>Ingresar al sistema</span>
                      <ArrowRight className="h-4 w-4 text-[#D4A853] transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>

      {/* Decorative background blur blobs right side */}
      <div className="fixed right-0 top-0 -z-10 h-full w-1/2 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-[10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[#D4A853]/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[10%] h-[500px] w-[500px] rounded-full bg-[#8B6914]/15 blur-[120px]" />
      </div>

    </div>
  );
}
