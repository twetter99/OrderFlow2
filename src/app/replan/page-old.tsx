
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";

export default function ReplanPage() {
  const { toast } = useToast();
  const [replanteos, setReplanteos] = useState<Replanteo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<PlantillaInstalacion[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReplan, setSelectedReplan] = useState<Replanteo | null>(null);

  useEffect(() => {
    const unsubReplanteos = onSnapshot(collection(db, "replanteos"), (snapshot) => {
      setReplanteos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Replanteo)));
      setLoading(false);
    });
    const unsubProjects = onSnapshot(collection(db, "projects"), (snapshot) => setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project))));
    const unsubTemplates = onSnapshot(collection(db, "installationTemplates"), (snapshot) => setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantillaInstalacion))));
    const unsubTechnicians = onSnapshot(collection(db, "technicians"), (snapshot) => setTechnicians(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician))));
    const unsubInventory = onSnapshot(collection(db, "inventory"), (snapshot) => setInventoryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem))));
    
    return () => {
      unsubReplanteos();
      unsubProjects();
      unsubTemplates();
      unsubTechnicians();
      unsubInventory();
    };
  }, []);

  const filteredReplanteos = useMemo(() => {
    return replanteos.filter(r =>
      r.vehiculo_identificacion.toLowerCase().includes(filter.toLowerCase()) ||
      r.matricula.toLowerCase().includes(filter.toLowerCase())
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
        const docRef = doc(db, "replanteos", selectedReplan.id);
        await updateDoc(docRef, values);
        toast({
          title: "Informe actualizado",
          description: `El informe para "${values.vehiculo_identificacion}" se ha actualizado.`,
        });
      } else {
        await addDoc(collection(db, "replanteos"), values);
        toast({
          title: "Informe creado",
          description: `El informe para "${values.vehiculo_identificacion}" se ha creado.`,
        });
      }
      setIsModalOpen(false);
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
      
      {loading ? (
        <p>Cargando informes...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredReplanteos.map(replan => (
            <ReplanCard key={replan.id} replan={replan} onEdit={handleEditClick} />
          ))}
        </div>
      )}
      
      {!loading && filteredReplanteos.length === 0 && (
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
