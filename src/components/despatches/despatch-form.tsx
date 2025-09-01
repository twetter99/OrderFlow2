
"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
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
import type { DeliveryNote, Project, InventoryItem, Location, InventoryLocation, Client } from "@/lib/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useMemo } from "react";

const formSchema = z.object({
  clientId: z.string().min(1, "Debes seleccionar un cliente."),
  projectId: z.string().min(1, "Debes seleccionar un proyecto."),
  locationId: z.string().min(1, "Debes seleccionar un almacén de origen."),
  items: z.array(z.object({
    itemId: z.string().min(1, "Debes seleccionar un artículo."),
    quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  })).min(1, "Debes añadir al menos un artículo."),
});

type DespatchFormValues = z.infer<typeof formSchema>;

interface DespatchFormProps {
  note?: DeliveryNote | null;
  clients: Client[];
  projects: Project[];
  inventoryItems: InventoryItem[];
  locations: Location[];
  inventoryLocations: InventoryLocation[];
  onSave: (values: DespatchFormValues) => void;
  onCancel: () => void;
}

export function DespatchForm({ note, clients, projects, inventoryItems, locations, inventoryLocations, onSave, onCancel }: DespatchFormProps) {
  const isReadOnly = !!note;

  const form = useForm<DespatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: note
      ? { clientId: note.clientId, projectId: note.projectId, items: note.items, locationId: note.locationId }
      : { clientId: "", projectId: "", locationId: "", items: [{ itemId: "", quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedLocationId = useWatch({ control: form.control, name: 'locationId' });
  const watchedClientId = useWatch({ control: form.control, name: 'clientId' });

  const filteredProjects = useMemo(() => {
    if (!watchedClientId) return [];
    return projects.filter(p => p.clientId === watchedClientId);
  }, [watchedClientId, projects]);


  const getStockInLocation = (itemId: string, locationId: string) => {
    return inventoryLocations.find(l => l.itemId === itemId && l.locationId === locationId)?.quantity || 0;
  };

  const getBuildableQuantityInLocation = (item: InventoryItem, locationId: string) => {
    if (item.type !== 'composite' || !item.components) return getStockInLocation(item.id, locationId);
    return Math.min(
      ...item.components.map(c => {
        const componentStockInLoc = getStockInLocation(c.itemId, locationId);
        return Math.floor(componentStockInLoc / c.quantity);
      })
    );
  };
  
  const availableInventory = useMemo(() => {
    if (!watchedLocationId) return [];
    return inventoryItems.filter(item => {
        if (item.type === 'composite') {
            return getBuildableQuantityInLocation(item, watchedLocationId) > 0;
        }
        return getStockInLocation(item.id, watchedLocationId) > 0;
    });
  }, [watchedLocationId, inventoryItems, inventoryLocations]);


  function onSubmit(values: DespatchFormValues) {
    // Check for stock availability in the selected location
    for (const [index, item] of values.items.entries()) {
      const stockItem = inventoryItems.find(i => i.id === item.itemId);
      if (!stockItem) continue;

      if (stockItem.type === 'composite') {
        const buildable = getBuildableQuantityInLocation(stockItem, values.locationId);
        if (buildable < item.quantity) {
          form.setError(`items.${index}.quantity`, {
            type: "manual",
            message: `Stock insuficiente en almacén. Se pueden construir: ${buildable}`,
          });
          return; // Stop submission
        }
      } else {
        const stockInLoc = getStockInLocation(item.itemId, values.locationId);
        if (stockInLoc < item.quantity) {
          form.setError(`items.${index}.quantity`, {
            type: "manual",
            message: `Stock insuficiente en almacén. Disponible: ${stockInLoc}`,
          });
          return; // Stop submission
        }
      }
    }
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('projectId', ''); // Reset project on client change
                }} defaultValue={field.value} disabled={isReadOnly}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Proyecto de Destino</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly || !watchedClientId}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un proyecto" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Almacén de Origen</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un almacén" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Artículos a Despachar</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60%]">Artículo</TableHead>
                            <TableHead>Cantidad</TableHead>
                            {!isReadOnly && <TableHead className="text-right">Acción</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => {
                            return (
                            <TableRow key={field.id}>
                                <TableCell>
                                    <FormField
                                    control={form.control}
                                    name={`items.${index}.itemId`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly || !watchedLocationId}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona un artículo" />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                {availableInventory.map(i => {
                                                  const stockLabel = i.type === 'composite'
                                                    ? `(Construible: ${getBuildableQuantityInLocation(i, watchedLocationId)})`
                                                    : `(Stock: ${getStockInLocation(i.id, watchedLocationId)})`;
                                                  return (
                                                    <SelectItem key={i.id} value={i.id}>
                                                      <span>{i.name} {stockLabel}</span>
                                                    </SelectItem>
                                                  )
                                                })}
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
                                    name={`items.${index}.quantity`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <Input type="number" {...field} disabled={isReadOnly} onFocus={e => e.target.select()} />
                                            <FormMessage />
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
                 {!isReadOnly && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => append({ itemId: "", quantity: 1 })}
                        disabled={!watchedLocationId}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Artículo
                    </Button>
                )}
                 <FormField
                    control={form.control}
                    name="items"
                    render={() => <FormItem><FormMessage className="pt-2" /></FormItem>}
                  />
            </CardContent>
        </Card>
        
        {!isReadOnly && (
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">Generar Albarán</Button>
          </div>
        )}
      </form>
    </Form>
  );
}
