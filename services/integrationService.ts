import { Property } from "../types";

type WebhookEvent = 'publish' | 'update' | 'status_change' | 'delete';

/**
 * Envia dados do imóvel para um Webhook externo (n8n, Zapier, etc)
 */
export const triggerIntegrationWebhook = async (
    webhookUrl: string | undefined,
    event: WebhookEvent,
    property: Property | { id: string, code?: string }
) => {
    if (!webhookUrl) return;

    // Não bloqueia a thread principal, "fire and forget"
    try {
        const payload = {
            event,
            timestamp: new Date().toISOString(),
            property: property
        };

        console.log(`[Integration] Enviando evento ${event} para n8n...`);

        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        }).then(res => {
            if (res.ok) console.log(`[Integration] Sucesso: ${event}`);
            else console.warn(`[Integration] Falha: ${res.statusText}`);
        }).catch(err => {
            console.error(`[Integration] Erro de conexão:`, err);
        });

    } catch (error) {
        console.error("Erro ao preparar payload de integração", error);
    }
};