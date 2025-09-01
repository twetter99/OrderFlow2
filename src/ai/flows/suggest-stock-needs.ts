
'use server';

/**
 * @fileOverview AI-powered suggestions for stock needs based on project forecasts and historical data.
 *
 * - suggestStockNeeds - A function that handles the stock needs suggestion process.
 * - SuggestStockNeedsInput - The input type for the suggestStockNeeds function.
 * - SuggestStockNeedsOutput - The return type for the suggestStockNeeds function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { inventory, projects } from '@/lib/data';

const SuggestStockNeedsInputSchema = z.object({
  projects: z.string().describe('A JSON string representing the list of planned projects.'),
  inventory: z.string().describe('A JSON string representing the current inventory levels.'),
});
export type SuggestStockNeedsInput = z.infer<typeof SuggestStockNeedsInputSchema>;

const SuggestStockNeedsOutputSchema = z.object({
  stockSuggestions: z.array(z.object({
      itemName: z.string().describe('The name of the item that needs to be ordered.'),
      sku: z.string().describe('The SKU of the item.'),
      quantityToOrder: z.number().describe('The suggested quantity to order.'),
      reason: z.string().describe('The reason for the suggestion (e.g., which projects require it).')
  })).describe('A list of suggested stock adjustments, including items to order, quantities, and reasoning.'),
  explanation: z
    .string()
    .describe('A general explanation of the reasoning behind the stock suggestions.'),
});
export type SuggestStockNeedsOutput = z.infer<typeof SuggestStockNeedsOutputSchema>;

export async function suggestStockNeeds(input: SuggestStockNeedsInput): Promise<SuggestStockNeedsOutput> {
  return suggestStockNeedsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestStockNeedsPrompt',
  input: {schema: SuggestStockNeedsInputSchema},
  output: {schema: SuggestStockNeedsOutputSchema},
  prompt: `Eres un asistente de IA especializado en gestión de inventario y optimización de la cadena de suministro para una empresa que instala sistemas en vehículos. Tu tarea es analizar los proyectos futuros y los niveles de stock actuales para prever las necesidades de material.

Proyectos Planificados (JSON):
{{{projects}}}

Inventario Actual (JSON):
{{{inventory}}}

Analiza los materiales necesarios para cada proyecto planificado. Compara estas necesidades con el inventario actual para identificar posibles déficits.
Calcula la cantidad de cada artículo que se necesita comprar.

Devuelve una lista de sugerencias en el campo 'stockSuggestions'. Para cada sugerencia, incluye el nombre del artículo, su SKU, la cantidad a pedir y una breve razón (por ejemplo, "Requerido para Proyecto X e Y").
En el campo 'explanation', proporciona un resumen de tu análisis, explicando por qué son necesarias estas compras.

Si el stock actual es suficiente para todos los proyectos planificados, devuelve una lista de sugerencias vacía y explica en el campo 'explanation' que no se requieren compras por el momento.
`,
});

const suggestStockNeedsFlow = ai.defineFlow(
  {
    name: 'suggestStockNeedsFlow',
    inputSchema: SuggestStockNeedsInputSchema,
    outputSchema: SuggestStockNeedsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
