
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PurchaseOrder, Supplier, Project, Location, PurchaseOrderItem } from '@/lib/types';
import { Loader2, Printer, AlertTriangle, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';

interface EnrichedPurchaseOrderItem extends PurchaseOrderItem {
  supplierProductCode?: string;
}

interface EnrichedPurchaseOrder extends PurchaseOrder {
  items: EnrichedPurchaseOrderItem[];
  supplierDetails?: Supplier;
  projectDetails?: Project;
  deliveryLocationDetails?: Location;
}

export default function PurchaseOrderPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<EnrichedPurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
        const item = localStorage.getItem(`print_order_${id}`);
        if (item) {
            setOrder(JSON.parse(item));
        } else {
            setError('No se pudo encontrar la información de la orden. Por favor, cierra esta pestaña y vuelve a intentarlo desde el listado.');
        }
    } catch (e) {
        console.error("Error reading from localStorage:", e);
        setError('Ocurrió un error al cargar los datos de la orden.');
    } finally {
        setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (order && !loading && !error) {
        // Set the document title for a clean PDF filename
        document.title = `WINFIN-OrdenCompra-${order.orderNumber || order.id}`;
        
        // Delay print slightly to ensure title is set and content is rendered
        const timer = setTimeout(() => {
            window.print();
            // Clean up local storage after printing has been initiated
            localStorage.removeItem(`print_order_${id}`); 
        }, 500);

        return () => clearTimeout(timer);
    }
  }, [order, loading, error, id]);
  
  const handlePrint = () => {
    window.print();
  }

  if (loading) {
    return (
        <div className="p-10 text-center flex flex-col items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Cargando orden de compra...</p>
        </div>
    );
  }

  if (error || !order) {
    return (
         <div className="p-10 text-center flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-800">
            <AlertTriangle className="h-10 w-10 mb-4" />
            <h1 className="text-xl font-bold mb-2">Error al Cargar la Orden</h1>
            <p>{error || 'No se encontró la orden de compra.'}</p>
        </div>
    );
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  const deliveryLocation = order.deliveryLocationDetails;

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 15mm;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .order-print-container, .order-print-container * {
            visibility: visible;
          }
          .order-print-container {
            position: absolute;
            left: 0;
            top: 0;
            right: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="bg-background flex flex-col items-center p-4">
        <div className="order-print-container bg-white text-black p-8 font-sans w-full max-w-4xl shadow-lg rounded-lg">
          <header className="flex justify-between items-start pb-4 border-b-2 border-black">
            <div>
              <Image src="/images/logo.png" alt="OrderFlow Logo" width={180} height={40} />
              <div className="mt-2 text-sm">
                <p>Moreras, 1, 28350 Ciempozuelos (Madrid)</p>
                <p>CIF: B05393632</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold uppercase">Orden de Compra</h2>
              <p className="text-lg font-mono">{order.orderNumber || order.id}</p>
              <p className="text-sm">Fecha: {new Date(order.date as string).toLocaleDateString('es-ES')}</p>
            </div>
          </header>
          
          <section className="grid grid-cols-2 gap-8 my-8">
            <div>
                <h3 className="text-sm uppercase font-bold text-gray-500 mb-2">Proveedor</h3>
                <p className="font-semibold">{order.supplierDetails?.name}</p>
                <p>Att: {order.supplierDetails?.contactPerson}</p>
                <p>{order.supplierDetails?.email}</p>
                <p>{order.supplierDetails?.phone}</p>
            </div>
            <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 p-4 rounded-lg space-y-2">
                <h3 className="text-sm uppercase font-bold text-gray-600">⚠️ ENTREGAR EXCLUSIVAMENTE EN:</h3>
                <p className="font-bold text-lg uppercase">📍 {deliveryLocation?.name}</p>
                {deliveryLocation?.type === 'physical' && (
                  <div className="text-sm text-gray-700">
                    <p>{deliveryLocation.street}, {deliveryLocation.number}</p>
                    <p>{deliveryLocation.postalCode}, {deliveryLocation.city}</p>
                    <p>{deliveryLocation.province}</p>
                  </div>
                )}
                {deliveryLocation?.type === 'mobile' && (
                    <p className="text-sm text-gray-700">Almacén móvil. Contactar para coordinar entrega.</p>
                )}
            </div>
          </section>

          <main className="my-8">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-100">
                        <TableHead className="text-black font-bold w-[50%]">Descripción</TableHead>
                        <TableHead className="text-right text-black font-bold">Cantidad</TableHead>
                        <TableHead className="text-right text-black font-bold">Precio Unitario</TableHead>
                        <TableHead className="text-right text-black font-bold">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.items.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell>
                              {item.supplierProductCode && (
                                <p className="font-bold text-gray-800">
                                  Código de: {order.supplierDetails?.name} {item.supplierProductCode}
                                </p>
                              )}
                              <p className="font-medium">{item.itemName}</p>
                              {item.itemSku && <p className="text-xs text-gray-500">SKU: {item.itemSku}</p>}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableBody>
                    <TableRow className="border-t-2 border-black">
                        <TableCell colSpan={3} className="text-right font-bold">Subtotal</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(order.total)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">IVA (21%)</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(order.total * 0.21)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-gray-100">
                        <TableCell colSpan={3} className="text-right font-bold text-lg">TOTAL</TableCell>
                        <TableCell className="text-right font-bold text-lg">{formatCurrency(order.total * 1.21)}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
          </main>

          <footer className="mt-16 text-sm text-gray-600">
            <p><span className="font-bold">Proyecto asociado:</span> {order.projectDetails?.name || 'No especificado'}</p>
            <p className="mt-4">Por favor, incluir el número de orden de compra en todas las facturas y comunicaciones. La entrega debe realizarse antes del <span className="font-bold">{new Date(order.estimatedDeliveryDate as string).toLocaleDateString('es-ES')}</span>.</p>
            <p className="text-center text-xs text-gray-500 mt-8">Gracias por su colaboración.</p>
          </footer>
        </div>
        
        <div className="no-print w-full max-w-4xl mt-4 flex flex-col items-center gap-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg p-3 flex items-center gap-2">
                <Info className="h-5 w-5"/>
                <span>Para una impresión profesional, desmarca la opción "Encabezado y pie de página" en la ventana de impresión del navegador.</span>
            </div>
            <Button onClick={handlePrint}>
                <Printer className="mr-2"/>
                Imprimir de Nuevo
            </Button>
        </div>
      </div>
    </>
  );
}
