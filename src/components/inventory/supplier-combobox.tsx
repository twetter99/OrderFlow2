

"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle, History } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Supplier } from "@/lib/types"

interface SupplierComboboxProps {
  suppliers: Supplier[];
  recentSupplierIds: string[];
  value: string;
  onChange: (supplierName: string, supplierId: string | null) => void;
  onAddNew: () => void;
  disabled?: boolean;
}

export function SupplierCombobox({ suppliers, recentSupplierIds, value, onChange, onAddNew, disabled }: SupplierComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (supplier: Supplier) => {
    onChange(supplier.name, supplier.id);
    setOpen(false);
  }

  const recentSuppliers = React.useMemo(() => {
    // We get the full ordered list, so we just need to find the ones marked as recent
    return suppliers.filter(s => recentSupplierIds.includes(s.id));
  }, [recentSupplierIds, suppliers]);

  const otherSuppliers = React.useMemo(() => {
    return suppliers.filter(s => !recentSupplierIds.includes(s.id));
  }, [recentSupplierIds, suppliers]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value
            ? suppliers.find((supplier) => supplier.name.toLowerCase() === value.toLowerCase())?.name
            : "Selecciona un proveedor..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{width: 'var(--radix-popover-trigger-width)'}}>
        <Command>
          <CommandInput placeholder="Buscar proveedor..." />
          <CommandList>
            <CommandEmpty>No se encontró ningún proveedor.</CommandEmpty>
            
            {recentSuppliers.length > 0 && (
              <CommandGroup heading="Proveedores Frecuentes">
                {recentSuppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={supplier.name}
                    onSelect={() => handleSelect(supplier)}
                    className="flex items-center gap-2"
                  >
                    <Check className={cn("h-4 w-4", value.toLowerCase() === supplier.name.toLowerCase() ? "opacity-100" : "opacity-0")}/>
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading={recentSuppliers.length > 0 ? "Todos los proveedores" : ""}>
              {otherSuppliers.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={supplier.name}
                  onSelect={() => handleSelect(supplier)}
                  className="flex items-center gap-2"
                >
                  <Check className={cn("h-4 w-4", value.toLowerCase() === supplier.name.toLowerCase() ? "opacity-100" : "opacity-0")}/>
                  <span>{supplier.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />
            <CommandGroup>
                 <CommandItem
                    onSelect={() => {
                        onAddNew();
                        setOpen(false);
                    }}
                    className="cursor-pointer"
                 >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Añadir nuevo proveedor</span>
                </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
