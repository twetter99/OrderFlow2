"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TemplateForm } from "@/components/installation-templates/template-form";
import type { PlantillaInstalacion, InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { addInstallationTemplate, updateInstallationTemplate, deleteInstallationTemplate } from "./actions";

interface InstallationTemplatesClientPageProps {
  templates: PlantillaInstalacion[];
  inventoryItems: InventoryItem[];
}

export function InstallationTemplatesClientPage({
  templates: initialTemplates,
  inventoryItems: initialInventoryItems,
}: InstallationTemplatesClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const templates = initialTemplates;
  const inventoryItems = initialInventoryItems;

  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PlantillaInstalacion | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<PlantillaInstalacion | null>(null);

  const filteredTemplates = useMemo(() => {
    return templates.filter(template =>
      template.nombre.toLowerCase().includes(filter.toLowerCase()) ||
      template.tipo_vehiculo.toLowerCase().includes(filter.toLowerCase())
    );
  }, [templates, filter]);

  const handleAddClick = () => {
    setSelectedTemplate(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (template: PlantillaInstalacion) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (template: PlantillaInstalacion) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      const result = await deleteInstallationTemplate(templateToDelete.id);
      if (!result.success) throw new Error(result.error);
      toast({
        variant: "destructive",
        title: "Plantilla eliminada",
        description: `La plantilla "${templateToDelete.nombre}" ha sido eliminada.`,
      });
      router.refresh();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la plantilla."
      });
    }
    setIsDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const handleSave = async (values: any) => {
    try {
      if (selectedTemplate) {
        const result = await updateInstallationTemplate(selectedTemplate.id, values);
        if (!result.success) throw new Error(result.error);
        toast({
          title: "Plantilla actualizada",
          description: `La plantilla "${values.nombre}" se ha actualizado correctamente.`,
        });
      } else {
        const result = await addInstallationTemplate(values);
        if (!result.success) throw new Error(result.error);
        toast({
          title: "Plantilla creada",
          description: `La plantilla "${values.nombre}" se ha creado correctamente.`,
        });
      }
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la plantilla.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Plantillas de Instalación</h1>
          <p className="text-muted-foreground">
            Estandariza tus trabajos definiendo materiales y tiempos para cada tipo de instalación.
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Plantilla
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Plantillas</CardTitle>
          <CardDescription>
            Busca y gestiona tus plantillas de instalación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Filtrar por nombre o tipo de vehículo..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo de Vehículo</TableHead>
                <TableHead>Tiempo Estimado (h)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.nombre}</TableCell>
                  <TableCell className="capitalize">{template.tipo_vehiculo}</TableCell>
                  <TableCell>{template.tiempo_estimado_horas}</TableCell>
                  <TableCell>
                    <Badge variant={template.activa ? 'default' : 'secondary'}>
                      {template.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditClick(template)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTrigger(template)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTemplates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No se encontraron plantillas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Editar Plantilla" : "Crear Nueva Plantilla"}</DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={selectedTemplate}
            inventoryItems={inventoryItems}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la plantilla "{templateToDelete?.nombre}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
