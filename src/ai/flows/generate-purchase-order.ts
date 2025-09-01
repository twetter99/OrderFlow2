
'use server';

/**
 * @fileOverview Implements a Genkit flow to generate a purchase order from a natural language prompt.
 *
 * - generatePurchaseOrder - A function that handles the purchase order generation process.
 * - GeneratePurchaseOrderInput - The input type for the generatePurchaseOrder function.
 * - GeneratePurchaseOrderOutput - The return type for the generatePurchaseOrder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { suppliers, inventory } from '@/lib/data';

const GeneratePurchaseOrderInputSchema = z.object({
  prompt: z.string().describe('The natural language prompt describing the purchase order.'),
});
export type GeneratePurchaseOrderInput = z.infer<typeof GeneratePurchaseOrderInputSchema>;

const GeneratePurchaseOrderOutputSchema = z.object({
  supplier: z.string().describe("The name of the supplier to order from."),
  items: z.array(z.object({
    itemName: z.string().describe("The name of the item being ordered."),
    quantity: z.number().describe("The quantity to order."),
    price: z.number().describe("The unit price of the item."),
  })).describe("The list of items to include in the purchase order."),
  clarificationNeeded: z.string().optional().describe("A question to ask the user if the prompt is ambiguous or information is missing.")
});
export type GeneratePurchaseOrderOutput = z.infer<typeof GeneratePurchaseOrderOutputSchema>;


const findSupplierTool = ai.defineTool({
    name: 'findSupplier',
    description: 'Finds a supplier by name from the list of available suppliers.',
    inputSchema: z.object({ name: z.string().describe('The name of the supplier to find.') }),
    outputSchema: z.object({
        id: z.string(),
        name: z.string(),
    }).nullable(),
}, async ({ name }) => {
    const found = suppliers.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
    return found ? { id: found.id, name: found.name } : null;
});


const findItemTool = ai.defineTool({
    name: 'findItem',
    description: 'Finds an item by name from the inventory list to get its details like current price.',
    inputSchema: z.object({ name: z.string().describe('The name of the item to find.') }),
    outputSchema: z.object({
        id: z.string(),
        name: z.string(),
        unitCost: z.number(),
    }).nullable(),
}, async ({ name }) => {
    const found = inventory.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
    return found ? { id: found.id, name: found.name, unitCost: found.unitCost } : null;
});


export async function generatePurchaseOrder(input: GeneratePurchaseOrderInput): Promise<GeneratePurchaseOrderOutput> {
  return generatePurchaseOrderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePurchaseOrderPrompt',
  input: {schema: GeneratePurchaseOrderInputSchema},
  output: {schema: GeneratePurchaseOrderOutputSchema},
  tools: [findSupplierTool, findItemTool],
  prompt: `Eres un asistente de IA experto en crear órdenes de compra. Analiza el prompt del usuario para generar una orden de compra estructurada.

Prompt del usuario: {{{prompt}}}

Tu proceso:
1.  **Identifica al proveedor**: Usa la herramienta 'findSupplier' para buscar al proveedor mencionado.
    - Si no encuentras al proveedor, **no intentes adivinar**. Formula una pregunta al usuario en el campo 'clarificationNeeded' para que elija uno de la lista de proveedores existentes. Por ejemplo: "No he encontrado al proveedor 'X'. ¿Te refieres a uno de estos: [lista de proveedores]?".
2.  **Identifica los artículos y cantidades**: Para cada artículo en el prompt:
    - Usa 'findItem' para obtener sus detalles y precio.
    - Si no encuentras un artículo, o la descripción es ambigua (ej. "cables"), pide una aclaración en 'clarificationNeeded'.
    - Si falta la cantidad, pide que la especifiquen en 'clarificationNeeded'.
3.  **Construye el resultado**:
    - Si tienes toda la información (proveedor válido, artículos específicos y cantidades), rellena los campos 'supplier' e 'items'.
    - Si falta información, deja 'supplier' e 'items' vacíos y rellena 'clarificationNeeded' con tu pregunta.

IMPORTANTE: Siempre debes devolver un objeto JSON válido que cumpla con el schema.
- **Si todo está claro**, devuelve el objeto con la orden de compra y sin 'clarificationNeeded'.
- **Si necesitas aclarar algo**, devuelve un objeto con 'supplier' vacío, 'items' como un array vacío, y el campo 'clarificationNeeded' con tu pregunta.
- **NUNCA** devuelvas null ni un objeto sin la estructura base.`,
});

const generatePurchaseOrderFlow = ai.defineFlow(
  {
    name: 'generatePurchaseOrderFlow',
    inputSchema: GeneratePurchaseOrderInputSchema,
    outputSchema: GeneratePurchaseOrderOutputSchema,
  },
  async input => {
    try {
        const {output} = await prompt(input);
        
        if (!output) {
          console.warn("AI returned a null structure. Returning default empty object with clarification.");
          return {
            supplier: "",
            items: [],
            clarificationNeeded: "Ha ocurrido un error inesperado. ¿Podrías reformular tu petición de forma más específica?",
          };
        }
        
        // Final validation just in case, although the prompt and try/catch should handle most cases.
        if (output.clarificationNeeded) {
            return {
                supplier: "",
                items: [],
                clarificationNeeded: output.clarificationNeeded,
            };
        }

        if (!output.supplier || !Array.isArray(output.items)) {
          console.warn("AI returned a malformed structure despite safeguards. Returning default empty object.");
          return {
            supplier: "",
            items: [],
            clarificationNeeded: "La IA no ha podido estructurar el pedido. Por favor, sé más específico con el proveedor, los artículos y las cantidades.",
          };
        }
        
        return output;

    } catch (error) {
        console.error("Error during generatePurchaseOrderFlow, likely due to AI output validation. Returning default empty object.", error);
        return {
            supplier: "",
            items: [],
            clarificationNeeded: "Ha ocurrido un error procesando tu solicitud. Por favor, intenta ser más detallado.",
        };
    }
  }
);
