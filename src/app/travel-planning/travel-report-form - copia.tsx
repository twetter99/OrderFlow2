"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Project, Technician } from "@/lib/types";
import { addTravelReport } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Esquema de validación con Zod
const gastoSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  tipo: z.enum(['Alojamiento', 'Combustible', 'Peajes', 'Dietas', 'Transporte', 'Otros'], { required_error: "El tipo es obligatorio."}),
  descripcion: z.string().min(3, "La descripción es necesaria."),
  importe: z.coerce.number({invalid_type_error: "Debe ser un número."}).min(0.01, "El importe debe ser positivo."),
});

const reportSchema = z.object({
  proyecto_id: z.string().min(1, "Debes seleccionar un proyecto."),
  tecnico_id: z.string().min(1, "Debes seleccionar un técnico."),
  fecha_inicio: z.date({ required_error: "La fecha de inicio es obligatoria." }),
  fecha_fin: z.date({ required_error: "La fecha de fin es obligatoria." }),
  descripcion_viaje: z.string().min(5, "Añade una breve descripción del viaje."),
  gastos: z.array(gastoSchema).min(1, "Debes añadir al menos un gasto."),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface TravelReportFormProps {
  projects: Project[];
  technicians: Technician[];
  onClose: () => void;
}

export function TravelReportForm({ projects, technicians, onClose }: TravelReportFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      proyecto_id: "",
      tecnico_id: "",
      descripcion_viaje: "",
      gastos: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "gastos",
  });

  const onSubmit = async (data: ReportFormData) => {
    setIsSubmitting(true);
    const reportData = {
      ...data,
      fecha_inicio: data.fecha_inicio.toISOString(),
      fecha_fin: data.fecha_fin.toISOString(),
      gastos: data.gastos.map(g => ({
        ...g,
        fecha: g.fecha.toISOString(),
      })),
    };

    const result = await addTravelReport(reportData);

    if (result.success) {
      toast({
        title: "Informe Creado",
        description: result.message,
      });
      onClose();
      router.refresh();
    } else {
      toast({
        title: "Error al crear el informe",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="proyecto_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proyecto *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un proyecto..." /></SelectTrigger></FormControl>
                  <SelectContent>{projects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tecnico_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Técnico *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un técnico..." /></SelectTrigger></FormControl>
                  <SelectContent>{technicians.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField control={form.control} name="fecha_inicio" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha de Inicio *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Selecciona una fecha</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="fecha_fin" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha de Fin *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Selecciona una fecha</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
        </div>

        <FormField control={form.control} name="descripcion_viaje" render={({ field }) => (<FormItem><FormLabel>Descripción del Viaje *</FormLabel><FormControl><Textarea placeholder="Ej: Desplazamiento a taller de [Operador] en [Ciudad]..." {...field} /></FormControl><FormMessage /></FormItem>)} />

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex justify-between items-center"><h3 className="text-lg font-medium">Líneas de Gasto</h3><Button type="button" variant="outline" size="sm" onClick={() => append({ fecha: new Date(), tipo: 'Combustible', descripcion: '', importe: 0 })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Gasto</Button></div>
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 border-t pt-3 relative">
              <FormField control={form.control} name={`gastos.${index}.fecha`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Fecha Gasto</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "P", { locale: es }) : <span>Fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={form.control} name={`gastos.${index}.tipo`} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Alojamiento">Alojamiento</SelectItem><SelectItem value="Combustible">Combustible</SelectItem><SelectItem value="Peajes">Peajes</SelectItem><SelectItem value="Dietas">Dietas</SelectItem><SelectItem value="Transporte">Transporte</SelectItem><SelectItem value="Otros">Otros</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name={`gastos.${index}.descripcion`} render={({ field }) => (<FormItem className="md:col-span-4"><FormLabel>Descripción</FormLabel><FormControl><Input placeholder="Ej: Gasolina furgoneta" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name={`gastos.${index}.importe`} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Importe (€)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="md:col-span-1 flex items-end"><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </div>
          ))}
          {fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Añade al menos una línea de gasto.</p>}
        </div>

        <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Enviar a Aprobación"}</Button></div>
      </form>
    </Form>
  );
}
