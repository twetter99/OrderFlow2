import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore"
import type { PurchaseOrder } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como moneda (EUR)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formatea una fecha a formato español
 */
export function formatDate(date: Date | string | Timestamp): string {
  let dateObj: Date;
  
  if (date instanceof Timestamp) {
    dateObj = date.toDate();
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(date: Date | string | Timestamp): string {
  let dateObj: Date;
  
  if (date instanceof Timestamp) {
    dateObj = date.toDate();
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

/**
 * Formatea un porcentaje
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Trunca un texto a un número específico de caracteres
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Capitaliza la primera letra de un string
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
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