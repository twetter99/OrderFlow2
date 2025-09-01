

"use client";

import React from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Technician, TechnicianCategory } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const technicianCategoryDefinitions = [
    { name: 'Técnico Ayudante / Auxiliar', description: 'Apoya en tareas básicas de instalación, cableado y montaje bajo supervisión directa.' },
    { name: 'Técnico Instalador', description: 'Realiza la instalación física y el conexionado de los equipos embarcados en vehículos.' },
    { name: 'Técnico Integrador de Sistemas Embarcados', description: 'Especialista en la integración y configuración conjunta de varios sistemas embarcados.' },
    { name: 'Técnico de Puesta en Marcha y Pruebas', description: 'Encargado de configurar los equipos, ponerlos en funcionamiento y comprobar su correcto funcionamiento tras la instalación.' },
    { name: 'Técnico de Mantenimiento', description: 'Realiza diagnósticos, reparaciones y mantenimientos preventivos y correctivos de los equipos instalados.' },
    { name: 'Jefe de Equipo / Encargado de Instalación', description: 'Coordina al equipo técnico, gestiona los recursos y supervisa la ejecución de las instalaciones.' },
    { name: 'Técnico de SAT (Servicio de Asistencia Técnica)', description: 'Atiende incidencias técnicas, realiza soporte post-instalación y resuelve averías en campo o de forma remota.' },
    { name: 'Técnico de Calidad / Certificación', description: 'Verifica y certifica que las instalaciones cumplen con los estándares y protocolos de calidad establecidos.' },
] as const;

const technicianCategories = technicianCategoryDefinitions.map(c => c.name) as [TechnicianCategory, ...TechnicianCategory[]];

const rateSchema = z.object({
  rateWorkHour: z.coerce.number().min(0, "La tarifa debe ser positiva").optional(),
  rateTravelHour: z.coerce.number().min(0, "La tarifa debe ser positiva").optional(),
  rateOvertimeWeekdayDay: z.coerce.number().min(0, "La tarifa debe ser positiva").optional(),
  rateOvertimeWeekdayNight: z.coerce.number().min(0, "La tarifa debe ser positiva").optional(),
  rateOvertimeWeekendDay: z.coerce.number().min(0, "La tarifa debe ser positiva").optional(),
  rateOvertimeWeekendNight: z.coerce.number().min(0, "La tarifa debe ser positiva").optional(),
  rateNotes: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  specialty: z.string().min(1, "La especialidad es obligatoria."),
  category: z.enum(technicianCategories, { required_error: "La categoría es obligatoria."}),
  phone: z.string().min(1, "El teléfono es obligatorio."),
  notes: z.string().optional(),
  rates: rateSchema.optional(),
});

type TechnicianFormValues = z.infer<typeof formSchema>;

interface TechnicianFormProps {
  technician?: Technician | null;
  onSave: (values: TechnicianFormValues) => void;
  onCancel: () => void;
}


