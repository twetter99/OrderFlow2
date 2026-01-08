"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, BarChart3, FileDown, RefreshCw } from "lucide-react";
import type { Project, InformeViaje } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { revalidateProjectTracking } from "./actions";
import { useToast } from "@/hooks/use-toast";

// Tipo ligero para totales pre-calculados
interface ProjectSpentData {
  projectId: string;
  spent: number;          // Materiales recibidos
  committed: number;      // Materiales comprometidos
  travelApproved: number; // Viajes aprobados
  travelPending: number;  // Viajes pendientes
}

interface ProjectTrackingClientPageProps {
  projects: Project[];
  projectSpentData: ProjectSpentData[];
  travelReports: InformeViaje[];
  cachedAt: string;
}

export function ProjectTrackingClientPage({
  projects: initialProjects,
  projectSpentData,
  travelReports: initialTravelReports,
  cachedAt,
}: ProjectTrackingClientPageProps) {
  const { toast } = useToast();
  const projects = initialProjects;
  const travelReports = initialTravelReports;

  const [filter, setFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calcular tiempo desde última actualización
  const getTimeSinceUpdate = useCallback(() => {
    if (!cachedAt) return "desconocido";
    const cached = new Date(cachedAt);
    const now = new Date();
    const diffMs = now.getTime() - cached.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "hace menos de 1 minuto";
    if (diffMins === 1) return "hace 1 minuto";
    if (diffMins < 60) return `hace ${diffMins} minutos`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "hace 1 hora";
    return `hace ${diffHours} horas`;
  }, [cachedAt]);

  // Función para forzar actualización
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await revalidateProjectTracking();
      toast({
        title: "Datos actualizados",
        description: "Los datos se han refrescado desde Firestore",
      });
      // Recargar la página para obtener datos frescos
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const projectsWithSpent = useMemo(() => {
    // Los datos ya vienen pre-calculados desde el servidor
    const spentByProjectId = new Map<string, { 
      materialsReceived: number; 
      materialsCommitted: number;
      travelApproved: number;
      travelPending: number;
    }>();
    
    projectSpentData.forEach(data => {
      spentByProjectId.set(data.projectId, { 
        materialsReceived: data.spent, 
        materialsCommitted: data.committed,
        travelApproved: data.travelApproved || 0,
        travelPending: data.travelPending || 0,
      });
    });

    return projects
      .map(project => {
        const data = spentByProjectId.get(project.id) || { 
          materialsReceived: 0, 
          materialsCommitted: 0,
          travelApproved: 0,
          travelPending: 0,
        };
        
        const totalSpent = data.materialsReceived + data.travelApproved;
        const totalCommitted = data.materialsCommitted + data.travelPending;
        const totalProjected = totalSpent + totalCommitted;
        
        return {
          ...project,
          materialsReceived: data.materialsReceived,
          materialsCommitted: data.materialsCommitted,
          travelApproved: data.travelApproved,
          travelPending: data.travelPending,
          totalSpent,
          totalCommitted,
          totalProjected,
          spent: totalProjected, // Para compatibilidad
        };
      })
      .filter(project =>
        project.name.toLowerCase().includes(filter.toLowerCase()) ||
        (project.client && project.client.toLowerCase().includes(filter.toLowerCase()))
      )
      .sort((a, b) => b.totalProjected - a.totalProjected); // Ordenar por total proyectado
  }, [projects, projectSpentData, filter]);

  // Función para exportar todos los proyectos a Excel
  const handleExportAllProjects = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    
    // Calcular totales globales
    const totals = projectsWithSpent.reduce((acc, p) => ({
      materialsReceived: acc.materialsReceived + p.materialsReceived,
      materialsCommitted: acc.materialsCommitted + p.materialsCommitted,
      travelApproved: acc.travelApproved + p.travelApproved,
      travelPending: acc.travelPending + p.travelPending,
      totalSpent: acc.totalSpent + p.totalSpent,
      totalCommitted: acc.totalCommitted + p.totalCommitted,
      totalProjected: acc.totalProjected + p.totalProjected,
    }), {
      materialsReceived: 0, materialsCommitted: 0, travelApproved: 0, travelPending: 0,
      totalSpent: 0, totalCommitted: 0, totalProjected: 0
    });
    
    // Hoja 1: Resumen General
    const resumenData = [
      ["INFORME DE GASTOS - TODOS LOS PROYECTOS"],
      ["Fecha de generación:", format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })],
      [],
      ["RESUMEN GLOBAL"],
      [],
      ["Concepto", "Importe"],
      ["Materiales Recibidos", totals.materialsReceived],
      ["Materiales Pendientes", totals.materialsCommitted],
      ["Viajes Aprobados", totals.travelApproved],
      ["Viajes Pendientes", totals.travelPending],
      [],
      ["Total Gastado", totals.totalSpent],
      ["Total Comprometido", totals.totalCommitted],
      ["TOTAL PROYECTADO", totals.totalProjected],
      [],
      [`Total de proyectos: ${projectsWithSpent.length}`],
    ];
    
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen["!cols"] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen");
    
    // Hoja 2: Detalle por Proyecto
    const proyectosHeader = [
      "Proyecto", "Cliente", "Mat. Recibidos", "Mat. Pendientes", 
      "Viajes Aprob.", "Viajes Pend.", "Total Gastado", "Total Comprometido", "Total Proyectado"
    ];
    const proyectosData = projectsWithSpent.map(p => [
      p.name,
      p.client || "-",
      p.materialsReceived,
      p.materialsCommitted,
      p.travelApproved,
      p.travelPending,
      p.totalSpent,
      p.totalCommitted,
      p.totalProjected,
    ]);
    // Añadir fila de totales
    proyectosData.push([
      "TOTALES", "",
      totals.materialsReceived, totals.materialsCommitted,
      totals.travelApproved, totals.travelPending,
      totals.totalSpent, totals.totalCommitted, totals.totalProjected
    ]);
    
    const wsProyectos = XLSX.utils.aoa_to_sheet([proyectosHeader, ...proyectosData]);
    wsProyectos["!cols"] = [
      { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, 
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsProyectos, "Detalle Proyectos");
    
    // Generar y descargar
    const fileName = `Control_Proyectos_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }, [projectsWithSpent]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return '-';
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Control de Proyectos</h1>
          <p className="text-muted-foreground">
            Supervisa los gastos de cada proyecto basados en las órdenes de compra.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Actualizado {getTimeSinceUpdate()}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportAllProjects}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gastos por Proyecto</CardTitle>
          <CardDescription>
            Desglose de gastos: Materiales (recibido + comprometido) + Viajes (aprobado + pendiente)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Filtrar por nombre de proyecto o cliente..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">📦 Materiales</TableHead>
                <TableHead className="text-right">🚗 Viajes</TableHead>
                <TableHead className="text-right font-semibold">💚 Gastado</TableHead>
                <TableHead className="text-right">💛 Comprometido</TableHead>
                <TableHead className="text-right font-semibold bg-primary/5">📊 Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsWithSpent.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <Link 
                      href={`/project-tracking/${project.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{project.client}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <div className="text-green-600">{formatCurrency(project.materialsReceived)}</div>
                    {project.materialsCommitted > 0 && (
                      <div className="text-xs text-orange-500">+{formatCurrency(project.materialsCommitted)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <div className="text-blue-600">{formatCurrency(project.travelApproved)}</div>
                    {project.travelPending > 0 && (
                      <div className="text-xs text-cyan-500">+{formatCurrency(project.travelPending)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-green-700">
                    {formatCurrency(project.totalSpent)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-orange-600">
                    {project.totalCommitted > 0 ? formatCurrency(project.totalCommitted) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold bg-primary/5">
                    {formatCurrency(project.totalProjected)}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/project-tracking/${project.id}`}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Ver detalle completo
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {projectsWithSpent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No se encontraron proyectos que coincidan con el filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
