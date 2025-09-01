

"use client";

import * as React from "react";
import { Check, X, ChevronsUpDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "./badge";

export type OptionType = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: OptionType[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
  closeOnSelect?: boolean;
  triggerIcon?: LucideIcon;
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
    ({
        options,
        selected,
        onChange,
        className,
        placeholder = "Selecciona opciones...",
        closeOnSelect = false,
        triggerIcon: TriggerIcon = ChevronsUpDown,
        ...props
    }, ref) => {
    const [open, setOpen] = React.useState(false);

    const handleUnselect = (value: string) => {
        onChange(selected.filter((s) => s !== value));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between h-auto min-h-10", className)}
            onClick={() => setOpen(!open)}
            {...props}
            >
            <div className="flex gap-1 flex-wrap">
                {selected.length > 0 ? (
                selected.map((value) => {
                    const option = options.find(o => o.value === value);
                    return (
                        <Badge
                            variant="secondary"
                            key={value}
                            className="mr-1"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent opening popover
                                handleUnselect(value);
                            }}
                            >
                            {option?.label || value}
                            <X className="h-3 w-3 ml-1" />
                        </Badge>
                    )
                })
                ) : (
                <span className="text-muted-foreground">{placeholder}</span>
                )}
            </div>
            <TriggerIcon className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" style={{width: 'var(--radix-popover-trigger-width)'}}>
            <Command>
            <CommandInput placeholder="Buscar..." />
            <CommandList>
                <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                <CommandGroup>
                {options.map((option) => (
                    <CommandItem
                    key={option.value}
                    onSelect={() => {
                        onChange(
                        selected.includes(option.value)
                            ? selected.filter((item) => item !== option.value)
                            : [...selected, option.value]
                        );
                        if (closeOnSelect) {
                            setOpen(false);
                        }
                    }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(option.value)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                    />
                    {option.label}
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
            </Command>
        </PopoverContent>
        </Popover>
    );
});

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };
