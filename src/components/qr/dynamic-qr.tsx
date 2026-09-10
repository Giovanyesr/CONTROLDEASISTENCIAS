'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { QRDisplay } from '@/components/qr/qr-display';
import { Button } from '@/components/ui/button';

interface QrData {
  token: string;
  expira_en: string;
  segundos: number;
}

export function DynamicQR() {
  const [qr, setQr] = useState<QrData | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const generar = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/asistencia/generar-qr', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.exito) throw new Error(data.mensaje || data.error || 'No se pudo generar el QR');
      setQr(data);
    } catch (err: any) {
      setError(err.message || 'No se pudo generar el QR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generar(); }, []);

  useEffect(() => {
    if (!qr) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((new Date(qr.expira_en).getTime() - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) generar();
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [qr]);

  if (loading && !qr) return <div className="flex h-52 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (error) return <div className="space-y-3 text-center"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={generar}>Reintentar</Button></div>;

  return (
    <div className="flex flex-col items-center gap-3">
      {qr && <QRDisplay value={`${typeof window !== 'undefined' ? window.location.origin : ''}/qr/${qr.token}`} uuid="" size={180} />}
      <div className={`flex items-center gap-2 text-xs font-medium ${remaining <= 10 ? 'text-red-600' : 'text-muted-foreground'}`}>
        <ShieldCheck className="h-4 w-4" />
        QR valido por {remaining}s
      </div>
      <Button variant="outline" size="sm" className="gap-2" onClick={generar} disabled={loading}>
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Generar nuevo QR
      </Button>
    </div>
  );
}
