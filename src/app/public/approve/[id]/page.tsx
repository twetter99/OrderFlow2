'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function ApprovedPage({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error' | 'expired' | 'already'>('loading');

  useEffect(() => {
    const approve = async () => {
      try {
        const res = await fetch('/api/purchasing/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: params.id }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setStatus('ok');
        } else if (data?.error === 'ALREADY_PROCESSED') {
          setStatus('already');
        } else if (data?.error === 'EXPIRED') {
          setStatus('expired');
        } else {
          setStatus('error');
        }
      } catch (e) {
        setStatus('error');
      }
    };

    approve();
  }, [params.id]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-50 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl text-green-700">
            {status === 'loading' && 'Procesando…'}
            {status === 'ok' && '¡Orden Aprobada!'}
            {status === 'already' && 'Ya estaba procesada'}
            {status === 'expired' && 'El enlace ha expirado'}
            {status === 'error' && 'Error al aprobar la orden'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'ok' && (
            <p className="text-muted-foreground">
              La orden de compra ha sido aprobada correctamente y el proceso de adquisición continuará.
              Ya puedes cerrar esta ventana.
            </p>
          )}
          {status === 'loading' && <p className="text-muted-foreground">Esperando confirmación…</p>}
          {status === 'already' && <p className="text-muted-foreground">Esta orden ya fue aprobada o rechazada.</p>}
          {status === 'expired' && <p className="text-muted-foreground">Este enlace ya no es válido.</p>}
          {status === 'error' && <p className="text-muted-foreground">No se pudo procesar la orden.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
