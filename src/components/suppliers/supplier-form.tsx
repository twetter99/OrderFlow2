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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Globe } from "lucide-react";
import type { Supplier } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  contactPerson: z.string().min(1, "La persona de contacto es obligatoria."),
  email: z.string().email("Debe ser un correo electrónico válido."),
  phone: z.string().min(1, "El teléfono es obligatorio."),
  deliveryRating: z.coerce.number().min(0).max(5, "La calificación debe estar entre 0 y 5."),
  qualityRating: z.coerce.number().min(0).max(5, "La calificación debe estar entre 0 y 5."),
  isInternational: z.boolean().optional(),
});

type SupplierFormValues = z.infer<typeof formSchema>;

interface SupplierFormProps {
  supplier?: Supplier | null;
  onSave: (values: SupplierFormValues) => void;
  onCancel: () => void;
}

export function SupplierForm({ supplier, onSave, onCancel }: SupplierFormProps) {
  const defaultValues = supplier
    ? { ...supplier }
    : {
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        deliveryRating: 4.0,
        qualityRating: 4.0,
        isInternational: false,
      };

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  function onSubmit(values: SupplierFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Proveedor</FormLabel>
              <FormControl>
                <Input placeholder="p. ej., TechParts Inc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Persona de Contacto</FormLabel>
                <FormControl>
                    <Input placeholder="p. ej., Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                    <Input placeholder="p. ej., 123-456-7890" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl>
                    <Input type="email" placeholder="p. ej., sales@techparts.com" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="deliveryRating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calificación de Entrega</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" min="0" max="5" placeholder="4.5" {...field} onFocus={(e) => e.target.select()} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="qualityRating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calificación de Calidad</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" min="0" max="5" placeholder="4.8" {...field} onFocus={(e) => e.target.select()} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isInternational"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Proveedor Internacional
                </FormLabel>
                <p className="text-sm text-muted-foreground">
                  Las órdenes de compra se generarán en inglés
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Form>
  );
}
