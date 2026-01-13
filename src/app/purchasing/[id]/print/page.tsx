
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PurchaseOrder, Supplier, Project, Location, PurchaseOrderItem } from '@/lib/types';
import { Loader2, Printer, AlertTriangle, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';

// Traducciones para órdenes de compra
const translations = {
  es: {
    purchaseOrder: "Orden de Compra",
    date: "Fecha",
    supplier: "Proveedor",
    attention: "Att",
    deliverExclusivelyTo: "⚠️ ENTREGAR EXCLUSIVAMENTE EN:",
    mobileWarehouse: "Almacén móvil. Contactar para coordinar entrega.",
    description: "Descripción",
    quantity: "Cantidad",
    unitPrice: "Precio Unitario",
    total: "Total",
    subtotal: "Subtotal",
    vat: "IVA (21%)",
    associatedProject: "Proyecto asociado",
    notSpecified: "No especificado",
    includeOrderNumber: "Por favor, incluir el número de orden de compra en todas las facturas y comunicaciones. La entrega debe realizarse antes del",
    thankYou: "Gracias por su colaboración.",
    supplierCode: "Código de",
    printAgain: "Imprimir de Nuevo",
    printTip: "Para una impresión profesional, desmarca la opción \"Encabezado y pie de página\" en la ventana de impresión del navegador.",
    loading: "Cargando orden de compra...",
    errorTitle: "Error al Cargar la Orden",
    errorNotFound: "No se encontró la orden de compra.",
    errorLoadData: "No se pudo encontrar la información de la orden. Por favor, cierra esta pestaña y vuelve a intentarlo desde el listado.",
    errorOccurred: "Ocurrió un error al cargar los datos de la orden.",
  },
  en: {
    purchaseOrder: "Purchase Order",
    date: "Date",
    supplier: "Supplier",
    attention: "Att",
    deliverExclusivelyTo: "⚠️ DELIVER EXCLUSIVELY TO:",
    mobileWarehouse: "Mobile warehouse. Contact to coordinate delivery.",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    total: "Total",
    subtotal: "Subtotal",
    vat: "VAT (21%)",
    associatedProject: "Associated project",
    notSpecified: "Not specified",
    includeOrderNumber: "Please include the purchase order number in all invoices and communications. Delivery must be completed before",
    thankYou: "Thank you for your cooperation.",
    supplierCode: "Code from",
    printAgain: "Print Again",
    printTip: "For professional printing, uncheck the \"Header and footer\" option in the browser print window.",
    loading: "Loading purchase order...",
    errorTitle: "Error Loading Order",
    errorNotFound: "Purchase order not found.",
    errorLoadData: "Could not find order information. Please close this tab and try again from the list.",
    errorOccurred: "An error occurred while loading the order data.",
  }
};

type Lang = 'es' | 'en';

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

  // Determinar idioma basado en si el proveedor es internacional
  const lang: Lang = order?.supplierDetails?.isInternational ? 'en' : 'es';
  const t = translations[lang];

  useEffect(() => {
    try {
        const item = localStorage.getItem(`print_order_${id}`);
        if (item) {
            setOrder(JSON.parse(item));
        } else {
            setError(translations.es.errorLoadData);
        }
    } catch (e) {
        console.error("Error reading from localStorage:", e);
        setError(translations.es.errorOccurred);
    } finally {
        setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (order && !loading && !error) {
        // Set the document title for a clean PDF filename
        const orderLabel = lang === 'en' ? 'PurchaseOrder' : 'OrdenCompra';
        document.title = `WINFIN-${orderLabel}-${order.orderNumber || order.id}`;
        
        // Delay print slightly to ensure title is set and content is rendered
        const timer = setTimeout(() => {
            window.print();
            // Clean up local storage after printing has been initiated
            localStorage.removeItem(`print_order_${id}`); 
        }, 500);

        return () => clearTimeout(timer);
    }
  }, [order, loading, error, id, lang]);
  
  const handlePrint = () => {
    window.print();
  }

  if (loading) {
    return (
        <div className="p-10 text-center flex flex-col items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>{translations.es.loading}</p>
        </div>
    );
  }

  if (error || !order) {
    return (
         <div className="p-10 text-center flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-800">
            <AlertTriangle className="h-10 w-10 mb-4" />
            <h1 className="text-xl font-bold mb-2">{translations.es.errorTitle}</h1>
            <p>{error || translations.es.errorNotFound}</p>
        </div>
    );
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  const formatDate = (date: string) => new Date(date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES');
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
              <h2 className="text-2xl font-bold uppercase">{t.purchaseOrder}</h2>
              <p className="text-lg font-mono">{order.orderNumber || order.id}</p>
              <p className="text-sm">{t.date}: {formatDate(order.date as string)}</p>
            </div>
          </header>
          
          <section className="grid grid-cols-2 gap-8 my-8">
            <div>
                <h3 className="text-sm uppercase font-bold text-gray-500 mb-2">{t.supplier}</h3>
                <p className="font-semibold">{order.supplierDetails?.name}</p>
                <p>{t.attention}: {order.supplierDetails?.contactPerson}</p>
                <p>{order.supplierDetails?.email}</p>
                <p>{order.supplierDetails?.phone}</p>
            </div>
            <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 p-4 rounded-lg space-y-2">
                <h3 className="text-sm uppercase font-bold text-gray-600">{t.deliverExclusivelyTo}</h3>
                <p className="font-bold text-lg uppercase">📍 {deliveryLocation?.name}</p>
                {deliveryLocation?.type === 'physical' && (
                  <div className="text-sm text-gray-700">
                    <p>{deliveryLocation.street}, {deliveryLocation.number}</p>
                    <p>{deliveryLocation.postalCode}, {deliveryLocation.city}</p>
                    <p>{deliveryLocation.province}</p>
                  </div>
                )}
                {deliveryLocation?.type === 'mobile' && (
                    <p className="text-sm text-gray-700">{t.mobileWarehouse}</p>
                )}
            </div>
          </section>

          <main className="my-8">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-100">
                        <TableHead className="text-black font-bold w-[50%]">{t.description}</TableHead>
                        <TableHead className="text-right text-black font-bold">{t.quantity}</TableHead>
                        <TableHead className="text-right text-black font-bold">{t.unitPrice}</TableHead>
                        <TableHead className="text-right text-black font-bold">{t.total}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.items.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell>
                              {item.supplierProductCode && (
                                <p className="font-bold text-gray-800">
                                  {t.supplierCode}: {order.supplierDetails?.name} {item.supplierProductCode}
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
                        <TableCell colSpan={3} className="text-right font-bold">{t.subtotal}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(order.total)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">{t.vat}</TableCell>
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
            <p><span className="font-bold">{t.associatedProject}:</span> {order.projectDetails?.name || t.notSpecified}</p>
            <p className="mt-4">{t.includeOrderNumber} <span className="font-bold">{formatDate(order.estimatedDeliveryDate as string)}</span>.</p>
            <p className="text-center text-xs text-gray-500 mt-8">{t.thankYou}</p>
          </footer>
        </div>
        
        <div className="no-print w-full max-w-4xl mt-4 flex flex-col items-center gap-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg p-3 flex items-center gap-2">
                <Info className="h-5 w-5"/>
                <span>{t.printTip}</span>
            </div>
            <Button onClick={handlePrint}>
                <Printer className="mr-2"/>
                {t.printAgain}
            </Button>
        </div>
      </div>
    </>
  );
}
