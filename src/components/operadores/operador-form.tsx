
"use client";

import React from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import type { Operador } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const depotSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre de la cochera es obligatorio."),
  address: z.string().min(1, "La dirección es obligatoria."),
});

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  cif: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Debe ser un correo electrónico válido.").optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  depots: z.array(depotSchema).optional(),
});

type OperadorFormValues = z.infer<typeof formSchema>;

interface OperadorFormProps {
  operador?: Operador | null;
  onSave: (values: OperadorFormValues) => void;
  onCancel: () => void;
}

export function OperadorForm({ operador, onSave, onCancel }: OperadorFormProps) {
  const defaultValues: Partial<Operador> = operador
    ? { ...operador, notes: operador.notes || '', depots: operador.depots || [] }
    : {
        name: "",
        cif: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
        depots: [],
      };

  const form = useForm<OperadorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "depots",
  });


  function onSubmit(values: OperadorFormValues) {
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
              <FormLabel>Nombre del Operador (Flota)</FormLabel>
              <FormControl>
                  <Input placeholder="Razón social del operador" {...field} />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        <FormField
        control={form.control}
        name="cif"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Código/CIF (Opcional)</FormLabel>
            <FormControl>
                <Input placeholder="Identificador fiscal" {...field} />
            </FormControl>
            <FormMessage />
            </FormItem>
        )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Teléfono (Opcional)</FormLabel>
                <FormControl>
                    <Input placeholder="Número de contacto principal" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email (Opcional)</FormLabel>
                <FormControl>
                    <Input type="email" placeholder="Correo electrónico de contacto" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Dirección Fiscal (Opcional)</FormLabel>
            <FormControl>
                <Input placeholder="Domicilio social o sede principal" {...field} />
            </FormControl>
            <FormMessage />
            </FormItem>
        )}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cocheras / Bases Operativas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Nombre de la Cochera</TableHead>
                  <TableHead className="w-[60%]">Dirección</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`depots.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl><Input placeholder="Ej: Cochera Central" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`depots.${index}.address`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl><Input placeholder="Ej: Calle de la Logística, 42" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => append({ name: '', address: '' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Cochera
            </Button>
          </CardContent>
        </Card>

        <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Notas (Opcional)</FormLabel>
            <FormControl>
                <Textarea placeholder="Comentarios adicionales sobre el operador..." {...field} />
            </FormControl>
            <FormMessage />
            </FormItem>
        )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Operador</Button>
        </div>
      </form>
    </Form>
  );
}
