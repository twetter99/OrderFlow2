"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, X } from "lucide-react";
import type { AnalyticsDateRange } from "@/lib/types";
import type { GroupBy } from "@/app/inventory-analytics/actions";
import { format, subDays, startOfMonth, subMonths } from "date-fns";

interface Props {
  dateRange: AnalyticsDateRange;
  onDateRangeChange: (range: AnalyticsDateRange) => void;
  groupBy?: GroupBy;
  onGroupByChange?: (g: GroupBy) => void;
  showGroupBy?: boolean;
}

const presets: { label: string; from: () => string; to: () => string }[] = [
  {
    label: "Últimos 7 días",
    from: () => format(subDays(new Date(), 6), "yyyy-MM-dd"),
    to: () => format(new Date(), "yyyy-MM-dd"),
  },
  {
    label: "Este mes",
    from: () => format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: () => format(new Date(), "yyyy-MM-dd"),
  },
  {
    label: "Últimos 3 meses",
    from: () => format(subMonths(startOfMonth(new Date()), 2), "yyyy-MM-dd"),
    to: () => format(new Date(), "yyyy-MM-dd"),
  },
  {
    label: "Últimos 6 meses",
    from: () => format(subMonths(startOfMonth(new Date()), 5), "yyyy-MM-dd"),
    to: () => format(new Date(), "yyyy-MM-dd"),
  },
  {
    label: "Este año",
    from: () => format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"),
    to: () => format(new Date(), "yyyy-MM-dd"),
  },
];

export function DateRangeFilter({ dateRange, onDateRangeChange, groupBy, onGroupByChange, showGroupBy = false }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-end gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground mb-2.5" />
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            className="w-36 h-8 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            className="w-36 h-8 text-sm"
          />
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onDateRangeChange({ from: p.from(), to: p.to() })}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {showGroupBy && onGroupByChange && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Agrupar por</Label>
          <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Día</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
