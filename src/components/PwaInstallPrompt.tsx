'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setInstalled(true);
      setShow(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    // Hide if already standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShow(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstalled(true);
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (!show || installed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-fade-in-up">
      <div className="flex items-center gap-3 rounded-2xl border border-[#E0D5C0] bg-white p-4 shadow-xl shadow-[#8B6914]/10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
          <Download className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Instala la app</p>
          <p className="text-xs text-muted-foreground">Accede rápido desde tu pantalla de inicio</p>
        </div>
        <button
          onClick={handleInstall}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary-dark active:scale-95"
        >
          Instalar
        </button>
        <button
          onClick={() => setShow(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
