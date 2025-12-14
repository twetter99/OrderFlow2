"use client";

import { useState, useTransition } from "react";
import { 
  createBackup, 
  generateBackupForDownload, 
  listBackups, 
  deleteBackup,
  type BackupMetadata 
} from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { 
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BackupManagerProps {
  initialCollections: string[];
  initialBackups: BackupMetadata[];
}

export function BackupManager({ initialCollections, initialBackups }: BackupManagerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [collections] = useState<string[]>(initialCollections);
  const [backups, setBackups] = useState<BackupMetadata[]>(initialBackups);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<BackupMetadata | null>(null);
  
  // Código de confirmación para crear backup
  const [confirmCode, setConfirmCode] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const CONFIRM_CODE = "0707";

  // Refrescar lista de backups
  const refreshBackups = () => {
    startTransition(async () => {
      const result = await listBackups();
      if (result.success) {
        setBackups(result.backups);
      }
    });
  };

  // Crear backup en Storage
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

      if (result.success) {
        toast({
          title: "✅ Backup Creado",
          description: result.message,
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
        title: "Error inesperado",
        description: "No se pudo crear el backup.",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Descargar backup directamente (sin Storage)
  const handleDownloadDirect = async () => {
    setIsDownloading(true);

    try {
      const result = await generateBackupForDownload();

      if (result.success && result.jsonContent) {
        // Crear blob y descargar
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
          title: "✅ Descarga Iniciada",
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
        description: "No se pudo generar el backup.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Eliminar backup
  const handleDeleteBackup = async () => {
    if (!backupToDelete) return;

    try {
      const result = await deleteBackup(backupToDelete.filename);

      if (result.success) {
        toast({
          title: "Backup eliminado",
          description: result.message,
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
        description: "No se pudo eliminar el backup.",
      });
    } finally {
      setBackupToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Backup de Base de Datos
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea y gestiona copias de seguridad de todas tus colecciones de Firestore.
          </p>
        </div>
      </div>

      {/* Información de seguridad */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <ShieldCheck className="h-5 w-5" />
            Proceso 100% Seguro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <li>✅ <strong>Solo lectura</strong>: El backup solo lee datos, nunca los modifica</li>
            <li>✅ <strong>Sin riesgo</strong>: Tus colecciones permanecen intactas</li>
            <li>✅ <strong>Auto-detección</strong>: Detecta automáticamente todas las colecciones</li>
            <li>✅ <strong>Formato estándar</strong>: JSON exportable e importable</li>
          </ul>
        </CardContent>
      </Card>

      {/* Colecciones detectadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Colecciones Detectadas ({collections.length})
          </CardTitle>
          <CardDescription>
            Estas son las colecciones que se incluirán en el backup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {collections.map((col) => (
              <Badge key={col} variant="secondary" className="text-sm">
                {col}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Acciones de backup */}
      <Card>
        <CardHeader>
          <CardTitle>Crear Nuevo Backup</CardTitle>
          <CardDescription>
            Elige cómo quieres crear tu copia de seguridad.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={isCreatingBackup || isDownloading}
            className="bg-primary"
          >
            {isCreatingBackup ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Guardar en Nube
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadDirect}
            disabled={isCreatingBackup || isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Descargar Directamente
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de backups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historial de Backups
              </CardTitle>
              <CardDescription>
                Backups almacenados en Firebase Storage.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={refreshBackups} disabled={isPending}>
              <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileJson className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay backups almacenados todavía.</p>
              <p className="text-sm">Crea tu primer backup usando los botones de arriba.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Colecciones</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {backup.timestamp ? 
                          format(new Date(backup.timestamp), "PPP 'a las' HH:mm", { locale: es }) 
                          : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {backup.filename}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{backup.collections.length}</Badge>
                    </TableCell>
                    <TableCell>{backup.totalDocuments.toLocaleString()}</TableCell>
                    <TableCell>{backup.sizeFormatted}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setBackupToDelete(backup)}
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
        </CardContent>
      </Card>

      {/* Dialog de confirmación para crear backup */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Crear Backup
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Se creará una copia de seguridad completa de <strong>{collections.length} colecciones</strong>.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
                  <p className="text-green-800 font-medium">✅ Operación segura</p>
                  <p className="text-green-700 text-xs mt-1">
                    Este proceso solo lee datos. Tus colecciones no serán modificadas.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ingresa el código de confirmación para continuar.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirm-code">Código de Confirmación *</Label>
            <Input
              id="confirm-code"
              type="password"
              placeholder="Ingresa el código"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmCode("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateBackup}
              disabled={!confirmCode.trim()}
            >
              Crear Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para eliminar backup */}
      <AlertDialog open={!!backupToDelete} onOpenChange={() => setBackupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar Backup
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el backup <strong>{backupToDelete?.filename}</strong>?
              <br /><br />
              Esta acción no se puede deshacer, pero <strong>no afecta a tus datos en Firestore</strong>.
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
