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

    // Handle loading state
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

    purchaseOrders.forEach(order => {
      if (order.project && ['Recibida', 'Enviada al Proveedor', 'Aprobada'].includes(order.status)) {
        const currentSpent = spentByProject.get(order.project) || 0;
        spentByProject.set(order.project, currentSpent + order.total);
      }
    });

    return projects
      .map(project => ({
        ...project,
        spent: spentByProject.get(project.id) || 0,
      }))
      .filter(project =>
        project.name.toLowerCase().includes(filter.toLowerCase()) ||
        (project.client && project.client.toLowerCase().includes(filter.toLowerCase()))
      );
  }, [projects, purchaseOrders, filter]);

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center">Cargando datos...</TableCell></TableRow>
              ) : projectsWithSpent.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.client}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(project.spent)}</TableCell>
                </TableRow>
              ))}
              {!loading && projectsWithSpent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
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
// Un comentario para forzar el despliegue