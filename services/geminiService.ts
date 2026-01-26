import { GoogleGenAI } from "@google/genai";
import { Property, Client } from "../types";
import { useStore } from "../store";

// Helper function to get AI instance with current key
const getAI = () => {
    const settings = useStore.getState().systemSettings;
    // Prefer store setting, fallback to safe env check
    let apiKey = settings.geminiApiKey;
    
    // Safety check for env var in case store is empty but env is present (first load)
    if (!apiKey) {
        try {
            // @ts-ignore
            apiKey = import.meta.env?.VITE_GEMINI_API_KEY;
        } catch(e) {}
    }
    
    if (!apiKey) {
        throw new Error("Chave da API do Google Gemini não configurada.");
    }
    
    return new GoogleGenAI({ apiKey: apiKey });
};

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

// Helper for replacement
const replaceAll = (template: string, replacements: Record<string, string | number>) => {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.split(key).join(String(value));
    }
    return result;
}

export const generatePropertyDescription = async (
  data: PropertyGenerationData
): Promise<string> => {
  try {
    const ai = getAI(); // Get fresh instance with current key
    const featureList = data.features.length > 0 ? data.features.join(', ') : 'Não especificado';
    const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.price);

    // Dynamic replacement of placeholders in the custom prompt
    let prompt = data.promptTemplate;
    
    // Replacement map
    const replacements = {
        '{{title}}': data.title,
        '{{type}}': data.type,
        '{{price}}': priceFormatted,
        '{{address}}': data.address,
        '{{area}}': data.area,
        '{{bedrooms}}': data.bedrooms,
        '{{bathrooms}}': data.bathrooms,
        '{{features}}': featureList
    };

    prompt = replaceAll(prompt, replacements);

    // Fallback if prompt is empty (sanity check)
    if (!prompt.trim()) {
        return "Erro: O template do prompt está vazio. Contate o administrador.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a descrição.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message && error.message.includes("API Key")) {
        return "Erro: Chave da API Gemini não configurada ou inválida.";
    }
    return "Erro ao gerar descrição com IA. Verifique a chave de API.";
  }
};

export const calculateClientMatch = async (client: Client, property: Property, promptTemplate: string): Promise<{ score: number; reason: string }> => {
  try {
    const ai = getAI();
    const locations = client.desiredLocation && client.desiredLocation.length > 0 
        ? client.desiredLocation.join(', ') 
        : 'Não especificado';
    
    const minBudget = client.minBudget ? `R$ ${client.minBudget}` : '0';

    const replacements = {
        '{{clientName}}': client.name,
        '{{minBudget}}': minBudget,
        '{{budget}}': client.budget,
        '{{interest}}': client.interest.join(', '),
        '{{locations}}': locations,
        '{{minBedrooms}}': client.minBedrooms || 0,
        '{{minArea}}': client.minArea || 0,
        '{{notes}}': client.notes || '',
        
        '{{propertyTitle}}': property.title,
        '{{propertyType}}': property.type,
        '{{propertyPrice}}': property.price,
        '{{propertyAddress}}': property.address,
        '{{propertyBedrooms}}': property.bedrooms,
        '{{propertyArea}}': property.area,
        '{{propertyFeatures}}': property.features.join(', ')
    };

    const prompt = replaceAll(promptTemplate, replacements);

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
    return { score: 0, reason: "Não foi possível calcular a compatibilidade no momento (Verifique API Key)." };
  }
}

// NEW FUNCTION: Finds TOP X matches from a list
export const findTopMatches = async (client: Client, properties: Property[], limit: number): Promise<Array<{ propertyId: string, score: number, reason: string }>> => {
    try {
        const ai = getAI();
        
        // Prepare simplified data to save tokens
        const candidates = properties.map(p => ({
            id: p.id,
            title: p.title,
            details: `${p.type}, ${p.bedrooms} quartos, ${p.area}m², R$ ${p.price}`,
            location: p.address,
            features: p.features.slice(0, 5)
        }));

        const clientProfile = {
            name: client.name,
            budget: client.budget,
            interest: client.interest,
            locations: client.desiredLocation,
            requirements: `Min ${client.minBedrooms || 0} quartos, Min ${client.minArea || 0}m²`,
            notes: client.notes
        };

        const prompt = `
        Atue como um Corretor de Imóveis Especialista em Matchmaking.
        
        PERFIL DO CLIENTE:
        ${JSON.stringify(clientProfile)}

        CANDIDATOS DISPONÍVEIS (IMÓVEIS):
        ${JSON.stringify(candidates)}

        TAREFA:
        1. Analise a lista de candidatos e identifique os melhores imóveis para este cliente.
        2. Selecione até ${limit} melhores opções.
        3. Atribua um "score" de 0 a 100 para cada um.
        4. Escreva uma "reason" curta e vendedora para cada um.

        Retorne APENAS um Array JSON puro:
        [
            { "propertyId": "ID", "score": 95, "reason": "Motivo..." },
            ...
        ]
        
        Se nenhum for compatível, retorne array vazio [].
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const jsonText = (response.text || "[]").replace(/```json/g, '').replace(/```/g, '').trim();
        const results = JSON.parse(jsonText);

        if(Array.isArray(results)) {
            return results.sort((a, b) => b.score - a.score);
        }
        return [];

    } catch (error) {
        console.error("Gemini Top Matches Error:", error);
        return [];
    }
}

export const generatePipelineInsights = async (clients: Client[], promptTemplate: string): Promise<string> => {
    try {
        const ai = getAI();
        const clientData = clients.map(c => ({
            stage: c.stage,
            budget: c.budget,
            interest: c.interest,
            lastContact: c.lastContact
        }));

        const prompt = replaceAll(promptTemplate, {
            '{{pipelineData}}': JSON.stringify(clientData)
        });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || "Sem insights disponíveis no momento.";

    } catch (error) {
        console.error("Gemini Insights Error:", error);
        return "Erro ao gerar insights. Verifique a configuração da API.";
    }
}

export const generateLeadCommercialInsights = async (client: Client, properties: Property[], promptTemplate: string): Promise<string> => {
    try {
        const ai = getAI();
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

        // Enhanced Visit History formatting for AI
        const visitsHistory = client.visits.map(v => {
            const status = v.status;
            const feedback = v.feedback ? `Feedback: "${v.feedback}"` : '';
            const liked = v.liked !== undefined ? (v.liked ? '(Gostou do imóvel)' : '(Não gostou do imóvel)') : '';
            const points = [];
            if(v.positivePoints) points.push(`Positivos: ${v.positivePoints}`);
            if(v.negativePoints) points.push(`Negativos: ${v.negativePoints}`);
            
            return `[${new Date(v.date).toLocaleDateString()}] Status: ${status} ${liked} ${feedback} ${points.join(', ')}`;
        }).join('\n');

        const locations = client.desiredLocation && client.desiredLocation.length > 0 
        ? client.desiredLocation.join(', ') 
        : 'Não especificado';

        const replacements = {
            '{{clientName}}': client.name,
            '{{createdAt}}': new Date(client.createdAt).toLocaleDateString(),
            '{{lastContact}}': new Date(client.lastContact).toLocaleDateString(),
            '{{visitsHistory}}': visitsHistory || "Nenhuma visita realizada ainda.",
            '{{interest}}': client.interest.join('/'),
            '{{locations}}': locations,
            '{{budget}}': client.budget,
            '{{minBedrooms}}': client.minBedrooms || 0,
            '{{minArea}}': client.minArea || 0,
            '{{matchingProperties}}': JSON.stringify(relevantProperties)
        };

        const prompt = replaceAll(promptTemplate, replacements);

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