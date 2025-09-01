
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Replanteo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ClipboardList, Calendar, Wrench, Edit } from "lucide-react";

interface ReplanCardProps {
    replan: Replanteo;
    onEdit: (replan: Replanteo) => void;
}

export function ReplanCard({ replan, onEdit }: ReplanCardProps) {
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                           <ClipboardList className="h-5 w-5 text-primary"/>
                           {replan.vehiculo_identificacion}
                        </CardTitle>
                        <CardDescription>
                            Matrícula: {replan.matricula}
                        </CardDescription>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          replan.estado === "Completado" && "bg-green-100 text-green-800 border-green-200",
                          replan.estado === "En Proceso" && "bg-blue-100 text-blue-800 border-blue-200",
                          replan.estado === "Pendiente" && "bg-yellow-100 text-yellow-800 border-yellow-200",
                        )}
                      >
                        {replan.estado}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground"/>
                    <span>Fecha Replanteo: {new Date(replan.fecha_replanteo).toLocaleDateString()}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground"/>
                    <span>Plantilla Base: {replan.plantilla_base_id}</span>
                </div>
                 <p className="text-muted-foreground line-clamp-2 pt-2">
                    {replan.observaciones}
                 </p>
            </CardContent>
            <CardFooter>
                <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(replan)}>
                    <Edit className="mr-2 h-4 w-4"/>
                    Ver / Editar Detalles
                </Button>
            </CardFooter>
        </Card>
    )
}
