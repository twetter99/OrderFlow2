
"use client";

import type { StatusHistoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle, Dot } from "lucide-react";

interface OrderStatusHistoryProps {
  history: StatusHistoryEntry[];
}

export function OrderStatusHistory({ history }: OrderStatusHistoryProps) {
    
  if (!history || history.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No hay historial de estados para este pedido.
      </div>
    );
  }

  const sortedHistory = [...history].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

  return (
    <div className="mt-4 space-y-6">
      {sortedHistory.map((entry, index) => {
        const isLast = index === sortedHistory.length - 1;
        const isCurrent = index === 0;

        return (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                  "flex items-center justify-center rounded-full h-8 w-8",
                  isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                 {isCurrent ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </div>
              {!isLast && (
                <div className="w-px h-full bg-border mt-1" />
              )}
            </div>
            <div className="flex-1 pb-4">
                <p className={cn(
                    "font-semibold",
                    isCurrent && "text-primary"
                )}>
                    {entry.status}
                </p>
                <p className="text-sm text-muted-foreground">
                    {new Date(entry.date as string).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
