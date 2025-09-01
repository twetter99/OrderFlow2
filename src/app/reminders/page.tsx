
"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function RemindersPage() {

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase flex items-center gap-2"><Clock />Recordatorios</h1>
          <p className="text-muted-foreground">
            Gestiona los recordatorios automáticos y su configuración.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Módulo de Recordatorios</CardTitle>
            <CardDescription>Esta sección está en desarrollo. Aquí podrás configurar y visualizar todos los recordatorios automáticos del sistema.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-16 text-muted-foreground">
                <p>Próximamente...</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
