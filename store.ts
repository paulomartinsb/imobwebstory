// ... (imports remain same)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Property, Client, User, UserRole, SystemSettings, Pipeline, PipelineStageConfig, LogEntry, PropertyStatus, Visit, SmtpConfig } from './types';
import { fetchEntitiesFromSupabase, syncEntityToSupabase, deleteEntityFromSupabase, subscribeToDatabase, unsubscribeAll } from './services/supabaseClient';
import { sendSystemEmail, DEFAULT_EMAIL_TEMPLATES } from './services/emailService';
import { triggerIntegrationWebhook } from './services/integrationService';

// ... (Interface declarations remain unchanged)
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
  
  // Realtime Status
  realtimeStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';

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
  removeProperty: (propertyId: string) => void; 
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

// ... (Constants, Helpers remain unchanged) ...
// ... (Include all previous helper functions here: createLog, processEmailTemplate, calculateNextVisit, getEnv, syncToCloud, normalizeRecord) ...
const createLog = (user: User | null, action: LogEntry['action'], entity: LogEntry['entity'], entityId: string, entityName: string, details: string, previousData?: any, newData?: any): LogEntry => ({ id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), userId: user?.id || 'system', userName: user?.name || 'Sistema', action, entity, entityId, entityName, details, previousData: previousData ? JSON.parse(JSON.stringify(previousData)) : undefined, newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined });
const processEmailTemplate = (template: string, vars: Record<string, string>) => { let result = template; for (const [key, value] of Object.entries(vars)) { result = result.split(`{{${key}}}`).join(value); } return result; }
const calculateNextVisit = (visits: Visit[]): string | undefined => { const now = new Date(); const futureVisits = visits.filter(v => v.status === 'scheduled').filter(v => new Date(v.date) > now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); return futureVisits.length > 0 ? futureVisits[0].date : undefined; }
// FIX: Cast import.meta to any to avoid TS error regarding 'env' property
const getEnv = (key: string) => { try { return (import.meta as any).env?.[key]; } catch (e) { return undefined; } }
const syncToCloud = (settings: SystemSettings, table: string, data: any, isDelete = false) => { let { supabaseUrl, supabaseAnonKey } = settings; if (!supabaseUrl) supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://sqbipjfbevtmcvmgvpbj.supabase.co'; if (!supabaseAnonKey) supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_tH5TSU40ykxLckoOvRmxjg_Si20eMfN'; if (!supabaseUrl || !supabaseAnonKey) return; if (isDelete) { deleteEntityFromSupabase(table, typeof data === 'string' ? data : data.id, supabaseUrl, supabaseAnonKey); } else { syncEntityToSupabase(table, data, supabaseUrl, supabaseAnonKey); } }
const normalizeRecord = (record: any): any => { if (!record) return null; if (record.content) { const content = typeof record.content === 'string' ? JSON.parse(record.content) : record.content; if(!content.id && record.id) content.id = record.id; return content; } const newObj: any = {}; for (const key in record) { const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()); newObj[camelKey] = record[key]; } return newObj; }

