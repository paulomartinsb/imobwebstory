import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Property, Client, User, UserRole, SystemSettings, Pipeline, PipelineStageConfig, LogEntry, PropertyStatus, Visit } from './types';
import { fetchEntitiesFromSupabase } from './services/supabaseClient';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppState {
  currentUser: User | null;
  users: User[];
  systemSettings: SystemSettings;
  properties: Property[];
  clients: Client[];
  notifications: Notification[];
  pipelines: Pipeline[];
  logs: LogEntry[];
  
  // Auth Actions
  setCurrentUser: (userId: string) => void; // Debug/Admin use
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  addUser: (userData: Omit<User, 'id' | 'avatar'>) => boolean;
  removeUser: (userId: string) => void;
  toggleUserBlock: (userId: string) => void;

  // Data Actions
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  addProperty: (property: Omit<Property, 'id' | 'authorId' | 'status' | 'createdAt'>) => void;
  updateProperty: (propertyId: string, updates: Partial<Property>) => void;
  updatePropertyStatus: (propertyId: string, newStatus: PropertyStatus, reason?: string) => void;
  approveProperty: (propertyId: string) => void;
  rejectProperty: (propertyId: string, reason: string) => void;
  
  // Client & Pipeline Actions
  addClient: (client: Omit<Client, 'id' | 'ownerId' | 'createdAt' | 'lastContact' | 'visits'>, specificOwnerId?: string) => boolean; 
  addFamilyMember: (originClientId: string, memberData: { name: string, phone: string, email: string, relationship: string }) => void;
  updateClient: (clientId: string, updates: Partial<Client>) => void;
  removeClient: (clientId: string) => void;
  moveClientToPipeline: (clientId: string, pipelineId: string, stageId: string) => void;
  markLeadAsLost: (clientId: string, reason: string) => void;
  
  // Visit Actions
  addVisit: (clientId: string, visit: Omit<Visit, 'id'>) => void;
  updateVisit: (clientId: string, visitId: string, updates: Partial<Visit>) => void;
  removeVisit: (clientId: string, visitId: string) => void;

  // Pipeline Management Actions
  addPipeline: (name: string) => void;
  updatePipeline: (pipelineId: string, updates: Partial<Pipeline>) => void;
  deletePipeline: (pipelineId: string) => void;
  addPipelineStage: (pipelineId: string, name: string) => void;
  updatePipelineStage: (pipelineId: string, stageId: string, updates: Partial<PipelineStageConfig>) => void;
  deletePipelineStage: (pipelineId: string, stageId: string) => void;
  
  // System Actions
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  removeNotification: (id: string) => void;

  // Audit Actions
  restoreState: (logId: string) => void;

  // Sync Actions
  loadFromSupabase: () => Promise<void>;
}

// Initial Admin User for Production
const DEFAULT_ADMIN: User = {
  id: 'admin-master',
  name: 'Administrador',
  email: 'admin@goldimob.ia',
  role: 'admin',
  avatar: 'https://ui-avatars.com/api/?name=Admin&background=0c4a6e&color=fff',
  blocked: false
};

const DEFAULT_PIPELINE: Pipeline = {
    id: 'p1',
    name: 'Vendas Padrão',
    isDefault: true,
    stages: [
        { id: 'new', name: 'Novos Leads', color: 'border-slate-400', order: 0 },
        { id: 'visit', name: 'Visitas', color: 'border-blue-400', order: 1 },
        { id: 'proposal', name: 'Negociação', color: 'border-yellow-400', order: 2 },
        { id: 'contract', name: 'Contratos', color: 'border-purple-400', order: 3 },
        { id: 'closed', name: 'Fechados', color: 'border-green-500', order: 4 },
    ]
};

