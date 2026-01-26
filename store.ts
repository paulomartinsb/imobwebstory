import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Property, Client, User, UserRole, SystemSettings, Pipeline, PipelineStageConfig, LogEntry, PropertyStatus, Visit, SmtpConfig } from './types';
import { fetchEntitiesFromSupabase, syncEntityToSupabase, deleteEntityFromSupabase, subscribeToTable, unsubscribeAll } from './services/supabaseClient';
import { sendSystemEmail, DEFAULT_EMAIL_TEMPLATES } from './services/emailService';

// ... (Interface declarations remain unchanged) ...
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
  setCurrentUser: (userId: string) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  addUser: (userData: Omit<User, 'id' | 'avatar'>) => boolean;
  removeUser: (userId: string) => void;
  toggleUserBlock: (userId: string) => void;

  // Data Actions
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  addProperty: (property: Omit<Property, 'id' | 'authorId' | 'status' | 'createdAt'>) => void;
  updateProperty: (propertyId: string, updates: Partial<Property>) => void;
  updatePropertyStatus: (propertyId: string, newStatus: PropertyStatus, reason?: string) => void;
  removeProperty: (propertyId: string) => void; // Added removeProperty
  approveProperty: (propertyId: string) => void;
  rejectProperty: (propertyId: string, reason: string) => void;
  
  // Client & Pipeline Actions
  addClient: (client: Omit<Client, 'id' | 'ownerId' | 'createdAt' | 'lastContact' | 'visits'>, specificOwnerId?: string) => string | null; 
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
  sendTestEmail: (email: string, config: SmtpConfig) => Promise<boolean>;

  // Audit Actions
  restoreState: (logId: string) => void;

  // Sync Actions
  loadFromSupabase: () => Promise<void>;
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
}