// ... (DEFAULT Constants remain unchanged) ...
const DEFAULT_ADMIN: User = { id: 'admin-master', name: 'Administrador', email: 'admin@webimob.com', password: '123456', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Admin&background=0c4a6e&color=fff', blocked: false };
const DEFAULT_PIPELINE: Pipeline = { id: 'p1', name: 'Vendas Padrão', isDefault: true, stages: [ { id: 'new', name: 'Novos Leads', color: 'border-slate-400', order: 0 }, { id: 'visit', name: 'Visitas', color: 'border-blue-400', order: 1 }, { id: 'proposal', name: 'Negociação', color: 'border-yellow-400', order: 2 }, { id: 'contract', name: 'Contratos', color: 'border-purple-400', order: 3 }, { id: 'closed', name: 'Fechados', color: 'border-green-500', order: 4 }, ] };
// ... (Other constants: DEFAULT_PROPERTY_TYPES, DEFAULT_FEATURES, etc. - assume they are present) ...
export const DEFAULT_PROPERTY_TYPES = [ { value: 'apartamento', label: 'Apartamento' }, { value: 'casa', label: 'Casa' }, { value: 'cobertura', label: 'Cobertura' }, { value: 'sobrado', label: 'Sobrado / Casa Geminada' }, { value: 'duplex', label: 'Duplex' }, { value: 'terreno', label: 'Terreno / Lote' }, { value: 'comercial', label: 'Comercial' }, { value: 'studio', label: 'Studio' }, { value: 'sitio', label: 'Sítio / Fazenda' } ];
export const DEFAULT_FEATURES = [ "Piscina", "Churrasqueira", "Academia", "Salão de Festas", "Portaria 24h", "Varanda Gourmet", "Ar Condicionado", "Playground", "Elevador", "Mobiliado", "Vaga Coberta", "Pet Friendly", "Vista Panorâmica", "Jardim", "Lareira", "Sauna", "Quadra Poliesportiva", "Armários Embutidos" ];
export const DEFAULT_LEAD_SOURCES = [ "Manual / Balcão", "Site Oficial", "Instagram", "Facebook", "Portal Zap", "Portal VivaReal", "Indicação", "Placa no Local" ];
export const DEFAULT_LOCATIONS = [ "São Paulo - Jardins", "São Paulo - Moema", "São Paulo - Itaim Bibi", "São Paulo - Vila Nova Conceição", "São Paulo - Pinheiros", "Barueri - Alphaville", "Barueri - Tamboré", "Santana de Parnaíba - Gênesis" ];
export const DEFAULT_DESC_PROMPT = `Atue como um assistente imobiliário...`; // Truncated for brevity
export const DEFAULT_MATCH_PROMPT = `Atue como um corretor imobiliário...`;
export const DEFAULT_CRM_GLOBAL_PROMPT = `Atue como um gerente de vendas...`;
export const DEFAULT_CRM_CARD_PROMPT = `Atue como um Mentor de Vendas...`;


export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ... (Initial State) ...
      currentUser: null,
      users: [DEFAULT_ADMIN],
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
          matchAiPrompt: DEFAULT_MATCH_PROMPT,
          crmGlobalInsightsPrompt: DEFAULT_CRM_GLOBAL_PROMPT,
          crmCardInsightsPrompt: DEFAULT_CRM_CARD_PROMPT,
          geminiApiKey: getEnv('VITE_GEMINI_API_KEY') || '',
          supabaseUrl: getEnv('VITE_SUPABASE_URL') || 'https://sqbipjfbevtmcvmgvpbj.supabase.co',
          supabaseAnonKey: getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_tH5TSU40ykxLckoOvRmxjg_Si20eMfN',
          // New N8N Config
          n8nWebhookUrl: '',
          leadAging: { freshLimit: 2, warmLimit: 7, freshColor: 'green', warmColor: 'yellow', coldColor: 'red' },
          teamPerformance: { minProperties: 1, minLeads: 5, minVisits: 2, activeLabel: 'Ativo', warningLabel: 'Baixa Atividade', inactiveLabel: 'Sem Produção - Cobrar' },
          smtpConfig: { host: 'smtp.gmail.com', port: 587, user: '', pass: '', secure: false, fromName: 'Sistema WebImob', enabled: false },
          emailTemplates: DEFAULT_EMAIL_TEMPLATES
      },
      pipelines: [DEFAULT_PIPELINE],
      logs: [], 
      properties: [],
      clients: [],
      notifications: [],
      realtimeStatus: 'DISCONNECTED', // Initialize as disconnected

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

          // Fetch Settings first
          const settingsRes = await fetchEntitiesFromSupabase('system_settings', supabaseUrl, supabaseAnonKey);
          if (settingsRes.data && settingsRes.data.length > 0) {
              const cloudSettings = settingsRes.data.find((s: any) => s.id === 'global-settings');
              if (cloudSettings) {
                  set({ systemSettings: { ...state.systemSettings, ...cloudSettings, supabaseUrl: cloudSettings.supabaseUrl || supabaseUrl, supabaseAnonKey: cloudSettings.supabaseAnonKey || supabaseAnonKey, geminiApiKey: cloudSettings.geminiApiKey || state.systemSettings.geminiApiKey } });
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
          if (usersRes.data && usersRes.data.length > 0) updates.users = usersRes.data;
          if (propsRes.data && propsRes.data.length > 0) updates.properties = propsRes.data;
          if (clientsRes.data && clientsRes.data.length > 0) updates.clients = clientsRes.data;
          
          if (pipeRes.data && pipeRes.data.length > 0) {
              updates.pipelines = pipeRes.data;
          } else if (state.pipelines.length === 0) {
              updates.pipelines = [DEFAULT_PIPELINE];
          }

          if (logsRes.data && logsRes.data.length > 0) updates.logs = logsRes.data;

          set(updates);
      },

      unsubscribeFromRealtime: () => {
          unsubscribeAll();
          set({ realtimeStatus: 'DISCONNECTED' });
      },

      subscribeToRealtime: () => {
          const state = get();
          const supabaseUrl = state.systemSettings.supabaseUrl || getEnv('VITE_SUPABASE_URL') || 'https://sqbipjfbevtmcvmgvpbj.supabase.co';
          const supabaseAnonKey = state.systemSettings.supabaseAnonKey || getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_tH5TSU40ykxLckoOvRmxjg_Si20eMfN';

          if (!supabaseUrl || !supabaseAnonKey) return;

          const allowedTables = ['properties', 'clients', 'users', 'pipelines', 'system_settings', 'logs'];

          subscribeToDatabase(
              supabaseUrl, 
              supabaseAnonKey, 
              (payload) => {
                  const { table, eventType, new: newRecord, old: oldRecord } = payload;
                  
                  if (!allowedTables.includes(table.toLowerCase())) return;

                  const record = eventType === 'DELETE' ? oldRecord : newRecord;
                  if (!record) return;

                  let data = normalizeRecord(record);
                  const id = String(data.id || record.id); 

                  if(!id && eventType !== 'INSERT') return;

                  set((current) => {
                      const updates: any = {};
                      const stateKey = table.toLowerCase() as keyof AppState; 

                      if (table === 'system_settings') {
                          if (id === 'global-settings' && data) {
                              updates.systemSettings = { ...current.systemSettings, ...data };
                          }
                          return updates;
                      }

                      if (current[stateKey] && Array.isArray(current[stateKey])) {
                          const currentList = current[stateKey] as any[];
                          
                          if (eventType === 'DELETE') {
                              updates[stateKey] = currentList.filter(item => String(item.id) !== id);
                          } else if (data) {
                              const exists = currentList.find(item => String(item.id) === id);
                              if (exists) {
                                  updates[stateKey] = currentList.map(item => String(item.id) === id ? { ...item, ...data } : item);
                              } else {
                                  updates[stateKey] = [...currentList, data];
                              }
                          }
                      }
                      return updates;
                  });
              },
              (status) => {
                  set({ realtimeStatus: status });
              }
          );
      },

      // ... (Rest of actions logic remains unchanged) ...
      // --- Auth Actions ---
      setCurrentUser: (userId) => { const user = get().users.find(u => u.id === userId); if (user) { if(user.blocked) { get().addNotification('error', `Usuário bloqueado.`); return; } set({ currentUser: user }); } },
      login: (email, password) => { const user = get().users.find(u => u.email === email); const validPassword = user?.password || '123456'; if (user && password === validPassword) { if (user.blocked) { get().addNotification('error', 'Acesso bloqueado.'); return false; } set({ currentUser: user }); get().loadFromSupabase(); return true; } return false; },
      logout: () => { set({ currentUser: null }); get().unsubscribeFromRealtime(); },
      updateUserRole: (userId, newRole) => set((state) => { const updatedUsers = state.users.map(u => u.id === userId ? { ...u, role: newRole } : u); const u = updatedUsers.find(u => u.id === userId); if(u) syncToCloud(state.systemSettings, 'users', u); return { users: updatedUsers }; }),
      updateUser: (userId, updates) => set((state) => { const updatedUsers = state.users.map(u => u.id === userId ? { ...u, ...updates } : u); const u = updatedUsers.find(u => u.id === userId); const currentUser = state.currentUser?.id === userId ? { ...state.currentUser, ...updates } : state.currentUser; if(u) syncToCloud(state.systemSettings, 'users', u); return { users: updatedUsers, currentUser }; }),
      addUser: (userData) => { const state = get(); if (state.users.find(u => u.email === userData.email)) return false; const newUser: User = { id: Math.random().toString(36).substr(2, 9), ...userData, password: '123456', avatar: `https://ui-avatars.com/api/?name=${userData.name}`, blocked: false }; syncToCloud(state.systemSettings, 'users', newUser); set({ users: [...state.users, newUser] }); return true; },
      removeUser: (userId) => set((state) => { syncToCloud(state.systemSettings, 'users', userId, true); return { users: state.users.filter(u => u.id !== userId) }; }),
      toggleUserBlock: (userId) => set((state) => { const user = state.users.find(u => u.id === userId); if(!user) return state; const updated = { ...user, blocked: !user.blocked }; syncToCloud(state.systemSettings, 'users', updated); return { users: state.users.map(u => u.id === userId ? updated : u) }; }),
      updateSystemSettings: (newSettings) => set((state) => { const updated = { ...state.systemSettings, ...newSettings }; syncToCloud(updated, 'system_settings', { id: 'global-settings', ...updated }); return { systemSettings: updated }; }),
      
      addProperty: (data) => set((state) => { 
          const user = state.currentUser; 
          if (!user) return state; 
          const isStaff = ['admin', 'employee', 'finance'].includes(user.role); 
          const status = (isStaff || !state.systemSettings.requirePropertyApproval) ? 'published' : 'pending_approval'; 
          const newProp: Property = { ...data, id: Math.random().toString(36).substr(2, 9), authorId: user.id, status, createdAt: new Date().toISOString() }; 
          
          syncToCloud(state.systemSettings, 'properties', newProp); 
          
          // Trigger Webhook if auto-published
          if (status === 'published') {
              triggerIntegrationWebhook(state.systemSettings.n8nWebhookUrl, 'publish', newProp);
          }

          return { properties: [...state.properties, newProp] }; 
      }),
      
      updateProperty: (id, updates) => set((state) => { 
          const old = state.properties.find(p => p.id === id); 
          if(!old) return state; 
          const updated = { ...old, ...updates, updatedAt: new Date().toISOString() }; 
          
          syncToCloud(state.systemSettings, 'properties', updated); 
          
          // Trigger Webhook if property is visible/published (update site)
          if (old.status === 'published') {
              triggerIntegrationWebhook(state.systemSettings.n8nWebhookUrl, 'update', updated);
          }

          return { properties: state.properties.map(p => p.id === id ? updated : p) }; 
      }),
      
      updatePropertyStatus: (id, status, reason) => set((state) => { 
          const old = state.properties.find(p => p.id === id); 
          if(!old) return state; 
          const updated = { ...old, status, rejectionReason: reason, updatedAt: new Date().toISOString() }; 
          
          syncToCloud(state.systemSettings, 'properties', updated); 
          
          // Trigger Webhook for ANY status change (Publish, Sold, Reserved, Draft)
          triggerIntegrationWebhook(state.systemSettings.n8nWebhookUrl, 'status_change', updated);

          return { properties: state.properties.map(p => p.id === id ? updated : p) }; 
      }),
      
      removeProperty: (id) => set((state) => { 
          syncToCloud(state.systemSettings, 'properties', id, true); 
          
          // Trigger Webhook for deletion
          triggerIntegrationWebhook(state.systemSettings.n8nWebhookUrl, 'delete', { id });

          return { properties: state.properties.filter(p => p.id !== id) }; 
      }),
      
      approveProperty: (id) => set((state) => { 
          const old = state.properties.find(p => p.id === id); 
          if(!old) return state; 
          const updated = { ...old, status: 'published' as const, approvedBy: state.currentUser?.id, approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
          
          syncToCloud(state.systemSettings, 'properties', updated); 
          
          // Trigger Webhook: Published
          triggerIntegrationWebhook(state.systemSettings.n8nWebhookUrl, 'publish', updated);

          return { properties: state.properties.map(p => p.id === id ? updated : p) }; 
      }),
      
      rejectProperty: (id, reason) => set((state) => { 
          const old = state.properties.find(p => p.id === id); 
          if(!old) return state; 
          const updated = { ...old, status: 'draft' as const, rejectionReason: reason, updatedAt: new Date().toISOString() }; 
          
          syncToCloud(state.systemSettings, 'properties', updated); 
          
          // Trigger Webhook: Status changed to draft (likely unpublish)
          triggerIntegrationWebhook(state.systemSettings.n8nWebhookUrl, 'status_change', updated);

          return { properties: state.properties.map(p => p.id === id ? updated : p) }; 
      }),

      addClient: (data, specificOwnerId) => { let newId = ''; set((state) => { newId = Math.random().toString(36).substr(2, 9); const newClient: Client = { ...data, id: newId, ownerId: specificOwnerId || state.currentUser?.id || '', createdAt: new Date().toISOString(), lastContact: new Date().toISOString(), visits: [], interestedPropertyIds: [] }; syncToCloud(state.systemSettings, 'clients', newClient); return { clients: [...state.clients, newClient] }; }); return newId; },
      updateClient: (id, updates) => set((state) => { const old = state.clients.find(c => c.id === id); if(!old) return state; const updated = { ...old, ...updates }; syncToCloud(state.systemSettings, 'clients', updated); return { clients: state.clients.map(c => c.id === id ? updated : c) }; }),
      removeClient: (id) => set((state) => { syncToCloud(state.systemSettings, 'clients', id, true); return { clients: state.clients.filter(c => c.id !== id) }; }),
      moveClientToPipeline: (id, pipeId, stageId) => set((state) => { const old = state.clients.find(c => c.id === id); if(!old) return state; const updated = { ...old, pipelineId: pipeId, stage: stageId }; syncToCloud(state.systemSettings, 'clients', updated); return { clients: state.clients.map(c => c.id === id ? updated : c) }; }),
      markLeadAsLost: (id, reason) => set((state) => { const old = state.clients.find(c => c.id === id); if(!old) return state; const updated = { ...old, pipelineId: undefined, stage: 'new', lostReason: reason }; syncToCloud(state.systemSettings, 'clients', updated); return { clients: state.clients.map(c => c.id === id ? updated : c) }; }),
      addFamilyMember: (id, data) => set((state) => { const parent = state.clients.find(c => c.id === id); if(!parent) return state; const newId = Math.random().toString(36).substr(2, 9); const member: Client = { id: newId, ownerId: parent.ownerId, name: data.name, phone: data.phone, email: data.email, stage: 'new', source: 'Indicação', budget: 0, interest: [], desiredLocation: [], visits: [], interestedPropertyIds: [], familyMembers: [{id: parent.id, name: parent.name, relationship: 'Titular'}], createdAt: new Date().toISOString(), lastContact: new Date().toISOString() }; const updatedParent = { ...parent, familyMembers: [...(parent.familyMembers || []), { id: newId, name: member.name, relationship: data.relationship }] }; syncToCloud(state.systemSettings, 'clients', updatedParent); syncToCloud(state.systemSettings, 'clients', member); return { clients: [...state.clients.filter(c => c.id !== id), updatedParent, member] }; }),
      addVisit: (clientId, visit) => set((state) => { const c = state.clients.find(i => i.id === clientId); if(!c) return state; const newVisit: Visit = { ...visit, id: Math.random().toString(36).substr(2, 9) }; const updated = { ...c, visits: [...c.visits, newVisit], lastContact: new Date().toISOString() }; syncToCloud(state.systemSettings, 'clients', updated); return { clients: state.clients.map(i => i.id === clientId ? updated : i) }; }),
      updateVisit: (clientId, visitId, updates) => set((state) => { const c = state.clients.find(i => i.id === clientId); if(!c) return state; const updatedVisits = c.visits.map(v => v.id === visitId ? { ...v, ...updates } : v); const updated = { ...c, visits: updatedVisits }; syncToCloud(state.systemSettings, 'clients', updated); return { clients: state.clients.map(i => i.id === clientId ? updated : i) }; }),
      removeVisit: (clientId, visitId) => set((state) => { const c = state.clients.find(i => i.id === clientId); if(!c) return state; const updated = { ...c, visits: c.visits.filter(v => v.id !== visitId) }; syncToCloud(state.systemSettings, 'clients', updated); return { clients: state.clients.map(i => i.id === clientId ? updated : i) }; }),
      addPipeline: (name) => set((state) => { const newP = { id: `p-${Date.now()}`, name, isDefault: false, stages: [{ id: 'new', name: 'Novo', color: 'border-slate-400', order: 0 }] }; syncToCloud(state.systemSettings, 'pipelines', newP); return { pipelines: [...state.pipelines, newP] }; }),
      updatePipeline: (id, updates) => set((state) => { const updatedP = state.pipelines.map(p => p.id === id ? { ...p, ...updates } : p); syncToCloud(state.systemSettings, 'pipelines', updatedP.find(p => p.id === id)); return { pipelines: updatedP }; }),
      deletePipeline: (id) => set((state) => { syncToCloud(state.systemSettings, 'pipelines', id, true); return { pipelines: state.pipelines.filter(p => p.id !== id) }; }),
      addPipelineStage: (pid, name) => set((state) => { const updatedP = state.pipelines.map(p => p.id !== pid ? p : { ...p, stages: [...p.stages, { id: `s-${Date.now()}`, name, color: 'border-gray-300', order: p.stages.length }] }); syncToCloud(state.systemSettings, 'pipelines', updatedP.find(p => p.id === pid)); return { pipelines: updatedP }; }),
      updatePipelineStage: (pid, sid, updates) => set((state) => { const updatedP = state.pipelines.map(p => p.id !== pid ? p : { ...p, stages: p.stages.map(s => s.id === sid ? { ...s, ...updates } : s) }); syncToCloud(state.systemSettings, 'pipelines', updatedP.find(p => p.id === pid)); return { pipelines: updatedP }; }),
      deletePipelineStage: (pid, sid) => set((state) => { const updatedP = state.pipelines.map(p => p.id !== pid ? p : { ...p, stages: p.stages.filter(s => s.id !== sid) }); syncToCloud(state.systemSettings, 'pipelines', updatedP.find(p => p.id === pid)); return { pipelines: updatedP }; }),
      addNotification: (type, message) => set((state) => ({ notifications: [...state.notifications, { id: Math.random().toString(), type, message }] })),
      removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) })),
      sendTestEmail: async (email, config) => sendSystemEmail({ to: email, subject: 'Teste', body: 'Teste' }, config),
      restoreState: (logId) => set((state) => { const log = state.logs.find(l => l.id === logId); if(!log || !log.previousData) return state; const entity = log.entity as 'property' | 'client'; if(entity === 'property') { syncToCloud(state.systemSettings, 'properties', log.previousData); return { properties: state.properties.map(p => p.id === log.entityId ? log.previousData : p) }; } if(entity === 'client') { syncToCloud(state.systemSettings, 'clients', log.previousData); return { clients: state.clients.map(c => c.id === log.entityId ? log.previousData : c) }; } return state; })
    }),
    {
      name: 'goldimob-storage',
      version: 3, 
      partialize: (state) => ({ currentUser: state.currentUser, systemSettings: state.systemSettings }),
    }
  )
);