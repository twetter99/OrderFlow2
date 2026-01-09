"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import { cn } from "@/lib/utils";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Boxes, PackagePlus, ArrowUpDown, ArrowUp, ArrowDown, Loader2, FileDown, FileText } from "lucide-react";
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
import { InventoryForm } from "@/components/inventory/inventory-form";
import type { InventoryItem, Supplier, Location, InventoryLocation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ItemDetailsModal } from "@/components/inventory/item-details-modal";
import { Input } from "@/components/ui/input";
import { AddStockForm } from "./add-stock-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/auth-context";
import { addInventoryItem, updateInventoryItem, deleteInventoryItem, deleteMultipleInventoryItems, addStock } from "./actions";

type SortableColumn = keyof InventoryItem | 'totalStock' | 'supplierName';
type SortDescriptor = {
    column: SortableColumn;
    direction: 'ascending' | 'descending';
};

interface InventoryClientPageNewProps {
  inventory: InventoryItem[];
  suppliers: Supplier[];
  locations: Location[];
  inventoryLocations: InventoryLocation[];
}

export function InventoryClientPageNew({
  inventory: initialInventory,
  suppliers: initialSuppliers,
  locations: initialLocations,
  inventoryLocations: initialInventoryLocations,
}: InventoryClientPageNewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { loading: authLoading } = useAuth();
  
  const inventory = initialInventory;
  const suppliers = initialSuppliers;
  const locations = initialLocations;
  const inventoryLocations = initialInventoryLocations;

  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
      column: 'name',
      direction: 'ascending',
  });

  const getItemTotalStock = (itemId: string) => {
    return inventoryLocations
      .filter(l => l.itemId === itemId)
      .reduce((sum, current) => sum + current.quantity, 0);
  }

  const sortedInventory = useMemo(() => {
    const lowercasedFilter = filter.toLowerCase();
    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

    const filtered = inventory.filter(item => {
      const hasMatchingSupplier = item.suppliers?.some(supplierId => {
        const supplierName = supplierMap.get(supplierId);
        return supplierName?.toLowerCase().includes(lowercasedFilter);
      });
      return (
        item.name.toLowerCase().includes(lowercasedFilter) ||
        item.sku.toLowerCase().includes(lowercasedFilter) ||
        hasMatchingSupplier
      );
    });

    return [...filtered].sort((a, b) => {
        let first: any, second: any;

        if (sortDescriptor.column === 'totalStock') {
            first = getItemTotalStock(a.id);
            second = getItemTotalStock(b.id);
        } else if (sortDescriptor.column === 'supplierName') {
            first = a.suppliers?.map(sId => supplierMap.get(sId)).join(', ') || '';
            second = b.suppliers?.map(sId => supplierMap.get(sId)).join(', ') || '';
        } else {
            first = a[sortDescriptor.column as keyof InventoryItem];
            second = b[sortDescriptor.column as keyof InventoryItem];
        }

        let cmp = 0;
        if (first === undefined || first === null) cmp = -1;
        else if (second === undefined || second === null) cmp = 1;
        else if (typeof first === 'number' && typeof second === 'number') {
             cmp = first - second;
        } else {
             cmp = String(first).localeCompare(String(second), 'es', { numeric: true });
        }
        
        return sortDescriptor.direction === 'descending' ? -cmp : cmp;
    });

  }, [inventory, filter, suppliers, inventoryLocations, sortDescriptor]);

  const onSortChange = (column: SortableColumn) => {
    if (sortDescriptor.column === column) {
        setSortDescriptor({
            ...sortDescriptor,
            direction: sortDescriptor.direction === 'ascending' ? 'descending' : 'ascending',
        });
    } else {
        setSortDescriptor({ column, direction: 'ascending' });
    }
  };

  const getSortIcon = (column: SortableColumn) => {
    if (sortDescriptor.column === column) {
      return sortDescriptor.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
  };

  const handleAddClick = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };
  
  const handleDetailsClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailsModalOpen(true);
  };

  const handleAddStockClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsAddStockModalOpen(true);
  };

  const handleDeleteTrigger = (item: InventoryItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };
  
  const handleBulkDeleteClick = () => {
    setItemToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    const itemsToDelete = itemToDelete ? [itemToDelete] : inventory.filter(i => selectedRowIds.includes(i.id));

    for (const item of itemsToDelete) {
        const isComponent = inventory.some(i => 
            i.type === 'composite' && i.components?.some(c => c.itemId === item.id)
        );

        if (isComponent) {
            toast({
                variant: "destructive",
                title: "Error de eliminación",
                description: `El artículo "${item.name}" no se puede eliminar porque es un componente de al menos un kit.`,
            });
            setIsDeleteDialogOpen(false);
            return;
        }
    }
    
    try {
        if (itemToDelete) {
          const result = await deleteInventoryItem(itemToDelete.id);
          if (!result.success) throw new Error(result.error);
        } else {
          const result = await deleteMultipleInventoryItems(selectedRowIds);
          if (!result.success) throw new Error(result.error);
        }
        
        toast({
            variant: "success",
            title: "Artículo(s) eliminado(s)",
            description: `Se han eliminado ${itemsToDelete.length} artículo(s).`,
        });
        router.refresh();
    } catch (error) {
        console.error("Error deleting item(s):", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron eliminar los artículos."
        });
    }
    
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
    setSelectedRowIds([]);
  };

  const handleSave = async (values: any) => {
    try {
      if (selectedItem) {
        const result = await updateInventoryItem(selectedItem.id, values);
        if (!result.success) throw new Error(result.error);
        toast({
          title: "Artículo actualizado",
          description: `El artículo "${values.name}" se ha actualizado correctamente.`,
        });
      } else {
        const result = await addInventoryItem(values);
        if (!result.success) throw new Error(result.error);
        toast({
          title: "Artículo creado",
          description: `El artículo "${values.name}" se ha creado correctamente.`,
        });
      }
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el artículo.",
      });
    }
  };

  const handleSaveStock = async (values: { locationId: string; quantity: number }) => {
     if (!selectedItem) return;

    try {
        const result = await addStock(selectedItem.id, values.locationId, values.quantity);
        if (!result.success) throw new Error(result.error);
        
        toast({
            title: "Stock Añadido",
            description: `Se añadieron ${values.quantity} unidades de "${selectedItem.name}" al almacén.`,
        });
        setIsAddStockModalOpen(false);
        setSelectedItem(null);
        router.refresh();
        
    } catch(error) {
        console.error("Error adding stock:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo añadir el stock."
        });
    }
  }

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(sortedInventory.map(i => i.id));
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

  // Función para exportar a Excel
  const handleExportExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
    
    // Calcular resumen
    const totalItems = inventory.length;
    const simpleItems = inventory.filter(i => i.type === 'simple').length;
    const compositeItems = inventory.filter(i => i.type === 'composite').length;
    const serviceItems = inventory.filter(i => i.type === 'service').length;
    const totalStockValue = inventory
      .filter(i => i.type !== 'service')
      .reduce((sum, item) => sum + (getItemTotalStock(item.id) * item.unitCost), 0);
    const itemsBelowThreshold = inventory.filter(item => {
      if (item.type === 'service' || !item.minThreshold) return false;
      return getItemTotalStock(item.id) < item.minThreshold;
    }).length;

    // Hoja 1: Resumen
    const resumenData = [
      ["INVENTARIO - RESUMEN"],
      [],
      ["Fecha de exportación:", format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })],
      [],
      ["ESTADÍSTICAS"],
      [],
      ["Concepto", "Cantidad"],
      ["Total Artículos", totalItems],
      ["Artículos Simples", simpleItems],
      ["Kits/Compuestos", compositeItems],
      ["Servicios", serviceItems],
      [],
      ["VALORACIÓN"],
      [],
      ["Valor Total Inventario", `${totalStockValue.toFixed(2)} €`],
      ["Artículos bajo mínimo", itemsBelowThreshold],
    ];
    
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen["!cols"] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen");
    
    // Hoja 2: Inventario completo
    const inventarioHeader = ["SKU", "Nombre", "Tipo", "Proveedores", "Stock Total", "Costo Unitario", "Valor Stock", "Unidad", "Umbral Mínimo", "Código Proveedor", "Familia", "Observaciones"];
    const inventarioData = sortedInventory.map(item => {
      const itemSuppliers = item.suppliers
        ?.map(supplierId => supplierMap.get(supplierId))
        .filter(Boolean)
        .join(', ') || '';
      const stock = item.type !== 'service' ? getItemTotalStock(item.id) : 0;
      const stockValue = stock * item.unitCost;
      
      return [
        item.sku,
        item.name,
        item.type === 'simple' ? 'Simple' : item.type === 'composite' ? 'Kit' : 'Servicio',
        itemSuppliers,
        item.type !== 'service' ? stock : 'N/A',
        item.unitCost,
        item.type !== 'service' ? stockValue : 'N/A',
        item.unit || 'ud',
        item.minThreshold || '-',
        item.supplierProductCode || '-',
        item.family || '-',
        item.observations || '-',
      ];
    });
    
    const wsInventario = XLSX.utils.aoa_to_sheet([inventarioHeader, ...inventarioData]);
    wsInventario["!cols"] = [
      { wch: 15 }, // SKU
      { wch: 35 }, // Nombre
      { wch: 10 }, // Tipo
      { wch: 30 }, // Proveedores
      { wch: 12 }, // Stock
      { wch: 14 }, // Costo
      { wch: 14 }, // Valor Stock
      { wch: 8 },  // Unidad
      { wch: 14 }, // Umbral
      { wch: 18 }, // Código Proveedor
      { wch: 15 }, // Familia
      { wch: 30 }, // Observaciones
    ];
    XLSX.utils.book_append_sheet(workbook, wsInventario, "Inventario");
    
    // Hoja 3: Stock por ubicación
    const locationMap = new Map(locations.map(l => [l.id, l.name]));
    const stockPorUbicacionHeader = ["SKU", "Nombre", "Ubicación", "Cantidad"];
    const stockPorUbicacionData: any[][] = [];
    
    inventory.forEach(item => {
      if (item.type === 'service') return;
      const itemLocations = inventoryLocations.filter(il => il.itemId === item.id);
      itemLocations.forEach(il => {
        if (il.quantity > 0) {
          stockPorUbicacionData.push([
            item.sku,
            item.name,
            locationMap.get(il.locationId) || il.locationId,
            il.quantity,
          ]);
        }
      });
    });
    
    if (stockPorUbicacionData.length > 0) {
      const wsStockUbicacion = XLSX.utils.aoa_to_sheet([stockPorUbicacionHeader, ...stockPorUbicacionData]);
      wsStockUbicacion["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 25 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, wsStockUbicacion, "Stock por Ubicación");
    }
    
    // Generar y descargar el archivo
    const fileName = `Inventario_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }, [inventory, suppliers, locations, inventoryLocations, sortedInventory, getItemTotalStock]);

  // Función para exportar PDF plantilla de conteo
  const handleExportPDFConteo = useCallback(() => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
    const locationMap = new Map(locations.map(l => [l.id, l.name]));
    
    // Título y cabecera
    doc.setFontSize(18);
    doc.text("PLANTILLA DE CONTEO DE INVENTARIO", 148, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy", { locale: es })}`, 14, 25);
    doc.text(`Total artículos: ${sortedInventory.filter(i => i.type !== 'service').length}`, 14, 30);
    doc.text("Realizado por: _______________________", 200, 25);
    doc.text("Firma: _______________________", 200, 30);
    
    // Preparar datos para la tabla
    const tableData = sortedInventory
      .filter(item => item.type !== 'service')
      .map(item => {
        const stock = getItemTotalStock(item.id);
        const itemLocs = inventoryLocations
          .filter(il => il.itemId === item.id && il.quantity > 0)
          .map(il => locationMap.get(il.locationId) || '-')
          .join(', ') || '-';
        
        return [
          item.sku,
          item.name.length > 40 ? item.name.substring(0, 37) + '...' : item.name,
          itemLocs.length > 25 ? itemLocs.substring(0, 22) + '...' : itemLocs,
          stock.toString(),
          '', // Conteo real (vacío para escribir)
          '', // Diferencia (vacío para escribir)
        ];
      });
    
    // Generar tabla
    autoTable(doc, {
      startY: 38,
      head: [['SKU', 'Nombre', 'Ubicación', 'Stock Sistema', 'Conteo Real', 'Diferencia']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 30 },  // SKU
        1: { cellWidth: 80 },  // Nombre
        2: { cellWidth: 50 },  // Ubicación
        3: { cellWidth: 30, halign: 'center' },  // Stock Sistema
        4: { cellWidth: 30, halign: 'center' },  // Conteo Real
        5: { cellWidth: 30, halign: 'center' },  // Diferencia
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      didDrawPage: (data) => {
        // Pie de página con número de página
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
          doc.internal.pageSize.width - 60,
          doc.internal.pageSize.height - 10
        );
      },
    });
    
    // Descargar el PDF
    const fileName = `Conteo_Inventario_${format(new Date(), "yyyyMMdd")}.pdf`;
    doc.save(fileName);
  }, [sortedInventory, suppliers, locations, inventoryLocations, getItemTotalStock]);

  if (authLoading) {
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
          <h1 className="text-3xl font-bold font-headline uppercase">Inventario</h1>
          <p className="text-muted-foreground">
            Gestiona todos los artículos, kits y servicios de tu empresa.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
           <div className="flex items-center justify-between">
              <div>
                <CardTitle>Listado de Artículos</CardTitle>
                <CardDescription>
                      Busca y filtra para encontrar artículos, kits o servicios en tu inventario.
                  </CardDescription>
              </div>
              {selectedRowIds.length > 0 ? (
                  <Button variant="destructive" onClick={handleBulkDeleteClick}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar ({selectedRowIds.length})
                  </Button>
              ) : (
                  <div className="flex items-center gap-2">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline">
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Exportar
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Formato de exportación</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={handleExportExcel}>
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Excel (.xlsx)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleExportPDFConteo}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  PDF Plantilla Conteo
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <Button onClick={handleAddClick}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Añadir Artículo
                      </Button>
                  </div>
              )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
                placeholder="Filtrar por nombre, SKU o proveedor..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRowIds.length === sortedInventory.length && sortedInventory.length > 0 ? true : (selectedRowIds.length > 0 ? 'indeterminate' : false)}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                    aria-label="Seleccionar todo"
                  />
                </TableHead>
                <TableHead>
                    <Button variant="ghost" className="px-1" onClick={() => onSortChange('sku')}>
                        SKU {getSortIcon('sku')}
                    </Button>
                </TableHead>
                <TableHead>
                     <Button variant="ghost" className="px-1" onClick={() => onSortChange('name')}>
                        Nombre {getSortIcon('name')}
                    </Button>
                </TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>
                     <Button variant="ghost" className="px-1" onClick={() => onSortChange('supplierName')}>
                        Proveedor {getSortIcon('supplierName')}
                    </Button>
                </TableHead>
                <TableHead className="text-right">
                     <Button variant="ghost" className="px-1" onClick={() => onSortChange('totalStock')}>
                        Stock Total {getSortIcon('totalStock')}
                    </Button>
                </TableHead>
                <TableHead className="text-right">
                    <Button variant="ghost" className="px-1" onClick={() => onSortChange('unitCost')}>
                        Costo Unitario {getSortIcon('unitCost')}
                    </Button>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInventory.map((item) => {
                const itemSuppliers = item.suppliers
                    ?.map(supplierId => suppliers.find(s => s.id === supplierId)?.name)
                    .filter(Boolean) as string[] || [];
                
                return (
                <TableRow key={item.id} data-state={selectedRowIds.includes(item.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRowIds.includes(item.id)}
                      onCheckedChange={() => handleRowSelect(item.id)}
                      aria-label={`Seleccionar artículo ${item.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{item.sku}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant={
                        item.type === 'composite' ? 'default' : 
                        item.type === 'service' ? 'secondary' : 'outline'
                    }>
                        {item.type === 'simple' ? 'Simple' : item.type === 'composite' ? 'Kit' : 'Servicio'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.type !== 'service' ? (
                        itemSuppliers.length === 0 ? (
                            <span className="text-muted-foreground">Sin proveedor</span>
                        ) : itemSuppliers.length <= 2 ? (
                            itemSuppliers.join(', ')
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="cursor-help">{itemSuppliers.slice(0, 2).join(', ')}, +{itemSuppliers.length - 2}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{itemSuppliers.join(', ')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right font-bold">{item.type !== 'service' ? getItemTotalStock(item.id) : 'N/A'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditClick(item)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {item.type !== 'service' && (
                            <DropdownMenuItem onClick={() => handleAddStockClick(item)}>
                                <PackagePlus className="mr-2 h-4 w-4" />
                                Añadir Stock
                            </DropdownMenuItem>
                        )}
                        {item.type === 'composite' && (
                          <DropdownMenuItem onClick={() => handleDetailsClick(item)}>
                            <Boxes className="mr-2 h-4 w-4" />
                            Ver Componentes
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTrigger(item)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
               {sortedInventory.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {filter ? "No se han encontrado artículos que coincidan con tu búsqueda." : "No se encontraron artículos."}
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
            <DialogTitle>{selectedItem ? "Editar Artículo" : "Crear Nuevo Artículo"}</DialogTitle>
          </DialogHeader>
          <InventoryForm 
            item={selectedItem}
            suppliers={suppliers}
            inventoryItems={inventory}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
            onAddNewSupplier={() => { /* Lógica para añadir proveedor */}}
          />
        </DialogContent>
      </Dialog>
      
       {selectedItem && (
         <ItemDetailsModal 
            item={selectedItem}
            allInvetoryItems={inventory}
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
         />
       )}
       
       {selectedItem && (
        <Dialog open={isAddStockModalOpen} onOpenChange={setIsAddStockModalOpen}>
            <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                    <DialogTitle>Añadir Stock a Almacén</DialogTitle>
                </DialogHeader>
                <AddStockForm 
                    item={selectedItem}
                    locations={locations}
                    onSave={handleSaveStock}
                    onCancel={() => setIsAddStockModalOpen(false)}
                />
            </DialogContent>
        </Dialog>
       )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. {itemToDelete ? `Se eliminará permanentemente el artículo "${itemToDelete.name}".` : `Se eliminarán los ${selectedRowIds.length} artículos seleccionados.`}
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
