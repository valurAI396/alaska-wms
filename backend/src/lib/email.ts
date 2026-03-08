import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLowStockAlert(productName: string, sku: string, currentQty: number, threshold: number) {
    if (!process.env.RESEND_API_KEY || !process.env.ALERT_EMAIL_TO) return;

    try {
        await resend.emails.send({
            from: 'ALASKA WMS <alerts@alaskawms.com>',
            to: process.env.ALERT_EMAIL_TO,
            subject: `Alerta de Stock Baixo: ${productName}`,
            html: `
        <h2>Alerta de Stock Baixo</h2>
        <p>O produto <strong>${productName}</strong> (${sku}) atingiu um nível crítico.</p>
        <ul>
          <li><strong>Stock Atual:</strong> ${currentQty}</li>
          <li><strong>Limite Mínimo:</strong> ${threshold}</li>
        </ul>
        <p>Por favor, verifique a reposição o quanto antes.</p>
      `,
        });
    } catch (error) {
        console.error('Failed to send low stock alert:', error);
    }
}
