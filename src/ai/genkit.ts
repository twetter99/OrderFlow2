import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  // PAUSED: Gemini API temporalmente desactivada (2026-03-01)
  // Para reactivar: quitar apiKey: false, descomentar model, y descomentar GEMINI_API_KEY en .env
  plugins: [googleAI({ apiKey: false })],
  // model: 'googleai/gemini-2.5-flash-preview',
});
