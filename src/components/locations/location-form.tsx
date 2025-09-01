
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Location, Technician } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";


const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  description: z.string().optional(),
  type: z.enum(['physical', 'mobile'], { required_error: "Debes seleccionar un tipo de almacén."}),
  street: z.string().optional(),
  number: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  technicianId: z.string().optional(),
}).refine(data => {
    if (data.type === 'physical') {
        return !!data.street && !!data.postalCode && !!data.city && !!data.province;
    }
    return true;
}, {
    message: "La dirección completa es obligatoria para almacenes físicos.",
    path: ["street"],
});

type LocationFormValues = z.infer<typeof formSchema>;

interface LocationFormProps {
  location?: Location | null;
  technicians: Technician[];
  onSave: (values: LocationFormValues) => void;
  onCancel: () => void;
}

export function LocationForm({ location, technicians, onSave, onCancel }: LocationFormProps) {
  const defaultValues = location
    ? { ...location }
    : {
        name: "",
        description: "",
        type: 'physical' as const,
        street: "",
        number: "",
        postalCode: "",
        city: "",
        province: "",
      };

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  const warehouseType = useWatch({
    control: form.control,
    name: 'type',
  });

  function onSubmit(values: LocationFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre del Almacén</FormLabel>
                    <FormControl>
                        <Input placeholder="p. ej., Almacén Central" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Almacén</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="physical">Almacén Físico</SelectItem>
                            <SelectItem value="mobile">Almacén Móvil (Furgoneta)</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        {warehouseType === 'physical' && (
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Dirección del Almacén Físico</CardTitle>
                    <CardDescription>Esta dirección se usará para envíos y localizaciones.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                         <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                <FormLabel>Calle</FormLabel>
                                <FormControl>
                                    <Input placeholder="p. ej., Calle de la Industria" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="number"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Número</FormLabel>
                                <FormControl>
                                    <Input placeholder="p. ej., 42" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="postalCode"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Código Postal</FormLabel>
                                <FormControl>
                                    <Input placeholder="p. ej., 28906" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Población</FormLabel>
                                <FormControl>
                                    <Input placeholder="p. ej., Getafe" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="province"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Provincia</FormLabel>
                                <FormControl>
                                    <Input placeholder="p. ej., Madrid" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
             </Card>
        )}
        
        {warehouseType === 'mobile' && (
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Información del Almacén Móvil</CardTitle>
                </CardHeader>
                <CardContent>
                     <FormField
                        control={form.control}
                        name="technicianId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Técnico Responsable (Opcional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Asigna un técnico..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {technicians.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
             </Card>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="p. ej., Almacén principal para componentes electrónicos."
                  {...field}
                />
              </FormControl>
              <FormMessage />
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
