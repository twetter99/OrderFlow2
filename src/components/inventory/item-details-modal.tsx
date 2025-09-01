

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InventoryItem } from "@/lib/types";
import { Boxes } from "lucide-react";

interface ItemDetailsModalProps {
  item: InventoryItem;
  allInvetoryItems: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function ItemDetailsModal({ item, allInvetoryItems, isOpen, onClose }: ItemDetailsModalProps) {
  if (!item || item.type !== 'composite') {
    return null;
  }

  const componentsWithDetails = item.components?.map(c => {
    const detail = allInvetoryItems.find(i => i.id === c.itemId);
    return {
      ...c,
      name: detail?.name || 'Artículo Desconocido',
      sku: detail?.sku || 'N/A',
    };
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-6 w-6" />
            Componentes de {item.name}
          </DialogTitle>
          <DialogDescription>
            Lista de materiales (BOM) para el artículo {item.sku}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU Componente</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Cantidad Requerida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {componentsWithDetails?.map(component => (
                <TableRow key={component.itemId}>
                  <TableCell>{component.sku}</TableCell>
                  <TableCell className="font-medium">{component.name}</TableCell>
                  <TableCell className="text-right font-bold">{component.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
