"use client";

import React, { useState, useMemo } from "react";
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
import { ProjectForm } from "@/components/projects/project-form";
import type { Project, Client, User, Operador, Technician } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { addProject, updateProject, deleteProject } from "./actions";

interface ProjectsClientPageProps {
  initialProjects: Project[];
  clients: Client[];
  users: User[];
  operadores: Operador[];
  technicians: Technician[];
}

export function ProjectsClientPage({
  initialProjects,
  clients,
  users,
  operadores,
  technicians,
}: ProjectsClientPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Actualizar projects cuando cambien los initialProjects
  React.useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const filteredProjects = useMemo(() => {
    const clientMap = new Map(clients.map(c => [c.id, c.name]));
    return projects
      .map(p => ({ ...p, clientName: clientMap.get(p.clientId) || 'Cliente Desconocido' }))
      .filter(project =>
        project.name.toLowerCase().includes(filter.toLowerCase()) ||
        project.clientName.toLowerCase().includes(filter.toLowerCase())
      );
  }, [projects, filter, clients]);

  const handleAddClick = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setLoading(true);
    
    const result = await deleteProject(projectToDelete.id);
    
    if (result.success) {
      toast({
        title: "Proyecto eliminado",
        description: `El proyecto "${projectToDelete.name}" ha sido eliminado.`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.message || "No se pudo eliminar el proyecto."
      });
    }
    
    setLoading(false);
    setIsDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    
    try {
      const dataToSave = { ...values };

      if (!dataToSave.responsable_proyecto_id) {
        delete dataToSave.responsable_proyecto_id;
      }

      let result;
      if (selectedProject) {
        result = await updateProject(selectedProject.id, dataToSave);
        if (result.success) {
          toast({
            title: "Proyecto actualizado",
            description: `El proyecto "${values.name}" se ha actualizado correctamente.`,
          });
        }
      } else {
        result = await addProject(dataToSave);
        if (result.success) {
          toast({
            title: "Proyecto creado",
            description: `El proyecto "${values.name}" se ha creado correctamente.`,
          });
        }
      }

      if (result.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "No se pudo guardar el proyecto.",
        });
      }
    } catch (error) {
      console.error("Error saving project:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el proyecto.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any): string => {
    if (!date) return 'Sin fecha';

    try {
      if (date?.toDate) {
        return date.toDate().toLocaleDateString('es-ES');
      }
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('es-ES');
      }
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString('es-ES');
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }

    return 'Fecha inválida';
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Gestión de Proyectos</h1>
          <p className="text-muted-foreground">
            Crea, edita y supervisa todos los proyectos de la empresa.
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Proyecto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Proyectos</CardTitle>
          <CardDescription>
            Busca y gestiona tus proyectos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Filtrar por nombre o cliente..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Proyecto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Fin</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{(project as any).clientName}</TableCell>
                  <TableCell>
                    <Badge variant={project.status === 'Completado' ? 'default' : (project.status === 'En Progreso' ? 'secondary' : 'outline')}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(project.endDate)}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEditClick(project)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTrigger(project)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No se encontraron proyectos.
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
            <DialogTitle>{selectedProject ? "Editar Proyecto" : "Crear Nuevo Proyecto"}</DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={selectedProject}
            clients={clients}
            users={users}
            operadores={operadores}
            technicians={technicians}
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el proyecto "{projectToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={loading}>
              {loading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
