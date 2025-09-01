

"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
import type { Replanteo, Project, PlantillaInstalacion, Technician, InventoryItem } from "@/lib/types";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

const formSchema = z.object({
  proyecto_id: z.string().min(1, "Debes seleccionar un proyecto."),
  plantilla_base_id: z.string().min(1, "Debes seleccionar una plantilla."),
  vehiculo_identificacion: z.string().min(1, "La identificación del vehículo es obligatoria."),
  matricula: z.string().min(1, "La matrícula es obligatoria."),
  fecha_replanteo: z.date({ required_error: "La fecha es obligatoria." }),
  tecnico_responsable_id: z.string().min(1, "Debes seleccionar un técnico."),
  estado: z.enum(['Pendiente', 'En Proceso', 'Completado']),
  tiempo_estimado_ajustado: z.coerce.number().min(0, "El tiempo debe ser positivo."),
  observaciones: z.string().optional(),
  materiales: z.array(z.object({
    material_id: z.string().min(1, "Selecciona un material."),
    cantidad_prevista: z.coerce.number().min(0.1, "La cantidad debe ser mayor a 0."),
    justificacion_cambio: z.string().optional(),
  })).optional(),
  imagenes: z.array(z.object({
    tipo: z.enum(['estado_inicial', 'esquema', 'detalle']),
    url_imagen: z.string().url("Debe ser una URL válida."),
    descripcion: z.string().min(1, "La descripción es obligatoria."),
  })).optional(),
});

type ReplanFormValues = z.infer<typeof formSchema>;

interface ReplanFormProps {
  replan?: Replanteo | null;
  projects: Project[];
  templates: PlantillaInstalacion[];
  technicians: Technician[];
  inventoryItems: InventoryItem[];
  onSave: (values: ReplanFormValues) => void;
  onCancel: () => void;
}

export function ReplanForm({ replan, projects, templates, technicians, inventoryItems, onSave, onCancel }: ReplanFormProps) {

  const physicalItems = inventoryItems.filter(i => i.type !== 'service');

  const defaultValues = replan
    ? {
        ...replan,
        fecha_replanteo: new Date(replan.fecha_replanteo),
        materiales: replan.materiales?.map(m => ({...m, justificacion_cambio: m.justificacion_cambio || ''})) || [],
      }
    : {
        proyecto_id: "",
        plantilla_base_id: "",
        vehiculo_identificacion: "",
        matricula: "",
        fecha_replanteo: new Date(),
        tecnico_responsable_id: "",
        estado: "Pendiente" as const,
        tiempo_estimado_ajustado: 0,
        observaciones: "",
        materiales: [],
        imagenes: [],
      };

  const form = useForm<ReplanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({ control: form.control, name: "materiales" });
  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({ control: form.control, name: "imagenes" });

  const selectedTemplateId = useWatch({ control: form.control, name: 'plantilla_base_id' });

  // Auto-fill form based on selected template
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      form.setValue('tiempo_estimado_ajustado', template.tiempo_estimado_horas);
      form.setValue('materiales', template.materiales.map(m => ({
        material_id: m.material_id,
        cantidad_prevista: m.cantidad_estandar,
        justificacion_cambio: ''
      })));
    }
  };


  function onSubmit(values: ReplanFormValues) {
    onSave({
        ...values,
        fecha_replanteo: values.fecha_replanteo.toISOString().split('T')[0] // Format as YYYY-MM-DD
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="text-lg font-medium">Información General del Replanteo</h3>
            <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="proyecto_id" render={({ field }) => (
                    <FormItem><FormLabel>Proyecto</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                 )}/>
                 <FormField control={form.control} name="plantilla_base_id" render={({ field }) => (
                    <FormItem><FormLabel>Plantilla Base</FormLabel><Select onValueChange={(value) => { field.onChange(value); handleTemplateChange(value); }} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl><SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                 )}/>
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="vehiculo_identificacion" render={({ field }) => (
                    <FormItem><FormLabel>Identificación Vehículo</FormLabel><FormControl><Input placeholder="Autobús #345" {...field}/></FormControl><FormMessage/></FormItem>
                 )}/>
                 <FormField control={form.control} name="matricula" render={({ field }) => (
                    <FormItem><FormLabel>Matrícula</FormLabel><FormControl><Input placeholder="1234 ABC" {...field}/></FormControl><FormMessage/></FormItem>
                 )}/>
            </div>
             <div className="grid md:grid-cols-3 gap-4">
                 <FormField control={form.control} name="fecha_replanteo" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Elige una fecha</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="tecnico_responsable_id" render={({ field }) => (
                    <FormItem><FormLabel>Técnico Responsable</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl><SelectContent>{technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                 )}/>
                <FormField control={form.control} name="estado" render={({ field }) => (
                    <FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Pendiente">Pendiente</SelectItem><SelectItem value="En Proceso">En Proceso</SelectItem><SelectItem value="Completado">Completado</SelectItem></SelectContent></Select><FormMessage/></FormItem>
                 )}/>
            </div>
             <FormField control={form.control} name="observaciones" render={({ field }) => (
                <FormItem><FormLabel>Observaciones Generales</FormLabel><FormControl><Textarea placeholder="Describe cualquier detalle importante sobre la instalación en este vehículo..." {...field}/></FormControl><FormMessage/></FormItem>
            )}/>
        </div>

        <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="text-lg font-medium">Materiales y Tiempos Ajustados</h3>
             <div className="flex items-center gap-4 pt-2">
                <FormField control={form.control} name="tiempo_estimado_ajustado" render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Tiempo Estimado (h)</FormLabel><FormControl><Input type="number" {...field} onFocus={(e) => e.target.select()} /></FormControl><FormMessage/></FormItem>
                )}/>
            </div>
             <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Cant.</TableHead><TableHead/></TableRow></TableHeader>
                <TableBody>
                    {materialFields.map((field, index) => (
                        <TableRow key={field.id}>
                            <TableCell>
                                    <FormField control={form.control} name={`materiales.${index}.material_id`} render={({ field }) => (
                                    <FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl><SelectContent>{physicalItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                )} />
                                <FormField control={form.control} name={`materiales.${index}.justificacion_cambio`} render={({ field }) => (
                                    <FormItem><FormControl><Input className="mt-1 text-xs h-7" placeholder="Justificación del cambio..." {...field}/></FormControl><FormMessage/></FormItem>
                                )}/>
                            </TableCell>
                            <TableCell>
                                <FormField control={form.control} name={`materiales.${index}.cantidad_prevista`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" {...field} onFocus={(e) => e.target.select()} /></FormControl><FormMessage/></FormItem>
                                )}/>
                            </TableCell>
                            <TableCell>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendMaterial({ material_id: "", cantidad_prevista: 1, justificacion_cambio: '' })}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Material</Button>
        </div>


        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Informe</Button>
        </div>
      </form>
    </Form>
  );
}
