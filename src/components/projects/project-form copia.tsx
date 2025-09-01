

"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useWatch } from "react-hook-form";
import Link from "next/link";
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
import type { Project, Client, User, Operador, Technician } from "@/lib/types";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Check, Users, UserSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import React from "react";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  clientId: z.string().min(1, "El cliente es obligatorio."),
  status: z.enum(["Planificado", "En Progreso", "Completado"]),
  operador_ids: z.array(z.string()).optional(),
  responsable_proyecto_id: z.string().optional(),
  equipo_tecnico_ids: z.array(z.string()).optional(),
  
  centro_coste: z.string().min(1, "El centro de coste es obligatorio."),

  startDate: z.date({ required_error: "La fecha de inicio es obligatoria." }),
  endDate: z.date({ required_error: "La fecha de fin es obligatoria." }),
  
  budget: z.coerce.number().nonnegative("El presupuesto no puede ser negativo.").optional(),
  spent: z.coerce.number().nonnegative("El gasto no puede ser negativo.").optional(),
  margen_previsto: z.coerce.number().min(0, "El margen no puede ser negativo.").optional(),
});

type ProjectFormValues = z.infer<typeof formSchema>;

interface ProjectFormProps {
  project?: Project | null;
  clients: Client[];
  users: User[];
  operadores: Operador[];
  technicians: Technician[];
  onSave: (values: ProjectFormValues) => void;
  onCancel: () => void;
}

const generateCostCenterCode = (projectName: string): string => {
    if (!projectName) return '';
    const randomNumber = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    const projectPart = projectName.replace(/\s+/g, '').toUpperCase().substring(0, 4).padEnd(4, 'X');
    const yearPart = new Date().getFullYear().toString().slice(-2);
    return `${randomNumber}-${projectPart}-${yearPart}`;
};


export function ProjectForm({ project, clients, users, operadores, technicians, onSave, onCancel }: ProjectFormProps) {
  const defaultValues = project
    ? {
        ...project,
        clientId: project.clientId || '',
        startDate: project.startDate ? new Date(project.startDate) : new Date(),
        endDate: project.endDate ? new Date(project.endDate) : new Date(),
        margen_previsto: project.margen_previsto ? project.margen_previsto * 100 : 0, // Convert to percentage for display
        equipo_tecnico_ids: project.equipo_tecnico_ids ?? [],
        operador_ids: project.operador_ids ?? [],
        budget: project.budget ?? 0,
        spent: project.spent ?? 0,
        responsable_proyecto_id: project.responsable_proyecto_id ?? undefined,
      }
    : {
        name: "",
        clientId: "",
        status: "Planificado" as const,
        operador_ids: [],
        responsable_proyecto_id: undefined,
        equipo_tecnico_ids: [],
        centro_coste: "",
        startDate: new Date(),
        endDate: new Date(),
        budget: 0,
        spent: 0,
        margen_previsto: 0,
      };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const projectName = useWatch({ control: form.control, name: 'name' });

  React.useEffect(() => {
    if (!project) {
        const generatedCode = generateCostCenterCode(projectName);
        form.setValue('centro_coste', generatedCode, { shouldValidate: true });
    }
  }, [projectName, form, project]);


  function onSubmit(values: ProjectFormValues) {
    onSave({
      ...values,
      margen_previsto: values.margen_previsto ? values.margen_previsto / 100 : 0 // Convert back to decimal before saving
    });
  }

  const projectManagers = React.useMemo(() => users.filter(u => u.role === 'Administrador'), [users]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="text-lg font-medium">Información General</h3>
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nombre del Proyecto</FormLabel>
                <FormControl>
                    <Input placeholder="p. ej., Actualización Flota A" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        </div>

        <div className="space-y-4 p-4 border rounded-lg">
             <h3 className="text-lg font-medium">Asignación de Personal</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <FormField
                    control={form.control}
                    name="responsable_proyecto_id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Responsable del Proyecto</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={projectManagers.length === 0}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={projectManagers.length === 0 ? "No hay responsables" : "Selecciona..."} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {projectManagers.map(u => <SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="operador_ids"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Operadores Externos</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant="outline" role="combobox" className={cn("w-full justify-between h-auto min-h-10", !field.value?.length && "text-muted-foreground")}>
                                    <div className="flex gap-1 flex-wrap">
                                        {field.value && field.value.length > 0 ? field.value.map(id => (<Badge variant="secondary" key={id}>{operadores.find(o => o.id === id)?.name}</Badge>)) : "Seleccionar..."}
                                    </div>
                                    <UserSquare className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command><CommandInput placeholder="Buscar operador..." /><CommandList><CommandEmpty>No se encontraron operadores.</CommandEmpty><CommandGroup>
                                    {operadores.map(op => (<CommandItem key={op.id} onSelect={() => { const s = field.value || []; field.onChange(s.includes(op.id) ? s.filter(id => id !== op.id) : [...s, op.id]);}}>
                                    <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", (field.value || []).includes(op.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}><Check className="h-4 w-4" /></div>
                                    <span>{op.name}</span></CommandItem>))}
                                </CommandGroup></CommandList></Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="equipo_tecnico_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipo Técnico Interno</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" role="combobox" className={cn("w-full justify-between h-auto min-h-10", !field.value?.length && "text-muted-foreground")}>
                                <div className="flex gap-1 flex-wrap">
                                    {field.value && field.value.length > 0 ? field.value.map(id => (<Badge variant="secondary" key={id}>{technicians.find(t => t.id === id)?.name}</Badge>)) : "Seleccionar..."}
                                </div>
                                <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command><CommandInput placeholder="Buscar técnico..." /><CommandList><CommandEmpty>No se encontraron técnicos.</CommandEmpty><CommandGroup>
                                {technicians.map(tech => (<CommandItem key={tech.id} onSelect={() => { const s = field.value || []; field.onChange(s.includes(tech.id) ? s.filter(id => id !== tech.id) : [...s, tech.id]);}}>
                                <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", (field.value || []).includes(tech.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}><Check className="h-4 w-4" /></div>
                                <span>{tech.name}</span></CommandItem>))}
                            </CommandGroup></CommandList></Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </div>
        </div>

        <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="text-lg font-medium">Plazos y Estado</h3>
            <div className="grid grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Fecha de Inicio Prevista</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                                )}
                            >
                                {field.value ? (
                                format(field.value, "PPP", { locale: es })
                                ) : (
                                <span>Elige una fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Fecha de Fin Prevista</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                                )}
                            >
                                {field.value ? (
                                format(field.value, "PPP", { locale: es })
                                ) : (
                                <span>Elige una fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un estado" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Planificado">Planificado</SelectItem>
                            <SelectItem value="En Progreso">En Progreso</SelectItem>
                            <SelectItem value="Completado">Completado</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
         </div>
        
        <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="text-lg font-medium">Información Financiera (Opcional)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Presupuesto (€)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="50000" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : +e.target.value)} onFocus={(e) => e.target.select()} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="spent"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Gasto (€)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="23000" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : +e.target.value)} onFocus={(e) => e.target.select()} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="margen_previsto"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Margen Previsto (%)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="15" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : +e.target.value)} onFocus={(e) => e.target.select()} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="centro_coste"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Centro de Coste</FormLabel>
                        <FormControl>
                        <Input placeholder="Se genera automáticamente" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        </div>


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
