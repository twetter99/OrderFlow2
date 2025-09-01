

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
import type { SupplierInvoice, Supplier, PurchaseOrder, Project } from "@/lib/types";
import { CalendarIcon, FileUp, Package, Tag, Building, CalendarDays, Euro, Info, Trash2, PlusCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import React, { useMemo, useState } from "react";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { SupplierCombobox } from "../inventory/supplier-combobox";


const vatRates = [
  { label: 'General (21%)', value: 0.21 },
  { label: 'Reducido (10%)', value: 0.10 },
  { label: 'Superreducido (4%)', value: 0.04 },
  { label: 'Exento (0%)', value: 0.0 },
];

const formSchema = z.object({
  supplierId: z.string().min(1, "Debes seleccionar un proveedor."),
  purchaseOrderIds: z.array(
    z.object({
        poId: z.string().min(1, "Selecciona un pedido para esta línea.")
    })
  ).min(1, "Debes asociar al menos una orden de compra."),
  invoiceNumber: z.string().min(1, "El número de factura es obligatorio."),
  emissionDate: z.date({ required_error: "La fecha de factura es obligatoria." }),
  dueDate: z.date({ required_error: "La fecha de vencimiento es obligatoria." }),
  bases: z.array(z.object({
    baseAmount: z.coerce.number().min(0, "El importe debe ser positivo."),
    vatRate: z.coerce.number(),
  })).min(1, "Debes añadir al menos una base imponible."),
  status: z.enum(['Pendiente de validar', 'Validada', 'Disputada', 'Pendiente de pago', 'Pagada']),
  notes: z.string().optional(),
  attachment: z.any().optional(),
}).refine((data) => {
    const poIds = data.purchaseOrderIds.map(item => item.poId);
    return new Set(poIds).size === poIds.length;
}, {
    message: "No puedes seleccionar la misma orden de compra más de una vez.",
    path: ["purchaseOrderIds"],
});

type InvoiceFormValues = z.infer<typeof formSchema>;

interface InvoiceFormProps {
  invoice?: SupplierInvoice | null;
  suppliers: Supplier[];
  projects: Project[];
  purchaseOrders: PurchaseOrder[];
  onSave: (values: any) => void;
  onCancel: () => void;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

function OrderPreviewCard({ orders, projects, className }: { orders: (PurchaseOrder | undefined)[], projects?: Project[], className?: string }) {
    if (!orders || orders.length === 0 || !orders.some(o => o)) return null;

    const totalAmount = orders.reduce((acc, order) => acc + (order?.total || 0), 0);
    const allItems = orders.flatMap(order => order?.items || []);
    const firstOrder = orders.find(o => o);
    const project = projects?.find(p => p.id === firstOrder?.project);
    
    return (
        <Card className={cn("sticky top-4", className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Tag className="h-5 w-5 text-primary"/>
                    Vista Previa del Pedido(s)
                </CardTitle>
                <CardDescription>{orders.map(o => o?.orderNumber).filter(Boolean).join(', ')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 col-span-2">
                        <Building className="h-4 w-4 text-muted-foreground"/>
                        <strong>Proyecto:</strong>
                        <span className="truncate">{project?.name || 'Varios Proyectos'}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                        <strong>Fecha:</strong>
                        <span>{new Date(firstOrder?.date as string).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Euro className="h-4 w-4 text-muted-foreground"/>
                        <strong>Total Pedidos:</strong>
                        <span className="font-bold">{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
                
                <p className="text-sm font-medium flex items-center gap-2"><Package className="h-4 w-4"/>Artículos</p>
                <ScrollArea className="h-[320px] border rounded-md">
                    <ul className="p-2 text-sm space-y-2">
                        {allItems.map((item, index) => (
                            <li key={index} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                                <div className="flex-grow">
                                    <p className="font-medium truncate">{item.itemName}</p>
                                    <p className="text-xs text-muted-foreground">Cant: {item.quantity} | P.U.: {formatCurrency(item.price)}</p>
                                </div>
                                <p className="font-semibold">{formatCurrency(item.quantity * item.price)}</p>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}


export function InvoiceForm({ invoice, suppliers, projects, purchaseOrders, onSave, onCancel }: InvoiceFormProps) {
  
  const defaultValues: Partial<InvoiceFormValues> = invoice
    ? { 
        ...invoice,
        purchaseOrderIds: (invoice.purchaseOrderIds || []).map(id => ({ poId: id })),
        emissionDate: new Date(invoice.emissionDate as string),
        dueDate: new Date(invoice.dueDate as string),
        bases: invoice.bases || [{ baseAmount: 0, vatRate: 0.21 }],
      }
    : {
        supplierId: "",
        purchaseOrderIds: [{ poId: '' }],
        invoiceNumber: "",
        emissionDate: new Date(),
        dueDate: new Date(),
        bases: [{ baseAmount: 0, vatRate: 0.21 }],
        status: "Pendiente de validar",
        notes: "",
      };

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields: poFields, append: appendPo, remove: removePo } = useFieldArray({ control: form.control, name: "purchaseOrderIds" });
  const { fields: baseFields, append: appendBase, remove: removeBase } = useFieldArray({ control: form.control, name: "bases" });
  
  const [isEmissionDatePickerOpen, setIsEmissionDatePickerOpen] = useState(false);
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);

  const selectedSupplierId = useWatch({ control: form.control, name: 'supplierId' });
  const selectedPOFields = useWatch({ control: form.control, name: 'purchaseOrderIds' });
  const watchedBases = useWatch({ control: form.control, name: 'bases' });

  const vatAmount = useMemo(() =>
    (watchedBases || []).reduce((acc, item) => {
        const base = Number(item.baseAmount) || 0;
        const rate = Number(item.vatRate) || 0;
        return acc + (base * rate);
    }, 0), [watchedBases]);

  const totalAmount = useMemo(() =>
      (watchedBases || []).reduce((acc, item) => {
          const base = Number(item.baseAmount) || 0;
          const rate = Number(item.vatRate) || 0;
          const vat = base * rate;
          return acc + base + vat;
      }, 0), [watchedBases]);
  
  const filteredPurchaseOrders = useMemo(() => {
    if (!selectedSupplierId) return [];
    const supplierDetails = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplierDetails) return [];
    return purchaseOrders.filter(po => 
      po.supplier === supplierDetails.name && (po.status === 'Recibida' || po.status === 'Recibida Parcialmente')
    );
  }, [selectedSupplierId, purchaseOrders, suppliers]);
  
  const { selectedOrdersForPreview, poTotalAmount, isDifference, differenceAmount } = useMemo(() => {
    if (!selectedPOFields || selectedPOFields.length === 0) return { selectedOrdersForPreview: [], poTotalAmount: 0, isDifference: false, differenceAmount: 0 };
    
    const selectedOrders = selectedPOFields
      .map(field => purchaseOrders.find(po => po.id === field.poId))
      .filter(Boolean);
    
    const poTotal = selectedOrders.reduce((acc, order) => acc + (order?.total || 0), 0);
    const diff = totalAmount - poTotal;
    
    return {
      selectedOrdersForPreview: selectedOrders,
      poTotalAmount: poTotal,
      isDifference: Math.abs(diff) > 1, // Umbral de 1€ para considerar diferencia
      differenceAmount: diff
    };
  }, [selectedPOFields, purchaseOrders, totalAmount]);
  

  function onSubmit(values: InvoiceFormValues) {
    const finalValues = {
        ...values,
        purchaseOrderIds: values.purchaseOrderIds.map(item => item.poId),
        totalAmountDifference: differenceAmount
    };
    onSave(finalValues);
  }
  
  const supplierName = suppliers.find(s => s.id === selectedSupplierId)?.name || '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="md:col-span-2 space-y-6">
                
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Proveedor</FormLabel>
                                <SupplierCombobox
                                    suppliers={suppliers}
                                    recentSupplierIds={[]}
                                    value={supplierName}
                                    onChange={(supplierName, supplierId) => {
                                        form.setValue("supplierId", supplierId || "");
                                        form.setValue("purchaseOrderIds", [{poId: ''}]);
                                    }}
                                    onAddNew={() => {}}
                                />
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className="space-y-2">
                        <FormLabel>
                            Pedido de Compra Asociado*
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild><button type="button" tabIndex={-1} className="ml-1"><Info className="h-3 w-3 text-muted-foreground cursor-help"/></button></TooltipTrigger>
                                    <TooltipContent><p>No se puede registrar ninguna factura si no está asociada a un pedido de compra.</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </FormLabel>
                        {poFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                                <FormField
                                    control={form.control}
                                    name={`purchaseOrderIds.${index}.poId`}
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={filteredPurchaseOrders.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={filteredPurchaseOrders.length > 0 ? "Selecciona un pedido..." : "No hay pedidos recibidos para este proveedor"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {filteredPurchaseOrders.map(po => <SelectItem key={po.id} value={po.id} disabled={selectedPOFields.some(f => f.poId === po.id && f.poId !== field.value)}>{po.orderNumber || po.id}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {poFields.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removePo(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                )}
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPo({ poId: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Añadir otra orden de compra
                        </Button>
                        <FormField control={form.control} name="purchaseOrderIds" render={() => (<FormItem><FormMessage/></FormItem>)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="invoiceNumber"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Número de Factura</FormLabel>
                                <FormControl><Input placeholder="Ej: F-2024-1234" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem><FormLabel>Estado de la Factura</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Pendiente de validar">Pendiente de validar</SelectItem>
                                    <SelectItem value="Validada">Validada</SelectItem>
                                    <SelectItem value="Disputada">Disputada</SelectItem>
                                    <SelectItem value="Pendiente de pago">Pendiente de pago</SelectItem>
                                    <SelectItem value="Pagada">Pagada</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="emissionDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Fecha de Factura</FormLabel>
                            <Popover open={isEmissionDatePickerOpen} onOpenChange={setIsEmissionDatePickerOpen}><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                {field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Elige una fecha</span>)}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={(date) => { if(date) { field.onChange(date); setIsEmissionDatePickerOpen(false); } }} initialFocus/>
                            </PopoverContent></Popover>
                            <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="dueDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Fecha de Vencimiento</FormLabel>
                            <Popover open={isDueDatePickerOpen} onOpenChange={setIsDueDatePickerOpen}><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                {field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Elige una fecha</span>)}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={(date) => { if(date) { field.onChange(date); setIsDueDatePickerOpen(false); } }} initialFocus/>
                            </PopoverContent></Popover>
                            <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    <Card>
                    <CardHeader><CardTitle className="text-base">Desglose de Bases e IVA</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader><TableRow>
                            <TableHead className="w-2/5">Base Imponible</TableHead>
                            <TableHead className="w-2/5">Tipo IVA</TableHead>
                            <TableHead className="w-1/5 text-right">IVA Calculado</TableHead>
                            <TableHead />
                        </TableRow></TableHeader>
                        <TableBody>
                            {(baseFields || []).map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell><FormField control={form.control} name={`bases.${index}.baseAmount`} render={({ field }) => (
                                <FormItem><FormControl><Input type="number" step="0.01" {...field}/></FormControl><FormMessage/></FormItem>
                                )}/></TableCell>
                                <TableCell><FormField control={form.control} name={`bases.${index}.vatRate`} render={({ field }) => (
                                <FormItem><Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{vatRates.map(r => <SelectItem key={r.label} value={String(r.value)}>{r.label}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                )}/></TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency((watchedBases?.[index]?.baseAmount || 0) * (watchedBases?.[index]?.vatRate || 0))}</TableCell>
                                <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeBase(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendBase({ baseAmount: 0, vatRate: 0.21 })}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Añadir Base Imponible
                        </Button>
                    </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle className="text-base">Control Financiero</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-2 border rounded-md bg-muted/50 h-16 flex flex-col justify-center">
                                    <p className="text-sm text-muted-foreground">Total Pedido(s)</p>
                                    <p className="font-bold text-lg">{formatCurrency(poTotalAmount)}</p>
                                </div>
                                 <div className="p-2 border rounded-md bg-muted/50 h-16 flex flex-col justify-center">
                                    <p className="text-sm text-muted-foreground">Total Factura</p>
                                    <p className="font-bold text-lg">{formatCurrency(totalAmount)}</p>
                                </div>
                                <div className={cn("p-2 border rounded-md h-16 flex flex-col justify-center", isDifference ? "bg-destructive/10 border-destructive" : "bg-green-500/10 border-green-500")}>
                                    <p className="text-sm">Diferencia</p>
                                    <p className="font-bold text-lg">{formatCurrency(differenceAmount)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Notas Adicionales</FormLabel>
                        <FormControl><Textarea placeholder="Observaciones sobre la factura..." {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}/>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit">Guardar Factura</Button>
                    </div>
                </div>
            </form>
        </Form>
        <div className="hidden md:block">
            <OrderPreviewCard orders={selectedOrdersForPreview || []} projects={projects} />
        </div>
    </div>
  );
}
