import { db } from '@/lib/firebase-admin';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { CheckCircle, XCircle, Package, CalendarDays, AlertTriangle, Info, User, Truck } from 'lucide-react';
import type { PurchaseOrder, Project } from '@/lib/types';
import { convertTimestampsToISO } from '@/lib/utils';
import { ApproveButton, RejectButton } from './actions';

// Función para obtener los detalles de la orden desde Firestore
async function getOrderDetails(id: string): Promise<PurchaseOrder | null> {
 try {
   const orderDoc = await db.collection('purchaseOrders').doc(id).get();

   if (!orderDoc.exists) {
     console.warn(`No se encontró la orden con ID: ${id}`);
     return null;
   }
   
   const orderData = orderDoc.data() as PurchaseOrder;
   
   // Si no tiene nombre de proyecto, lo buscamos
   if (!orderData.projectName && orderData.project) {
     try {
       const projectDoc = await db.collection('projects').doc(orderData.project).get();
       
       if (projectDoc.exists) {
         const projectData = projectDoc.data() as Project;
         orderData.projectName = projectData?.name || 'Proyecto sin nombre';
       }
     } catch (e) {
       console.error('Error al cargar el proyecto:', e);
     }
   }

   // Convertimos los Timestamps de Firebase a un formato estándar
   return convertTimestampsToISO({ id: orderDoc.id, ...orderData });

 } catch (error) {
   console.error("Error al obtener detalles de la orden:", error);
   return null;
 }
}

