
"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
    const { logOut } = useAuth();
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-4xl font-bold font-headline text-destructive">Acceso Denegado</h1>
            <p className="mt-2 text-lg text-muted-foreground">
                No tienes los permisos necesarios para acceder a esta página o a ninguna sección de la aplicación.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
                Por favor, contacta con el administrador del sistema si crees que esto es un error.
            </p>
            <div className="mt-8 flex gap-4">
                <Button onClick={() => router.back()} variant="outline">
                    Volver a la página anterior
                </Button>
                <Button onClick={logOut}>
                    Cerrar Sesión
                </Button>
            </div>
        </div>
    );
}
