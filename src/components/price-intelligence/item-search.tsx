"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  X, 
  Package, 
  Building2, 
  FolderKanban,
  Clock,
  TrendingUp,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/lib/types";
import { smartSearch, type SearchResult } from "@/app/price-intelligence/actions";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ItemSearchProps {
  items: InventoryItem[];
  onItemSelect: (item: InventoryItem) => void;
  onSupplierSelect?: (supplierId: string, supplierName: string) => void;
  onProjectSelect?: (projectId: string, projectName: string) => void;
  selectedItemId?: string;
  selectedContext?: {
    type: 'item' | 'supplier' | 'project';
    id: string;
    name: string;
  };
}

export function ItemSearch({ 
  items, 
  onItemSelect, 
  onSupplierSelect,
  onProjectSelect,
  selectedItemId,
  selectedContext 
}: ItemSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(i => i.id === selectedItemId);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cargar búsquedas recientes del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('price-intelligence-recent');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // Ignorar errores de parsing
      }
    }
  }, []);

  // Búsqueda inteligente con debounce
  useEffect(() => {
    const search = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      
      try {
        // Usar búsqueda inteligente del servidor
        const searchResults = await smartSearch(debouncedQuery);
        setResults(searchResults);
      } catch (error) {
        console.error("Error en búsqueda:", error);
        setResults([]);
      }
      
      setIsLoading(false);
    };

    search();
  }, [debouncedQuery]);

  const saveToRecent = (result: SearchResult) => {
    const updated = [
      result,
      ...recentSearches.filter(r => !(r.type === result.type && r.id === result.id))
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('price-intelligence-recent', JSON.stringify(updated));
  };

  const handleSelect = (result: SearchResult) => {
    saveToRecent(result);
    setQuery("");
    setIsOpen(false);

    if (result.type === 'item') {
      const item = items.find(i => i.id === result.id);
      if (item) {
        onItemSelect(item);
      }
    } else if (result.type === 'supplier' && onSupplierSelect) {
      onSupplierSelect(result.id, result.name);
    } else if (result.type === 'project' && onProjectSelect) {
      onProjectSelect(result.id, result.name);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: es });
    } catch {
      return '';
    }
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'item':
        return <Package className="h-4 w-4" />;
      case 'supplier':
        return <Building2 className="h-4 w-4" />;
      case 'project':
        return <FolderKanban className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'item':
        return 'Artículo';
      case 'supplier':
        return 'Proveedor';
      case 'project':
        return 'Proyecto';
    }
  };

  const getTypeBadgeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'item':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'supplier':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'project':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // Agrupar resultados por tipo
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<SearchResult['type'], SearchResult[]>);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar artículos, proveedores o proyectos..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 h-12 text-base"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (
          <div 
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-[400px] overflow-y-auto overscroll-contain"
          >
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                Buscando...
              </div>
            </div>
          ) : query.length < 2 ? (
            // Mostrar búsquedas recientes cuando no hay query
            recentSearches.length > 0 ? (
              <div className="py-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Búsquedas recientes
                </div>
                <ul>
                  {recentSearches.map((result, idx) => (
                    <li key={`${result.type}-${result.id}-${idx}`}>
                      <button
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                        onClick={() => handleSelect(result)}
                      >
                        <div className={cn(
                          "p-2 rounded-md",
                          result.type === 'item' && "bg-blue-100",
                          result.type === 'supplier' && "bg-purple-100",
                          result.type === 'project' && "bg-green-100"
                        )}>
                          {getTypeIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.name}</p>
                          {result.subtitle && (
                            <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={cn("text-xs", getTypeBadgeColor(result.type))}>
                          {getTypeLabel(result.type)}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Busca por nombre, SKU, proveedor o proyecto</p>
                <p className="text-sm mt-1">Escribe al menos 2 caracteres para buscar</p>
              </div>
            )
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No se encontraron resultados</p>
              <p className="text-sm mt-1">Prueba con otros términos de búsqueda</p>
            </div>
          ) : (
            <div className="py-1">
              {/* Artículos */}
              {groupedResults.item && groupedResults.item.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1 bg-muted/50">
                    <Package className="h-3 w-3" />
                    Artículos ({groupedResults.item.length})
                  </div>
                  <ul>
                    {groupedResults.item.map((result) => (
                      <li key={`item-${result.id}`}>
                        <button
                          type="button"
                          className={cn(
                            "w-full px-4 py-3 text-left hover:bg-muted transition-colors",
                            selectedItemId === result.id && "bg-primary/10"
                          )}
                          onClick={() => handleSelect(result)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-md">
                              <Package className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{result.name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-mono">{result.subtitle}</span>
                                {result.itemCount && result.itemCount > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-green-600 flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" />
                                      Con historial
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Proveedores */}
              {groupedResults.supplier && groupedResults.supplier.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1 bg-muted/50">
                    <Building2 className="h-3 w-3" />
                    Proveedores ({groupedResults.supplier.length})
                  </div>
                  <ul>
                    {groupedResults.supplier.map((result) => (
                      <li key={`supplier-${result.id}`}>
                        <button
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                          onClick={() => handleSelect(result)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 rounded-md">
                              <Building2 className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{result.name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{result.subtitle}</span>
                                {result.lastPurchase && (
                                  <>
                                    <span>•</span>
                                    <span>Última compra: {formatDate(result.lastPurchase)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Proyectos */}
              {groupedResults.project && groupedResults.project.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1 bg-muted/50">
                    <FolderKanban className="h-3 w-3" />
                    Proyectos ({groupedResults.project.length})
                  </div>
                  <ul>
                    {groupedResults.project.map((result) => (
                      <li key={`project-${result.id}`}>
                        <button
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                          onClick={() => handleSelect(result)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-100 rounded-md">
                              <FolderKanban className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{result.name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{result.subtitle}</span>
                                {result.lastPurchase && (
                                  <>
                                    <span>•</span>
                                    <span>Última compra: {formatDate(result.lastPurchase)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contexto seleccionado */}
      {selectedContext && !isOpen && (
        <div className={cn(
          "mt-3 p-3 border rounded-lg",
          selectedContext.type === 'item' && "bg-blue-50 border-blue-200",
          selectedContext.type === 'supplier' && "bg-purple-50 border-purple-200",
          selectedContext.type === 'project' && "bg-green-50 border-green-200"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-md",
                selectedContext.type === 'item' && "bg-blue-100",
                selectedContext.type === 'supplier' && "bg-purple-100",
                selectedContext.type === 'project' && "bg-green-100"
              )}>
                {getTypeIcon(selectedContext.type)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{getTypeLabel(selectedContext.type)}</p>
                <p className="font-semibold">{selectedContext.name}</p>
              </div>
            </div>
            <Badge variant="outline" className={getTypeBadgeColor(selectedContext.type)}>
              {getTypeLabel(selectedContext.type)}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
