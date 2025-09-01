

"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Supplier } from '@/lib/types';

const RECENT_SUPPLIERS_KEY = 'recentSuppliers';
const MAX_RECENT_SUPPLIERS = 5;

export function useRecentSuppliers(allSuppliers: Supplier[]) {
  const [recentSupplierIds, setRecentSupplierIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const item = window.localStorage.getItem(RECENT_SUPPLIERS_KEY);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return [];
    }
  });

  const [orderedSuppliers, setOrderedSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    // Reorder suppliers whenever the base list or recent list changes
    const recent = recentSupplierIds
      .map(id => allSuppliers.find(s => s.id === id))
      .filter(Boolean) as Supplier[];

    const other = allSuppliers
      .filter(s => !recentSupplierIds.includes(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));
      
    setOrderedSuppliers([...recent, ...other]);
  }, [allSuppliers, recentSupplierIds]);

  const addRecentSupplier = useCallback((supplierId: string) => {
    const newRecentIds = [
      supplierId,
      ...recentSupplierIds.filter(id => id !== supplierId)
    ].slice(0, MAX_RECENT_SUPPLIERS);

    setRecentSupplierIds(newRecentIds);

    try {
      window.localStorage.setItem(RECENT_SUPPLIERS_KEY, JSON.stringify(newRecentIds));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  }, [recentSupplierIds]);

  return { orderedSuppliers, recentSupplierIds, addRecentSupplier };
}
