import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function RejectedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-red-50 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="mt-4 text-2xl text-red-700">Orden Rechazada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La orden de compra ha sido marcada como rechazada. El solicitante será notificado.
            Ya puedes cerrar esta ventana.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
