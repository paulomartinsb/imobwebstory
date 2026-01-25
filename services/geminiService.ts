import { GoogleGenAI } from "@google/genai";
import { Property, Client } from "../types";

// Initialize the API client
// Note: In a real app, ensure process.env.API_KEY is defined in your build environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface PropertyGenerationData {
    title: string;
    type: string;
    price: number;
    area: number;
    bedrooms: number;
    bathrooms: number;
    address: string;
    features: string[];
    promptTemplate: string; // New field for the dynamic prompt
}

export const generatePropertyDescription = async (
  data: PropertyGenerationData
): Promise<string> => {
  try {
    const featureList = data.features.length > 0 ? data.features.join(', ') : 'Não especificado';
    const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.price);

    // Dynamic replacement of placeholders in the custom prompt
    let prompt = data.promptTemplate;
    
    // Replacement map
    const replacements: Record<string, string | number> = {
        '{{title}}': data.title,
        '{{type}}': data.type,
        '{{price}}': priceFormatted,
        '{{address}}': data.address,
        '{{area}}': data.area,
        '{{bedrooms}}': data.bedrooms,
        '{{bathrooms}}': data.bathrooms,
        '{{features}}': featureList
    };

    // Perform replacements
    for (const [key, value] of Object.entries(replacements)) {
        prompt = prompt.split(key).join(String(value));
    }

    // Fallback if prompt is empty (sanity check)
    if (!prompt.trim()) {
        return "Erro: O template do prompt está vazio. Contate o administrador.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a descrição.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao gerar descrição com IA. Tente novamente.";
  }
};

export const calculateClientMatch = async (client: Client, property: Property): Promise<{ score: number; reason: string }> => {
  try {
    const locations = client.desiredLocation && client.desiredLocation.length > 0 
        ? client.desiredLocation.join(', ') 
        : 'Não especificado';
    
    const minBudget = client.minBudget ? `R$ ${client.minBudget}` : '0';

    const prompt = `
      Atue como um corretor imobiliário sênior. Analise a compatibilidade (Match) entre este cliente e este imóvel.
      
      PERFIL DO CLIENTE:
      - Nome: ${client.name}
      - Orçamento: De ${minBudget} Até R$ ${client.budget}
      - Tipos de Interesse: ${client.interest.join(', ')}
      - Locais Desejados: ${locations}
      - Mínimo Quartos: ${client.minBedrooms || 0}
      - Área Mínima: ${client.minArea || 0}m²
      - Observações: ${client.notes || ''}

      IMÓVEL DISPONÍVEL:
      - Título: ${property.title}
      - Tipo: ${property.type}
      - Preço: R$ ${property.price}
      - Localização: ${property.address}
      - Quartos: ${property.bedrooms}
      - Área: ${property.area}m²
      - Características: ${property.features.join(', ')}

      Retorne APENAS um objeto JSON (sem markdown, sem explicações extras) com o seguinte formato exato:
      {
        "score": number,
        "reason": "string"
      }
      
      Onde "score" é um número de 0 a 100 indicando a compatibilidade, e "reason" é uma explicação persuasiva de 1 a 2 frases.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
    });

    let jsonText = response.text || "{}";
    
    // Sanitize Response: Remove Markdown code blocks if present (common issue)
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

    const result = JSON.parse(jsonText);
    
    // Validate structure
    if (typeof result.score !== 'number' || typeof result.reason !== 'string') {
        throw new Error("Invalid JSON structure");
    }

    return result;

  } catch (error) {
    console.error("Gemini Match Error:", error);
    return { score: 0, reason: "Não foi possível calcular a compatibilidade no momento." };
  }
}

export const generatePipelineInsights = async (clients: Client[]): Promise<string> => {
    try {
        const clientData = clients.map(c => ({
            stage: c.stage,
            budget: c.budget,
            interest: c.interest,
            lastContact: c.lastContact
        }));

        const prompt = `
            Atue como um gerente de vendas imobiliário experiente.
            Analise os seguintes dados anonimizados do pipeline de vendas:
            ${JSON.stringify(clientData)}

            Forneça 3 insights estratégicos curtos e acionáveis para o corretor fechar mais negócios.
            Foque em: estagnação de leads, oportunidades de alto valor e priorização.
            Retorne em formato de lista (HTML <ul><li>) simples.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || "Sem insights disponíveis no momento.";

    } catch (error) {
        console.error("Gemini Insights Error:", error);
        return "Erro ao gerar insights. Tente novamente mais tarde.";
    }
}

export const generateLeadCommercialInsights = async (client: Client, properties: Property[]): Promise<string> => {
    try {
        // Filter properties loosely to save context window (Match type and budget +/- 20%)
        const relevantProperties = properties.filter(p => {
            const isTypeMatch = client.interest.includes(p.type);
            const isBudgetMatch = p.price <= (client.budget * 1.2) && p.price >= ((client.minBudget || 0) * 0.8);
            return isTypeMatch && isBudgetMatch && p.status === 'published';
        }).map(p => ({
            code: p.code,
            title: p.title,
            price: p.price,
            features: p.features.slice(0, 5),
            address: p.address
        })).slice(0, 5); // Limit to top 5 candidates

        const visitsHistory = client.visits.map(v => `Data: ${new Date(v.date).toLocaleDateString()}, Status: ${v.status}, Feedback: ${v.feedback || 'Nenhum'}`).join('; ');

        const prompt = `
            Atue como um Mentor de Vendas Imobiliárias de Alto Padrão (Coach de Corretores).
            
            Analise este Lead específico e gere uma estratégia de abordagem agressiva e persuasiva.

            DADOS DO LEAD:
            - Nome: ${client.name}
            - Entrada no CRM: ${new Date(client.createdAt).toLocaleDateString()}
            - Último Contato: ${new Date(client.lastContact).toLocaleDateString()}
            - Histórico de Visitas: ${visitsHistory || "Nenhuma visita realizada ainda."}
            - O que ele quer: Busca ${client.interest.join('/')} em ${client.desiredLocation.join(', ')}.
            - Orçamento: Até R$ ${client.budget}
            - Requisitos: Min ${client.minBedrooms || 0} quartos, ${client.minArea || 0}m².

            IMÓVEIS NO SISTEMA QUE PODEM DAR MATCH:
            ${JSON.stringify(relevantProperties)}

            TAREFA:
            Crie um "Plano de Ataque Comercial" curto contendo:
            1. **Análise de Temperatura**: O lead está esfriando? (Baseado na data de entrada vs visitas).
            2. **Oportunidade Oculta**: Indique 1 imóvel da lista acima que seja a melhor aposta e por que (Argumento de venda focado no perfil).
            3. **Próximo Passo Sugerido**: Uma ação concreta (ex: "Ligar oferecendo X", "Agendar visita no Y").
            
            Formate a resposta em HTML simples (sem markdown), usando tags <strong> para ênfase, <p> para parágrafos e <ul> para listas. Mantenha o tom profissional, motivador e estratégico.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || "Não foi possível gerar insights para este lead.";

    } catch (error) {
        console.error("Gemini Lead Insights Error:", error);
        return "Erro ao processar estratégia comercial.";
    }
}