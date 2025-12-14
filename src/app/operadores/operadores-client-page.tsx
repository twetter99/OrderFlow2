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
import { OperadorForm } from "@/components/operadores/operador-form";
import type { Operador } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { addOperador, updateOperador, deleteOperador } from "./actions";

interface OperadoresClientPageProps {
  initialOperadores: Operador[];
}

export default function OperadoresClientPage({ initialOperadores }: OperadoresClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedOperador, setSelectedOperador] = useState<Operador | null>(null);
  const [operadorToDelete, setOperadorToDelete] = useState<Operador | null>(null);

  const filteredOperadores = useMemo(() => {
    return initialOperadores.filter(operador =>
      operador.name.toLowerCase().includes(filter.toLowerCase()) ||
      (operador.cif || '').toLowerCase().includes(filter.toLowerCase())
    );
  }, [initialOperadores, filter]);

  const handleAddClick = () => {
    setSelectedOperador(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (operador: Operador) => {
    setSelectedOperador(operador);
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (operador: Operador) => {
    setOperadorToDelete(operador);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!operadorToDelete) return;
    try {
      const result = await deleteOperador(operadorToDelete.id);
      if (result.success) {
        toast({
          variant: "destructive",
          title: "Operador eliminado",
          description: `El operador "${operadorToDelete.name}" ha sido eliminado.`,
        });
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error deleting operador:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el operador."
      });
    }
    setIsDeleteDialogOpen(false);
    setOperadorToDelete(null);
  };

  const handleSave = async (values: any) => {
    try {
      if (selectedOperador) {
        const result = await updateOperador(selectedOperador.id, values);
        if (result.success) {
          toast({
            title: "Operador actualizado",
            description: `El operador "${values.name}" se ha actualizado correctamente.`,
          });
          router.refresh();
        } else {
          throw new Error(result.error);
        }
      } else {
        const result = await addOperador(values);
        if (result.success) {
          toast({
            title: "Operador creado",
            description: `El operador "${values.name}" se ha creado correctamente.`,
          });
          router.refresh();
        } else {
          throw new Error(result.error);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving operador:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el operador.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Operadores</h1>
          <p className="text-muted-foreground">
            Gestiona la información de las flotas y empresas operadoras externas.
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Operador
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Operadores</CardTitle>
          <CardDescription>
            Busca y gestiona tus operadores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
                placeholder="Filtrar por nombre o CIF..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>CIF</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOperadores.map((operador) => (
                <TableRow key={operador.id}>
                  <TableCell className="font-medium">{operador.name}</TableCell>
                  <TableCell>{operador.cif}</TableCell>
                  <TableCell>{operador.phone}</TableCell>
                  <TableCell>{operador.email}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEditClick(operador)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTrigger(operador)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOperadores.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No se encontraron operadores.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl">
           <DialogHeader>
            <DialogTitle>{selectedOperador ? "Editar Operador" : "Crear Nuevo Operador"}</DialogTitle>
          </DialogHeader>
          <OperadorForm 
            operador={selectedOperador}
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el operador "{operadorToDelete?.name}".
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
