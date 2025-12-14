
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
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Loader2 } from "lucide-react";
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
import { ClientForm } from "@/components/clients/client-form";
import type { Client } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/auth-context";

export default function ClientsPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user || authLoading) {
      if (!authLoading) setLoading(false);
      return;
    };

    const unsubscribe = onSnapshot(collection(db, "clients"), (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
        setLoading(false);
    }, (error) => {
        console.error("Error fetching clients:", error);
        toast({ variant: "destructive", title: "Error de Carga", description: "No se pudieron cargar los clientes." });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, toast]);


  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      client.name.toLowerCase().includes(filter.toLowerCase()) ||
      client.contactPerson.toLowerCase().includes(filter.toLowerCase()) ||
      client.email.toLowerCase().includes(filter.toLowerCase())
    );
  }, [clients, filter]);

  const handleAddClick = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  };
  
  const handleBulkDeleteClick = () => {
    setClientToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
        try {
            await deleteDoc(doc(db, "clients", clientToDelete.id));
            toast({
                variant: "success",
                title: "Cliente eliminado",
                description: `El cliente "${clientToDelete.name}" ha sido eliminado.`,
            });
        } catch (error) {
            console.error("Error deleting client:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el cliente." });
        }
    } else if (selectedRowIds.length > 0) {
        const batch = writeBatch(db);
        selectedRowIds.forEach(id => {
            batch.delete(doc(db, "clients", id));
        });
        try {
            await batch.commit();
            toast({
                variant: "success",
                title: "Clientes eliminados",
                description: `Se eliminaron ${selectedRowIds.length} clientes.`,
            });
        } catch (error) {
            console.error("Error deleting multiple clients:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron eliminar los clientes." });
        }
        setSelectedRowIds([]);
    }

    setIsDeleteDialogOpen(false);
    setClientToDelete(null);
  };

  const handleSave = async (values: any) => {
    try {
      if (selectedClient) {
        const docRef = doc(db, "clients", selectedClient.id);
        await updateDoc(docRef, values);
        toast({
          title: "Cliente actualizado",
          description: `El cliente "${values.name}" se ha actualizado correctamente.`,
        });
      } else {
        await addDoc(collection(db, "clients"), values);
        toast({
          title: "Cliente creado",
          description: `El cliente "${values.name}" se ha creado correctamente.`,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving client:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el cliente.",
      });
    }
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(filteredClients.map(c => c.id));
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

  if (authLoading || loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona la información de los clientes de tu empresa.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                <CardTitle>Listado de Clientes</CardTitle>
                <CardDescription>
                  Busca y gestiona tus clientes.
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
                        Añadir Cliente
                    </Button>
                )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
                placeholder="Filtrar por nombre, contacto o email..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRowIds.length === filteredClients.length && filteredClients.length > 0 ? true : (selectedRowIds.length > 0 ? 'indeterminate' : false)}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                    aria-label="Seleccionar todo"
                  />
                </TableHead>
                <TableHead>Nombre del Cliente</TableHead>
                <TableHead>Persona de Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} data-state={selectedRowIds.includes(client.id) && "selected"}>
                  <TableCell>
                     <Checkbox
                      checked={selectedRowIds.includes(client.id)}
                      onCheckedChange={() => handleRowSelect(client.id)}
                      aria-label={`Seleccionar cliente ${client.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.contactPerson}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEditClick(client)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTrigger(client)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredClients.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No se encontraron clientes.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
           <DialogHeader>
            <DialogTitle>{selectedClient ? "Editar Cliente" : "Crear Nuevo Cliente"}</DialogTitle>
          </DialogHeader>
          <ClientForm 
            client={selectedClient}
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
               Esta acción no se puede deshacer. Se eliminará permanentemente {clientToDelete ? ` el cliente "${clientToDelete.name}".` : `los ${selectedRowIds.length} clientes seleccionados.`}
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
