import { db, admin } from '@/lib/firebase-admin';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { CheckCircle, XCircle, Package, CalendarDays, AlertTriangle, Info, HardHat, User, Truck, Building } from 'lucide-react';
import type { PurchaseOrder, StatusHistoryEntry, Project } from '@/lib/types';
import { cn, convertTimestampsToISO } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ApproveButton } from '@/lib/actions/ai-assistant';


async function getOrderDetails(id: string): Promise<PurchaseOrder | null> {
 try {
   // Usar el Admin SDK directamente con db
   const orderDoc = await db.collection('purchaseOrders').doc(id).get();

   if (!orderDoc.exists) {
     console.warn(`No se encontró la orden con ID: ${id}`);
     return null;
   }
   
   const orderData = orderDoc.data() as PurchaseOrder;
   
   // Debug para verificar
   console.log('Order data from Firestore:', {
     id: orderDoc.id,
     project: orderData.project,
     projectName: orderData.projectName
   });

   // Si por alguna razón no tiene projectName, lo buscamos
   if (!orderData.projectName && orderData.project) {
     try {
       const projectDoc = await db.collection('projects').doc(orderData.project).get();
       
       if (projectDoc.exists) {
         const projectData = projectDoc.data() as Project;
         orderData.projectName = projectData?.name || 'Proyecto sin nombre';
         console.log('Loaded project name:', orderData.projectName);
       }
     } catch (e) {
       console.error('Error loading project:', e);
     }
   }

   // Convertir timestamps y retornar
   return convertTimestampsToISO({ id: orderDoc.id, ...orderData });

 } catch (error) {
   console.error("Error fetching order details:", error);
   return null;
 }
}

function StatusBadge({ status }: { status: PurchaseOrder['status'] }) {
   const statusInfo = {
       'Aprobada': { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'Esta orden ya fue APROBADA.', bg: 'bg-green-50 border-green-200 text-green-800' },
       'Rechazado': { icon: <XCircle className="h-5 w-5 text-red-500" />, text: 'Esta orden ya fue RECHAZADA.', bg: 'bg-red-50 border-red-200 text-red-800' },
       'Enviada al Proveedor': { icon: <Info className="h-5 w-5 text-blue-500" />, text: 'Esta orden ya fue enviada al proveedor.', bg: 'bg-blue-50 border-blue-200 text-blue-800' },
       'Recibida': { icon: <Info className="h-5 w-5 text-purple-500" />, text: 'Esta orden ya ha sido recibida.', bg: 'bg-purple-50 border-purple-200 text-purple-800' },
       'Recibida Parcialmente': { icon: <Info className="h-5 w-5 text-yellow-500" />, text: 'Esta orden ya ha sido recibida parcialmente.', bg: 'bg-yellow-50 border-yellow-200 text-yellow-800' }
   };

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

export default async function PublicApprovalPage({ params }: { params: { id: string }}) {
 const order = await getOrderDetails(params.id);

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
   <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
     <div className="w-full max-w-4xl mx-auto">
       <header className="mb-8 text-center">
           <Image 
               src="/images/logo.png" 
               alt="WINFIN Logo" 
               width={200} 
               height={50}
               className="mx-auto mb-6"
           />
           <h1 className="text-4xl font-bold tracking-tight text-gray-900">Solicitud de Aprobación</h1>
           <p className="mt-2 text-lg text-gray-600">Revisa los detalles de la orden de compra antes de tomar una acción.</p>
       </header>

       <Card className="w-full shadow-lg">
         <CardHeader>
            <StatusBadge status={order.status} />
         </CardHeader>
         <CardContent className="grid gap-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
               <div className="space-y-1">
                   <p className="text-gray-500 font-semibold flex items-center gap-2"><Truck className="h-4 w-4"/> Proveedor</p>
                   <p className="font-medium text-gray-900 text-base">{order.supplier}</p>
               </div>
               <div className="space-y-1">
                   <p className="text-gray-500 font-semibold flex items-center gap-2"><User className="h-4 w-4"/> Proyecto</p>
                   <p className="font-medium text-gray-900 text-base">{order.projectName || 'Proyecto no especificado'}</p>
               </div>
               <div className="space-y-1">
                   <p className="text-gray-500 font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4"/> Fecha de Orden</p>
                   <p className="font-medium text-gray-900 text-base">{new Date(order.date as string).toLocaleDateString('es-ES')}</p>
               </div>
           </div>

           <div>
               <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2"><Package className="h-5 w-5"/> Artículos Solicitados</h3>
               <div className="border rounded-lg overflow-hidden">
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
           </div>
           
            <div className="flex justify-end">
               <div className="w-full max-w-xs space-y-2">
                   <div className="flex justify-between text-sm text-gray-600">
                       <span>Subtotal</span>
                       <span>{formatCurrency(order.total)}</span>
                   </div>
                    <div className="flex justify-between text-sm text-gray-600">
                       <span>IVA (21%)</span>
                       <span>{formatCurrency(order.total * 0.21)}</span>
                   </div>
                   <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t mt-2">
                       <span>TOTAL</span>
                       <span>{formatCurrency(order.total * 1.21)}</span>
                   </div>
               </div>
           </div>

         </CardContent>
         {isActionable && (
           <CardFooter className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
               {/* <RejectButton/> */}
               <ApproveButton orderId={order.id} />
           </CardFooter>
         )}
       </Card>
     </div>
   </div>
 )
}



