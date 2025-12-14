
"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { PurchaseOrder, Supplier, InventoryItem, Project, Location } from "@/lib/types";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CalendarIcon, PlusCircle, Trash2, Eye, Download, Paperclip } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "../ui/table";
import { SupplierCombobox } from "../inventory/supplier-combobox";
import { ItemPriceInsight } from "./item-price-insight";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "../ui/calendar";
import { ItemCombobox } from "./item-combobox";
import React from "react";
import { productFamilies } from "@/lib/data";

const formSchema = z.object({
  orderNumber: z.string().optional(),
  date: z.date({ required_error: "La fecha de creación es obligatoria." }),
  project: z.string().min(1, "El proyecto es obligatorio."),
  supplier: z.string().min(1, "El proveedor es obligatorio."),
  deliveryLocationId: z.string().min(1, "Debes seleccionar un almacén de entrega."),
  estimatedDeliveryDate: z.date({ required_error: "La fecha de entrega es obligatoria." }),
  status: z.enum(["Pendiente de Aprobación", "Aprobada", "Enviada al Proveedor", "Recibida", "Recibida Parcialmente", "Rechazado"]),
  rejectionReason: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().optional(), // Puede ser opcional si el nombre es la clave
    itemSku: z.string().optional(),
    itemName: z.string().min(1, "El nombre es obligatorio."),
    quantity: z.coerce.number().min(1, "La cantidad debe ser >= 1."),
    price: z.coerce.number().min(0, "El precio es obligatorio."),
    unit: z.string().min(1, "La unidad es obligatoria."),
    type: z.enum(['Material', 'Servicio']),
    family: z.string().optional(), // Used for filtering, not saved
  })).min(1, "Debes añadir al menos un artículo."),
  total: z.coerce.number(), // Se calculará automáticamente
  deliveryNotes: z.array(z.any()).optional(),
});

type PurchasingFormValues = z.infer<typeof formSchema>;

interface PurchasingFormProps {
  order?: PurchaseOrder | Partial<PurchaseOrder> | null;
  onSave: (values: PurchasingFormValues) => void;
  onCancel: () => void;
  canApprove?: boolean;
  suppliers: Supplier[];
  recentSupplierIds: string[];
  inventoryItems: InventoryItem[];
  projects: Project[];
  locations: Location[];
}

const downloadBase64File = (base64Data: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Función corregida para visualizar archivos Base64
const viewBase64File = (base64Data: string, fileType: string) => {
    try {
      const base64Content = base64Data.split(';base64,').pop();
      if (!base64Content) {
        throw new Error("Formato Base64 inválido.");
      }
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileType });
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
      setTimeout(() => URL.revokeObjectURL(fileURL), 1000);
    } catch (error) {
      console.error("Error al visualizar el archivo:", error);
    }
};


