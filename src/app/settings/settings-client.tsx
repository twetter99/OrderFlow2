"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { 
  Settings, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Save,
  Database,
  Download,
  Trash2,
  Loader2,
  ShieldCheck,
  HardDrive,
  Clock,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  createBackup, 
  generateBackupForDownload, 
  listBackups, 
  deleteBackup,
  type BackupMetadata 
} from "@/app/admin/backup/actions";

interface SettingsClientProps {
  initialCollections: string[];
  initialBackups: BackupMetadata[];
  storageConfigured?: boolean;
}

export function SettingsClient({ initialCollections, initialBackups, storageConfigured = true }: SettingsClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  // Estado para Backup
  const [collections] = useState<string[]>(initialCollections);
  const [backups, setBackups] = useState<BackupMetadata[]>(initialBackups);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<BackupMetadata | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(storageConfigured);
  
  const CONFIRM_CODE = "0707";

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Los cambios se han guardado correctamente.",
    });
  };

  // === FUNCIONES DE BACKUP ===
  
  const refreshBackups = () => {
    startTransition(async () => {
      const result = await listBackups();
      if (result.success) {
        setBackups(result.backups);
      }
    });
  };

  const handleCreateBackup = async () => {
    if (confirmCode !== CONFIRM_CODE) {
      toast({
        variant: "destructive",
        title: "Código incorrecto",
        description: "El código de confirmación no es válido.",
      });
      setConfirmCode("");
      return;
    }

    setIsCreatingBackup(true);
    setShowConfirmDialog(false);
    setConfirmCode("");

    try {
      const result = await createBackup('admin');
      
      if (result.success && result.backup) {
        toast({
          title: "✅ Backup Creado",
          description: `Se guardaron ${result.backup.collections.length} colecciones con ${result.backup.totalDocuments} documentos.`,
        });
        refreshBackups();
      } else {
        // Si falla el storage, sugerimos descarga directa
        setStorageAvailable(false);
        toast({
          variant: "default",
          title: "⚠️ Storage no disponible",
          description: "Usa 'Descargar Directamente' para obtener tu backup.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado al crear el backup.",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDirectDownload = async () => {
    setIsDownloading(true);
    
    try {
      const result = await generateBackupForDownload();
      
      if (result.success && result.jsonContent) {
        const blob = new Blob([result.jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || 'backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "✅ Descarga iniciada",
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al generar el backup para descarga.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!backupToDelete) return;
    
    try {
      const result = await deleteBackup(backupToDelete.filename);
      
      if (result.success) {
        toast({
          title: "Backup eliminado",
          description: "El backup se ha eliminado correctamente.",
        });
        refreshBackups();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar el backup.",
      });
    } finally {
      setBackupToDelete(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase flex items-center gap-3">
            <Settings className="h-8 w-8" />
            Configuración General
          </h1>
          <p className="text-muted-foreground">
            Administra las preferencias, configuraciones del sistema y copias de seguridad.
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Guardar Cambios
        </Button>
      </div>

      <div className="grid gap-6">
        
        {/* ===================== BACKUP DE DATOS ===================== */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Backup de Datos
            </CardTitle>
            <CardDescription>
              Crea copias de seguridad de todas las colecciones de Firestore. Los backups se guardan en Firebase Storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Garantía de Seguridad */}
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">
                  100% Operación de Solo Lectura
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  El backup lee las colecciones y guarda una copia en Storage. 
                  No modifica, elimina ni altera ningún dato existente en Firestore.
                </p>
              </div>
            </div>

            {/* Colecciones detectadas */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Colecciones a respaldar ({collections.length})
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {collections.map(col => (
                  <Badge key={col} variant="secondary" className="text-xs">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Aviso si Storage no está configurado */}
            {!storageAvailable && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Firebase Storage no configurado
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Para habilitar backups en la nube, configura <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</code> en tu archivo .env.local.
                    Mientras tanto, puedes usar "Descargar Directamente" para crear backups locales.
                  </p>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-4">
              <Button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={isCreatingBackup || isDownloading || !storageAvailable}
                className="flex-1"
                variant={!storageAvailable ? "outline" : "default"}
              >
                {isCreatingBackup ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Crear Backup en Cloud
              </Button>
              
              <Button 
                variant={!storageAvailable ? "default" : "outline"}
                onClick={handleDirectDownload}
                disabled={isCreatingBackup || isDownloading}
                className="flex-1"
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Descargar Directamente
              </Button>
            </div>

            {/* Historial de Backups */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Historial de Backups
                </Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={refreshBackups}
                  disabled={isPending}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-1", isPending && "animate-spin")} />
                  Actualizar
                </Button>
              </div>

              {backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileJson className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  {!storageAvailable ? (
                    <>
                      <p className="font-medium text-amber-600">Firebase Storage no está configurado</p>
                      <p className="text-sm mt-1">Usa "Descargar Directamente" para crear backups locales.</p>
                    </>
                  ) : (
                    <p>No hay backups guardados en Storage</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Colecciones</TableHead>
                      <TableHead>Documentos</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Creado por</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.filename}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            {format(new Date(backup.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{backup.collections.length}</Badge>
                        </TableCell>
                        <TableCell>{backup.totalDocuments.toLocaleString()}</TableCell>
                        <TableCell>{backup.sizeFormatted}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {backup.createdBy || 'Sistema'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBackupToDelete(backup)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configura cómo y cuándo recibir notificaciones del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones por email</Label>
                <p className="text-sm text-muted-foreground">
                  Recibir alertas importantes por correo electrónico.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de stock bajo</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar cuando el inventario esté por debajo del mínimo.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Recordatorios de aprobación</Label>
                <p className="text-sm text-muted-foreground">
                  Avisar sobre documentos pendientes de aprobación.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Configuración Regional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Configuración Regional
            </CardTitle>
            <CardDescription>
              Ajusta el idioma, zona horaria y formato de moneda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select defaultValue="es">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Zona Horaria</Label>
                <Select defaultValue="europe-madrid">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="europe-madrid">Europa/Madrid (GMT+1)</SelectItem>
                    <SelectItem value="europe-london">Europa/Londres (GMT)</SelectItem>
                    <SelectItem value="america-new_york">América/Nueva York (GMT-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select defaultValue="eur">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eur">Euro (€)</SelectItem>
                    <SelectItem value="usd">Dólar ($)</SelectItem>
                    <SelectItem value="gbp">Libra (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Formato de Fecha</Label>
                <Select defaultValue="dd-mm-yyyy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Apariencia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Apariencia
            </CardTitle>
            <CardDescription>
              Personaliza la apariencia visual de la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo oscuro</Label>
                <p className="text-sm text-muted-foreground">
                  Usar tema oscuro para reducir fatiga visual.
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Barra lateral compacta</Label>
                <p className="text-sm text-muted-foreground">
                  Mostrar menú lateral en modo reducido por defecto.
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Seguridad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Gestiona opciones de seguridad y autenticación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autenticación de dos factores</Label>
                <p className="text-sm text-muted-foreground">
                  Añade una capa extra de seguridad a tu cuenta.
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Tiempo de sesión (minutos)</Label>
              <Input type="number" defaultValue="60" className="w-32" />
              <p className="text-sm text-muted-foreground">
                Tiempo de inactividad antes de cerrar sesión automáticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Confirmación para Crear Backup */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Crear Backup de Seguridad
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Se creará una copia de seguridad de <strong>{collections.length} colecciones</strong> 
                  y se guardará en Firebase Storage.
                </p>
                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Esta operación es 100% segura. Solo lee datos, no modifica nada.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-code">Código de Confirmación</Label>
                  <Input
                    id="confirm-code"
                    type="password"
                    placeholder="Ingresa el código"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmCode("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateBackup} disabled={!confirmCode.trim()}>
              Crear Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmación para Eliminar Backup */}
      <AlertDialog open={!!backupToDelete} onOpenChange={() => setBackupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar Backup
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este backup? Esta acción no se puede deshacer.
              <br /><br />
              <strong>Archivo:</strong> {backupToDelete?.filename}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteBackup}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