// Componente para mostrar un aviso si la orden ya fue procesada
function StatusBadge({ status }: { status: PurchaseOrder['status'] }) {
   const statusInfo = {
       'Aprobada': { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'Esta orden ya fue APROBADA.', bg: 'bg-green-50 border-green-200 text-green-800' },
       'Rechazado': { icon: <XCircle className="h-5 w-5 text-red-500" />, text: 'Esta orden ya fue RECHAZADA.', bg: 'bg-red-50 border-red-200 text-red-800' },
       'Enviada al Proveedor': { icon: <Info className="h-5 w-5 text-blue-500" />, text: 'Esta orden ya fue enviada al proveedor.', bg: 'bg-blue-50 border-blue-200 text-blue-800' },
       'Recibida': { icon: <Info className="h-5 w-5 text-purple-500" />, text: 'Esta orden ya ha sido recibida.', bg: 'bg-purple-50 border-purple-200 text-purple-800' },
       'Recibida Parcialmente': { icon: <Info className="h-5 w-5 text-yellow-500" />, text: 'Esta orden ya ha sido recibida parcialmente.', bg: 'bg-yellow-50 border-yellow-200 text-yellow-800' }
   };

   // Solo mostramos el aviso si el estado no es 'Pendiente de Aprobación'
   if (status !== 'Pendiente de Aprobación') {
       const info = statusInfo[status];
       if (info) {
           return (
               <div className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${info.bg}`}>
                   {info.icon}
                   <span className="font-medium">{info.text}</span>
               </div>
           );
       }
   }
   return null;
}

// --- CORRECCIÓN APLICADA AQUÍ ---
// Se ajusta la forma de recibir y usar los 'params' para ser compatible con Next.js 16+
export default async function PublicApprovalPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const order = await getOrderDetails(id);

 // Si la orden no se encuentra, mostramos una página de error clara
 if (!order) {
   return (
     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4">
       <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
       <h1 className="text-2xl font-bold text-gray-800">Orden de Compra no encontrada</h1>
       <p className="text-gray-600 mt-2">
         El enlace de aprobación puede ser incorrecto, o la orden ha sido eliminada.
       </p>
     </div>
   )
 }

 const isActionable = order.status === 'Pendiente de Aprobación';
 const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

 return (
   <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-3 sm:px-6 py-6 font-sans">
     <div className="w-full max-w-4xl mx-auto">
       <header className="mb-6 sm:mb-8 text-center">
           <Image 
               src="/images/logo.png" 
               alt="Logo de la empresa" 
               width={160} 
               height={40}
               className="mx-auto mb-4 sm:mb-6 w-[120px] sm:w-[200px] h-auto"
           />
           <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900">Solicitud de Aprobación</h1>
           <p className="mt-1 sm:mt-2 text-sm sm:text-lg text-gray-600">Revisa los detalles de la orden de compra.</p>
       </header>

       <Card className="w-full shadow-lg">
         <CardHeader className="px-3 sm:px-6">
            <StatusBadge status={order.status} />
         </CardHeader>
         <CardContent className="grid gap-4 sm:gap-6 px-3 sm:px-6">
           {/* Detalles principales de la orden */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 text-sm">
               <div className="flex sm:block items-center justify-between sm:space-y-1">
                   <p className="text-gray-500 font-semibold flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"><Truck className="h-3 w-3 sm:h-4 sm:w-4"/> Proveedor</p>
                   <p className="font-medium text-gray-900 text-sm sm:text-base">{order.supplier}</p>
               </div>
               <div className="flex sm:block items-center justify-between sm:space-y-1">
                   <p className="text-gray-500 font-semibold flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"><User className="h-3 w-3 sm:h-4 sm:w-4"/> Proyecto</p>
                   <p className="font-medium text-gray-900 text-sm sm:text-base">{order.projectName || 'No especificado'}</p>
               </div>
               <div className="flex sm:block items-center justify-between sm:space-y-1">
                   <p className="text-gray-500 font-semibold flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"><CalendarDays className="h-3 w-3 sm:h-4 sm:w-4"/> Fecha</p>
                   <p className="font-medium text-gray-900 text-sm sm:text-base">{new Date(order.date as string).toLocaleDateString('es-ES')}</p>
               </div>
           </div>

           {/* Artículos - Tabla en desktop, Cards en móvil */}
           <div>
               <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2"><Package className="h-4 w-4 sm:h-5 sm:w-5"/> Artículos</h3>
               
               {/* Tabla para pantallas grandes */}
               <div className="hidden sm:block border rounded-lg overflow-hidden">
                   <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50">
                       <tr>
                           <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                           <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                           <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unitario</th>
                           <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                       </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                       {order.items.map((item, index) => (
                           <tr key={index}>
                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.itemName}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.price)}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold text-right">{formatCurrency(item.price * item.quantity)}</td>
                           </tr>
                       ))}
                       </tbody>
                   </table>
               </div>

               {/* Cards para móvil */}
               <div className="sm:hidden space-y-3">
                   {order.items.map((item, index) => (
                       <div key={index} className="border rounded-lg p-3 bg-white">
                           <p className="font-medium text-gray-900 text-sm mb-2">{item.itemName}</p>
                           <div className="flex justify-between text-xs text-gray-500">
                               <span>Cantidad: {item.quantity}</span>
                               <span>P/U: {formatCurrency(item.price)}</span>
                           </div>
                           <div className="flex justify-end mt-1">
                               <span className="text-sm font-semibold text-gray-700">{formatCurrency(item.price * item.quantity)}</span>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
           
           {/* Resumen de totales */}
            <div className="flex justify-end">
               <div className="w-full sm:max-w-xs space-y-2">
                   <div className="flex justify-between text-sm text-gray-600">
                       <span>Subtotal</span>
                       <span>{formatCurrency(order.total)}</span>
                   </div>
                    <div className="flex justify-between text-sm text-gray-600">
                       <span>IVA (21%)</span>
                       <span>{formatCurrency(order.total * 0.21)}</span>
                   </div>
                   <div className="flex justify-between text-base sm:text-lg font-bold text-gray-900 pt-2 border-t mt-2">
                       <span>TOTAL</span>
                       <span>{formatCurrency(order.total * 1.21)}</span>
                   </div>
               </div>
           </div>

         </CardContent>
         {/* Mostramos los botones solo si la orden está pendiente */}
         {isActionable && (
           <CardFooter className="bg-gray-50 px-3 sm:px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
               <RejectButton orderId={order.id} />
               <ApproveButton orderId={order.id} />
           </CardFooter>
         )}
       </Card>
     </div>
   </div>
 )
}

