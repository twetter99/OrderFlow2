
"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import type { InventoryItem, Location } from "@/lib/types";

const formSchema = z.object({
  locationId: z.string().min(1, "Debes seleccionar un almacén."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
});

type AddStockFormValues = z.infer<typeof formSchema>;

interface AddStockFormProps {
  item: InventoryItem;
  locations: Location[];
  onSave: (values: AddStockFormValues) => void;
  onCancel: () => void;
}

export function AddStockForm({ item, locations, onSave, onCancel }: AddStockFormProps) {
  
  const form = useForm<AddStockFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        locationId: "",
        quantity: 1,
    }
  });

  function onSubmit(values: AddStockFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
            <h3 className="font-medium">Añadir stock para: {item.name}</h3>
            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
        </div>
        <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Almacén de Destino</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Cantidad a Añadir</FormLabel>
                <FormControl>
                    <Input type="number" {...field} onFocus={e => e.target.select()} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Añadir Stock</Button>
        </div>
      </form>
    </Form>
  );
}
