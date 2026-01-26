import { SmtpConfig } from "../types";

export interface EmailOptions {
    to: string;
    subject: string;
    body: string;
}

/**
 * Simulates sending an email via SMTP.
 */
export const sendSystemEmail = async (options: EmailOptions, config?: SmtpConfig): Promise<boolean> => {
    if (!config || !config.enabled) {
        console.warn("Email service disabled or not configured.");
        return false;
    }

    if (!options.to || !options.to.includes('@')) {
        console.error("Invalid email recipient.");
        return false;
    }

    // SIMULATION OF SMTP SENDING
    console.group('%c 📧 Email System Simulation (SMTP)', 'color: #0ea5e9; font-weight: bold; font-size: 12px;');
    console.log(`Connecting to SMTP: ${config.host}:${config.port}`);
    console.log(`Auth User: ${config.user}`);
    console.log(`From: ${config.fromName} <${config.user}>`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:`, options.body);
    console.groupEnd();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return true;
};

// Default Templates (Strings with {{placeholders}})
export const DEFAULT_EMAIL_TEMPLATES = {
    propertyRejected: `Olá, {{ownerName}}.

O imóvel "{{propertyTitle}}" (Código: {{propertyCode}}) precisa de ajustes antes de ser publicado.

Motivo apontado pela revisão:
"{{reason}}"

Por favor, acesse o sistema, realize as correções necessárias e envie para aprovação novamente.

Atenciosamente,
Equipe.`,

    propertyApproved: `Parabéns, {{ownerName}}!

O seu imóvel "{{propertyTitle}}" (Código: {{propertyCode}}) foi aprovado e já está visível em nossa vitrine de imóveis.

Sucesso nas vendas!
Atenciosamente,
Equipe.`,

    leadAssigned: `Olá, {{ownerName}}.

Você recebeu um novo lead em sua carteira!

Nome: {{clientName}}
Telefone: {{clientPhone}}

Acesse o CRM agora mesmo para iniciar o atendimento.

Atenciosamente,
Administração.`
};