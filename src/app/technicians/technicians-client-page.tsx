"use client";

import React, { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TechnicianForm } from "@/components/technicians/technician-form";
import type { Technician } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { addTechnician, updateTechnician, deleteTechnician } from "./actions";

interface TechniciansClientPageProps {
  initialTechnicians: Technician[];
}

export function TechniciansClientPage({ initialTechnicians }: TechniciansClientPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [technicianToDelete, setTechnicianToDelete] = useState<Technician | null>(null);

  React.useEffect(() => {
    setTechnicians(initialTechnicians);
  }, [initialTechnicians]);

  const filteredTechnicians = useMemo(() => {
    return technicians.filter(technician =>
      technician.name.toLowerCase().includes(filter.toLowerCase()) ||
      technician.specialty.toLowerCase().includes(filter.toLowerCase())
    );
  }, [technicians, filter]);

  const handleAddClick = () => {
    setSelectedTechnician(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (technician: Technician) => {
    setSelectedTechnician(technician);
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (technician: Technician) => {
    setTechnicianToDelete(technician);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!technicianToDelete) return;
    setLoading(true);
    const result = await deleteTechnician(technicianToDelete.id);
    if (result.success) {
      toast({ title: "Técnico eliminado", description: `El técnico "${technicianToDelete.name}" ha sido eliminado.` });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message });
    }
    setLoading(false);
    setIsDeleteDialogOpen(false);
    setTechnicianToDelete(null);
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    let result;
    if (selectedTechnician) {
      result = await updateTechnician(selectedTechnician.id, values);
      if (result.success) {
        toast({ title: "Técnico actualizado", description: `El técnico "${values.name}" se ha actualizado correctamente.` });
      }
    } else {
      result = await addTechnician(values);
      if (result.success) {
        toast({ title: "Técnico creado", description: `El técnico "${values.name}" se ha creado correctamente.` });
      }
    }
    if (result.success) {
      setIsModalOpen(false);
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message || "No se pudo guardar el técnico." });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Técnicos</h1>
          <p className="text-muted-foreground">Gestiona la información del personal técnico interno.</p>
        </div>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Técnico
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Técnicos</CardTitle>
          <CardDescription>Busca y gestiona tu personal técnico.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input placeholder="Filtrar por nombre o especialidad..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechnicians.map((technician) => (
                <TableRow key={technician.id}>
                  <TableCell className="font-medium">{technician.name}</TableCell>
                  <TableCell>{technician.category}</TableCell>
                  <TableCell>{technician.specialty}</TableCell>
                  <TableCell>{technician.phone}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditClick(technician)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTrigger(technician)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTechnicians.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No se encontraron técnicos.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader><DialogTitle>{selectedTechnician ? "Editar Técnico" : "Crear Nuevo Técnico"}</DialogTitle></DialogHeader>
          <TechnicianForm technician={selectedTechnician} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el técnico "{technicianToDelete?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={loading}>{loading ? "Eliminando..." : "Eliminar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