// ... (DEFAULT_ADMIN, DEFAULT_PIPELINE, Constants, Helper functions remain unchanged) ...
// Initial Admin User for Production
const DEFAULT_ADMIN: User = {
  id: 'admin-master',
  name: 'Administrador',
  email: 'admin@webimob.com',
  password: '123456', // Default password
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

export const DEFAULT_PROPERTY_TYPES = [
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

export const DEFAULT_FEATURES = [
    "Piscina", "Churrasqueira", "Academia", "Salão de Festas",
    "Portaria 24h", "Varanda Gourmet", "Ar Condicionado",
    "Playground", "Elevador", "Mobiliado", "Vaga Coberta",
    "Pet Friendly", "Vista Panorâmica", "Jardim", "Lareira",
    "Sauna", "Quadra Poliesportiva", "Armários Embutidos"
];

export const DEFAULT_LEAD_SOURCES = [
    "Manual / Balcão",
    "Site Oficial",
    "Instagram",
    "Facebook",
    "Portal Zap",
    "Portal VivaReal",
    "Indicação",
    "Placa no Local"
];

export const DEFAULT_LOCATIONS = [
    "São Paulo - Jardins", 
    "São Paulo - Moema", 
    "São Paulo - Itaim Bibi",
    "São Paulo - Vila Nova Conceição",
    "São Paulo - Pinheiros",
    "Barueri - Alphaville", 
    "Barueri - Tamboré", 
    "Santana de Parnaíba - Gênesis"
];

export const DEFAULT_DESC_PROMPT = `Atue como um assistente imobiliário técnico e objetivo.
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

export const DEFAULT_MATCH_PROMPT = `Atue como um corretor imobiliário sênior. Analise a compatibilidade (Match) entre este cliente e este imóvel.

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

export const DEFAULT_CRM_GLOBAL_PROMPT = `Atue como um gerente de vendas imobiliário experiente.
Analise os seguintes dados anonimizados do pipeline de vendas:
{{pipelineData}}

Forneça 3 insights estratégicos curtos e acionáveis para o corretor fechar mais negócios.
Foque em: estagnação de leads, oportunidades de alto valor e priorização.
Retorne em formato de lista (HTML <ul><li>) simples.`;

export const DEFAULT_CRM_CARD_PROMPT = `Atue como um Mentor de Vendas Imobiliárias de Alto Padrão (Coach de Corretores).

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

// Helper to replace template vars
const processEmailTemplate = (template: string, vars: Record<string, string>) => {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        result = result.split(`{{${key}}}`).join(value);
    }
    return result;
}

// Helper to calculate next visit
const calculateNextVisit = (visits: Visit[]): string | undefined => {
    const now = new Date();
    const futureVisits = visits
        .filter(v => v.status === 'scheduled')
        .filter(v => new Date(v.date) > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return futureVisits.length > 0 ? futureVisits[0].date : undefined;
}

// Robust Env Getter
const getEnv = (key: string) => {
    try {
        // @ts-ignore
        return import.meta.env?.[key];
    } catch (e) {
        return undefined;
    }
}

// REAL-TIME SYNC HELPER WITH ENV FALLBACK
const syncToCloud = (settings: SystemSettings, table: string, data: any, isDelete = false) => {
    // 1. Try to get from State
    let { supabaseUrl, supabaseAnonKey } = settings;
    
    // 2. Fallback to defaults if state is empty
    if (!supabaseUrl) supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://sqbipjfbevtmcvmgvpbj.supabase.co';
    if (!supabaseAnonKey) supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_tH5TSU40ykxLckoOvRmxjg_Si20eMfN';

    if (!supabaseUrl || !supabaseAnonKey) {
        return; 
    }

    // Fire and forget (don't await) to update UI immediately
    if (isDelete) {
        deleteEntityFromSupabase(table, typeof data === 'string' ? data : data.id, supabaseUrl, supabaseAnonKey);
    } else {
        syncEntityToSupabase(table, data, supabaseUrl, supabaseAnonKey);
    }
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
          companyName: 'WebImob',
          propertyTypes: DEFAULT_PROPERTY_TYPES,
          propertyFeatures: DEFAULT_FEATURES,
          leadSources: DEFAULT_LEAD_SOURCES,
          availableLocations: DEFAULT_LOCATIONS,
          propertyDescriptionPrompt: DEFAULT_DESC_PROMPT,
          // Default CRM Prompts
          matchAiPrompt: DEFAULT_MATCH_PROMPT,
          crmGlobalInsightsPrompt: DEFAULT_CRM_GLOBAL_PROMPT,
          crmCardInsightsPrompt: DEFAULT_CRM_CARD_PROMPT,
          // Default API Key (Try env first)
          geminiApiKey: getEnv('VITE_GEMINI_API_KEY') || '',
          // Default Supabase config (Pre-configured per user request)
          supabaseUrl: getEnv('VITE_SUPABASE_URL') || 'https://sqbipjfbevtmcvmgvpbj.supabase.co',
          supabaseAnonKey: getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_tH5TSU40ykxLckoOvRmxjg_Si20eMfN',
          // Default Lead Aging Config
          leadAging: {
              freshLimit: 2, // 0 to 2 days = Fresh
              warmLimit: 7,  // 3 to 7 days = Warm, 8+ = Cold
              freshColor: 'green',
              warmColor: 'yellow',
              coldColor: 'red'
          },
          // New Team Performance Defaults
          teamPerformance: {
              minProperties: 1, // Min properties to count as "Active"
              minLeads: 5,      // Min leads to count as "Active"
              minVisits: 2,     // Min visits to count as "Active"
              activeLabel: 'Ativo',
              warningLabel: 'Baixa Atividade',
              inactiveLabel: 'Sem Produção - Cobrar'
          },
          // Default SMTP (Disabled)
          smtpConfig: {
              host: 'smtp.gmail.com',
              port: 587,
              user: '',
              pass: '',
              secure: false,
              fromName: 'Sistema WebImob',
              enabled: false
          },
          // Default Templates
          emailTemplates: DEFAULT_EMAIL_TEMPLATES
      },
      pipelines: [DEFAULT_PIPELINE],
      logs: [], 
      
      properties: [], // Empty for Production
      clients: [], // Empty for Production
      notifications: [],

      // ... (loadFromSupabase unchanged) ...
      loadFromSupabase: async () => {
          const state = get();
          const envUrl = getEnv('VITE_SUPABASE_URL');
          const envKey = getEnv('VITE_SUPABASE_ANON_KEY');
          const supabaseUrl = envUrl || state.systemSettings.supabaseUrl || 'https://sqbipjfbevtmcvmgvpbj.supabase.co';
          const supabaseAnonKey = envKey || state.systemSettings.supabaseAnonKey || 'sb_publishable_tH5TSU40ykxLckoOvRmxjg_Si20eMfN';

          if (!supabaseUrl || !supabaseAnonKey) {
              console.warn("Supabase not configured. Operating in local mode.");
              return;
          }

          const settingsRes = await fetchEntitiesFromSupabase('system_settings', supabaseUrl, supabaseAnonKey);
          
          if (settingsRes.data && settingsRes.data.length > 0) {
              const cloudSettings = settingsRes.data.find((s: any) => s.id === 'global-settings');
              if (cloudSettings) {
                  const mergedSettings = {
                      ...state.systemSettings,
                      ...cloudSettings,
                      supabaseUrl: cloudSettings.supabaseUrl || supabaseUrl,
                      supabaseAnonKey: cloudSettings.supabaseAnonKey || supabaseAnonKey,
                      geminiApiKey: cloudSettings.geminiApiKey || state.systemSettings.geminiApiKey || getEnv('VITE_GEMINI_API_KEY') || '',
                      // Ensure new fields exist if coming from older DB version
                      teamPerformance: cloudSettings.teamPerformance || state.systemSettings.teamPerformance,
                      smtpConfig: cloudSettings.smtpConfig || state.systemSettings.smtpConfig,
                      emailTemplates: cloudSettings.emailTemplates || state.systemSettings.emailTemplates || DEFAULT_EMAIL_TEMPLATES
                  };
                  set({ systemSettings: mergedSettings });
                  console.log("Configurações Globais carregadas do Supabase.");
              }
          }

          const [usersRes, propsRes, clientsRes, pipeRes, logsRes] = await Promise.all([
              fetchEntitiesFromSupabase('users', supabaseUrl, supabaseAnonKey),
              fetchEntitiesFromSupabase('properties', supabaseUrl, supabaseAnonKey),
              fetchEntitiesFromSupabase('clients', supabaseUrl, supabaseAnonKey),
              fetchEntitiesFromSupabase('pipelines', supabaseUrl, supabaseAnonKey),
              fetchEntitiesFromSupabase('logs', supabaseUrl, supabaseAnonKey)
          ]);

          const updates: Partial<AppState> = {};
          let hasUpdates = false;

          if (usersRes.data && usersRes.data.length > 0) { updates.users = usersRes.data; hasUpdates = true; }
          if (propsRes.data && propsRes.data.length > 0) { updates.properties = propsRes.data; hasUpdates = true; }
          if (clientsRes.data && clientsRes.data.length > 0) { updates.clients = clientsRes.data; hasUpdates = true; }
          if (pipeRes.data && pipeRes.data.length > 0) { updates.pipelines = pipeRes.data; hasUpdates = true; }
          if (logsRes.data && logsRes.data.length > 0) { updates.logs = logsRes.data; hasUpdates = true; }

          if (hasUpdates) {
              set(updates);
              console.log("Dados Operacionais sincronizados do Supabase.");
          }
      },

      unsubscribeFromRealtime: () => {
          unsubscribeAll();
      },

      subscribeToRealtime: () => {
          const state = get();
          const envUrl = getEnv('VITE_SUPABASE_URL');
          const envKey = getEnv('VITE_SUPABASE_ANON_KEY');
          const supabaseUrl = envUrl || state.systemSettings.supabaseUrl || 'https://sqbipjfbevtmcvmgvpbj.supabase.co';
          const supabaseAnonKey = envKey || state.systemSettings.supabaseAnonKey || 'sb_publishable_tH5TSU40ykxLckoOvRmxjg_Si20eMfN';

          if (!supabaseUrl || !supabaseAnonKey) return;

          const handleUpdate = (table: string, payload: any, type: 'INSERT' | 'UPDATE' | 'DELETE') => {
              // Safe Payload Extraction
              const id = payload.id || (payload.content && payload.content.id);
              let data = payload.content;

              // Ensure data is parsed if it comes as string (Supabase quirk depending on JSON/JSONB)
              if (typeof data === 'string') {
                  try { data = JSON.parse(data); } catch(e) { console.error('Failed to parse realtime payload', e); return; }
              }

              if(!id) return; 

              set((current) => {
                  const updates: any = {};
                  const stateKey = table as keyof AppState; 

                  // Special Case: System Settings
                  if (table === 'system_settings') {
                      if (id === 'global-settings' && data) {
                          updates.systemSettings = { 
                              ...current.systemSettings, 
                              ...data,
                              supabaseUrl: data.supabaseUrl || current.systemSettings.supabaseUrl || supabaseUrl,
                              supabaseAnonKey: data.supabaseAnonKey || current.systemSettings.supabaseAnonKey || supabaseAnonKey,
                          };
                          // @ts-ignore
                          delete updates.systemSettings.id;
                      }
                      return updates;
                  }

                  // Generic List Update
                  if (current[stateKey] && Array.isArray(current[stateKey])) {
                      const currentList = current[stateKey] as any[];
                      
                      if (type === 'DELETE') {
                          updates[stateKey] = currentList.filter(item => item.id !== id);
                      } else if (data) {
                          // INSERT or UPDATE
                          const exists = currentList.find(item => item.id === id);
                          if (exists) {
                              // Force new array reference to trigger React re-render
                              updates[stateKey] = currentList.map(item => item.id === id ? data : item);
                          } else {
                              updates[stateKey] = [...currentList, data];
                          }
                      }
                  }

                  return updates;
              });
          };

          const tables = ['properties', 'clients', 'users', 'pipelines', 'system_settings', 'logs'];
          
          tables.forEach(table => {
              subscribeToTable(table, supabaseUrl, supabaseAnonKey, 
                  (p) => handleUpdate(table, p, 'INSERT'),
                  (p) => handleUpdate(table, p, 'UPDATE'),
                  (p) => handleUpdate(table, p, 'DELETE')
              );
          });
      },

      // ... (Auth Actions, Data Actions, etc. unchanged) ...
      // --- Auth Actions Updated ---
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
          // Check against persisted password OR default '123456' for legacy
          const validPassword = user?.password || '123456';
          
          if (user && password === validPassword) {
              if (user.blocked) {
                  get().addNotification('error', 'Acesso bloqueado. Entre em contato com o administrador.');
                  return false;
              }
              set({ currentUser: user });
              get().addNotification('success', `Bem-vindo de volta, ${user.name.split(' ')[0]}!`);
              get().loadFromSupabase();
              get().subscribeToRealtime();
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
          const updatedUsers = state.users.map(u => u.id === userId ? { ...u, role: newRole } : u);
          
          const updatedUser = updatedUsers.find(u => u.id === userId);
          if(updatedUser) syncToCloud(state.systemSettings, 'users', updatedUser);

          return {
              users: updatedUsers,
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Permissões do usuário atualizadas.' }]
          };
      }),

      // New generic Update User action
      updateUser: (userId, updates) => set((state) => {
          const updatedUsers = state.users.map(u => u.id === userId ? { ...u, ...updates } : u);
          const updatedUser = updatedUsers.find(u => u.id === userId);
          
          // Also update current user session if it's the same person
          const currentUser = state.currentUser?.id === userId ? { ...state.currentUser, ...updates } : state.currentUser;

          if(updatedUser) syncToCloud(state.systemSettings, 'users', updatedUser);

          return {
              users: updatedUsers,
              currentUser: currentUser,
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Usuário atualizado com sucesso.' }]
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
                  password: '123456', // Default password
                  role: userData.role,
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`,
                  blocked: false 
              };
              
              syncToCloud(state.systemSettings, 'users', newUser);

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
          
          syncToCloud(state.systemSettings, 'users', userId, true);

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
          const updatedUser = { ...user, blocked: newBlockedStatus };
          
          syncToCloud(state.systemSettings, 'users', updatedUser);

          return {
              users: state.users.map(u => u.id === userId ? updatedUser : u),
              notifications: [...state.notifications, { 
                  id: Math.random().toString(), 
                  type: newBlockedStatus ? 'error' : 'success', 
                  message: newBlockedStatus ? `Acesso de ${user.name} bloqueado.` : `Acesso de ${user.name} liberado.` 
              }]
          };
      }),

      // ... (Rest of actions logic is fine) ...
      updateSystemSettings: (newSettings) => set((state) => {
          const oldSettings = { ...state.systemSettings };
          const updatedSettings = { ...state.systemSettings, ...newSettings };
          const newLog = createLog(state.currentUser, 'update', 'settings', 'system', 'Configurações Globais', 'Alteração nas configurações do sistema', oldSettings, updatedSettings);
          
          syncToCloud(updatedSettings, 'system_settings', { id: 'global-settings', ...updatedSettings });
          syncToCloud(updatedSettings, 'logs', newLog);

          return {
            systemSettings: updatedSettings,
            logs: [newLog, ...state.logs],
            notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Configurações do sistema salvas e sincronizadas.' }]
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
            submittedAt: status === 'pending_approval' ? new Date().toISOString() : undefined,
            approvedAt: (isStaff || !requireApproval) ? new Date().toISOString() : undefined,
            createdAt: new Date().toISOString()
        };

        const newLog = createLog(user, 'create', 'property', newProperty.id, newProperty.title, 'Novo imóvel cadastrado', undefined, newProperty);
        
        syncToCloud(state.systemSettings, 'properties', newProperty);
        syncToCloud(state.systemSettings, 'logs', newLog);

        return { 
            properties: [...state.properties, newProperty],
            logs: [newLog, ...state.logs],
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
          
          const enhancedUpdates = { 
              ...updates,
              updatedAt: new Date().toISOString(),
              updatedBy: state.currentUser?.id
          };
          
          if (updates.status === 'pending_approval') {
              // Store submission date when sending for approval (edit or resubmit)
              enhancedUpdates.submittedAt = new Date().toISOString();
          }

          const newProperty = { ...oldProperty, ...enhancedUpdates };
          if (updates.status === 'pending_approval') newProperty.rejectionReason = undefined;

          const newLog = createLog(state.currentUser, 'update', 'property', propertyId, oldProperty.title, 'Imóvel atualizado', oldProperty, newProperty);
          
          syncToCloud(state.systemSettings, 'properties', newProperty);
          syncToCloud(state.systemSettings, 'logs', newLog);

          return {
              properties: state.properties.map(p => p.id === propertyId ? newProperty : p),
              logs: [newLog, ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Imóvel atualizado com sucesso.' }]
          };
      }),

      updatePropertyStatus: (propertyId, newStatus, reason) => set((state) => {
          const oldProperty = state.properties.find(p => p.id === propertyId);
          if (!oldProperty) return state;
          
          const newProperty = { 
              ...oldProperty, 
              status: newStatus,
              rejectionReason: reason,
              submittedAt: newStatus === 'pending_approval' ? new Date().toISOString() : oldProperty.submittedAt,
              approvedAt: newStatus === 'published' ? new Date().toISOString() : oldProperty.approvedAt,
              updatedAt: new Date().toISOString(),
              updatedBy: state.currentUser?.id
          };
          
          if (newStatus === 'published' && !newProperty.approvedBy) newProperty.approvedBy = state.currentUser?.id;
          if (newStatus === 'published') newProperty.rejectionReason = undefined;

          const newLog = createLog(state.currentUser, 'update', 'property', propertyId, oldProperty.title, `Status alterado para ${newStatus}`, oldProperty, newProperty);
          
          syncToCloud(state.systemSettings, 'properties', newProperty);
          syncToCloud(state.systemSettings, 'logs', newLog);

          return {
              properties: state.properties.map(p => p.id === propertyId ? newProperty : p),
              logs: [newLog, ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'info', message: `Status do imóvel alterado para ${newStatus}.` }]
          };
      }),

      removeProperty: (propertyId) => set((state) => {
          const property = state.properties.find(p => p.id === propertyId);
          if (!property) return state;

          const newLog = createLog(state.currentUser, 'delete', 'property', propertyId, property.title, 'Imóvel excluído', property, undefined);
          
          syncToCloud(state.systemSettings, 'properties', propertyId, true); // Hard delete
          syncToCloud(state.systemSettings, 'logs', newLog);

          return {
              properties: state.properties.filter(p => p.id !== propertyId),
              logs: [newLog, ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Imóvel excluído com sucesso.' }]
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
              approvedAt: new Date().toISOString(),
              rejectionReason: undefined,
              updatedAt: new Date().toISOString(),
              updatedBy: user.id
          };

          const newLog = createLog(user, 'approval', 'property', propertyId, oldProperty.title, 'Imóvel aprovado', oldProperty, newProperty);
          
          syncToCloud(state.systemSettings, 'properties', newProperty);
          syncToCloud(state.systemSettings, 'logs', newLog);

          // SEND EMAIL TO OWNER
          const owner = state.users.find(u => u.id === oldProperty.authorId);
          if (owner) {
              const template = state.systemSettings.emailTemplates?.propertyApproved || DEFAULT_EMAIL_TEMPLATES.propertyApproved;
              const body = processEmailTemplate(template, {
                  ownerName: owner.name,
                  propertyTitle: oldProperty.title,
                  propertyCode: oldProperty.code
              });

              sendSystemEmail({
                  to: owner.email,
                  subject: `Sucesso: Imóvel Publicado - ${state.systemSettings.companyName}`,
                  body
              }, state.systemSettings.smtpConfig);
          }

          return {
              properties: state.properties.map(p => p.id === propertyId ? newProperty : p),
              logs: [newLog, ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: `Sucesso: O imóvel '${oldProperty.title}' foi publicado!` }]
          };
      }),

      rejectProperty: (propertyId, reason) => set((state) => {
          const user = state.currentUser;
          if (!user || user.role === 'broker') return { notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'Sem permissão para reprovar.' }] };
          const oldProperty = state.properties.find(p => p.id === propertyId);
          if (!oldProperty) return state;
          const newProperty = { 
              ...oldProperty, 
              status: 'draft' as const, 
              approvedBy: undefined, 
              rejectionReason: reason,
              updatedAt: new Date().toISOString(),
              updatedBy: user.id
          };
          
          const newLog = createLog(user, 'update', 'property', propertyId, oldProperty.title, 'Imóvel reprovado (Retornado para Rascunho)', oldProperty, newProperty);
          
          syncToCloud(state.systemSettings, 'properties', newProperty);
          syncToCloud(state.systemSettings, 'logs', newLog);

          // SEND EMAIL TO OWNER
          const owner = state.users.find(u => u.id === oldProperty.authorId);
          if (owner) {
              const template = state.systemSettings.emailTemplates?.propertyRejected || DEFAULT_EMAIL_TEMPLATES.propertyRejected;
              const body = processEmailTemplate(template, {
                  ownerName: owner.name,
                  propertyTitle: oldProperty.title,
                  propertyCode: oldProperty.code,
                  reason: reason
              });

              sendSystemEmail({
                  to: owner.email,
                  subject: `Atenção: Ajustes Necessários - ${state.systemSettings.companyName}`,
                  body
              }, state.systemSettings.smtpConfig);
          }

          return {
              properties: state.properties.map(p => p.id === propertyId ? newProperty : p),
              logs: [newLog, ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'info', message: `Atenção: O imóvel '${oldProperty.title}' precisa de ajustes. Motivo: ${reason}` }]
          };
      }),
      
      updateClient: (clientId, updates) => set((state) => {
          const oldClient = state.clients.find(c => c.id === clientId);
          if (!oldClient) return state;
          const newClient = { ...oldClient, ...updates };
          const newLog = createLog(state.currentUser, 'update', 'client', clientId, oldClient.name, 'Dados do lead atualizados', oldClient, newClient);
          
          syncToCloud(state.systemSettings, 'clients', newClient);
          syncToCloud(state.systemSettings, 'logs', newLog);

          return {
            clients: state.clients.map(c => c.id === clientId ? newClient : c),
            logs: [newLog, ...state.logs],
            notifications: updates.stage ? [...state.notifications, { id: Math.random().toString(), type: 'info', message: 'Estágio do cliente atualizado.' }] : state.notifications
          };
      }),

      removeClient: (clientId) => set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if (!client) return state;
          
          const newLog = createLog(state.currentUser, 'delete', 'client', clientId, client.name, 'Lead excluído', client, undefined);
          
          syncToCloud(state.systemSettings, 'clients', clientId, true);
          syncToCloud(state.systemSettings, 'logs', newLog);

          return {
            clients: state.clients.filter(c => c.id !== clientId),
            logs: [newLog, ...state.logs],
            notifications: [...state.notifications, { id: Math.random().toString(), type: 'info', message: 'Cliente removido.' }]
          };
      }),

      markLeadAsLost: (clientId, reason) => set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if(!client) return state;

          const updatedClient: Client = {
              ...client,
              pipelineId: undefined, 
              stage: 'new',
              lostReason: reason,
              lastContact: new Date().toISOString(),
              interestedPropertyIds: [] 
          };

          const newLog = createLog(state.currentUser, 'update', 'client', clientId, client.name, `Lead marcado como perdido: ${reason}`, client, updatedClient);
          
          syncToCloud(state.systemSettings, 'clients', updatedClient);
          syncToCloud(state.systemSettings, 'logs', newLog);

          return {
              clients: state.clients.map(c => c.id === clientId ? updatedClient : c),
              logs: [newLog, ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'info', message: 'Lead marcado como perdido e movido para o histórico.' }]
          };
      }),

      addClient: (clientData, specificOwnerId) => {
          const state = get();
          if (state.clients.find(c => c.phone === clientData.phone)) {
              state.addNotification('error', `Este telefone já pertence a um lead existente.`);
              return null;
          }
          
          let newId = '';
          set((state) => {
            const ownerId = specificOwnerId || state.currentUser?.id;
            if (!ownerId) return state;
            
            newId = Math.random().toString(36).substr(2, 9);
            const newClient: Client = {
                ...clientData,
                id: newId,
                ownerId: ownerId,
                visits: [],
                interestedPropertyIds: [],
                familyMembers: [],
                documents: [],
                followers: [],
                createdAt: new Date().toISOString(),
                lastContact: new Date().toISOString()
            };
            
            const newLog = createLog(state.currentUser, 'create', 'client', newClient.id, newClient.name, 'Lead criado', undefined, newClient);
            
            syncToCloud(state.systemSettings, 'clients', newClient);
            syncToCloud(state.systemSettings, 'logs', newLog);

            // EMAIL ALERT IF ASSIGNED BY ADMIN TO ANOTHER USER
            if (specificOwnerId && specificOwnerId !== state.currentUser?.id) {
                const targetBroker = state.users.find(u => u.id === specificOwnerId);
                if (targetBroker) {
                    const template = state.systemSettings.emailTemplates?.leadAssigned || DEFAULT_EMAIL_TEMPLATES.leadAssigned;
                    const body = processEmailTemplate(template, {
                        ownerName: targetBroker.name,
                        clientName: newClient.name,
                        clientPhone: newClient.phone
                    });

                    sendSystemEmail({
                        to: targetBroker.email,
                        subject: `Novo Lead: ${newClient.name} foi adicionado à sua carteira.`,
                        body
                    }, state.systemSettings.smtpConfig);
                }
            }

            return { 
                clients: [...state.clients, newClient],
                logs: [newLog, ...state.logs],
                notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Novo lead cadastrado com sucesso!' }]
            };
          });
          return newId;
      },

      addFamilyMember: (originClientId, memberData) => set((state) => {
          const originClient = state.clients.find(c => c.id === originClientId);
          if (!originClient) {
              return { notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'Lead principal não encontrado.' }]};
          }

          if (state.clients.find(c => c.phone === memberData.phone || c.email === memberData.email)) {
              return { notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'Familiar já existe como lead no sistema (verifique email/telefone).' }]};
          }

          const newId = Math.random().toString(36).substr(2, 9);
          const newClient: Client = {
              id: newId,
              ownerId: originClient.ownerId, 
              pipelineId: undefined, 
              name: memberData.name,
              phone: memberData.phone,
              email: memberData.email,
              stage: 'new',
              source: 'Indicação',
              budget: 0,
              interest: [],
              desiredLocation: [],
              visits: [],
              interestedPropertyIds: [],
              familyMembers: [{ id: originClient.id, name: originClient.name, relationship: 'Responsável/Titular' }], 
              documents: [],
              followers: [],
              createdAt: new Date().toISOString(),
              lastContact: new Date().toISOString()
          };

          const updatedOriginClient = {
              ...originClient,
              familyMembers: [...(originClient.familyMembers || []), { id: newId, name: newClient.name, relationship: memberData.relationship }]
          };

          const newLog = createLog(state.currentUser, 'update', 'client', originClientId, originClient.name, `Adicionado familiar: ${newClient.name}`, originClient, updatedOriginClient);
          
          syncToCloud(state.systemSettings, 'clients', updatedOriginClient);
          syncToCloud(state.systemSettings, 'clients', newClient);
          syncToCloud(state.systemSettings, 'logs', newLog);

          return {
              clients: [...state.clients.filter(c => c.id !== originClientId), updatedOriginClient, newClient],
              logs: [newLog, ...state.logs],
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Familiar adicionado e criado como Lead!' }]
          };
      }),

      moveClientToPipeline: (clientId, pipelineId, stageId) => set((state) => {
          const oldClient = state.clients.find(c => c.id === clientId);
          if(!oldClient) return state;
          const newClient = { ...oldClient, pipelineId, stage: stageId };
          
          const newLog = createLog(state.currentUser, 'update', 'client', clientId, oldClient.name, 'Movido para pipeline', oldClient, newClient);
          
          syncToCloud(state.systemSettings, 'clients', newClient);
          syncToCloud(state.systemSettings, 'logs', newLog);

          return {
              clients: state.clients.map(c => c.id === clientId ? newClient : c),
              logs: [newLog, ...state.logs],
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
          
          syncToCloud(state.systemSettings, 'clients', updatedClient);

          return {
              clients: state.clients.map(c => c.id === clientId ? updatedClient : c),
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Visita agendada com sucesso!' }]
          };
      }),

      updateVisit: (clientId, visitId, updates) => set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if (!client) return state;

          const oldVisit = client.visits.find(v => v.id === visitId);
          const updatedVisits = client.visits.map(v => v.id === visitId ? { ...v, ...updates } : v);
          const newVisit = updatedVisits.find(v => v.id === visitId);
          
          const nextVisit = calculateNextVisit(updatedVisits);
          const updatedClient = { ...client, visits: updatedVisits, nextVisit };

          // NEW: Generate Log if status changed to completed
          let newLog;
          if (updates.status === 'completed' && oldVisit?.status !== 'completed') {
              const feedbackSummary = updates.feedback 
                  ? `Feedback: "${updates.feedback}"` 
                  : 'Visita concluída sem feedback.';
              const likedStr = updates.liked ? 'Cliente Gostou.' : 'Cliente Não Gostou.';
              
              newLog = createLog(
                  state.currentUser, 
                  'update', 
                  'client', 
                  clientId, 
                  client.name, 
                  `Visita Realizada. ${likedStr} ${feedbackSummary}`, 
                  oldVisit, 
                  newVisit
              );
              syncToCloud(state.systemSettings, 'logs', newLog);
          }

          syncToCloud(state.systemSettings, 'clients', updatedClient);

          return {
              clients: state.clients.map(c => c.id === clientId ? updatedClient : c),
              logs: newLog ? [newLog, ...state.logs] : state.logs,
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Visita atualizada.' }]
          };
      }),

      removeVisit: (clientId, visitId) => set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if (!client) return state;

          const updatedVisits = client.visits.filter(v => v.id !== visitId);
          const nextVisit = calculateNextVisit(updatedVisits);
          const updatedClient = { ...client, visits: updatedVisits, nextVisit };

          syncToCloud(state.systemSettings, 'clients', updatedClient);

          return {
              clients: state.clients.map(c => c.id === clientId ? updatedClient : c),
              notifications: [...state.notifications, { id: Math.random().toString(), type: 'info', message: 'Visita removida.' }]
          };
      }),
      
      addPipeline: (name) => set((state) => {
          const newPipeline = { id: `p-${Date.now()}`, name, isDefault: false, stages: [{ id: `s-${Date.now()}-1`, name: 'Novo', color: 'border-slate-400', order: 0 }] };
          syncToCloud(state.systemSettings, 'pipelines', newPipeline);
          return { pipelines: [...state.pipelines, newPipeline], notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Novo pipeline criado.' }] };
      }),
      updatePipeline: (pipelineId, updates) => set((state) => {
          const updatedPipelines = state.pipelines.map(p => p.id === pipelineId ? { ...p, ...updates } : p);
          const updated = updatedPipelines.find(p => p.id === pipelineId);
          if(updated) syncToCloud(state.systemSettings, 'pipelines', updated);
          return { pipelines: updatedPipelines };
      }),
      deletePipeline: (pipelineId) => set((state) => {
          if(state.pipelines.find(p => p.id === pipelineId)?.isDefault) {
              return { notifications: [...state.notifications, { id: Math.random().toString(), type: 'error', message: 'O pipeline padrão não pode ser excluído.' }] };
          }
          syncToCloud(state.systemSettings, 'pipelines', pipelineId, true);
          return { pipelines: state.pipelines.filter(p => p.id !== pipelineId), clients: state.clients.map(c => c.pipelineId === pipelineId ? { ...c, pipelineId: undefined, stage: '' } : c), notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Pipeline removido.' }] };
      }),
      addPipelineStage: (pipelineId, name) => set((state) => {
          const updatedPipelines = state.pipelines.map(p => p.id !== pipelineId ? p : { ...p, stages: [...p.stages, { id: `s-${Date.now()}`, name, color: 'border-gray-300', order: p.stages.length }] });
          const updated = updatedPipelines.find(p => p.id === pipelineId);
          if(updated) syncToCloud(state.systemSettings, 'pipelines', updated);
          return { pipelines: updatedPipelines };
      }),
      updatePipelineStage: (pipelineId, stageId, updates) => set((state) => {
          const updatedPipelines = state.pipelines.map(p => p.id !== pipelineId ? p : { ...p, stages: p.stages.map(s => s.id === stageId ? { ...s, ...updates } : s) });
          const updated = updatedPipelines.find(p => p.id === pipelineId);
          if(updated) syncToCloud(state.systemSettings, 'pipelines', updated);
          return { pipelines: updatedPipelines };
      }),
      deletePipelineStage: (pipelineId, stageId) => set((state) => {
          const updatedPipelines = state.pipelines.map(p => p.id !== pipelineId ? p : p.stages.length <= 1 ? p : { ...p, stages: p.stages.filter(s => s.id !== stageId) });
          const updated = updatedPipelines.find(p => p.id === pipelineId);
          if(updated) syncToCloud(state.systemSettings, 'pipelines', updated);
          return { pipelines: updatedPipelines };
      }),
      
      addNotification: (type, message) => set((state) => ({ notifications: [...state.notifications, { id: Math.random().toString(), type, message }] })),
      removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) })),

      sendTestEmail: async (email, config) => {
          const success = await sendSystemEmail({
              to: email,
              subject: 'Teste de Configuração SMTP - WebImob',
              body: 'Olá.\n\nEste é um email de teste para confirmar que sua configuração SMTP está funcionando corretamente.\n\nAtenciosamente,\nWebImob'
          }, config);
          return success;
      },

      restoreState: (logId) => set((state) => {
          const log = state.logs.find(l => l.id === logId);
          if (!log || !log.previousData) return state;

          const { entity, entityId, previousData } = log;
          const user = state.currentUser;

          const newLog = createLog(user, 'restore', entity, entityId, log.entityName, `Restaurado para versão de ${new Date(log.timestamp).toLocaleString()}`, undefined, previousData);
          
          syncToCloud(state.systemSettings, 'logs', newLog);

          switch(entity) {
              case 'property':
                  syncToCloud(state.systemSettings, 'properties', previousData); 
                  return {
                      properties: state.properties.map(p => p.id === entityId ? { ...p, ...previousData } : p),
                      logs: [newLog, ...state.logs],
                      notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Imóvel restaurado.' }]
                  };
              case 'client':
                  syncToCloud(state.systemSettings, 'clients', previousData); 
                  return {
                      clients: state.clients.map(c => c.id === entityId ? { ...c, ...previousData } : c),
                      logs: [newLog, ...state.logs],
                      notifications: [...state.notifications, { id: Math.random().toString(), type: 'success', message: 'Cliente restaurado.' }]
                  };
              case 'settings':
                  if (entityId === 'system') {
                      syncToCloud(previousData, 'system_settings', { id: 'global-settings', ...previousData });
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
      version: 3, 
      partialize: (state) => ({ 
          currentUser: state.currentUser,
          systemSettings: state.systemSettings 
      }),
    }
  )
);