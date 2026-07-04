'use client';

import { MessageCircle, ArrowLeft, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const WHATSAPP = '51956261852';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP}?text=Hola%2C%20necesito%20ayuda%20con%20mi%20cuenta%20del%20sistema%20de%20asistencia`;

export default function RecuperarPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#faf8f5] via-[#f5f0e8] to-[#faf8f5] p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#8B6914]/5 via-transparent to-transparent animate-float" style={{ animationDuration: '12s' }} />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-[#D4A853]/8 via-transparent to-transparent animate-float" style={{ animationDuration: '15s', animationDelay: '-3s' }} />
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
        </div>

        <Card className="overflow-hidden border border-[#8B6914]/10 bg-white/95 backdrop-blur-sm shadow-xl shadow-[#8B6914]/5">
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8B6914] via-[#D4A853] to-[#8B6914]" />
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B6914]/10 to-[#D4A853]/10 ring-1 ring-[#8B6914]/10">
                <GraduationCap className="h-7 w-7 text-[#8B6914]" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-[#2C2C2C]">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="mt-2 text-sm text-[#6B5B4E] leading-relaxed">
                Para recuperar el acceso a tu cuenta, contáctate con soporte técnico a través de WhatsApp. Te atenderemos a la brevedad.
              </p>

              <div className="mt-8">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="h-12 w-full gap-3 rounded-xl bg-green-600 text-white text-base font-semibold shadow-lg shadow-green-600/25 transition-all duration-300 hover:bg-green-700 hover:shadow-xl hover:shadow-green-600/35 active:scale-[0.98]">
                    <MessageCircle className="h-5 w-5" />
                    Contactar por WhatsApp
                  </Button>
                </a>
                <p className="mt-2 text-xs text-[#6B5B4E]/50">
                  +51 956 261 852
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center border-t border-[#E0D5C0]/50 bg-[#FAF8F5]/50 px-8 py-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-[#6B5B4E]/70 transition-all hover:text-[#8B6914]"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
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
