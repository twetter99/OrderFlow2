
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore"
import type { PurchaseOrder } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recorre un objeto o array de forma recursiva y convierte cualquier
 * instancia de Timestamp de Firestore a una cadena de texto ISO.
 * Esto es crucial para pasar datos de Server Components a Client Components.
 * @param data El objeto o array a limpiar.
 * @returns El objeto o array limpio y serializable.
 */
export const convertTimestampsToISO = (data: any): any => {
  if (!data) return data;

  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => convertTimestampsToISO(item));
  }
  
  // Solo procesar objetos que no sean nulos y no sean arrays
  if (typeof data === 'object' && data !== null) {
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = convertTimestampsToISO(data[key]);
      }
    }
    return newObj;
  }

  return data;
};


export const convertPurchaseOrderTimestamps = (orderData: any): PurchaseOrder => {
  if (!orderData) return orderData;
  return convertTimestampsToISO(orderData);
};
