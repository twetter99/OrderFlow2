"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
import { MoreHorizontal, Eye, BarChart3 } from "lucide-react";
import type { Project, PurchaseOrder, InformeViaje } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface ProjectTrackingClientPageProps {
  projects: Project[];
  purchaseOrders: PurchaseOrder[];
  travelReports: InformeViaje[];
}

export function ProjectTrackingClientPage({
  projects: initialProjects,
  purchaseOrders: initialPurchaseOrders,
  travelReports: initialTravelReports,
}: ProjectTrackingClientPageProps) {
  const projects = initialProjects;
  const purchaseOrders = initialPurchaseOrders;
  const travelReports = initialTravelReports;

  const [filter, setFilter] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const projectsWithSpent = useMemo(() => {
    const spentByProject = new Map<string, number>();

    const projectIdToNameMap = new Map<string, string>();
    projects.forEach(p => {
      projectIdToNameMap.set(p.id, p.name);
    });

    // Calcular gastos de purchase orders (lógica original)
    purchaseOrders.forEach(order => {
      if (order.project) {
        let projectKey: string | undefined;

        if (projectIdToNameMap.has(order.project)) {
          projectKey = projectIdToNameMap.get(order.project);
        } else {
          projectKey = order.project;
        }

        if (projectKey) {
          const currentSpent = spentByProject.get(projectKey) || 0;
          spentByProject.set(projectKey, currentSpent + order.total);
        }
      }
    });

    // AÑADIR: Calcular gastos de travel reports aprobados
    travelReports.forEach(report => {
      if (report.proyecto_id && report.estado === 'Aprobado' && report.total_informe) {
        const projectName = projectIdToNameMap.get(report.proyecto_id) || report.proyecto_name;

        if (projectName) {
          const currentSpent = spentByProject.get(projectName) || 0;
          spentByProject.set(projectName, currentSpent + report.total_informe);
        }
      }
    });

    return projects
      .map(project => ({
        ...project,
        spent: spentByProject.get(project.name) || 0,
      }))
      .filter(project =>
        project.name.toLowerCase().includes(filter.toLowerCase()) ||
        (project.client && project.client.toLowerCase().includes(filter.toLowerCase()))
      );
  }, [projects, purchaseOrders, travelReports, filter]);

  const getProjectOrders = (projectName: string) => {
    const projectIdToNameMap = new Map<string, string>();
    projects.forEach(p => {
      projectIdToNameMap.set(p.id, p.name);
    });

    return purchaseOrders
      .filter(order => {
        if (!order.project) return false;
        const orderProjectName = projectIdToNameMap.get(order.project) || order.project;
        return orderProjectName === projectName;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date as string || 0);
        const dateB = new Date(b.date as string || 0);
        return dateB.getTime() - dateA.getTime();
      });
  };

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

  const selectedProjectOrders = selectedProject ? getProjectOrders(selectedProject) : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline uppercase">Control de Proyectos</h1>
        <p className="text-muted-foreground">
          Supervisa los gastos de cada proyecto basados en las órdenes de compra.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gastos por Proyecto</CardTitle>
          <CardDescription>
            Importe total gastado por proyecto. Incluye Órdenes de Compra + Informes de Viaje aprobados.
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
                <TableHead>Nombre del Proyecto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Importe Total (OC + Viajes)</TableHead>
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
                  <TableCell>{project.client}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(project.spent)}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {project.spent > 0 && (
                          <DropdownMenuItem
                            onClick={() => setSelectedProject(selectedProject === project.name ? null : project.name)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver órdenes de compra
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/project-tracking/${project.id}`}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Informe de consumo
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {projectsWithSpent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No se encontraron proyectos que coincidan con el filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {selectedProject && (
            <div className="mt-6 border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-lg mb-4">Detalle de Órdenes - {selectedProject}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Número de Orden</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProjectOrders.map((order) => (
                    <TableRow key={order.id || `${order.orderNumber}-${Math.random()}`}>
                      <TableCell>{formatDate(order.date)}</TableCell>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>{order.supplier}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(order.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-semibold">Total:</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(selectedProjectOrders.reduce((sum, order) => sum + order.total, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
