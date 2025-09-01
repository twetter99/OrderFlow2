
"use client";

import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { getData } from "@/lib/data";
import type { Project, PurchaseOrder } from "@/lib/types";
  
export function ProjectCostReport() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            const [projData, poData] = await Promise.all([
                getData<Project>('projects', []),
                getData<PurchaseOrder>('purchaseOrders', [])
            ]);
            setProjects(projData);
            setPurchaseOrders(poData);
        }
        fetchData();
    }, []);

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

    const projectsWithDetails = projects.map(p => {
        const spent = p.spent || 0;
        const budget = p.budget || 0;
        const variance = budget - spent;
        const progress = budget > 0 ? Math.round((spent / budget) * 100) : 0;
        const relatedPOs = purchaseOrders.filter(po => po.project === p.id);
        return { ...p, variance, progress, relatedPOs, spent, budget };
    });

    return (
      <Card>
        <CardHeader>
            <CardTitle>Informe de Costos de Proyectos</CardTitle>
            <CardDescription>Análisis del presupuesto frente al gasto real de cada proyecto. Expande para ver las órdenes de compra asociadas.</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="multiple" className="w-full">
                {projectsWithDetails.map((project) => (
                    <AccordionItem value={project.id} key={project.id}>
                        <AccordionTrigger className="hover:no-underline">
                             <Table className="w-full">
                                <TableBody>
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableCell className="font-medium w-1/4">{project.name}</TableCell>
                                        <TableCell className="text-right w-1/6">{formatCurrency(project.budget)}</TableCell>
                                        <TableCell className="text-right w-1/6">{formatCurrency(project.spent)}</TableCell>
                                        <TableCell className={cn(
                                            "text-right font-semibold w-1/6",
                                            project.variance >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {formatCurrency(project.variance)}
                                        </TableCell>
                                        <TableCell className="w-1/4">
                                            <div className="flex items-center gap-2">
                                                <Progress value={project.progress} className="w-32" />
                                                <span className="text-sm text-muted-foreground">{project.progress}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="px-4 py-2 bg-muted/50 rounded-md mx-4 mb-2">
                             {project.relatedPOs.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID Orden</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {project.relatedPOs.map(po => (
                                            <TableRow key={po.id}>
                                                <TableCell>{po.id}</TableCell>
                                                <TableCell><Badge variant="outline">{po.status}</Badge></TableCell>
                                                <TableCell className="text-right">{formatCurrency(po.total)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             ) : (
                                <p className="text-sm text-muted-foreground text-center p-4">No hay órdenes de compra asociadas a este proyecto.</p>
                             )}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </CardContent>
      </Card>
    );
}
