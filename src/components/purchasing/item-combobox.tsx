

"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { InventoryItem } from "@/lib/types"

interface ItemComboboxProps {
  inventoryItems: InventoryItem[];
  value: string;
  onChange: (item: InventoryItem | { name: string; sku: string; unitCost: number; unit: string; id: undefined; type: 'Material' | 'Servicio' }) => void;
  disabled?: boolean;
}

export function ItemCombobox({ inventoryItems, value, onChange, disabled }: ItemComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const handleSelect = (item: InventoryItem) => {
    onChange(item);
    setSearchValue(""); // Reset search value
    setOpen(false);
  };
  
  const handleCreateNew = (inputValue: string) => {
     const trimmedValue = inputValue.trim();
     if (trimmedValue) {
        onChange({ name: trimmedValue, sku: 'NUEVO', unitCost: 0, unit: 'ud', id: undefined, type: 'Material' });
     }
     setSearchValue(""); // Reset search value
     setOpen(false);
  }

  React.useEffect(() => {
    // When the popover is closed, we want to clear the search value.
    if (!open) {
      setSearchValue("");
    }
  }, [open]);
  
  const filteredItems = React.useMemo(() => {
    if (!searchValue) return inventoryItems;
    return inventoryItems.filter(item => 
      item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [searchValue, inventoryItems]);
  
  const showCreateNew = searchValue.trim() && !filteredItems.some(item => item.name.toLowerCase() === searchValue.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          data-field-name="itemNameTrigger"
        >
          <span className="truncate">
            {value ? value : "Selecciona o escribe un artículo..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{width: 'var(--radix-popover-trigger-width)'}}>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar o crear artículo..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
                {searchValue.trim() ? (
                     <CommandItem
                        onSelect={() => handleCreateNew(searchValue)}
                        className="cursor-pointer"
                    >
                        Crear nuevo artículo: "{searchValue}"
                    </CommandItem>
                ) : "No se encontraron artículos."}
            </CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.sku} - ${item.name}`}
                  onSelect={() => handleSelect(item)}
                  className="flex justify-between items-start gap-2"
                >
                    <div className="flex items-start gap-2">
                        <Check
                            className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0 mt-1",
                            value === item.name ? "opacity-100" : "opacity-0"
                            )}
                        />
                        <div className="flex-grow">
                            <span className="font-medium">{item.name}</span>
                            <div className="text-xs text-muted-foreground font-mono">
                                {item.sku}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Coste: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.unitCost)} / {item.unit}
                            </div>
                        </div>
                    </div>
                </CommandItem>
              ))}
              {showCreateNew && (
                  <CommandItem
                      onSelect={() => handleCreateNew(searchValue)}
                      className="cursor-pointer"
                  >
                     Crear nuevo artículo: "{searchValue.trim()}"
                  </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
