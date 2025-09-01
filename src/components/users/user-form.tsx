
"use client";

import React from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import type { User, Technician, Supervisor } from "@/lib/types";
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PasswordInput } from '../shared/password-input';

const modules = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'projects', label: 'Gestor de Proyectos' },
    { id: 'installation-templates', label: 'Plantillas de Instalación' },
    { id: 'replan', label: 'Informes de Replanteo' },
    { id: 'resource-planning', label: 'Planificación de Recursos' },
    { id: 'travel-planning', label: 'Planificación Desplazamientos' },
    { id: 'inventory', label: 'Control de Stock' },
    { id: 'locations', label: 'Almacenes' },
    { id: 'receptions', label: 'Recepción de Stock' },
    { id: 'despatches', label: 'Salidas de Material' },
    { id: 'purchasing', label: 'Órdenes de Compra' },
    { id: 'completed-orders', label: 'Órdenes Finalizadas' },
    { id: 'suppliers', label: 'Directorio de Proveedores' },
    { id: 'supplier-invoices', label: 'Gestión de Facturas' },
    { id: 'payments', label: 'Gestión de Pagos' },
    { id: 'project-tracking', label: 'Seguimiento y Control' },
    { id: 'reports', label: 'Reportes' },
    { id: 'documentation', label: 'Documentación' },
    { id: 'ai-assistant', label: 'Asistente IA' },
    { id: 'clients', label: 'Directorio de Clientes' },
    { id: 'operadores', label: 'Operadores' },
    { id: 'technicians', label: 'Técnicos' },
    { id: 'supervisores', label: 'Supervisores' },
    { id: 'users', label: 'Gestión de Accesos' },
    { id: 'approval-flows', label: 'Flujos de Aprobación' },
    { id: 'reminders', label: 'Recordatorios' },
    { id: 'settings', label: 'Configuración General' },
] as const;

const passwordSchema = z.string()
  .min(6, "La contraseña debe tener al menos 6 caracteres.")
  .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, "Debe contener letras y números.")
  .refine(s => !/(.)\1{5,}/.test(s), "La contraseña no puede tener 6 caracteres idénticos.")
  .refine(s => !["123456", "abcdef"].includes(s), "La contraseña es demasiado simple.");

const baseFormSchema = z.object({
  personId: z.string().min(1, "Debes vincular el usuario a un técnico o supervisor existente."),
  name: z.string().min(1, "El nombre es obligatorio."),
  email: z.string().email("Debe ser un correo electrónico válido."),
  phone: z.string().optional(),
  permissions: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Debes seleccionar al menos un permiso.",
  }),
});

// Esquema para crear un usuario (la contraseña es obligatoria)
const createUserSchema = baseFormSchema.extend({
  password: passwordSchema,
});

// Esquema para editar un usuario (la contraseña es opcional)
const updateUserSchema = baseFormSchema.extend({
  password: passwordSchema.optional().or(z.literal('')),
});


interface UserFormProps {
  user?: User | null;
  technicians: Technician[];
  supervisors: Supervisor[];
  onSave: (values: any) => void;
  onCancel: () => void;
}


export function UserForm({ user, technicians, supervisors, onSave, onCancel }: UserFormProps) {
  
  const isEditing = !!user;

  const formSchema = isEditing ? updateUserSchema : createUserSchema;
  type UserFormValues = z.infer<typeof formSchema>;

  const availablePeople = React.useMemo(() => {
    const techOptions = technicians.map(t => ({ id: t.id, name: t.name, email: t.email, phone: t.phone, role: 'Técnico' }));
    const supOptions = supervisors.map(s => ({ id: s.id, name: s.name, email: s.email, phone: s.phone, role: 'Supervisor' }));
    return [...techOptions, ...supOptions];
  }, [technicians, supervisors]);

  const defaultValues = user
    ? { 
        ...user,
        personId: user.personId || user.uid,
        phone: user.phone ?? '',
        permissions: user.permissions || [],
        password: '', // La contraseña nunca se carga, solo se puede cambiar
      }
    : {
        personId: "",
        name: "",
        email: "",
        phone: "",
        permissions: [],
        password: "",
      };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const watchedPermissions = useWatch({
    control: form.control,
    name: 'permissions',
  });

  const allModuleIds = modules.map(m => m.id);
  const areAllSelected = watchedPermissions?.length === allModuleIds.length;

  const handleSelectAllToggle = () => {
    if (areAllSelected) {
      form.setValue('permissions', [], { shouldValidate: true });
    } else {
      form.setValue('permissions', allModuleIds, { shouldValidate: true });
    }
  };

  const handlePersonChange = (personId: string) => {
    const selectedPerson = availablePeople.find(p => p.id === personId);
    if (selectedPerson) {
        form.setValue('name', selectedPerson.name);
        form.setValue('email', selectedPerson.email || '');
        form.setValue('phone', selectedPerson.phone || '');
    }
  }

  function onSubmit(values: UserFormValues) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Información del Usuario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 {!isEditing && (
                 <FormField
                    control={form.control}
                    name="personId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Vincular Usuario a</FormLabel>
                        <Select
                            onValueChange={(value) => {
                                field.onChange(value);
                                handlePersonChange(value);
                            }}
                            defaultValue={field.value}
                            disabled={availablePeople.length === 0}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={availablePeople.length > 0 ? "Selecciona un técnico o supervisor..." : "No hay personal disponible"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {availablePeople.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.role})</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 )}
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                        <Input placeholder="Se rellena al vincular" {...field} disabled={true} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Correo Electrónico de Acceso</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="Se rellena al vincular" {...field} disabled={isEditing}/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                             <FormItem>
                                <FormLabel>Contraseña de Acceso</FormLabel>
                                <FormControl>
                                <PasswordInput
                                    {...field}
                                    onValueChange={field.onChange}
                                    isOptional={isEditing}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                                <Input placeholder="Se rellena al vincular" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg">Permisos de Acceso a Módulos</CardTitle>
                        <CardDescription>
                            Selecciona todos los módulos a los que este usuario tendrá acceso.
                        </CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleSelectAllToggle}>
                        {areAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                 <FormField
                    control={form.control}
                    name="permissions"
                    render={() => (
                        <FormItem>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {modules.map((item) => (
                            <FormField
                                key={item.id}
                                control={form.control}
                                name="permissions"
                                render={({ field }) => {
                                return (
                                    <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                            ? field.onChange([...(field.value || []), item.id])
                                            : field.onChange(
                                                (field.value || [])?.filter(
                                                (value) => value !== item.id
                                                )
                                            )
                                        }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        {item.label}
                                    </FormLabel>
                                    </FormItem>
                                )
                                }}
                            />
                            ))}
                        </div>
                        <FormMessage className="pt-4"/>
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Usuario</Button>
        </div>
      </form>
    </Form>
  );
}
