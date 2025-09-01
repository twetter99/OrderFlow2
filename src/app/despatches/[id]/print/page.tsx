
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DeliveryNote, Client, Project, InventoryItem, Location } from '@/lib/types';
import { Printer, Building, User, FolderKanban } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertTimestampsToISO } from '@/lib/utils';
import { getData } from '@/lib/data';

interface EnrichedDeliveryNote extends DeliveryNote {
  client?: Client;
  project?: Project;
  location?: Location;
  enrichedItems: {
    name: string;
    sku: string;
    quantity: number;
  }[];
}

export default function DespatchPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [note, setNote] = useState<EnrichedDeliveryNote | null>(null);

  useEffect(() => {
    const fetchNote = async () => {
        if (!id) return;

        const noteRef = doc(db, 'deliveryNotes', id);
        const noteSnap = await getDoc(noteRef);
        
        if (!noteSnap.exists()) return;
        
        const foundNote = convertTimestampsToISO({ id: noteSnap.id, ...noteSnap.data() }) as DeliveryNote;

        const [clients, projects, inventory, locations] = await Promise.all([
            getData<Client>('clients', []),
            getData<Project>('projects', []),
            getData<InventoryItem>('inventory', []),
            getData<Location>('locations', []),
        ]);
        
        const client = clients.find((c) => c.id === foundNote.clientId);
        const project = projects.find((p) => p.id === foundNote.projectId);
        const location = locations.find((l) => l.id === foundNote.locationId);
        const enrichedItems = foundNote.items.map(item => {
            const inventoryItem = inventory.find(i => i.id === item.itemId);
            return {
            name: inventoryItem?.name || 'Artículo Desconocido',
            sku: inventoryItem?.sku || 'N/A',
            quantity: item.quantity
            };
        });

        setNote({ ...foundNote, client, project, location, enrichedItems });
    }
    fetchNote();
  }, [id]);

  useEffect(() => {
    // Automatically trigger print dialog when component mounts
    if (note) {
        setTimeout(() => window.print(), 500);
    }
  }, [note])

  if (!note) {
    return <div className="p-10 text-center">Cargando albarán...</div>;
  }
  
  const handlePrint = () => {
    window.print();
  }

  return (
    <div className="bg-white text-black p-8 font-sans">
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
      `}</style>
      
      <header className="flex justify-between items-start pb-4 border-b-2 border-black">
        <div>
          <Image src="/images/logo.png" alt="OrderFlow Logo" width={180} height={40} />
          <div className="mt-2 text-sm">
            <p>Moreras, 1, 28350 Ciempozuelos (Madrid)</p>
            <p>CIF: B05393632</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold uppercase">Albarán de Salida</h2>
          <p className="text-lg font-mono">{note.id}</p>
          <p className="text-sm">Fecha: {new Date(note.date).toLocaleDateString('es-ES')}</p>
        </div>
      </header>
      
      <section className="grid grid-cols-2 gap-8 my-8">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <h3 className="text-sm uppercase font-bold text-gray-500 mb-2 flex items-center gap-2">
                <Building className="h-4 w-4"/>
                Cliente
            </h3>
            <p className="font-semibold text-base">{note.client?.name}</p>
            <div className="text-sm text-gray-700 mt-2">
                <p className="flex items-center gap-2"><User className="h-3 w-3"/>{note.client?.contactPerson}</p>
                <p>{note.client?.email}</p>
                <p>{note.client?.phone}</p>
            </div>
        </div>
         <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <h3 className="text-sm uppercase font-bold text-gray-500 mb-2 flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Proyecto de Destino
            </h3>
            <p className="font-semibold text-base">{note.project?.name}</p>
            <p className="text-sm text-gray-700">ID: {note.project?.id}</p>
            <h3 className="text-sm uppercase font-bold text-gray-500 mt-4 mb-2">Almacén de Origen</h3>
            <p className="font-semibold">{note.location?.name}</p>
        </div>
      </section>

      <main className="my-8">
        <Table>
            <TableHeader>
                <TableRow className="bg-gray-100">
                    <TableHead className="text-black font-bold">SKU</TableHead>
                    <TableHead className="text-black font-bold">Descripción del Artículo</TableHead>
                    <TableHead className="text-right text-black font-bold">Cantidad</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {note.enrichedItems.map((item, index) => (
                    <TableRow key={index}>
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </main>

      <footer className="mt-16 pt-8 border-t-2 border-black">
        <div className="grid grid-cols-2 gap-8">
            <div>
                <h3 className="text-sm uppercase font-bold text-gray-500 mb-2">Observaciones</h3>
                <div className="border-b border-gray-400 h-8"></div>
                <div className="border-b border-gray-400 h-8 mt-2"></div>
            </div>
             <div>
                <h3 className="text-sm uppercase font-bold text-gray-500 mb-2">Recibido por</h3>
                <div className="border-b border-gray-400 h-8 mt-12"></div>
                <p className="text-xs text-center">Firma y Fecha</p>
            </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-8">Gracias por su confianza en WINFIN.</p>
      </footer>
      
      <div className="no-print fixed bottom-4 right-4">
        <Button onClick={handlePrint}>
            <Printer className="mr-2"/>
            Imprimir
        </Button>
      </div>
    </div>
  );
}
