"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SupervisorForm } from "@/components/supervisores/supervisor-form";
import type { Supervisor } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { addSupervisor, updateSupervisor, deleteSupervisor } from "./actions";

interface SupervisoresClientPageProps {
  initialSupervisores: Supervisor[];
}

export default function SupervisoresClientPage({ initialSupervisores }: SupervisoresClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  const [supervisorToDelete, setSupervisorToDelete] = useState<Supervisor | null>(null);

  const filteredSupervisores = useMemo(() => {
    return initialSupervisores.filter(supervisor =>
      supervisor.name.toLowerCase().includes(filter.toLowerCase()) ||
      supervisor.email.toLowerCase().includes(filter.toLowerCase())
    );
  }, [initialSupervisores, filter]);

  const handleAddClick = () => {
    setSelectedSupervisor(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (supervisor: Supervisor) => {
    setSelectedSupervisor(supervisor);
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (supervisor: Supervisor) => {
    setSupervisorToDelete(supervisor);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!supervisorToDelete) return;
    try {
      const result = await deleteSupervisor(supervisorToDelete.id);
      if (result.success) {
        toast({
          variant: "destructive",
          title: "Supervisor eliminado",
          description: `El supervisor "${supervisorToDelete.name}" ha sido eliminado.`,
        });
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error deleting supervisor:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el supervisor."
      });
    }
    setIsDeleteDialogOpen(false);
    setSupervisorToDelete(null);
  };

  const handleSave = async (values: any) => {
    try {
      if (selectedSupervisor) {
        const result = await updateSupervisor(selectedSupervisor.id, values);
        if (result.success) {
          toast({
            title: "Supervisor actualizado",
            description: `El supervisor "${values.name}" se ha actualizado correctamente.`,
          });
          router.refresh();
        } else {
          throw new Error(result.error);
        }
      } else {
        const result = await addSupervisor(values);
        if (result.success) {
          toast({
            title: "Supervisor creado",
            description: `El supervisor "${values.name}" se ha creado correctamente.`,
          });
          router.refresh();
        } else {
          throw new Error(result.error);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving supervisor:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el supervisor.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Supervisores</h1>
          <p className="text-muted-foreground">
            Gestiona la información del personal de supervisión.
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Supervisor
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Supervisores</CardTitle>
          <CardDescription>
            Busca y gestiona tu personal de supervisión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
                placeholder="Filtrar por nombre o email..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSupervisores.map((supervisor) => (
                <TableRow key={supervisor.id}>
                  <TableCell className="font-medium">{supervisor.name}</TableCell>
                  <TableCell>{supervisor.email}</TableCell>
                  <TableCell>{supervisor.phone}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditClick(supervisor)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTrigger(supervisor)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSupervisores.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No se encontraron supervisores.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
           <DialogHeader>
            <DialogTitle>{selectedSupervisor ? "Editar Supervisor" : "Crear Nuevo Supervisor"}</DialogTitle>
          </DialogHeader>
          <SupervisorForm 
            supervisor={selectedSupervisor}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el supervisor "{supervisorToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