export function PurchasingForm({ order, onSave, onCancel, canApprove = false, suppliers, recentSupplierIds, inventoryItems, projects, locations }: PurchasingFormProps) {
  const isEditable = !order || !('id' in order) || order.status === 'Pendiente de Aprobación' || order.status === 'Aprobada';
  const isReadOnly = order && 'id' in order ? !isEditable : false;
  const [isDeliveryDatePickerOpen, setIsDeliveryDatePickerOpen] = React.useState(false);
  
  const defaultValues = order
    ? { 
        project: order.project || "",
        supplier: order.supplier || "",
        deliveryLocationId: order.deliveryLocationId || "",
        orderNumber: order.orderNumber || "",
        date: order.date ? new Date(order.date as any) : new Date(),
        estimatedDeliveryDate: order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate as any) : new Date(),
        status: order.status || "Pendiente de Aprobación",
        rejectionReason: order.rejectionReason || "",
        items: order.items?.map(item => ({...item, family: inventoryItems.find(i => i.id === item.itemId)?.family || 'all'})) || [{ itemName: "", itemSku: "", quantity: 1, price: 0, unit: "ud", type: 'Material' as const, family: 'all' }],
        total: order.total || 0,
        deliveryNotes: order.deliveryNotes || [],
       }
    : {
        project: "",
        supplier: "",
        deliveryLocationId: "",
        orderNumber: "",
        date: new Date(),
        estimatedDeliveryDate: new Date(),
        status: "Pendiente de Aprobación" as const,
        rejectionReason: "",
        items: [{ itemName: "", itemSku: "", quantity: 1, price: 0, unit: "ud", type: 'Material' as const, family: 'all' }],
        total: 0,
        deliveryNotes: [],
      };

  const form = useForm<PurchasingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const status = useWatch({ control: form.control, name: "status" });
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const watchedSupplier = useWatch({ control: form.control, name: "supplier" });

  
  const total = React.useMemo(() => {
    return watchedItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  }, [watchedItems]);

  const sortedProductFamilies = React.useMemo(() => {
    return [...productFamilies].sort((a, b) => a.name.localeCompare(b.name));
  }, []);


  function onSubmit(values: PurchasingFormValues) {
    // Remove temporary 'family' field before saving
    const itemsToSave = values.items.map(({ family, ...rest }) => rest);
    onSave({ ...values, items: itemsToSave, total }); // Pass the calculated total on submit
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>, index: number, fieldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const form = e.currentTarget.closest('form');
      if (!form) return;

      const fields: (keyof typeof watchedItems[0] | 'itemNameTrigger')[] = [
          'type', 'family', 'itemNameTrigger', 'quantity', 'unit', 'price'
      ];

      const currentFieldIndex = fields.indexOf(fieldName as any);
      if (currentFieldIndex === -1 || currentFieldIndex === fields.length - 1) {
        return; 
      }
      
      const nextFieldName = fields[currentFieldIndex + 1];
      const nextField = form.querySelector<HTMLElement>(`[name="items.${index}.${nextFieldName}"]`) || form.querySelector<HTMLElement>(`[data-field-name="items.${index}.${nextFieldName}"]`);

      if (nextField) {
        nextField.focus();
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="supplier"
            render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                <FormLabel>Proveedor</FormLabel>
                <FormControl>
                    <SupplierCombobox
                      suppliers={suppliers}
                      recentSupplierIds={recentSupplierIds}
                      value={field.value}
                      onChange={(supplierName, supplierId) => {
                          field.onChange(supplierName);
                      }}
                      onAddNew={() => { /* Implementar si es necesario */ }}
                      disabled={isReadOnly}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
           />
           <FormField
            control={form.control}
            name="project"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Proyecto</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un proyecto" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
           />
           <FormField
              control={form.control}
              name="deliveryLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Almacén de Entrega</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly || locations.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={locations.length > 0 ? "Selecciona un almacén" : "Crea un almacén primero"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimatedDeliveryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha Entrega Estimada</FormLabel>
                  <Popover open={isDeliveryDatePickerOpen} onOpenChange={setIsDeliveryDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                           disabled={isReadOnly}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Elige una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                           if (date) {
                             field.onChange(date);
                             setIsDeliveryDatePickerOpen(false);
                           }
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Conceptos del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[10%]">Tipo</TableHead>
                            <TableHead className="w-[15%] min-w-[120px]">Familia</TableHead>
                            <TableHead className="w-[25%] min-w-[150px]">Descripción</TableHead>
                            <TableHead className="w-[10%] min-w-[90px]">Cantidad</TableHead>
                            <TableHead className="w-[8%] min-w-[70px]">Unidad</TableHead>
                            <TableHead className="w-[12%] min-w-[130px]">Precio Unitario (€)</TableHead>
                            {!isReadOnly && <TableHead className="w-[5%] min-w-[50px] text-right"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => {
                            const selectedFamily = watchedItems[index]?.family;
                            const itemsFilteredByFamily = inventoryItems.filter(item => 
                                !selectedFamily || selectedFamily === 'all' || item.family === selectedFamily
                            );
                            
                            const supplierDetails = suppliers.find(s => s.name === watchedSupplier);
                            
                            const filteredItemsForLine = itemsFilteredByFamily.filter(item => {
                                if (!supplierDetails) return false;
                                return item.suppliers?.includes(supplierDetails.id);
                            });
                            
                            return (
                            <TableRow key={field.id}>
                                <TableCell>
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.type`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                                                    <FormControl>
                                                        <SelectTrigger onKeyDown={(e) => handleKeyDown(e, index, 'type')}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Material">Material</SelectItem>
                                                        <SelectItem value="Servicio">Servicio</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell>
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.family`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <Select
                                                  onValueChange={(value) => {
                                                    field.onChange(value);
                                                    form.setValue(`items.${index}.itemName`, ''); // Reset item name on family change
                                                  }}
                                                  value={field.value}
                                                  disabled={isReadOnly || !watchedSupplier || watchedItems[index]?.type === 'Servicio'}
                                                >
                                                  <FormControl>
                                                    <SelectTrigger onKeyDown={(e) => handleKeyDown(e, index, 'family')}>
                                                        <SelectValue placeholder="Todas" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent position="popper" className="w-[--radix-select-trigger-width]">
                                                    <SelectItem value="all">Todas las familias</SelectItem>
                                                    {sortedProductFamilies.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                                                  </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell>
                                     <FormField
                                        control={form.control}
                                        name={`items.${index}.itemName`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                   <ItemCombobox 
                                                        inventoryItems={filteredItemsForLine}
                                                        value={field.value}
                                                        onChange={(selectedItem) => {
                                                            form.setValue(`items.${index}.itemName`, selectedItem.name);
                                                            form.setValue(`items.${index}.itemSku`, selectedItem.sku);
                                                            form.setValue(`items.${index}.price`, selectedItem.unitCost);
                                                            form.setValue(`items.${index}.itemId`, selectedItem.id);
                                                            form.setValue(`items.${index}.unit`, selectedItem.unit);
                                                            
                                                            const purchaseItemType = selectedItem.type === 'service' ? 'Servicio' : 'Material';
                                                            form.setValue(`items.${index}.type`, purchaseItemType);
                                                        }}
                                                        disabled={isReadOnly || !watchedSupplier}
                                                   />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell className="min-w-[90px]">
                                      <FormField
                                        control={form.control}
                                        name={`items.${index}.quantity`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input type="number" className="min-w-[70px]" {...field} onKeyDown={(e) => handleKeyDown(e, index, 'quantity')} onFocus={(e) => e.target.select()} disabled={isReadOnly}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell className="min-w-[70px]">
                                      <FormField
                                        control={form.control}
                                        name={`items.${index}.unit`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="ud" className="min-w-[60px]" {...field} onKeyDown={(e) => handleKeyDown(e, index, 'unit')} disabled={isReadOnly}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell className="min-w-[130px]">
                                     <FormField
                                        control={form.control}
                                        name={`items.${index}.price`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input type="number" step="0.01" className="min-w-[100px]" {...field} onKeyDown={(e) => handleKeyDown(e, index, 'price')} onFocus={(e) => e.target.select()} disabled={isReadOnly}/>
                                                </FormControl>
                                                <FormMessage />
                                                {!isReadOnly && watchedItems[index]?.type === 'Material' && (
                                                    <ItemPriceInsight
                                                        itemName={watchedItems[index]?.itemName}
                                                        itemPrice={watchedItems[index]?.price}
                                                        supplierName={watchedSupplier}
                                                    />
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                {!isReadOnly && (
                                <TableCell className="text-right">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                                )}
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
                </div>
                 {!isReadOnly && (
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => append({ itemName: "", itemSku: "", quantity: 1, price: 0, unit: "ud", type: 'Material', family: 'all' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Fila
                </Button>
                )}
                 <FormField
                    control={form.control}
                    name="items"
                    render={() => <FormItem><FormMessage className="pt-2" /></FormItem>}
                  />
            </CardContent>
        </Card>
        
        {order && 'id' in order && order.deliveryNotes && order.deliveryNotes.length > 0 && (
          <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Albaranes Adjuntos
                </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {order.deliveryNotes.map((note, index) => {
                  const fileSize = note.fileSize ? `${(note.fileSize / 1024).toFixed(1)} KB` : '';
                  const uploadedDate = note.uploadedAt ? formatDistanceToNow(new Date(note.uploadedAt as string), { addSuffix: true, locale: es }) : '';
                  return (
                    <li key={index} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                        <div>
                            <p className="font-medium text-sm">{note.fileName}</p>
                            <p className="text-xs text-muted-foreground">{fileSize} - Subido {uploadedDate}</p>
                        </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => viewBase64File(note.data, note.fileType)}>
                            <Eye className="mr-2 h-4 w-4" /> Ver
                        </Button>
                        <Button variant="outline" size="sm" type="button" onClick={() => downloadBase64File(note.data, note.fileName)}>
                           <Download className="mr-2 h-4 w-4" /> Descargar
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canApprove}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Pendiente de Aprobación">Pendiente de Aprobación</SelectItem>
                            <SelectItem value="Aprobada">Aprobada</SelectItem>
                            <SelectItem value="Enviada al Proveedor">Enviada al Proveedor</SelectItem>
                            <SelectItem value="Recibida">Recibida</SelectItem>
                            <SelectItem value="Rechazado">Rechazado</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 {status === 'Rechazado' && canApprove && (
                    <FormField
                        control={form.control}
                        name="rejectionReason"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Motivo del Rechazo</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Describe por qué se rechaza este pedido..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
            <div className="flex flex-col items-end justify-end space-y-2">
                 <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total del Pedido</p>
                    <p className="text-2xl font-bold">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total)}
                    </p>
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {isReadOnly ? "Cerrar" : "Cancelar"}
          </Button>
          {!isReadOnly && (
            <Button type="submit">Guardar Cambios</Button>
          )}
        </div>
      </form>
    </Form>
  );
}