const DEFAULT_PROPERTY_TYPES = [
    { value: 'apartamento', label: 'Apartamento' },
    { value: 'casa', label: 'Casa' },
    { value: 'cobertura', label: 'Cobertura' },
    { value: 'sobrado', label: 'Sobrado / Casa Geminada' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'terreno', label: 'Terreno / Lote' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'studio', label: 'Studio' },
    { value: 'sitio', label: 'Sítio / Fazenda' }
];

const DEFAULT_FEATURES = [
    "Piscina", "Churrasqueira", "Academia", "Salão de Festas",
    "Portaria 24h", "Varanda Gourmet", "Ar Condicionado",
    "Playground", "Elevador", "Mobiliado", "Vaga Coberta",
    "Pet Friendly", "Vista Panorâmica", "Jardim", "Lareira",
    "Sauna", "Quadra Poliesportiva", "Armários Embutidos"
];

const DEFAULT_LEAD_SOURCES = [
    "Manual / Balcão",
    "Site Oficial",
    "Instagram",
    "Facebook",
    "Portal Zap",
    "Portal VivaReal",
    "Indicação",
    "Placa no Local"
];

const DEFAULT_LOCATIONS = [
    "São Paulo - Jardins", 
    "São Paulo - Moema", 
    "São Paulo - Itaim Bibi",
    "São Paulo - Vila Nova Conceição",
    "São Paulo - Pinheiros",
    "Barueri - Alphaville", 
    "Barueri - Tamboré", 
    "Santana de Parnaíba - Gênesis"
];

const DEFAULT_DESC_PROMPT = `Atue como um assistente imobiliário técnico e objetivo.
Sua tarefa é ler os dados brutos deste imóvel e criar uma descrição organizada, limpa e fácil de visualizar para um anúncio.

DADOS DO IMÓVEL:
- Título: {{title}}
- Tipo: {{type}}
- Preço: {{price}}
- Localização: {{address}}
- Área Útil: {{area}}m²
- Quartos: {{bedrooms}}
- Banheiros: {{bathrooms}}
- Diferenciais/Comodidades: {{features}}

REGRAS OBRIGATÓRIAS:
1. NÃO invente informações que não estejam listadas acima (sem floreios poéticos exagerados).
2. NÃO use Markdown (negrito, itálico), use apenas texto simples e quebras de linha.
3. Organize o texto em 3 partes curtas:
     - Um parágrafo inicial resumindo o imóvel (O que é e onde fica).
     - Uma lista simples dos principais atributos (Área, quartos, banheiros).
     - Uma frase final convidativa sobre os diferenciais.
4. Mantenha o tom profissional e direto.`;

const DEFAULT_MATCH_PROMPT = `Atue como um corretor imobiliário sênior. Analise a compatibilidade (Match) entre este cliente e este imóvel.

PERFIL DO CLIENTE:
- Nome: {{clientName}}
- Orçamento: De {{minBudget}} Até {{budget}}
- Tipos de Interesse: {{interest}}
- Locais Desejados: {{locations}}
- Mínimo Quartos: {{minBedrooms}}
- Área Mínima: {{minArea}}m²
- Observações: {{notes}}

IMÓVEL DISPONÍVEL:
- Título: {{propertyTitle}}
- Tipo: {{propertyType}}
- Preço: {{propertyPrice}}
- Localização: {{propertyAddress}}
- Quartos: {{propertyBedrooms}}
- Área: {{propertyArea}}m²
- Características: {{propertyFeatures}}

Retorne APENAS um objeto JSON (sem markdown, sem explicações extras) com o seguinte formato exato:
{
  "score": number,
  "reason": "string"
}

Onde "score" é um número de 0 a 100 indicando a compatibilidade, e "reason" é uma explicação persuasiva de 1 a 2 frases.`;

const DEFAULT_CRM_GLOBAL_PROMPT = `Atue como um gerente de vendas imobiliário experiente.
Analise os seguintes dados anonimizados do pipeline de vendas:
{{pipelineData}}

Forneça 3 insights estratégicos curtos e acionáveis para o corretor fechar mais negócios.
Foque em: estagnação de leads, oportunidades de alto valor e priorização.
Retorne em formato de lista (HTML <ul><li>) simples.`;

