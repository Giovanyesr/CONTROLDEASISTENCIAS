'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || installed) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Instalar aplicación</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isIOS
              ? 'Presiona el botón Compartir < then "Agregar a pantalla de inicio"'
              : 'Accede rápido desde tu pantalla de inicio'}
          </p>
        </div>
        {!isIOS && deferredPrompt && (
          <Button size="sm" onClick={handleInstall} className="gap-1.5 shrink-0">
            <Download className="h-3.5 w-3.5" />
            Instalar
          </Button>
        )}
      </div>
    </div>
  );
}