function CurrencyInput({
  field,
  label,
  tooltipText,
}: {
  field: any;
  label: string;
  tooltipText: string;
}) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState('');

  const formatCurrency = (value: number | string) => {
    const num = Number(value);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };
  
  React.useEffect(() => {
    if (!isFocused) {
        setDisplayValue(field.value === 0 || field.value === undefined ? '' : formatCurrency(field.value));
    } else {
        setDisplayValue(field.value === 0 || field.value === undefined ? '' : String(field.value));
    }
  }, [field.value, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const rawValue = e.target.value;
    if (rawValue === '') {
        field.onChange(0);
        return;
    }
    const numericValue = parseFloat(rawValue.replace(',', '.'));
    if (!isNaN(numericValue)) {
      field.onChange(numericValue);
    } else {
      field.onChange(0);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (/^[0-9]*[,.]?[0-9]*$/.test(value)) {
        setDisplayValue(value);
      }
  }

  return (
    <div className="space-y-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <FormLabel className="cursor-help">{label}</FormLabel>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="relative">
        <FormControl>
          <Input
            type="text"
            value={displayValue}
            placeholder="0,00 €"
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className="pr-8"
          />
        </FormControl>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
          €
        </div>
      </div>
       <FormMessage />
    </div>
  );
}


export function TechnicianForm({ technician, onSave, onCancel }: TechnicianFormProps) {
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);

  const defaultValues: Partial<Technician> = technician
    ? { 
        ...technician,
        notes: technician.notes || '',
        rates: {
            rateWorkHour: technician.rates?.rateWorkHour || 0,
            rateTravelHour: technician.rates?.rateTravelHour || 0,
            rateOvertimeWeekdayDay: technician.rates?.rateOvertimeWeekdayDay || 0,
            rateOvertimeWeekdayNight: technician.rates?.rateOvertimeWeekdayNight || 0,
            rateOvertimeWeekendDay: technician.rates?.rateOvertimeWeekendDay || 0,
            rateOvertimeWeekendNight: technician.rates?.rateOvertimeWeekendNight || 0,
            rateNotes: technician.rates?.rateNotes || "",
        }
      }
    : {
        name: "",
        specialty: "General",
        category: 'Técnico Ayudante / Auxiliar',
        phone: "",
        notes: "",
        rates: {
            rateWorkHour: 0,
            rateTravelHour: 0,
            rateOvertimeWeekdayDay: 0,
            rateOvertimeWeekdayNight: 0,
            rateOvertimeWeekendDay: 0,
            rateOvertimeWeekendNight: 0,
            rateNotes: "",
        }
      };

  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  function onSubmit(values: TechnicianFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
                <CardHeader><CardTitle>Información del Técnico</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nombre del Técnico</FormLabel>
                        <FormControl>
                            <Input placeholder="Nombre y apellidos" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoría</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una categoría"/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent onPointerLeave={() => setHoveredCategory(null)}>
                                            {technicianCategoryDefinitions.map(category => (
                                                <SelectItem 
                                                    key={category.name} 
                                                    value={category.name}
                                                    onPointerEnter={() => setHoveredCategory(category.name)}
                                                >
                                                    <div className="whitespace-normal text-sm">{category.name}</div>
                                                    {hoveredCategory === category.name && (
                                                    <div className="whitespace-normal text-xs text-muted-foreground mt-1">
                                                        {category.description}
                                                    </div>
                                                    )}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="specialty"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Especialidad</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Electrónica, GPS..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                            <Input placeholder="Número de contacto" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Notas Generales (Opcional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Comentarios adicionales sobre el técnico..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Tabla de Tarifas (€/hora)</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField name="rates.rateWorkHour" render={({ field }) => (
                            <FormItem><CurrencyInput field={field} label="Hora trabajo" tooltipText="Tarifa estándar por hora de trabajo efectivo en el proyecto." /></FormItem>
                        )} />
                        <FormField name="rates.rateTravelHour" render={({ field }) => (
                            <FormItem><CurrencyInput field={field} label="Hora desplaz." tooltipText="Tarifa por hora durante los desplazamientos hacia/desde el lugar de trabajo."/></FormItem>
                        )} />
                        <FormField name="rates.rateOvertimeWeekdayDay" render={({ field }) => (
                            <FormItem><CurrencyInput field={field} label="Extra laboral (día)" tooltipText="Tarifa para horas extra realizadas en día laborable, en horario diurno." /></FormItem>
                        )} />
                          <FormField name="rates.rateOvertimeWeekdayNight" render={({ field }) => (
                            <FormItem><CurrencyInput field={field} label="Extra laboral (noche)" tooltipText="Tarifa para horas extra realizadas en día laborable, en horario nocturno." /></FormItem>
                        )} />
                          <FormField name="rates.rateOvertimeWeekendDay" render={({ field }) => (
                            <FormItem><CurrencyInput field={field} label="Extra festivo (día)" tooltipText="Tarifa para horas extra realizadas en sábado, domingo o festivo, en horario diurno." /></FormItem>
                        )} />
                          <FormField name="rates.rateOvertimeWeekendNight" render={({ field }) => (
                            <FormItem><CurrencyInput field={field} label="Extra festivo (noche)" tooltipText="Tarifa para horas extra realizadas en sábado, domingo o festivo, en horario nocturno."/></FormItem>
                        )} />
                    </div>
                    <FormField name="rates.rateNotes" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas sobre Tarifas</FormLabel>
                            <FormControl><Textarea placeholder="Añade cualquier observación sobre las tarifas de este técnico..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </CardContent>
            </Card>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Técnico</Button>
        </div>
      </form>
    </Form>
  );
}
