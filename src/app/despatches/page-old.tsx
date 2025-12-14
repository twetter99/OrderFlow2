
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Printer } from "lucide-react";
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
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function DespatchesPage() {
  const { toast } = useToast();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventoryLocations, setInventoryLocations] = useState<InventoryLocation[]>([]);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<DeliveryNote | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubNotes = onSnapshot(collection(db, "deliveryNotes"), (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryNote));
      setDeliveryNotes(notesData);
      setLoading(false);
    });
    const unsubClients = onSnapshot(collection(db, "clients"), (snapshot) => setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client))));
    const unsubProjects = onSnapshot(collection(db, "projects"), (snapshot) => setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project))));
    const unsubInventory = onSnapshot(collection(db, "inventory"), (snapshot) => setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem))));
    const unsubLocations = onSnapshot(collection(db, "locations"), (snapshot) => setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location))));
    const unsubInvLoc = onSnapshot(collection(db, "inventoryLocations"), (snapshot) => setInventoryLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryLocation))));
    
    return () => {
      unsubNotes();
      unsubClients();
      unsubProjects();
      unsubInventory();
      unsubLocations();
      unsubInvLoc();
    };
  }, []);

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
    const batch = writeBatch(db);
    const notesToDelete = noteToDelete ? [noteToDelete] : enrichedDeliveryNotes.filter(n => selectedRowIds.includes(n.id));

    if (notesToDelete.length === 0) return;

    notesToDelete.forEach(note => {
        const docRef = doc(db, "deliveryNotes", note.id);
        batch.delete(docRef);
    });

    try {
        await batch.commit();
        toast({
            variant: "destructive",
            title: "Albarán(es) eliminado(s)",
            description: `Se han eliminado ${notesToDelete.length} albarán(es).`,
        });
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
    const batch = writeBatch(db);

    try {
      // 1. Create the delivery note document
      const newNoteRef = doc(collection(db, "deliveryNotes"));
      batch.set(newNoteRef, {
        ...values,
        date: serverTimestamp(),
        status: 'Completado'
      });

      // 2. Update stock for each item
      for (const item of values.items) {
        const inventoryItem = inventory.find(i => i.id === item.itemId);
        if (!inventoryItem) throw new Error(`Item with ID ${item.itemId} not found.`);

        if (inventoryItem.type === 'composite') {
          // Deduct components for a kit
          for (const component of inventoryItem.components || []) {
            const componentLocationQuery = query(
              collection(db, "inventoryLocations"),
              where("itemId", "==", component.itemId),
              where("locationId", "==", values.locationId)
            );
            const componentLocationSnapshot = await getDocs(componentLocationQuery);
            if (componentLocationSnapshot.empty) {
                throw new Error(`Component ${component.itemId} not found in location ${values.locationId}`);
            }
            const docToUpdate = componentLocationSnapshot.docs[0];
            const currentQuantity = docToUpdate.data().quantity || 0;
            const quantityToDeduct = component.quantity * item.quantity;
            batch.update(docToUpdate.ref, { quantity: currentQuantity - quantityToDeduct });
          }
        } else {
          // Deduct a simple item
          const itemLocationQuery = query(
            collection(db, "inventoryLocations"),
            where("itemId", "==", item.itemId),
            where("locationId", "==", values.locationId)
          );
          const itemLocationSnapshot = await getDocs(itemLocationQuery);
           if (itemLocationSnapshot.empty) {
                throw new Error(`Item ${item.itemId} not found in location ${values.locationId}`);
            }
          const docToUpdate = itemLocationSnapshot.docs[0];
          const currentQuantity = docToUpdate.data().quantity || 0;
          batch.update(docToUpdate.ref, { quantity: currentQuantity - item.quantity });
        }
      }

      await batch.commit();

      toast({
        title: "Albarán Creado",
        description: `El albarán de salida se ha generado y el stock ha sido actualizado.`,
      });
      setIsModalOpen(false);

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
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center">Cargando...</TableCell></TableRow>
              ) : enrichedDeliveryNotes.map((note) => (
                <TableRow key={note.id} data-state={selectedRowIds.includes(note.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRowIds.includes(note.id)}
                      onCheckedChange={() => handleRowSelect(note.id)}
                      aria-label={`Seleccionar albarán ${note.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{note.id}</TableCell>
                  <TableCell>{note.date ? new Date((note.date as any).seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell>
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
              {!loading && enrichedDeliveryNotes.length === 0 && (
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
