'use server';
/**
 * @fileOverview Implements a Genkit flow to send a travel report approval email.
 * Adapted from send-approval-email.ts to maintain consistency.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as nodemailer from 'nodemailer';

// Define the schema locally
const SendTravelApprovalEmailInputSchema = z.object({
  to: z.string().email().describe('The recipient email address.'),
  reportId: z.string().describe('The ID of the travel report to approve.'),
  reportCode: z.string().describe('The code of the travel report.'),
  technicianName: z.string().describe('The name of the technician.'),
  projectName: z.string().describe('The name of the project.'),
  totalAmount: z.number().describe('The total amount of the travel expenses.'),
  approvalUrl: z.string().url().describe('The secure URL to approve the travel report.'),
  reportDate: z.string().describe('The date the report was created in ISO format.'),
  startDate: z.string().describe('Travel start date.'),
  endDate: z.string().describe('Travel end date.'),
  isReminder: z.boolean().optional().default(false).describe('Whether this email is a reminder.'),
});

type SendTravelApprovalEmailInput = z.infer<typeof SendTravelApprovalEmailInputSchema>;

// Reutilizamos el mismo sendEmailTool (misma configuración de Gmail)
const sendEmailTool = ai.defineTool(
    {
      name: 'sendTravelEmail',
      description: 'Sends a travel report approval email using the configured SMTP server.',
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
       console.log("📧 Attempting to send travel email with credentials:", {
            user: GMAIL_USER,
            hasPassword: !!GMAIL_APP_PASSWORD
       });
       
       if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
            const errorMsg = "Gmail credentials are not configured in environment variables.";
            console.error("❌", errorMsg);
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
        from: `"WINFIN OrderFlow" <${GMAIL_USER}>`,
        to: to,
        subject: subject,
        html: body,
      };
      
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Travel approval email sent successfully to ${to}`, info.messageId);
        return { success: true };
      } catch (error: any) {
        console.error('❌ Nodemailer failed to send travel email:', error);
        return { success: false, error: `Nodemailer error: ${error.message} (Code: ${error.code})` };
      }
    }
);

// Flow directo sin AI (igual que purchase orders)
const sendTravelApprovalEmailFlow = ai.defineFlow(
  {
    name: 'sendTravelApprovalEmailFlow',
    inputSchema: SendTravelApprovalEmailInputSchema,
    outputSchema: z.object({
        success: z.boolean(),
        error: z.string().optional(),
    }),
  },
  async (input) => {
    console.log("🚀 Starting sendTravelApprovalEmailFlow with input:", input);
    
    const formattedAmount = new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(input.totalAmount);

    const formattedStartDate = new Date(input.startDate).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const formattedEndDate = new Date(input.endDate).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // 1. Construir el contenido del email directamente (sin AI)
    const subject = input.isReminder 
        ? `Recordatorio de Aprobación: Informe de Viaje ${input.reportCode}`
        : `Solicitud de Aprobación: Informe de Viaje ${input.reportCode}`;

    const reminderHeader = input.isReminder 
        ? `<p style="color: #d97706; background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;"><strong>⚠️ RECORDATORIO:</strong> El siguiente informe de viaje sigue pendiente de tu aprobación.</p>` 
        : '';
        
    const body = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 26px;">📋 Informe de Viaje</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Solicitud de Aprobación</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${reminderHeader}
          
          <p style="color: #374151; line-height: 1.6;">Hola,</p>
          
          <p style="color: #374151; line-height: 1.6;">Se ha registrado un nuevo informe de gastos de viaje que requiere tu aprobación:</p>
          
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Código de Informe:</td>
                <td style="padding: 10px 0; color: #111827; text-align: right;"><strong>${input.reportCode}</strong></td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Técnico:</td>
                <td style="padding: 10px 0; color: #111827; text-align: right;">${input.technicianName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Proyecto:</td>
                <td style="padding: 10px 0; color: #111827; text-align: right;">${input.projectName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Periodo:</td>
                <td style="padding: 10px 0; color: #111827; text-align: right;">${formattedStartDate} - ${formattedEndDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Importe Total:</td>
                <td style="padding: 10px 0; text-align: right;"><strong style="color: #667eea; font-size: 18px;">${formattedAmount}</strong></td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-weight: 600;">⚠️ Acción Requerida</p>
            <p style="color: #78350f; margin: 8px 0 0 0; font-size: 14px;">Una vez aprobado, el gasto se imputará automáticamente al presupuesto del proyecto.</p>
          </div>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${input.approvalUrl}" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">✅ Revisar y Aprobar Informe</a>
          </p>
          
          <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Si no puedes ver el botón, copia y pega la siguiente URL en tu navegador:</p>
          <p style="word-break: break-all; color: #667eea; font-size: 12px;"><a href="${input.approvalUrl}" style="color: #667eea;">${input.approvalUrl}</a></p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #374151;">Gracias,</p>
            <p style="color: #374151; font-weight: 600;">El equipo de WINFIN OrderFlow</p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>Este es un email automático del sistema de gestión.</p>
        </div>
      </div>
    `;

    // 2. Llamar al tool de email directamente
    try {
      const result = await sendEmailTool({
        to: input.to,
        subject: subject,
        body: body,
      });
      console.log("✅ Email tool result:", result);
      return result;
    } catch (error: any) {
      console.error("❌ Error calling sendEmailTool:", error);
      return { success: false, error: error.message || "Unknown error calling tool" };
    }
  }
);

// Función principal exportada
export async function sendTravelReportApprovalEmail(
  input: SendTravelApprovalEmailInput
): Promise<{ success: boolean; error?: string }> {
  console.log("📧 sendTravelReportApprovalEmail called with:", input);
  
  if (!input.to || !input.reportId || !input.reportCode || !input.approvalUrl) {
    const errorMsg = "Missing required fields for travel approval email";
    console.error("❌", errorMsg, input);
    return { 
      success: false, 
      error: errorMsg,
    };
  }
  
  try {
    const result = await sendTravelApprovalEmailFlow(input);
    console.log("✅ sendTravelApprovalEmailFlow final result:", result);
    return result;
  } catch (error) {
    console.error("❌ Critical error calling sendTravelApprovalEmailFlow:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to execute send travel approval email flow" 
    };
  }
}

// Flow para recordatorios (opcional, para uso futuro)
const sendTravelReminderEmailFlow = ai.defineFlow(
    {
      name: 'sendTravelReminderEmailFlow',
      inputSchema: SendTravelApprovalEmailInputSchema,
      outputSchema: z.object({
          success: z.boolean(),
          error: z.string().optional(),
      }),
    },
    async (input) => {
        return sendTravelApprovalEmailFlow({ ...input, isReminder: true });
    }
);

export async function sendTravelReminderEmail(
  input: SendTravelApprovalEmailInput
): Promise<{ success: boolean; error?: string }> {
    console.log("📧 sendTravelReminderEmail called with:", input);
    return sendTravelReminderEmailFlow(input);
}