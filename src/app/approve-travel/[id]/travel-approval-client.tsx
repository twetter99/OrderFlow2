"use client";

import { useState } from "react";
import { InformeViaje } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, MapPin, Calendar, User, Briefcase } from "lucide-react";
import { approveTravelReport, rejectTravelReport } from "@/app/travel-planning/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ADMIN_USER_ID = "WF-USER-001"; // En producción, obtener del contexto de auth

interface TravelApprovalPageProps {
  report: InformeViaje;
}

export function TravelApprovalPage({ report }: TravelApprovalPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    const result = await approveTravelReport(report.id, ADMIN_USER_ID);

    if (result.success) {
      toast({
        title: "Informe Aprobado",
        description: result.message,
      });
      router.push("/travel-planning");
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.message,
      });
    }
    setIsApproving(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Razón Requerida",
        description: "Debes proporcionar una razón para el rechazo.",
      });
      return;
    }

    setIsRejecting(true);
    const result = await rejectTravelReport(report.id, ADMIN_USER_ID, rejectionReason);

    if (result.success) {
      toast({
        title: "Informe Rechazado",
        description: result.message,
      });
      router.push("/travel-planning");
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.message,
      });
    }
    setIsRejecting(false);
  };

  const isActionable = report.estado === "Pendiente de Aprobación";

  return (
    <div className="container max-w-5xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Revisión de Informe de Viaje</h1>
        <p className="text-muted-foreground">
          Revisa los detalles del informe y aprueba o rechaza según corresponda.
        </p>
      </div>

      {/* Estado del Informe */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{report.codigo_informe}</CardTitle>
              <CardDescription>Informe de gastos de viaje</CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                report.estado === "Aprobado"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : report.estado === "Rechazado"
                  ? "bg-destructive/20 text-destructive border-destructive/20"
                  : "bg-orange-100 text-orange-800 border-orange-200"
              }
            >
              {report.estado}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Información General */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <Label className="text-muted-foreground">Técnico</Label>
              <p className="font-medium">{report.tecnico_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <Label className="text-muted-foreground">Proyecto</Label>
              <p className="font-medium">{report.proyecto_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <Label className="text-muted-foreground">Fecha de Inicio</Label>
              <p className="font-medium">
                {format(new Date(report.fecha_inicio), "PPP", { locale: es })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <Label className="text-muted-foreground">Fecha de Fin</Label>
              <p className="font-medium">
                {format(new Date(report.fecha_fin), "PPP", { locale: es })}
              </p>
            </div>
          </div>

          <div className="md:col-span-2">
            <Label className="text-muted-foreground">Descripción del Viaje</Label>
            <p className="font-medium mt-1">{report.descripcion_viaje}</p>
          </div>
        </CardContent>
      </Card>

      {/* Detalle de Gastos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detalle de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
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
              {report.gastos?.map((gasto, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {format(new Date(gasto.fecha), "P", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{gasto.tipo}</Badge>
                  </TableCell>
                  <TableCell>{gasto.descripcion}</TableCell>
                  <TableCell className="text-right font-medium">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }).format(gasto.importe)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total del Informe:</span>
              <span>
                {new Intl.NumberFormat("es-ES", {
                  style: "currency",
                  currency: "EUR",
                }).format(report.total_informe)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      {isActionable && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
            <CardDescription>
              Aprueba el informe para imputar los gastos al proyecto, o recházalo con una
              justificación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showRejectForm ? (
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-1"
                  size="lg"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aprobando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aprobar Informe
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1"
                  size="lg"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar Informe
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rejection-reason">Razón del Rechazo *</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Ej: Gastos no justificados correctamente, falta documentación..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-2"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason("");
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isRejecting || !rejectionReason.trim()}
                    className="flex-1"
                  >
                    {isRejecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rechazando...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Confirmar Rechazo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mensaje si ya fue procesado */}
      {!isActionable && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Este informe ya ha sido {report.estado.toLowerCase()}.
            </p>
            {report.estado === "Rechazado" && report.notas_aprobacion && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-left">
                <Label className="text-destructive font-semibold">Razón de Rechazo:</Label>
                <p className="mt-2">{report.notas_aprobacion}</p>
              </div>
            )}
            <Button onClick={() => router.push("/travel-planning")} className="mt-4">
              Volver a Gestión de Viajes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}