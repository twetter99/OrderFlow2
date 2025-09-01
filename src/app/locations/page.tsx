
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
import { MoreHorizontal, PlusCircle, Trash2, Edit, Move, List, PackagePlus } from "lucide-react";
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
import { LocationForm } from "@/components/locations/location-form";
import { TransferForm } from "@/components/inventory-locations/transfer-form";
import type { Location, InventoryLocation, InventoryItem, Technician } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

export default function LocationsPage() {
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventoryLocations, setInventoryLocations] = useState<InventoryLocation[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubLocations = onSnapshot(collection(db, "locations"), (snapshot) => {
      setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
      setLoading(false);
    });
    const unsubInvLocations = onSnapshot(collection(db, "inventoryLocations"), (snapshot) => {
      setInventoryLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryLocation)));
    });
     const unsubInventory = onSnapshot(collection(db, "inventory"), (snapshot) => {
      setInventoryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });
    const unsubTechnicians = onSnapshot(collection(db, "technicians"), (snapshot) => {
        setTechnicians(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician)))
    });

    return () => {
        unsubLocations();
        unsubInvLocations();
        unsubInventory();
        unsubTechnicians();
    };
  }, []);

  const enrichedLocations = useMemo(() => {
    return locations
      .map(loc => {
        const itemsInLocation = inventoryLocations.filter(il => il.locationId === loc.id);
        const totalValue = itemsInLocation.reduce((sum, il) => {
            const itemDetails = inventoryItems.find(item => item.id === il.itemId);
            return sum + (itemDetails ? itemDetails.unitCost * il.quantity : 0);
        }, 0);
        return {
          ...loc,
          itemCount: itemsInLocation.length,
          totalValue,
        };
      })
      .filter(loc => loc.name.toLowerCase().includes(filter.toLowerCase()));
  }, [locations, inventoryLocations, inventoryItems, filter]);

  const handleAddClick = () => {
    setSelectedLocation(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (location: Location) => {
    setSelectedLocation(location);
    setIsModalOpen(true);
  };
  
  const handleTransferClick = () => {
    setIsTransferModalOpen(true);
  }

  const handleDeleteTrigger = (location: Location) => {
    setLocationToDelete(location);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    setLocationToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    const batch = writeBatch(db);
    const locationsToDelete = locationToDelete ? [locationToDelete] : enrichedLocations.filter(loc => selectedRowIds.includes(loc.id));

    for (const loc of locationsToDelete) {
        const hasStock = inventoryLocations.some(il => il.locationId === loc.id && il.quantity > 0);
        if (hasStock) {
            toast({
                variant: "destructive",
                title: "Error de eliminación",
                description: `No se puede eliminar "${loc.name}" porque contiene stock. Transfiere los artículos primero.`,
            });
            setIsDeleteDialogOpen(false);
            return;
        }
        const docRef = doc(db, "locations", loc.id);
        batch.delete(docRef);
    }
    
    try {
        await batch.commit();
        toast({
            variant: "success",
            title: "Almacén(es) eliminado(s)",
            description: `Se han eliminado ${locationsToDelete.length} almacén(es).`,
        });
    } catch (error) {
        console.error("Error deleting location(s):", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron eliminar los almacenes."
        });
    }
    
    setIsDeleteDialogOpen(false);
    setLocationToDelete(null);
    setSelectedRowIds([]);
  };

  const handleSave = async (values: any) => {
    try {
      if (selectedLocation) {
        const docRef = doc(db, "locations", selectedLocation.id);
        await updateDoc(docRef, values);
        toast({
          title: "Almacén actualizado",
          description: `El almacén "${values.name}" se ha actualizado correctamente.`,
        });
      } else {
        await addDoc(collection(db, "locations"), values);
        toast({
          title: "Almacén creado",
          description: `El almacén "${values.name}" se ha creado correctamente.`,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el almacén.",
      });
    }
  };

  const handleSaveTransfer = async (values: { itemId: string, fromLocationId: string, toLocationId: string, quantity: number }) => {
     const batch = writeBatch(db);

    try {
      // Decrement from source
      const fromQuery = query(collection(db, "inventoryLocations"), where("itemId", "==", values.itemId), where("locationId", "==", values.fromLocationId));
      const fromSnapshot = await getDocs(fromQuery);
      if (fromSnapshot.empty) throw new Error("Stock de origen no encontrado.");
      const fromDoc = fromSnapshot.docs[0];
      const fromNewQty = fromDoc.data().quantity - values.quantity;
      batch.update(fromDoc.ref, { quantity: fromNewQty });

      // Increment in destination
      const toQuery = query(collection(db, "inventoryLocations"), where("itemId", "==", values.itemId), where("locationId", "==", values.toLocationId));
      const toSnapshot = await getDocs(toQuery);
      if (toSnapshot.empty) {
        // If item doesn't exist in destination, create new entry
        const newEntryRef = doc(collection(db, "inventoryLocations"));
        batch.set(newEntryRef, { itemId: values.itemId, locationId: values.toLocationId, quantity: values.quantity });
      } else {
        // If it exists, update quantity
        const toDoc = toSnapshot.docs[0];
        const toNewQty = toDoc.data().quantity + values.quantity;
        batch.update(toDoc.ref, { quantity: toNewQty });
      }
      
      await batch.commit();

      toast({
        title: "Transferencia Exitosa",
        description: `Se han movido ${values.quantity} unidades.`,
      });
      setIsTransferModalOpen(false);

    } catch(error) {
      console.error("Error saving transfer:", error);
      toast({
        variant: "destructive",
        title: "Error en la Transferencia",
        description: (error as Error).message || "No se pudo completar la transferencia.",
      });
    }
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(enrichedLocations.map(l => l.id));
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

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Almacenes</h1>
          <p className="text-muted-foreground">
            Gestiona las ubicaciones físicas y móviles de tu inventario.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listado de Almacenes</CardTitle>
              <CardDescription>
                Busca y gestiona tus almacenes.
              </CardDescription>
            </div>
            <div className="flex gap-2">
                {selectedRowIds.length > 0 ? (
                  <Button variant="destructive" onClick={handleBulkDeleteClick}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar ({selectedRowIds.length})
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleTransferClick}>
                        <Move className="mr-2 h-4 w-4" />
                        Realizar Transferencia
                    </Button>
                    <Button onClick={handleAddClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Almacén
                    </Button>
                  </>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
                placeholder="Filtrar por nombre..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRowIds.length === enrichedLocations.length && enrichedLocations.length > 0 ? true : (selectedRowIds.length > 0 ? 'indeterminate' : false)}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                    aria-label="Seleccionar todo"
                  />
                </TableHead>
                <TableHead>Nombre del Almacén</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nº Artículos Únicos</TableHead>
                <TableHead>Valor Total del Stock</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center">Cargando...</TableCell></TableRow>
              ) : enrichedLocations.map((loc) => (
                <TableRow key={loc.id} data-state={selectedRowIds.includes(loc.id) && "selected"}>
                   <TableCell>
                    <Checkbox
                      checked={selectedRowIds.includes(loc.id)}
                      onCheckedChange={() => handleRowSelect(loc.id)}
                      aria-label={`Seleccionar almacén ${loc.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell>
                    <Badge variant={loc.type === 'physical' ? 'secondary' : 'outline'}>
                        {loc.type === 'physical' ? 'Físico' : 'Móvil'}
                    </Badge>
                  </TableCell>
                  <TableCell>{loc.itemCount}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(loc.totalValue)}</TableCell>
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
                        <DropdownMenuItem asChild>
                             <Link href={`/locations/${loc.id}`}>
                                <List className="mr-2 h-4 w-4"/>
                                Ver Stock
                             </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(loc)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTrigger(loc)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && enrichedLocations.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No se encontraron almacenes.
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
            <DialogTitle>{selectedLocation ? "Editar Almacén" : "Crear Nuevo Almacén"}</DialogTitle>
          </DialogHeader>
          <LocationForm 
            location={selectedLocation}
            technicians={technicians}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent>
           <DialogHeader>
            <DialogTitle>Transferencia de Stock entre Almacenes</DialogTitle>
          </DialogHeader>
          <TransferForm
            inventoryItems={inventoryItems}
            locations={locations}
            inventoryLocations={inventoryLocations}
            onSave={handleSaveTransfer}
            onCancel={() => setIsTransferModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. {locationToDelete ? `Se eliminará permanentemente el almacén "${locationToDelete.name}".` : `Se eliminarán los ${selectedRowIds.length} almacenes seleccionados.`}
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
