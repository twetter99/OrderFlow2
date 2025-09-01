
'use server';
/**
 * @fileOverview Implements a Genkit flow to send a purchase order approval email.
 *
 * - sendApprovalEmail - A function that handles the email sending process.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as nodemailer from 'nodemailer';

// Define the schema and type locally within this file.
// This avoids exporting non-function objects from a "use server" file.
const SendApprovalEmailInputSchema = z.object({
  to: z.string().email().describe('The recipient email address.'),
  orderId: z.string().describe('The ID of the purchase order to approve.'),
  orderNumber: z.string().describe('The number of the purchase order.'),
  orderAmount: z.number().describe('The total amount of the purchase order.'),
  approvalUrl: z.string().url().describe('The secure URL to approve the purchase order.'),
  orderDate: z.string().describe("The date the order was created in ISO format."),
  isReminder: z.boolean().optional().default(false).describe("Whether this email is a reminder."),
  projectName: z.string().optional().describe("The descriptive name of the project."),
});

// Infer the type from the local schema.
type SendApprovalEmailInput = z.infer<typeof SendApprovalEmailInputSchema>;

// This tool remains the same, as it correctly handles the email sending logic.
const sendEmailTool = ai.defineTool(
    {
      name: 'sendEmail',
      description: 'Sends an email to the specified recipient using the configured SMTP server.',
      inputSchema: z.object({
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        error: z.string().optional(),
      }),
    },
    async ({to, subject, body}) => {
       const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
       console.log("Attempting to send email with credentials:", {
            user: GMAIL_USER,
            hasPassword: !!GMAIL_APP_PASSWORD
       });
       
       if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
            const errorMsg = "Gmail credentials are not configured in environment variables.";
            console.error(errorMsg);
            return { success: false, error: errorMsg };
       }
       
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASSWORD,
        },
      });
      
      const mailOptions = {
        from: `"OrderFlow" <${GMAIL_USER}>`,
        to: to,
        subject: subject,
        html: body,
      };
      
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}`, info.messageId);
        return { success: true };
      } catch (error: any) {
        // Log the full error object for detailed diagnostics
        console.error('❌ Nodemailer failed to send email:', error);
        return { success: false, error: `Nodemailer error: ${error.message} (Code: ${error.code})` };
      }
    }
);

// REFACTORED FLOW: Direct, no AI prompt involved for this business logic.
const sendApprovalEmailFlow = ai.defineFlow(
  {
    name: 'sendApprovalEmailFlow',
    inputSchema: SendApprovalEmailInputSchema,
    outputSchema: z.object({
        success: z.boolean(),
        error: z.string().optional(),
    }),
  },
  async (input) => {
    console.log("Starting DIRECT sendApprovalEmailFlow with input:", input);
    
    // 1. Construct the email content directly. No AI needed.
    const subject = input.isReminder 
        ? `Recordatorio de Aprobación: Orden de Compra ${input.orderNumber}`
        : `Solicitud de Aprobación: Orden de Compra ${input.orderNumber}`;

    const reminderHeader = input.isReminder 
        ? `<p style="color: #d97706;"><strong>RECORDATORIO:</strong> La siguiente solicitud de compra sigue pendiente de tu aprobación.</p>` 
        : '';
        
    const body = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Solicitud de Aprobación de Orden de Compra</h2>
        ${reminderHeader}
        <p>Hola,</p>
        <p>Se ha generado una nueva orden de compra que requiere tu aprobación:</p>
        <ul>
          <li><strong>Número de Orden:</strong> ${input.orderNumber}</li>
          <li><strong>Proyecto:</strong> ${input.projectName || 'No especificado'}</li>
          <li><strong>Importe Total:</strong> ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(input.orderAmount)}</li>
          <li><strong>Fecha de Orden:</strong> ${new Date(input.orderDate).toLocaleDateString('es-ES')}</li>
        </ul>
        <p>Por favor, revisa los detalles y aprueba la orden haciendo clic en el siguiente botón:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${input.approvalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Aprobar Orden de Compra</a>
        </p>
        <p>Si no puedes ver el botón, copia y pega la siguiente URL en tu navegador:</p>
        <p><a href="${input.approvalUrl}">${input.approvalUrl}</a></p>
        <br/>
        <p>Gracias,</p>
        <p><strong>El equipo de OrderFlow</strong></p>
      </div>
    `;

    // 2. Call the email tool directly.
    try {
      const result = await sendEmailTool({
        to: input.to,
        subject: subject,
        body: body,
      });
      console.log("Direct tool call result:", result);
      return result;
    } catch (error: any) {
      console.error("Error directly calling sendEmailTool:", error);
      return { success: false, error: error.message || "Unknown error calling tool" };
    }
  }
);


export async function sendApprovalEmail(input: SendApprovalEmailInput): Promise<{ success: boolean; error?: string }> {
  console.log("sendApprovalEmail called with:", input);
  
  if (!input.to || !input.orderId || !input.orderNumber || !input.approvalUrl) {
    const errorMsg = "Missing required fields for approval email";
    console.error(errorMsg, input);
    return { 
      success: false, 
      error: errorMsg,
    };
  }
  
  try {
    const result = await sendApprovalEmailFlow(input);
    console.log("sendApprovalEmailFlow final result:", result);
    return result;
  } catch (error) {
    console.error("Critical error calling sendApprovalEmailFlow:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to execute send approval email flow" 
    };
  }
}

// Flow específico para enviar recordatorios
const sendReminderEmailFlow = ai.defineFlow(
    {
      name: 'sendReminderEmailFlow',
      inputSchema: SendApprovalEmailInputSchema,
      outputSchema: z.object({
          success: z.boolean(),
          error: z.string().optional(),
      }),
    },
    async (input) => {
        // Llama al flujo principal, pero forzando el flag de recordatorio
        return sendApprovalEmailFlow({ ...input, isReminder: true });
    }
);

// Función exportada para ser llamada desde server actions o futuras Cloud Functions
export async function sendReminderEmail(input: SendApprovalEmailInput): Promise<{ success: boolean; error?: string }> {
    console.log("sendReminderEmail called with:", input);
    return sendReminderEmailFlow(input);
}
