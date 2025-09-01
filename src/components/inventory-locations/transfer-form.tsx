
"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import type { InventoryItem, Location, InventoryLocation } from "@/lib/types";
import { useMemo } from "react";

const formSchema = z.object({
    itemId: z.string().min(1, "Debes seleccionar un artículo."),
    fromLocationId: z.string().min(1, "Debes seleccionar un almacén de origen."),
    toLocationId: z.string().min(1, "Debes seleccionar un almacén de destino."),
    quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
}).refine(data => data.fromLocationId !== data.toLocationId, {
    message: "El almacén de origen y destino no pueden ser el mismo.",
    path: ["toLocationId"],
});

type TransferFormValues = z.infer<typeof formSchema>;

interface TransferFormProps {
  inventoryItems: InventoryItem[];
  locations: Location[];
  inventoryLocations: InventoryLocation[];
  onSave: (values: TransferFormValues) => void;
  onCancel: () => void;
}

export function TransferForm({ inventoryItems, locations, inventoryLocations, onSave, onCancel }: TransferFormProps) {
  
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        itemId: "",
        fromLocationId: "",
        toLocationId: "",
        quantity: 1,
    }
  });

  const selectedItemId = useWatch({ control: form.control, name: 'itemId' });

  const locationsWithStockForItem = useMemo(() => {
    if (!selectedItemId) return [];
    const locationIdsWithStock = inventoryLocations
        .filter(l => l.itemId === selectedItemId && l.quantity > 0)
        .map(l => l.locationId);
    return locations.filter(l => locationIdsWithStock.includes(l.id));
  }, [selectedItemId, inventoryLocations, locations]);
  
  const selectedFromLocationId = useWatch({ control: form.control, name: 'fromLocationId' });

  const availableQuantity = useMemo(() => {
    if (!selectedItemId || !selectedFromLocationId) return 0;
    return inventoryLocations.find(l => l.itemId === selectedItemId && l.locationId === selectedFromLocationId)?.quantity || 0;
  }, [selectedItemId, selectedFromLocationId, inventoryLocations]);

  function onSubmit(values: TransferFormValues) {
    if (values.quantity > availableQuantity) {
        form.setError("quantity", { type: "manual", message: `Stock insuficiente. Disponible: ${availableQuantity}` });
        return;
    }
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
            control={form.control}
            name="itemId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Artículo a Transferir</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un artículo" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {inventoryItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.sku})</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />

        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="fromLocationId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Desde Almacén</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedItemId}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Origen" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {locationsWithStockForItem.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="toLocationId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Hacia Almacén</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedItemId}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Destino" />
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
        </div>

        <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Cantidad a Transferir</FormLabel>
                <FormControl>
                    <Input type="number" {...field} disabled={!selectedFromLocationId} min="1" max={availableQuantity} onFocus={e => e.target.select()} />
                </FormControl>
                {selectedFromLocationId && <FormMessage>Disponible: {availableQuantity}</FormMessage>}
                </FormItem>
            )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Confirmar Transferencia</Button>
        </div>
      </form>
    </Form>
  );
}
