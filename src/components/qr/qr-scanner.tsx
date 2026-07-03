'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Smartphone } from 'lucide-react';

interface QRScannerProps {
  onScan: (uuid: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner-element';

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        const cams = devices.map((d) => ({ id: d.id, label: d.label || `Cámara ${d.id}` }));
        setCameras(cams);
        if (cams.length > 0) {
          setSelectedCamera(cams[0].id);
        }
      })
      .catch(() => {});

    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) {
      onError?.('No se encontraron cámaras disponibles');
      return;
    }

    try {
      setScanning(true);
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;

      await scanner.start(
        selectedCamera,
        { fps: 15, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const uuid = decodedText.split('/').pop() || decodedText;
          onScan(uuid);
          stopScanning();
        },
        () => {}
      );
    } catch (err: any) {
      setScanning(false);
      onError?.(err.message || 'Error al iniciar la cámara');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {cameras.length > 1 && (
        <div className="flex w-full items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            disabled={scanning}
            className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.label.replace(/\(\w+\)/, '').trim() || `Cámara ${cam.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        id={scannerDivId}
        className={`w-full overflow-hidden rounded-xl border-2 transition-all duration-300 ${
          scanning
            ? 'border-primary shadow-lg shadow-primary/10'
            : 'border-dashed border-border'
        }`}
        style={{ maxWidth: 400, minHeight: 280 }}
      />

      <div className="flex justify-center gap-2">
        {!scanning ? (
          <Button
            onClick={startScanning}
            className="gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
          >
            <Camera className="h-4 w-4" />
            Iniciar Escáner
          </Button>
        ) : (
          <Button
            onClick={stopScanning}
            variant="destructive"
            className="gap-2 rounded-xl shadow-lg transition-all duration-200 active:scale-[0.98]"
          >
            <CameraOff className="h-4 w-4" />
            Detener Escáner
          </Button>
        )}
      </div>
    </div>
  );
}
