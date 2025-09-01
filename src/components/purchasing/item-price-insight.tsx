
"use client";

import { useEffect, useState, useTransition } from "react";
import { useDebounce } from "use-debounce";
import { getPriceInsight } from "@/lib/actions/ai-assistant";
import type { CheckItemPriceOutput } from "@/ai/flows/check-item-price";
import { AlertCircle, Bot, Loader2 } from "lucide-react";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
  

interface ItemPriceInsightProps {
  itemName: string;
  itemPrice: number;
  supplierName: string;
}

export function ItemPriceInsight({ itemName, itemPrice, supplierName }: ItemPriceInsightProps) {
  const [insight, setInsight] = useState<CheckItemPriceOutput | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [debouncedItemName] = useDebounce(itemName, 500);
  const [debouncedItemPrice] = useDebounce(itemPrice, 500);
  const [debouncedSupplierName] = useDebounce(supplierName, 500);

  useEffect(() => {
    if (debouncedItemName && debouncedItemPrice > 0 && debouncedSupplierName) {
      startTransition(async () => {
        const result = await getPriceInsight(debouncedItemName, debouncedItemPrice, debouncedSupplierName);
        if (result.insight?.isPriceTooHigh) {
            setInsight(result.insight);
            setIsOpen(true);
        } else {
            setInsight(null);
            setIsOpen(false);
        }
      });
    } else {
        setInsight(null);
        setIsOpen(false);
    }
  }, [debouncedItemName, debouncedItemPrice, debouncedSupplierName]);
  
  if (isPending) {
    return <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1"><Loader2 className="h-3 w-3 animate-spin"/> Analizando...</div>
  }

  if (!insight) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1 text-destructive hover:bg-destructive/10">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span className="text-xs">Precio elevado detectado</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none flex items-center gap-2"><Bot className="h-4 w-4 text-primary" />Análisis de IA</h4>
            <p className="text-sm text-muted-foreground">
                El precio de <strong>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(itemPrice)}</strong> parece alto.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Precio promedio</span>
              <span className="font-semibold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(insight.averagePrice)}</span>
            </div>
            {insight.suggestedSuppliers.length > 0 && (
                <div className="space-y-1 pt-2">
                    <span className="text-sm text-muted-foreground">Proveedores alternativos:</span>
                    <div className="flex flex-wrap gap-1">
                        {insight.suggestedSuppliers.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
