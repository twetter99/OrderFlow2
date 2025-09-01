
"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { PlantillaInstalacion, InventoryItem } from "@/lib/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";

const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  tipo_vehiculo: z.enum(['autobuses', 'camiones', 'furgonetas', 'otros']),
  descripcion: z.string().min(1, "La descripción es obligatoria."),
  tiempo_estimado_horas: z.coerce.number().min(0, "El tiempo debe ser positivo."),
  num_tecnicos_requeridos: z.coerce.number().int().min(1, "Se requiere al menos un técnico."),
  activa: z.boolean(),
  materiales: z.array(z.object({
    id: z.string().optional(),
    material_id: z.string().min(1, "Selecciona un material."),
    cantidad_estandar: z.coerce.number().min(0.1, "La cantidad debe ser mayor a 0."),
    opcional: z.boolean(),
  })).optional(),
  herramientas: z.array(z.object({
    id: z.string().optional(),
    herramienta: z.string().min(1, "El nombre de la herramienta es obligatorio."),
    obligatoria: z.boolean(),
  })).optional(),
});

type TemplateFormValues = z.infer<typeof formSchema>;

interface TemplateFormProps {
  template?: PlantillaInstalacion | null;
  inventoryItems: InventoryItem[];
  onSave: (values: TemplateFormValues) => void;
  onCancel: () => void;
}

export function TemplateForm({ template, inventoryItems, onSave, onCancel }: TemplateFormProps) {
  
  const physicalItems = inventoryItems.filter(i => i.type === 'simple' || i.type === 'composite');

  const defaultValues = template
    ? { ...template }
    : {
        nombre: "",
        tipo_vehiculo: "autobuses" as const,
        descripcion: "",
        tiempo_estimado_horas: 0,
        num_tecnicos_requeridos: 1,
        activa: true,
        materiales: [],
        herramientas: [],
      };

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control, name: "materiales"
  });
  const { fields: toolFields, append: appendTool, remove: removeTool } = useFieldArray({
    control: form.control, name: "herramientas"
  });

  function onSubmit(values: TemplateFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Información General</h3>
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la Plantilla</FormLabel>
                <FormControl><Input placeholder="p. ej., Instalación GPS y Cámaras" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl><Textarea placeholder="Describe el propósito y alcance de esta plantilla..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="tipo_vehiculo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Vehículo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="autobuses">Autobuses</SelectItem>
                      <SelectItem value="camiones">Camiones</SelectItem>
                      <SelectItem value="furgonetas">Furgonetas</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tiempo_estimado_horas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiempo Estimado (h)</FormLabel>
                  <FormControl><Input type="number" step="0.5" {...field} onFocus={(e) => e.target.select()} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="num_tecnicos_requeridos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Técnicos Req.</FormLabel>
                  <FormControl><Input type="number" {...field} onFocus={(e) => e.target.select()} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activa"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Plantilla Activa</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="mt-2" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle>Materiales Requeridos</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-3/5">Material</TableHead>
                                <TableHead>Cant.</TableHead>
                                <TableHead>Opc.</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materialFields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell>
                                        <FormField control={form.control} name={`materiales.${index}.material_id`} render={({ field }) => (
                                            <FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl><SelectContent>{physicalItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                        )} />
                                    </TableCell>
                                    <TableCell>
                                        <FormField control={form.control} name={`materiales.${index}.cantidad_estandar`} render={({ field }) => (
                                            <FormItem><FormControl><Input type="number" step="0.1" {...field} onFocus={(e) => e.target.select()} /></FormControl><FormMessage/></FormItem>
                                        )} />
                                    </TableCell>
                                    <TableCell>
                                         <FormField control={form.control} name={`materiales.${index}.opcional`} render={({ field }) => (
                                            <FormItem><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormMessage/></FormItem>
                                        )} />
                                    </TableCell>
                                    <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendMaterial({ material_id: "", cantidad_estandar: 1, opcional: false })}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Material</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Herramientas Necesarias</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-4/5">Herramienta</TableHead>
                                <TableHead>Obl.</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {toolFields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell>
                                        <FormField control={form.control} name={`herramientas.${index}.herramienta`} render={({ field }) => (
                                            <FormItem><FormControl><Input placeholder="Juego de llaves Allen" {...field} /></FormControl><FormMessage/></FormItem>
                                        )} />
                                    </TableCell>
                                    <TableCell>
                                         <FormField control={form.control} name={`herramientas.${index}.obligatoria`} render={({ field }) => (
                                            <FormItem><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormMessage/></FormItem>
                                        )} />
                                    </TableCell>
                                    <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeTool(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendTool({ herramienta: "", obligatoria: true })}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Herramienta</Button>
                </CardContent>
            </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="submit">Guardar Plantilla</Button>
        </div>
      </form>
    </Form>
  );
}
