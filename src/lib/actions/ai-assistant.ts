
'use server';

import { checkItemPrice } from "@/ai/flows/check-item-price";
import type { CheckItemPriceOutput } from "@/ai/flows/check-item-price";

export async function getPriceInsight(
  itemName: string,
  itemPrice: number,
  supplierName: string
): Promise<{ insight: CheckItemPriceOutput | null }> {
  try {
    const insight = await checkItemPrice({ itemName, itemPrice, supplierName });
    return { insight };
  } catch (error) {
    console.error("Error getting price insight:", error);
    return { insight: null };
  }
}
