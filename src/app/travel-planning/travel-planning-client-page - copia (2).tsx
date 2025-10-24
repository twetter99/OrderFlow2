"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  MoreHorizontal, 
  PlusCircle, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit,
  Copy,
  History,
  ChevronRight,
  Printer,
  Mail
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TravelReportForm } from "./travel-report-form";
import type { InformeViaje, Project, Technician } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { approveTravelReport, rejectTravelReport, deleteTravelReport, deleteTravelReports } from "./actions";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";

const LOGGED_IN_USER_ID = 'WF-USER-001'; // Simula el Admin
const ALL_STATUSES: InformeViaje['estado'][] = ["Pendiente de Aprobación", "Aprobado", "Rechazado"];

type SortDescriptor = {
  column: keyof InformeViaje | 'proyecto_name' | 'tecnico_name';
  direction: 'ascending' | 'descending';
};

interface ClientPageProps {
  initialReports: InformeViaje[];
  projects: Project[];
  technicians: Technician[];
}

export function TravelPlanningClientPage({ initialReports, projects, technicians }: ClientPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [reports, setReports] = useState<InformeViaje[]>(initialReports);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    codigo: '',
    proyecto: '',
    tecnico: '',
    estado: 'all',
  });

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  
  const [selectedReport, setSelectedReport] = useState<InformeViaje | null>(null);
  const [reportToDelete, setReportToDelete] = useState<InformeViaje | null>(null);
  const [reportToDuplicate, setReportToDuplicate] = useState<InformeViaje | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'fecha_inicio',
    direction: 'descending',
  });

  // Actualizar reports cuando cambien los initialReports
  React.useEffect(() => {
    setReports(initialReports);
  }, [initialReports]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const filteredReports = useMemo(() => {
    let filtered = reports.filter(report => {
      return (
        (report.codigo_informe || report.id || '').toLowerCase().includes(filters.codigo.toLowerCase()) &&
        (report.proyecto_name || '').toLowerCase().includes(filters.proyecto.toLowerCase()) &&
        (report.tecnico_name || '').toLowerCase().includes(filters.tecnico.toLowerCase()) &&
        (filters.estado === 'all' || report.estado === filters.estado)
      );
    });

    return filtered.sort((a, b) => {
      const first = a[sortDescriptor.column as keyof typeof a];
      const second = b[sortDescriptor.column as keyof typeof b];
      let cmp = 0;

      if (first === undefined || first === null) cmp = -1;
      else if (second === undefined || second === null) cmp = 1;
      else if (sortDescriptor.column === 'total_informe') {
        cmp = Number(first) - Number(second);
      } else if (sortDescriptor.column === 'fecha_inicio' || sortDescriptor.column === 'fecha_fin') {
        cmp = new Date(first as string).getTime() - new Date(second as string).getTime();
      } else {
        cmp = String(first).localeCompare(String(second));
      }

      return sortDescriptor.direction === 'descending' ? -cmp : cmp;
    });
  }, [reports, sortDescriptor, filters]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(filteredReports.map(r => r.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev => 
      prev.includes(rowId) 
        ? prev.filter(id => id !== rowId) 
        : [...prev, rowId]
    );
  };

  const onSortChange = (column: SortDescriptor['column']) => {
    if (sortDescriptor.column === column) {
      setSortDescriptor({
        ...sortDescriptor,
        direction: sortDescriptor.direction === 'ascending' ? 'descending' : 'ascending',
      });
    } else {
      setSortDescriptor({ column, direction: 'ascending' });
    }
  };

  const getSortIcon = (column: SortDescriptor['column']) => {
    if (sortDescriptor.column === column) {
      return sortDescriptor.direction === 'ascending' 
        ? <ArrowUp className="ml-2 h-4 w-4" /> 
        : <ArrowDown className="ml-2 h-4 w-4" />;
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
  };

  const handleViewDetails = (report: InformeViaje) => {
    setSelectedReport(report);
    setIsDetailDialogOpen(true);
  };

  const handleEditClick = (report: InformeViaje) => {
    setSelectedReport(report);
    setIsSheetOpen(true);
  };

  const handleDuplicateClick = (report: InformeViaje) => {
    setReportToDuplicate(report);
    setIsDuplicateDialogOpen(true);
  };

  const handleHistoryClick = (report: InformeViaje) => {
    setSelectedReport(report);
    setIsHistoryDialogOpen(true);
  };

  const handlePrintClick = (report: InformeViaje) => {
    toast({
      title: 'Función de Impresión',
      description: 'Esta funcionalidad se implementará en el sistema completo.',
    });
  };

  const handleEmailClick = (report: InformeViaje) => {
    const subject = `Informe de Viaje ${report.codigo_informe} - ${report.proyecto_name}`;
    const body = `Hola,\n\nAdjunto encontrarás el informe de viaje ${report.codigo_informe}.\n\nTécnico: ${report.tecnico_name}\nProyecto: ${report.proyecto_name}\nPeriodo: ${format(new Date(report.fecha_inicio), "P", { locale: es })} - ${format(new Date(report.fecha_fin), "P", { locale: es })}\nTotal: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(report.total_informe)}\n\nSaludos,\nEl equipo de WINFIN`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const confirmDuplicate = () => {
    if (!reportToDuplicate) return;

    const newReportData: Partial<InformeViaje> = {
      ...reportToDuplicate,
      estado: 'Pendiente de Aprobación',
    };

    delete newReportData.id;
    delete newReportData.codigo_informe;
    delete newReportData.fecha_creacion;
    delete newReportData.fecha_aprobacion;
    delete newReportData.fecha_rechazo;
    delete newReportData.aprobado_por;
    delete newReportData.notas_aprobacion;
    
    setSelectedReport(newReportData as InformeViaje);
    setIsSheetOpen(true);
    setIsDuplicateDialogOpen(false);
    setReportToDuplicate(null);
  };

  const handleApproveClick = (report: InformeViaje) => {
    setSelectedReport(report);
    setIsApproveDialogOpen(true);
  };

  const handleRejectClick = (report: InformeViaje) => {
    setSelectedReport(report);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedReport) return;
    
    setLoading(true);
    const result = await approveTravelReport(selectedReport.id, LOGGED_IN_USER_ID);
    
    if (result.success) {
      toast({ title: 'Informe Aprobado', description: result.message });
      router.refresh();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    
    setLoading(false);
    setIsApproveDialogOpen(false);
    setSelectedReport(null);
  };

  const confirmReject = async () => {
    if (!selectedReport || !rejectionReason.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Debes proporcionar una razón de rechazo.' 
      });
      return;
    }
    
    setLoading(true);
    const result = await rejectTravelReport(selectedReport.id, LOGGED_IN_USER_ID, rejectionReason);
    
    if (result.success) {
      toast({ title: 'Informe Rechazado', description: result.message });
      router.refresh();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    
    setLoading(false);
    setIsRejectDialogOpen(false);
    setSelectedReport(null);
    setRejectionReason("");
  };

  const handleDeleteTrigger = (report: InformeViaje) => {
    setReportToDelete(report);
    setSelectedRowIds([]);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteMultiple = () => {
    setReportToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);

    try {
      let result;

      if (reportToDelete) {
        result = await deleteTravelReport(reportToDelete.id);
      } 
      else if (selectedRowIds.length > 0) {
        result = await deleteTravelReports(selectedRowIds);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No hay informes seleccionados para eliminar.'
        });
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        return;
      }

      if (result.success) {
        toast({ 
          title: 'Eliminación Exitosa', 
          description: result.message 
        });

        if (result.details && result.details.errors.length > 0) {
          console.warn('Errores durante eliminación:', result.details.errors);
        }

        setSelectedRowIds([]);
        router.refresh();
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Error al Eliminar', 
          description: result.message 
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Inesperado',
        description: 'Ocurrió un error al intentar eliminar los informes.'
      });
      console.error('Error en confirmDelete:', error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const approvedInSelection = selectedRowIds.filter(id => {
    const report = reports.find(r => r.id === id);
    return report?.estado === 'Aprobado';
  }).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Gestión de Viajes y Gastos</h1>
          <p className="text-muted-foreground">
            Registra y gestiona todos los gastos de viaje de los técnicos. Los informes aprobados imputan gastos a los proyectos.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Informes de Viaje</CardTitle>
              <CardDescription>Visualiza y gestiona todos los informes de gastos de viaje.</CardDescription>
            </div>
            {selectedRowIds.length > 0 ? (
              <Button variant="destructive" onClick={handleDeleteMultiple}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar ({selectedRowIds.length})
              </Button>
            ) : (
              <Button onClick={() => setIsSheetOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Informe de Viaje
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="filter-codigo">Código de Informe</Label>
              <Input 
                id="filter-codigo" 
                placeholder="Buscar por código..." 
                value={filters.codigo} 
                onChange={(e) => handleFilterChange('codigo', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-proyecto">Proyecto</Label>
              <Input 
                id="filter-proyecto" 
                placeholder="Buscar por proyecto..." 
                value={filters.proyecto} 
                onChange={(e) => handleFilterChange('proyecto', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-tecnico">Técnico</Label>
              <Input 
                id="filter-tecnico" 
                placeholder="Buscar por técnico..." 
                value={filters.tecnico} 
                onChange={(e) => handleFilterChange('tecnico', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-estado">Estado</Label>
              <Select value={filters.estado} onValueChange={(value) => handleFilterChange('estado', value)}>
                <SelectTrigger id="filter-estado">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  {ALL_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRowIds.length === filteredReports.length && filteredReports.length > 0 
                      ? true 
                      : (selectedRowIds.length > 0 ? 'indeterminate' : false)}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                    aria-label="Seleccionar todo"
                  />
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-1" onClick={() => onSortChange('codigo_informe')}>
                    Código {getSortIcon('codigo_informe')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-1" onClick={() => onSortChange('proyecto_name')}>
                    Proyecto {getSortIcon('proyecto_name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-1" onClick={() => onSortChange('tecnico_name')}>
                    Técnico {getSortIcon('tecnico_name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-1" onClick={() => onSortChange('fecha_inicio')}>
                    Fecha Inicio {getSortIcon('fecha_inicio')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-1" onClick={() => onSortChange('fecha_fin')}>
                    Fecha Fin {getSortIcon('fecha_fin')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="px-1" onClick={() => onSortChange('estado')}>
                    Estado {getSortIcon('estado')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" className="px-1" onClick={() => onSortChange('total_informe')}>
                    Total {getSortIcon('total_informe')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow 
                  key={report.id} 
                  data-state={selectedRowIds.includes(report.id) ? "selected" : ""}
                  className={cn(
                    report.estado === "Pendiente de Aprobación" && "bg-orange-50 dark:bg-orange-900/20"
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRowIds.includes(report.id)}
                      onCheckedChange={() => handleRowSelect(report.id)}
                      aria-label={`Seleccionar informe ${report.codigo_informe}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{report.codigo_informe || report.id}</TableCell>
                  <TableCell>{report.proyecto_name}</TableCell>
                  <TableCell>{report.tecnico_name}</TableCell>
                  <TableCell>{format(new Date(report.fecha_inicio), "P", { locale: es })}</TableCell>
                  <TableCell>{format(new Date(report.fecha_fin), "P", { locale: es })}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        report.estado === "Aprobado" && "bg-green-100 text-green-800 border-green-200",
                        report.estado === "Pendiente de Aprobación" && "bg-orange-100 text-orange-800 border-orange-200 animate-pulse",
                        report.estado === "Rechazado" && "bg-destructive/20 text-destructive border-destructive/20"
                      )}
                    >
                      {report.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(report.total_informe)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewDetails(report)}>
                          <Eye className="mr-2 h-4 w-4"/>
                          Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(report)}>
                          <Edit className="mr-2 h-4 w-4"/>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateClick(report)}>
                          <Copy className="mr-2 h-4 w-4"/>
                          Duplicar Informe
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleHistoryClick(report)}>
                          <History className="mr-2 h-4 w-4"/>
                          Trazabilidad
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ChevronRight className="mr-2 h-4 w-4"/>
                            Cambiar Estado
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {report.estado === "Pendiente de Aprobación" ? (
                              <>
                                <DropdownMenuItem onClick={() => handleApproveClick(report)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600"/>
                                  Aprobar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRejectClick(report)}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-600"/>
                                  Rechazar
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem disabled>
                                <AlertTriangle className="mr-2 h-4 w-4 text-muted-foreground"/>
                                No disponible
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handlePrintClick(report)}>
                          <Printer className="mr-2 h-4 w-4"/>
                          Imprimir Informe
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEmailClick(report)}>
                          <Mail className="mr-2 h-4 w-4"/>
                          Enviar por Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTrigger(report)}
                          disabled={report.estado === 'Aprobado'}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">Cargando...</TableCell>
                </TableRow>
              )}
              {!loading && filteredReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No se encontraron informes que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet para crear/editar informe */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{selectedReport?.id ? 'Editar' : 'Nuevo'} Informe de Viaje</SheetTitle>
            <SheetDescription>
              Rellena los detalles del viaje y adjunta los gastos asociados. Se enviará para su aprobación.
            </SheetDescription>
          </SheetHeader>
          <TravelReportForm 
            projects={projects} 
            technicians={technicians}
            report={selectedReport}
            onClose={() => {
              setIsSheetOpen(false);
              setSelectedReport(null);
            }} 
          />
        </SheetContent>
      </Sheet>

      {/* Dialog de Detalles */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Informe {selectedReport?.codigo_informe}</DialogTitle>
            <DialogDescription>
              Información completa del informe de viaje
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Proyecto</Label>
                  <p className="font-medium">{selectedReport.proyecto_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Técnico</Label>
                  <p className="font-medium">{selectedReport.tecnico_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha Inicio</Label>
                  <p className="font-medium">{format(new Date(selectedReport.fecha_inicio), "PPP", { locale: es })}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha Fin</Label>
                  <p className="font-medium">{format(new Date(selectedReport.fecha_fin), "PPP", { locale: es })}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Descripción del Viaje</Label>
                <p className="font-medium">{selectedReport.descripcion_viaje}</p>
              </div>

              <div>
                <Label className="text-lg font-semibold">Gastos Detallados</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReport.gastos?.map((gasto, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{format(new Date(gasto.fecha), "P", { locale: es })}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{gasto.tipo}</Badge>
                        </TableCell>
                        <TableCell>{gasto.descripcion}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(gasto.importe)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total del Informe:</span>
                  <span>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(selectedReport.total_informe)}</span>
                </div>
              </div>

              {selectedReport.estado === "Rechazado" && selectedReport.notas_aprobacion && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <Label className="text-destructive font-semibold">Razón de Rechazo:</Label>
                  <p className="mt-2">{selectedReport.notas_aprobacion}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Aprobación */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprobar Informe de Viaje</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas aprobar el informe {selectedReport?.codigo_informe}?
              El gasto de {selectedReport && new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(selectedReport.total_informe)} se imputará al proyecto {selectedReport?.proyecto_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} disabled={loading}>
              {loading ? "Aprobando..." : "Aprobar Informe"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Rechazo */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Informe de Viaje</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, proporciona una razón para rechazar el informe {selectedReport?.codigo_informe}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Razón del Rechazo *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Ej: Gastos no justificados correctamente..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={4}
              disabled={loading}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmReject}
              className="bg-destructive hover:bg-destructive/90"
              disabled={loading || !rejectionReason.trim()}
            >
              {loading ? "Rechazando..." : "Rechazar Informe"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Estás seguro?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente
                  {reportToDelete 
                    ? ` el informe "${reportToDelete.codigo_informe}".` 
                    : (selectedRowIds.length > 1 
                        ? ` los ${selectedRowIds.length} informes seleccionados.` 
                        : " el informe seleccionado.")}
                </p>
                {approvedInSelection > 0 && (
                  <p className="text-destructive font-semibold">
                    ⚠️ Advertencia: {approvedInSelection} de los informes seleccionados están aprobados y NO se eliminarán.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Continuar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Duplicación */}
      <AlertDialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar Informe de Viaje</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Crear un nuevo informe usando los datos de este? El nuevo informe se creará con estado "Pendiente de Aprobación".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDuplicate}>
              Duplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Historial/Trazabilidad */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trazabilidad del Informe {selectedReport?.codigo_informe}</DialogTitle>
            <DialogDescription>
              Historial de cambios de estado para este informe.
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                  <span className="font-medium">Creado:</span>
                  <span className="text-muted-foreground">
                    {selectedReport.fecha_creacion ? format(new Date(selectedReport.fecha_creacion), "PPP 'a las' HH:mm", { locale: es }) : 'N/A'}
                  </span>
                </div>
                {selectedReport.estado === 'Aprobado' && selectedReport.fecha_aprobacion && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">Aprobado:</span>
                    <span className="text-muted-foreground">
                      {format(new Date(selectedReport.fecha_aprobacion), "PPP 'a las' HH:mm", { locale: es })}
                    </span>
                  </div>
                )}
                {selectedReport.estado === 'Rechazado' && selectedReport.fecha_rechazo && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span className="font-medium">Rechazado:</span>
                    <span className="text-muted-foreground">
                      {format(new Date(selectedReport.fecha_rechazo), "PPP 'a las' HH:mm", { locale: es })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
