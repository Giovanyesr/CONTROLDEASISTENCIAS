'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';

interface QRDisplayProps {
  uuid: string;
  size?: number;
  showLabel?: boolean;
}

export function QRDisplay({ uuid, size = 200, showLabel = true }: QRDisplayProps) {
  const qrValue = `${typeof window !== 'undefined' ? window.location.origin : ''}/qr/${uuid}`;

  return (
    <Card className="inline-block">
      <CardContent className="p-4">
        <QRCodeSVG
          value={qrValue}
          size={size}
          level="H"
          includeMargin
          bgColor="#ffffff"
          fgColor="#1e40af"
        />
        {showLabel && (
          <p className="mt-2 text-center text-xs text-gray-500">
            Escanea este código para registrar asistencia
          </p>
        )}
      </CardContent>
    </Card>
  );
}
