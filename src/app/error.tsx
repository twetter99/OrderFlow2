"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log del error en consola para debugging
    console.error("Error capturado por error boundary:", error);
    console.error("Digest:", error.digest);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Ha ocurrido un error</CardTitle>
          <CardDescription>
            Lo sentimos, algo salió mal al cargar esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mostrar información del error en desarrollo */}
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-md bg-muted p-4 text-sm">
              <p className="font-medium text-destructive mb-2">Detalles del error:</p>
              <p className="text-muted-foreground break-all">{error.message}</p>
              {error.digest && (
                <p className="text-muted-foreground mt-2">
                  <span className="font-medium">Digest:</span> {error.digest}
                </p>
              )}
            </div>
          )}
          
          {/* En producción, mostrar el digest para referencia */}
          {process.env.NODE_ENV === "production" && error.digest && (
            <div className="rounded-md bg-muted p-4 text-sm text-center">
              <p className="text-muted-foreground">
                Código de referencia: <code className="font-mono">{error.digest}</code>
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Intentar de nuevo
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => window.location.href = '/dashboard'}
            >
              <Home className="h-4 w-4" />
              Ir al Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
