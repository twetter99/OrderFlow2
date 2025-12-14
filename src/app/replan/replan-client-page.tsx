"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ReplanCard } from "@/components/replan/replan-card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReplanForm } from "@/components/replan/replan-form";
import type { Replanteo, Project, PlantillaInstalacion, Technician, InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { addReplanteo, updateReplanteo } from "./actions";

interface ReplanClientPageProps {
  replanteos: Replanteo[];
  projects: Project[];
  templates: PlantillaInstalacion[];
  technicians: Technician[];
  inventoryItems: InventoryItem[];
}

export function ReplanClientPage({
  replanteos: initialReplanteos,
  projects: initialProjects,
  templates: initialTemplates,
  technicians: initialTechnicians,
  inventoryItems: initialInventoryItems,
}: ReplanClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const replanteos = initialReplanteos;
  const projects = initialProjects;
  const templates = initialTemplates;
  const technicians = initialTechnicians;
  const inventoryItems = initialInventoryItems;

  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReplan, setSelectedReplan] = useState<Replanteo | null>(null);

  const filteredReplanteos = useMemo(() => {
    return replanteos.filter(r =>
      r.vehiculo_identificacion?.toLowerCase().includes(filter.toLowerCase()) ||
      r.matricula?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [replanteos, filter]);

  const handleAddClick = () => {
    setSelectedReplan(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (replan: Replanteo) => {
    setSelectedReplan(replan);
    setIsModalOpen(true);
  };

  const handleSave = async (values: any) => {
    try {
      if (selectedReplan) {
        const result = await updateReplanteo(selectedReplan.id, values);
        if (!result.success) throw new Error(result.error);
        toast({
          title: "Informe actualizado",
          description: `El informe para "${values.vehiculo_identificacion}" se ha actualizado.`,
        });
      } else {
        const result = await addReplanteo(values);
        if (!result.success) throw new Error(result.error);
        toast({
          title: "Informe creado",
          description: `El informe para "${values.vehiculo_identificacion}" se ha creado.`,
        });
      }
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving replan:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el informe de replanteo.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Informes de Replanteo</h1>
          <p className="text-muted-foreground">
            Documenta los detalles y desviaciones de cada instalación vehicular.
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Informe
        </Button>
      </div>
      
      <div className="mb-4">
        <Input 
          placeholder="Filtrar por identificación de vehículo o matrícula..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredReplanteos.map(replan => (
          <ReplanCard key={replan.id} replan={replan} onEdit={handleEditClick} />
        ))}
      </div>
      
      {filteredReplanteos.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No se encontraron informes de replanteo.</p>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedReplan ? "Editar Informe de Replanteo" : "Crear Nuevo Informe"}</DialogTitle>
          </DialogHeader>
          <ReplanForm 
            replan={selectedReplan}
            projects={projects}
            templates={templates}
            technicians={technicians}
            inventoryItems={inventoryItems}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
