import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ApprovedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-50 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl text-green-700">¡Orden Aprobada!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La orden de compra ha sido aprobada correctamente y el proceso de adquisición continuará.
            Ya puedes cerrar esta ventana.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}