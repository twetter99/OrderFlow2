
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { MoreHorizontal, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Payment, SupplierInvoice } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn, convertTimestampsToISO } from "@/lib/utils";
import { differenceInDays, isPast, isToday, parseISO } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const getDueDateStatus = (dueDate: string) => {
    const date = parseISO(dueDate);
    if (isPast(date) && !isToday(date)) {
        return { text: 'Vencido', color: 'text-destructive', icon: <AlertTriangle className="h-4 w-4 text-destructive" /> };
    }
    const daysUntil = differenceInDays(date, new Date());
    if (daysUntil <= 7) {
        return { text: `Vence en ${daysUntil + 1} días`, color: 'text-orange-500', icon: <Clock className="h-4 w-4 text-orange-500" /> };
    }
    return { text: 'En plazo', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4 text-green-600" /> };
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubPayments = onSnapshot(collection(db, "payments"), (snapshot) => {
      setPayments(snapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as Payment));
      if (loading) setLoading(false);
    });
    const unsubInvoices = onSnapshot(collection(db, "supplierInvoices"), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as SupplierInvoice));
    });

    return () => {
      unsubPayments();
      unsubInvoices();
    };
  }, [loading]);

  const sortedPayments = useMemo(() => {
    if (loading) return [];
    return payments.sort((a, b) => {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return dateA - dateB;
    });
  }, [payments, loading]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

  const getStatusBadgeVariant = (status: Payment['status']) => {
    switch (status) {
      case 'Pagado total': return 'default';
      case 'Pagado parcialmente': return 'secondary';
      case 'Pendiente': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Vencimientos y Pagos</h1>
          <p className="text-muted-foreground">
            Controla los vencimientos de las facturas de proveedores y registra los pagos.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Vencimientos</CardTitle>
          <CardDescription>
            Facturas ordenadas por su fecha de vencimiento más próxima.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Nº Factura</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Importe Pendiente</TableHead>
                  <TableHead>Estado Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center">Cargando...</TableCell></TableRow>
                ) : sortedPayments.map((payment) => {
                    const dueDateStatus = getDueDateStatus(payment.dueDate);
                    const amountPaid = payment.paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0;
                    const amountPending = payment.amountDue - amountPaid;
                  return (
                  <TableRow key={payment.id} className={cn(dueDateStatus.text === 'Vencido' && payment.status === 'Pendiente' && 'bg-destructive/5')}>
                    <TableCell className="font-medium">{payment.supplierName}</TableCell>
                    <TableCell>{payment.invoiceNumber}</TableCell>
                    <TableCell>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                    {dueDateStatus.icon}
                                    <span>{new Date(payment.dueDate).toLocaleDateString()}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{dueDateStatus.text}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(amountPending)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStatusBadgeVariant(payment.status)}
                        className={cn(payment.status === 'Pendiente' && 'animate-pulse')}
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem>
                            Registrar Pago
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Ver Factura Asociada
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})}
                {!loading && sortedPayments.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No se encontraron vencimientos.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
