
'use server';

/**
 * @fileOverview Implements a Genkit flow to check if the price of an item in a purchase request
 *               is significantly higher than similar items from other suppliers.
 *
 * - checkItemPrice - A function that checks the item price.
 * - CheckItemPriceInput - The input type for the checkItemPrice function.
 * - CheckItemPriceOutput - The return type for the checkItemPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { suppliers, purchaseOrders } from '@/lib/data';

const CheckItemPriceInputSchema = z.object({
  itemName: z.string().describe('The name of the item.'),
  itemPrice: z.number().describe('The price of the item in the purchase request.'),
  supplierName: z.string().describe('The name of the supplier for the item.'),
});
export type CheckItemPriceInput = z.infer<typeof CheckItemPriceInputSchema>;

const CheckItemPriceOutputSchema = z.object({
  isPriceTooHigh: z.boolean().describe('Whether the item price is significantly higher than similar items from other suppliers.'),
  suggestedSuppliers: z.array(z.string()).describe('A list of suggested suppliers with lower prices for the item.'),
  averagePrice: z.number().describe('The average price of the item from other suppliers.'),
});
export type CheckItemPriceOutput = z.infer<typeof CheckItemPriceOutputSchema>;

export async function checkItemPrice(input: CheckItemPriceInput): Promise<CheckItemPriceOutput> {
  return checkItemPriceFlow(input);
}

const getSuggestedSuppliers = ai.defineTool({
  name: 'getSuggestedSuppliers',
  description: 'Retrieves a list of suppliers offering the specified item at a lower price based on historical purchase order data.',
  inputSchema: z.object({
    itemName: z.string().describe('The name of the item to find suppliers for.'),
    currentSupplier: z.string().describe('The name of the current supplier.'),
    currentPrice: z.number().describe('The current price of the item.'),
  }),
  outputSchema: z.object({
    alternativeSuppliers: z.array(z.string()).describe('A list of supplier names offering the item at a lower price.'),
    averagePrice: z.number().describe('The average price of the item across all suppliers.'),
  }),
},
async ({ itemName, currentSupplier, currentPrice }) => {
    const alternativeSuppliers = new Set<string>();
    const prices: number[] = [];

    // Find purchase orders containing the item from different suppliers
    for (const order of purchaseOrders) {
      for (const item of order.items) {
          if (item.itemName.toLowerCase() === itemName.toLowerCase()) {
            prices.push(item.price);
            if (order.supplier !== currentSupplier && item.price < currentPrice) {
              alternativeSuppliers.add(order.supplier);
            }
          }
      }
    }
    
    const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    return {
      alternativeSuppliers: Array.from(alternativeSuppliers),
      averagePrice
    };
});

const checkItemPricePrompt = ai.definePrompt({
  name: 'checkItemPricePrompt',
  input: {schema: CheckItemPriceInputSchema},
  output: {schema: CheckItemPriceOutputSchema},
  tools: [getSuggestedSuppliers],
  prompt: `Eres un analista de adquisiciones experto. Tu tarea es determinar si el precio de un artículo en una solicitud de compra es significativamente más alto que el precio promedio de otros proveedores.

  Nombre del Artículo: {{{itemName}}}
  Precio del Artículo: {{{itemPrice}}}
  Nombre del Proveedor: {{{supplierName}}}

  Primero, utiliza tus conocimientos y las herramientas disponibles para investigar el precio promedio de este artículo de otros proveedores. Llama a la herramienta 'getSuggestedSuppliers' para obtener los precios históricos y proveedores alternativos.

  Compara el precio actual del artículo ({{{itemPrice}}}) con el precio promedio devuelto por la herramienta. Si el precio del artículo es significativamente más alto (por ejemplo, más de un 20% más alto que el promedio), entonces establece isPriceTooHigh en verdadero. Si no hay datos históricos, asume que el precio no es demasiado alto a menos que parezca obviamente incorrecto.

  Usa la lista de 'alternativeSuppliers' devuelta por la herramienta para rellenar el campo 'suggestedSuppliers'.

  Devuelve un objeto JSON con el siguiente formato:
  {
    "isPriceTooHigh": boolean,
    "suggestedSuppliers": string[],
    "averagePrice": number
  }`,
});

const checkItemPriceFlow = ai.defineFlow(
  {
    name: 'checkItemPriceFlow',
    inputSchema: CheckItemPriceInputSchema,
    outputSchema: CheckItemPriceOutputSchema,
  },
  async input => {
    const {output} = await checkItemPricePrompt(input);
    return output!;
  }
);
