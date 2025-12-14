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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Printer } from "lucide-react";
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
import { DespatchForm } from "@/components/despatches/despatch-form";
import type { DeliveryNote, Client, Project, InventoryItem, Location, InventoryLocation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { addDeliveryNote, deleteDeliveryNote, deleteMultipleDeliveryNotes } from "./actions";

interface DespatchesClientPageProps {
  deliveryNotes: DeliveryNote[];
  clients: Client[];
  projects: Project[];
  inventory: InventoryItem[];
  locations: Location[];
  inventoryLocations: InventoryLocation[];
}

export function DespatchesClientPage({
  deliveryNotes: initialDeliveryNotes,
  clients: initialClients,
  projects: initialProjects,
  inventory: initialInventory,
  locations: initialLocations,
  inventoryLocations: initialInventoryLocations,
}: DespatchesClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const deliveryNotes = initialDeliveryNotes;
  const clients = initialClients;
  const projects = initialProjects;
  const inventory = initialInventory;
  const locations = initialLocations;
  const inventoryLocations = initialInventoryLocations;

  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<DeliveryNote | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  const enrichedDeliveryNotes = useMemo(() => {
    return deliveryNotes
      .map(note => {
        const client = clients.find(c => c.id === note.clientId);
        const project = projects.find(p => p.id === note.projectId);
        return { ...note, clientName: client?.name || 'N/A', projectName: project?.name || 'N/A' };
      })
      .filter(note => 
        note.id.toLowerCase().includes(filter.toLowerCase()) ||
        note.clientName.toLowerCase().includes(filter.toLowerCase()) ||
        note.projectName.toLowerCase().includes(filter.toLowerCase())
      );
  }, [deliveryNotes, clients, projects, filter]);

  const handleAddClick = () => {
    setSelectedNote(null);
    setIsModalOpen(true);
  };
  
  const handlePrintClick = (note: DeliveryNote) => {
    window.open(`/despatches/${note.id}/print`, '_blank');
  };

  const handleDeleteTrigger = (note: DeliveryNote) => {
    setNoteToDelete(note);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    setNoteToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    const notesToDelete = noteToDelete ? [noteToDelete] : enrichedDeliveryNotes.filter(n => selectedRowIds.includes(n.id));

    if (notesToDelete.length === 0) return;

    try {
      if (noteToDelete) {
        const result = await deleteDeliveryNote(noteToDelete.id);
        if (!result.success) throw new Error(result.error);
      } else {
        const result = await deleteMultipleDeliveryNotes(selectedRowIds);
        if (!result.success) throw new Error(result.error);
      }

      toast({
        variant: "destructive",
        title: "Albarán(es) eliminado(s)",
        description: `Se han eliminado ${notesToDelete.length} albarán(es).`,
      });
      router.refresh();
    } catch (error) {
      console.error("Error deleting despatch note(s):", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron eliminar los albaranes."
      });
    }
    
    setIsDeleteDialogOpen(false);
    setNoteToDelete(null);
    setSelectedRowIds([]);
  };

  const handleSave = async (values: any) => {
    try {
      const result = await addDeliveryNote(values, inventory);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Albarán Creado",
        description: `El albarán de salida se ha generado y el stock ha sido actualizado.`,
      });
      setIsModalOpen(false);
      router.refresh();

    } catch (error) {
      console.error("Error creating despatch note:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo generar el albarán: ${(error as Error).message}`,
      });
    }
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(enrichedDeliveryNotes.map(n => n.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev => 
      prev.includes(rowId) 
        ? prev.filter(id => id !== rowId) 
        : [...prev, rowId]
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Despachos (Albaranes)</h1>
          <p className="text-muted-foreground">
            Crea y gestiona los albaranes de salida de material para proyectos.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listado de Albaranes</CardTitle>
              <CardDescription>
                Busca y gestiona los despachos de material.
              </CardDescription>
            </div>
             {selectedRowIds.length > 0 ? (
                <Button variant="destructive" onClick={handleBulkDeleteClick}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar ({selectedRowIds.length})
                </Button>
            ) : (
                <Button onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Albarán
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
                placeholder="Filtrar por ID, cliente o proyecto..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRowIds.length === enrichedDeliveryNotes.length && enrichedDeliveryNotes.length > 0 ? true : (selectedRowIds.length > 0 ? 'indeterminate' : false)}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                    aria-label="Seleccionar todo"
                  />
                </TableHead>
                <TableHead>Albarán ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedDeliveryNotes.map((note) => (
                <TableRow key={note.id} data-state={selectedRowIds.includes(note.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRowIds.includes(note.id)}
                      onCheckedChange={() => handleRowSelect(note.id)}
                      aria-label={`Seleccionar albarán ${note.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{note.id}</TableCell>
                  <TableCell>{note.date ? new Date(note.date as string).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{note.clientName}</TableCell>
                  <TableCell>{note.projectName}</TableCell>
                  <TableCell>
                    <Badge variant={note.status === 'Completado' ? 'default' : 'secondary'}>
                      {note.status}
                    </Badge>
                  </TableCell>
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
                        <DropdownMenuItem onClick={() => handlePrintClick(note)}>
                            <Printer className="mr-2 h-4 w-4"/>
                            Imprimir
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTrigger(note)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {enrichedDeliveryNotes.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No se encontraron albaranes.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl">
           <DialogHeader>
            <DialogTitle>Crear Nuevo Albarán de Salida</DialogTitle>
          </DialogHeader>
          <DespatchForm
            note={null}
            clients={clients}
            projects={projects}
            inventoryItems={inventory}
            locations={locations}
            inventoryLocations={inventoryLocations}
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
               Esta acción no se puede deshacer. Se eliminará permanentemente {noteToDelete ? ` el albarán "${noteToDelete.id}".` : `los ${selectedRowIds.length} albaranes seleccionados.`}
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