const DEFAULT_CRM_CARD_PROMPT = `Atue como um Mentor de Vendas Imobiliárias de Alto Padrão (Coach de Corretores).

Analise este Lead específico e gere uma estratégia de abordagem agressiva e persuasiva.

DADOS DO LEAD:
- Nome: {{clientName}}
- Entrada no CRM: {{createdAt}}
- Último Contato: {{lastContact}}
- Histórico de Visitas: {{visitsHistory}}
- O que ele quer: Busca {{interest}} em {{locations}}.
- Orçamento: Até {{budget}}
- Requisitos: Min {{minBedrooms}} quartos, {{minArea}}m².

IMÓVEIS NO SISTEMA QUE PODEM DAR MATCH:
{{matchingProperties}}

TAREFA:
Crie um "Plano de Ataque Comercial" curto contendo:
1. **Análise de Temperatura**: O lead está esfriando? (Baseado na data de entrada vs visitas).
2. **Oportunidade Oculta**: Indique 1 imóvel da lista acima que seja a melhor aposta e por que (Argumento de venda focado no perfil).
3. **Próximo Passo Sugerido**: Uma ação concreta (ex: "Ligar oferecendo X", "Agendar visita no Y").

Formate a resposta em HTML simples (sem markdown), usando tags <strong> para ênfase, <p> para parágrafos e <ul> para listas. Mantenha o tom profissional, motivador e estratégico.`;

// Helper to create log entry
const createLog = (
    user: User | null, 
    action: LogEntry['action'], 
    entity: LogEntry['entity'], 
    entityId: string, 
    entityName: string,
    details: string,
    previousData?: any,
    newData?: any
): LogEntry => ({
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema',
    action,
    entity,
    entityId,
    entityName,
    details,
    previousData: previousData ? JSON.parse(JSON.stringify(previousData)) : undefined, // Deep copy
    newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined // Deep copy
});

