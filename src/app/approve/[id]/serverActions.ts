'use server';

import { updatePurchaseOrderStatus } from '@/app/purchasing/actions';

export async function approveOrderAction(orderId: string) {
  await updatePurchaseOrderStatus(orderId, 'Aprobada', 'Aprobado desde enlace público.');
}

export async function rejectOrderAction(orderId: string) {
  await updatePurchaseOrderStatus(orderId, 'Rechazado', 'Rechazado desde enlace público.');
}