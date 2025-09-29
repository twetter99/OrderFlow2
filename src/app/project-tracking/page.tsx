"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import type { Project, PurchaseOrder } from "@/lib/types";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatCurrency } from "@/lib/utils";

export default function ProjectTrackingPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    const unsubProjects = onSnapshot(collection(db, "projects"), (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }) as Project);
      setProjects(projectsData);
    });

    const unsubPurchaseOrders = onSnapshot(collection(db, "purchaseOrders"), (snapshot) => {
      const ordersData = snapshot.docs.map(doc => doc.data() as PurchaseOrder);
      setPurchaseOrders(ordersData);
    });

    Promise.all([new Promise(res => setTimeout(res, 500))]).then(() => {
        setLoading(false);
    });

    return () => {
      unsubProjects();
      unsubPurchaseOrders();
    };
  }, []);

  const projectsWithSpent = useMemo(() => {
    const spentByProject = new Map<string, number>();
    
    const projectIdToNameMap = new Map<string, string>();
    projects.forEach(p => {
      projectIdToNameMap.set(p.id, p.name);
    });

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

    return projects
      .map(project => ({
        ...project,
        spent: spentByProject.get(project.name) || 0,
      }))
      .filter(project =>
        project.name.toLowerCase().includes(filter.toLowerCase()) ||
        (project.client && project.client.toLowerCase().includes(filter.toLowerCase()))
      );
  }, [projects, purchaseOrders, filter]);

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
      // MODIFICACIÓN: Añadido .sort() para ordenar por fecha descendente
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
            Busca y analiza los importes gastados en compras para cada proyecto.
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
                <TableHead className="text-right">Importe Gastado en Compras</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Cargando datos...</TableCell></TableRow>
              ) : projectsWithSpent.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.client}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(project.spent)}</TableCell>
                  <TableCell className="text-center">
                    {project.spent > 0 && (
                      <button
                        onClick={() => setSelectedProject(selectedProject === project.name ? null : project.name)}
                        className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                      >
                        ⋮
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && projectsWithSpent.length === 0 && (
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
                    <TableRow key={order.orderNumber}>
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