// Helper to calculate next visit
const calculateNextVisit = (visits: Visit[]): string | undefined => {
    const now = new Date();
    const futureVisits = visits
        .filter(v => v.status === 'scheduled')
        .filter(v => new Date(v.date) > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return futureVisits.length > 0 ? futureVisits[0].date : undefined;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null, // Initial State is Logged Out
      users: [DEFAULT_ADMIN], // Start with only Admin
      systemSettings: {
          allowNewRegistrations: true,
          requirePropertyApproval: true,
          maintenanceMode: false,
          companyName: 'GoldImob AI',
          propertyTypes: DEFAULT_PROPERTY_TYPES,
          propertyFeatures: DEFAULT_FEATURES,
          leadSources: DEFAULT_LEAD_SOURCES,
          availableLocations: DEFAULT_LOCATIONS,
          propertyDescriptionPrompt: DEFAULT_DESC_PROMPT,
          // Default CRM Prompts
          matchAiPrompt: DEFAULT_MATCH_PROMPT,
          crmGlobalInsightsPrompt: DEFAULT_CRM_GLOBAL_PROMPT,
          crmCardInsightsPrompt: DEFAULT_CRM_CARD_PROMPT,
          // Default API Key
          geminiApiKey: process.env.VITE_GEMINI_API_KEY || '',
          // Default Supabase config with provided credentials (or empty for production safety)
          supabaseUrl: process.env.VITE_SUPABASE_URL || '',
          supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
          // Default Lead Aging Config
          leadAging: {
              freshLimit: 2, // 0 to 2 days = Fresh
              warmLimit: 7,  // 3 to 7 days = Warm, 8+ = Cold
              freshColor: 'green',
              warmColor: 'yellow',
              coldColor: 'red'
          }
      },
      pipelines: [DEFAULT_PIPELINE],
      logs: [], 
      
      properties: [], // Empty for Production
      clients: [], // Empty for Production
      notifications: [],

      // --- SUPABASE SYNC ACTION ---
      loadFromSupabase: async () => {
          const state = get();
          const { supabaseUrl, supabaseAnonKey } = state.systemSettings;

          if (!supabaseUrl || !supabaseAnonKey) return;

          // Fetch all entities in parallel
          const [usersRes, propsRes, clientsRes, pipeRes, logsRes] = await Promise.all([
              fetchEntitiesFromSupabase('users', supabaseUrl, supabaseAnonKey),
              fetchEntitiesFromSupabase('properties', supabaseUrl, supabaseAnonKey),
              fetchEntitiesFromSupabase('clients', supabaseUrl, supabaseAnonKey),
              fetchEntitiesFromSupabase('pipelines', supabaseUrl, supabaseAnonKey),
              fetchEntitiesFromSupabase('logs', supabaseUrl, supabaseAnonKey)
          ]);

          const updates: Partial<AppState> = {};
          let hasUpdates = false;

          // Only update if we got data back (avoid wiping local state if offline/error)
          if (usersRes.data && usersRes.data.length > 0) { updates.users = usersRes.data; hasUpdates = true; }
          if (propsRes.data && propsRes.data.length > 0) { updates.properties = propsRes.data; hasUpdates = true; }
          if (clientsRes.data && clientsRes.data.length > 0) { updates.clients = clientsRes.data; hasUpdates = true; }
          if (pipeRes.data && pipeRes.data.length > 0) { updates.pipelines = pipeRes.data; hasUpdates = true; }
          if (logsRes.data && logsRes.data.length > 0) { updates.logs = logsRes.data; hasUpdates = true; }

          if (hasUpdates) {
              set(updates);
              // Silent update or console log
              console.log("Estado sincronizado com Supabase:", updates);
          }
      },

      setCurrentUser: (userId) => {
          const user = get().users.find(u => u.id === userId);
          if (user) {
              if(user.blocked) {
                  get().addNotification('error', `O usuário ${user.name} está bloqueado.`);
                  return;
              }
              set({ currentUser: user });
              get().addNotification('info', `Simulação: Logado como ${user.name}`);
          }
      },

      login: (email, password) => {
          const user = get().users.find(u => u.email === email);
          // Simple auth check - In production this should verify hash or call backend
          if (user && password === '123456') {
              if (user.blocked) {
                  get().addNotification('error', 'Acesso bloqueado. Entre em contato com o administrador.');
                  return false;
              }
              set({ currentUser: user });
              get().addNotification('success', `Bem-vindo de volta, ${user.name.split(' ')[0]}!`);
              // Trigger sync on login
              get().loadFromSupabase();
              return true;
          }
          return false;
      },

      logout: () => {
          set({ currentUser: null });
          get().addNotification('info', 'Você saiu do sistema.');
      },

      updateUserRole: (userId, newRole) => set((state) => {
          const admins = state.users.filter(u => u.role === 'admin');
          if (admins.length === 1 && admins[0].id === userId && newRole !== 'admin') {
              get().addNotification('error', 'Não é possível remover o último administrador.');
              return state;
          }
          return {
              users: state.users.map(u => u.id === userId ? { ...u, role: newRole } : u),
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Permissões do usuário atualizadas.' }]
          };
      }),

      addUser: (userData) => {
          const state = get();
          if (state.users.find(u => u.email === userData.email)) {
              state.addNotification('error', 'Já existe um usuário com este email.');
              return false;
          }
          set((state) => {
              const newUser: User = {
                  id: Math.random().toString(36).substr(2, 9),
                  name: userData.name,
                  email: userData.email,
                  role: userData.role,
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`,
                  blocked: false // Default not blocked
              };
              return {
                  users: [...state.users, newUser],
                  notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Usuário adicionado com sucesso.' }]
              };
          });
          return true;
      },

      removeUser: (userId) => set((state) => {
          if (userId === state.currentUser?.id) {
               return { notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'Você não pode excluir a si mesmo.' }] };
          }
          return {
              users: state.users.filter(u => u.id !== userId),
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Usuário removido.' }]
          };
      }),

      toggleUserBlock: (userId) => set((state) => {
          if (userId === state.currentUser?.id) {
              return { notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'Você não pode bloquear a si mesmo.' }] };
          }
          const user = state.users.find(u => u.id === userId);
          if (!user) return state;

          const newBlockedStatus = !user.blocked;
          
          return {
              users: state.users.map(u => u.id === userId ? { ...u, blocked: newBlockedStatus } : u),
              notifications: [...state.notifications, { 
                  id: Math.random().toString(), 
                  type: newBlockedStatus ? 'error' : 'success', 
                  message: newBlockedStatus ? `Acesso de ${user.name} bloqueado.` : `Acesso de ${user.name} liberado.` 
              }]
          };
      }),

      updateSystemSettings: (newSettings) => set((state) => {
          const oldSettings = { ...state.systemSettings };
          const updatedSettings = { ...state.systemSettings, ...newSettings };
          return {
            systemSettings: updatedSettings,
            logs: [createLog(state.currentUser, 'update', 'settings', 'system', 'Configurações Globais', 'Alteração nas configurações do sistema', oldSettings, updatedSettings), ...state.logs],
            notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Configurações do sistema salvas.' }]
          };
      }),
      
      addProperty: (propertyData) => set((state) => {
        const user = state.currentUser;
        if (!user) return state;

        const isStaff = ['admin', 'employee', 'finance'].includes(user.role);
        const requireApproval = state.systemSettings.requirePropertyApproval;
        const status = (isStaff || !requireApproval) ? 'published' : 'pending_approval';

        const newProperty: Property = {
            ...propertyData,
            id: Math.random().toString(36).substr(2, 9),
            authorId: user.id,
            status: status,
            approvedBy: (isStaff || !requireApproval) ? user.id : undefined,
            createdAt: new Date().toISOString()
        };

        return { 
            properties: [...state.properties, newProperty],
            logs: [createLog(user, 'create', 'property', newProperty.id, newProperty.title, 'Novo imóvel cadastrado', undefined, newProperty), ...state.logs],
            notifications: [...state.notifications, { 
                id: Math.random().toString(), 
                type: 'success', 
                message: status === 'published' ? 'Imóvel publicado!' : 'Imóvel enviado para aprovação.' 
            }]
        };
      }),

      updateProperty: (propertyId, updates) => set((state) => {
          const oldProperty = state.properties.find(p => p.id === propertyId);
          if (!oldProperty) return state;
          const newProperty = { ...oldProperty, ...updates };
          if (updates.status === 'pending_approval') newProperty.rejectionReason = undefined;

          return {
              properties: state.properties.map(p => p.id === propertyId ? newProperty : p),
              logs: [createLog(state.currentUser, 'update', 'property', propertyId, oldProperty.title, 'Imóvel atualizado', oldProperty, newProperty), ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Imóvel atualizado com sucesso.' }]
          };
      }),

      updatePropertyStatus: (propertyId, newStatus, reason) => set((state) => {
          const oldProperty = state.properties.find(p => p.id === propertyId);
          if (!oldProperty) return state;
          
          const newProperty = { 
              ...oldProperty, 
              status: newStatus,
              rejectionReason: reason // Add or Clear rejection reason
          };
          
          if (newStatus === 'published' && !newProperty.approvedBy) newProperty.approvedBy = state.currentUser?.id;
          // Clear rejection reason if published, but keep it if moving to draft/pending with a note
          if (newStatus === 'published') newProperty.rejectionReason = undefined;

          return {
              properties: state.properties.map(p => p.id === propertyId ? newProperty : p),
              logs: [createLog(state.currentUser, 'update', 'property', propertyId, oldProperty.title, `Status alterado para ${newStatus}`, oldProperty, newProperty), ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'info', message: `Status do imóvel alterado para ${newStatus}.` }]
          };
      }),

      approveProperty: (propertyId) => set((state) => {
          const user = state.currentUser;
          if (!user || user.role === 'broker') {
              return { notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'Sem permissão para aprovar.' }] };
          }
          
          const oldProperty = state.properties.find(p => p.id === propertyId);
          if (!oldProperty) return state;

          const newProperty = { 
              ...oldProperty, 
              status: 'published' as const, 
              approvedBy: user.id, 
              rejectionReason: undefined 
          };

          const updatedProperties = state.properties.map(p => p.id === propertyId ? newProperty : p);

          return {
              properties: updatedProperties,
              logs: [createLog(user, 'approval', 'property', propertyId, oldProperty.title, 'Imóvel aprovado', oldProperty, newProperty), ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Imóvel aprovado e publicado.' }]
          };
      }),

      rejectProperty: (propertyId, reason) => set((state) => {
          const user = state.currentUser;
          if (!user || user.role === 'broker') return { notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'Sem permissão para reprovar.' }] };
          const oldProperty = state.properties.find(p => p.id === propertyId);
          if (!oldProperty) return state;
          const newProperty = { ...oldProperty, status: 'draft' as const, approvedBy: undefined, rejectionReason: reason };
          return {
              properties: state.properties.map(p => p.id === propertyId ? newProperty : p),
              logs: [createLog(user, 'update', 'property', propertyId, oldProperty.title, 'Imóvel reprovado (Retornado para Rascunho)', oldProperty, newProperty), ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'info', message: 'Imóvel devolvido ao corretor para correção.' }]
          };
      }),
      
      updateClient: (clientId, updates) => set((state) => {
          const oldClient = state.clients.find(c => c.id === clientId);
          if (!oldClient) return state;
          const newClient = { ...oldClient, ...updates };
          return {
            clients: state.clients.map(c => c.id === clientId ? newClient : c),
            logs: [createLog(state.currentUser, 'update', 'client', clientId, oldClient.name, 'Dados do lead atualizados', oldClient, newClient), ...state.logs],
            notifications: updates.stage ? [...state.notifications, { id: Math.random().toString(), type: 'info', message: 'Estágio do cliente atualizado.' }] : state.notifications
          };
      }),

      removeClient: (clientId) => set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if (!client) return state;
          return {
            clients: state.clients.filter(c => c.id !== clientId),
            logs: [createLog(state.currentUser, 'delete', 'client', clientId, client.name, 'Lead excluído', client, undefined), ...state.logs],
            notifications: [...state.notifications, { id: Math.random().toString(), type: 'info', message: 'Cliente removido.' }]
          };
      }),

      markLeadAsLost: (clientId, reason) => set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if(!client) return state;

          const updatedClient: Client = {
              ...client,
              pipelineId: undefined, // Remove from active CRM board
              stage: 'new', // Reset stage or keep it, but logic implies available for new process. Setting to 'new' allows reuse.
              lostReason: reason,
              lastContact: new Date().toISOString(),
              interestedPropertyIds: [] // Unlink linked properties
          };

          return {
              clients: state.clients.map(c => c.id === clientId ? updatedClient : c),
              logs: [createLog(state.currentUser, 'update', 'client', clientId, client.name, `Lead marcado como perdido: ${reason}`, client, updatedClient), ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'info', message: 'Lead marcado como perdido e movido para o histórico.' }]
          };
      }),

      addClient: (clientData, specificOwnerId) => {
          const state = get();
          if (state.clients.find(c => c.phone === clientData.phone)) {
              state.addNotification('error', `Este telefone já pertence a um lead existente.`);
              return false;
          }
          set((state) => {
            const ownerId = specificOwnerId || state.currentUser?.id;
            if (!ownerId) return state;
            const newClient: Client = {
                ...clientData,
                id: Math.random().toString(36).substr(2, 9),
                ownerId: ownerId,
                visits: [], // Default empty visits
                interestedPropertyIds: [], // Default empty linked properties
                familyMembers: [],
                documents: [],
                followers: [],
                createdAt: new Date().toISOString(),
                lastContact: new Date().toISOString()
            };
            return { 
                clients: [...state.clients, newClient],
                logs: [createLog(state.currentUser, 'create', 'client', newClient.id, newClient.name, 'Lead criado', undefined, newClient), ...state.logs],
                notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Novo lead cadastrado!' }]
            };
          });
          return true;
      },

      addFamilyMember: (originClientId, memberData) => set((state) => {
          const originClient = state.clients.find(c => c.id === originClientId);
          if (!originClient) {
              return { notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'Lead principal não encontrado.' }]};
          }

          // Check for duplicates
          if (state.clients.find(c => c.phone === memberData.phone || c.email === memberData.email)) {
              return { notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'Familiar já existe como lead no sistema (verifique email/telefone).' }]};
          }

          const newId = Math.random().toString(36).substr(2, 9);
          const newClient: Client = {
              id: newId,
              ownerId: originClient.ownerId, // Same broker
              pipelineId: undefined, // New lead starts in lead bank
              name: memberData.name,
              phone: memberData.phone,
              email: memberData.email,
              stage: 'new',
              source: 'Indicação', // Assuming created from family
              budget: 0,
              interest: [],
              desiredLocation: [],
              visits: [],
              interestedPropertyIds: [],
              familyMembers: [{ id: originClient.id, name: originClient.name, relationship: 'Responsável/Titular' }], // Link back to original
              documents: [],
              followers: [],
              createdAt: new Date().toISOString(),
              lastContact: new Date().toISOString()
          };

          // Update original client to include new member
          const updatedOriginClient = {
              ...originClient,
              familyMembers: [...(originClient.familyMembers || []), { id: newId, name: newClient.name, relationship: memberData.relationship }]
          };

          return {
              clients: [...state.clients.filter(c => c.id !== originClientId), updatedOriginClient, newClient],
              logs: [createLog(state.currentUser, 'update', 'client', originClientId, originClient.name, `Adicionado familiar: ${newClient.name}`, originClient, updatedOriginClient), ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Familiar adicionado e criado como Lead!' }]
          };
      }),

      moveClientToPipeline: (clientId, pipelineId, stageId) => set((state) => {
          const oldClient = state.clients.find(c => c.id === clientId);
          if(!oldClient) return state;
          const newClient = { ...oldClient, pipelineId, stage: stageId };
          return {
              clients: state.clients.map(c => c.id === clientId ? newClient : c),
              logs: [createLog(state.currentUser, 'update', 'client', clientId, oldClient.name, 'Movido para pipeline', oldClient, newClient), ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Lead movido para o pipeline.' }]
          };
      }),

      addVisit: (clientId, visit) => set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if (!client) return state;

          const newVisit: Visit = { ...visit, id: Math.random().toString(36).substr(2, 9) };
          const updatedVisits = [...client.visits, newVisit];
          const nextVisit = calculateNextVisit(updatedVisits);

          const updatedClient = { ...client, visits: updatedVisits, nextVisit, lastContact: new Date().toISOString() };

          return {
              clients: state.clients.map(c => c.id === clientId ? updatedClient : c),
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Visita agendada com sucesso!' }]
          };
      }),

      updateVisit: (clientId, visitId, updates) => set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if (!client) return state;

          const updatedVisits = client.visits.map(v => v.id === visitId ? { ...v, ...updates } : v);
          const nextVisit = calculateNextVisit(updatedVisits);
          const updatedClient = { ...client, visits: updatedVisits, nextVisit };

          return {
              clients: state.clients.map(c => c.id === clientId ? updatedClient : c),
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Visita atualizada.' }]
          };
      }),

      removeVisit: (clientId, visitId) => set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if (!client) return state;

          const updatedVisits = client.visits.filter(v => v.id !== visitId);
          const nextVisit = calculateNextVisit(updatedVisits);
          const updatedClient = { ...client, visits: updatedVisits, nextVisit };

          return {
              clients: state.clients.map(c => c.id === clientId ? updatedClient : c),
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'info', message: 'Visita removida.' }]
          };
      }),
      
      // Pipeline Mgmt
      addPipeline: (name) => set((state) => ({ pipelines: [...state.pipelines, { id: `p-${Date.now()}`, name, isDefault: false, stages: [{ id: `s-${Date.now()}-1`, name: 'Novo', color: 'border-slate-400', order: 0 }] }], notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Novo pipeline criado.' }] })),
      updatePipeline: (pipelineId, updates) => set((state) => ({ pipelines: state.pipelines.map(p => p.id === pipelineId ? { ...p, ...updates } : p) })),
      deletePipeline: (pipelineId) => set((state) => state.pipelines.find(p => p.id === pipelineId)?.isDefault ? { ...state, notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'O pipeline padrão não pode ser excluído.' }] } : { pipelines: state.pipelines.filter(p => p.id !== pipelineId), clients: state.clients.map(c => c.pipelineId === pipelineId ? { ...c, pipelineId: undefined, stage: '' } : c), notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Pipeline removido.' }] }),
      addPipelineStage: (pipelineId, name) => set((state) => ({ pipelines: state.pipelines.map(p => p.id !== pipelineId ? p : { ...p, stages: [...p.stages, { id: `s-${Date.now()}`, name, color: 'border-gray-300', order: p.stages.length }] }) })),
      updatePipelineStage: (pipelineId, stageId, updates) => set((state) => ({ pipelines: state.pipelines.map(p => p.id !== pipelineId ? p : { ...p, stages: p.stages.map(s => s.id === stageId ? { ...s, ...updates } : s) }) })),
      deletePipelineStage: (pipelineId, stageId) => set((state) => ({ pipelines: state.pipelines.map(p => p.id !== pipelineId ? p : p.stages.length <= 1 ? p : { ...p, stages: p.stages.filter(s => s.id !== stageId) }) })),
      
      // System Actions
      addNotification: (type, message) => set((state) => ({ notifications: [...state.notifications, { id: Math.random().toString(), type, message }] })),
      removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) })),

      restoreState: (logId) => set((state) => {
          const log = state.logs.find(l => l.id === logId);
          if (!log || !log.previousData) return state;

          const { entity, entityId, previousData } = log;
          const user = state.currentUser;

          const newLog = createLog(user, 'restore', entity, entityId, log.entityName, `Restaurado para versão de ${new Date(log.timestamp).toLocaleString()}`, undefined, previousData);

          switch(entity) {
              case 'property':
                  return {
                      properties: state.properties.map(p => p.id === entityId ? { ...p, ...previousData } : p),
                      logs: [newLog, ...state.logs],
                      notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Imóvel restaurado.' }]
                  };
              case 'client':
                  return {
                      clients: state.clients.map(c => c.id === entityId ? { ...c, ...previousData } : c),
                      logs: [newLog, ...state.logs],
                      notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Cliente restaurado.' }]
                  };
              case 'settings':
                  if (entityId === 'system') {
                      return {
                          systemSettings: { ...state.systemSettings, ...previousData },
                          logs: [newLog, ...state.logs],
                          notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Configurações restauradas.' }]
                      };
                  }
                  return state;
              default:
                  return state;
          }
      })
    }),
    {
      name: 'goldimob-storage',
      version: 2, 
      partialize: (state) => ({ 
          users: state.users,
          systemSettings: state.systemSettings,
          properties: state.properties,
          clients: state.clients,
          pipelines: state.pipelines,
          logs: state.logs,
          currentUser: state.currentUser 
      }),
    }
  )
);