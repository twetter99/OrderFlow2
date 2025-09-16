'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updatePurchaseOrderStatus } from '@/app/purchasing/actions';

// --- Componente del Botón de Aprobación ---
export function ApproveButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    try {
      // Llamada directa a la función de actualización
      await updatePurchaseOrderStatus(orderId, 'Aprobada', 'Aprobado desde enlace público.');
      // Refrescamos la página para que se actualice y muestre el nuevo estado
      router.refresh();
    } catch (error) {
      console.error('Error al aprobar la orden:', error);
      setIsPending(false);
    }
  };

  return (
    <Button 
      onClick={handleClick} 
      disabled={isPending} 
      className="bg-green-600 hover:bg-green-700"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : (
        'Aprobar'
      )}
    </Button>
  );
}

// --- Componente del Botón de Rechazo ---
export function RejectButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    try {
      // Llamada directa a la función de actualización
      await updatePurchaseOrderStatus(orderId, 'Rechazado', 'Rechazado desde enlace público.');
      // Refrescamos la página para que se actualice y muestre el nuevo estado
      router.refresh();
    } catch (error) {
      console.error('Error al rechazar la orden:', error);
      setIsPending(false);
    }
  };

  return (
    <Button 
      variant="destructive" 
      onClick={handleClick} 
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : (
        'Rechazar'
      )}
    </Button>
  );
}