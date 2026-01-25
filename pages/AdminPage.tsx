import React, { useState } from 'react';
import { useStore, DEFAULT_DESC_PROMPT, DEFAULT_MATCH_PROMPT, DEFAULT_CRM_GLOBAL_PROMPT, DEFAULT_CRM_CARD_PROMPT, DEFAULT_PROPERTY_TYPES, DEFAULT_FEATURES, DEFAULT_LEAD_SOURCES, DEFAULT_LOCATIONS } from '../store';
import { Card, Button, Input, Badge } from '../components/ui/Elements';
import { Users, Shield, Settings, Save, AlertTriangle, FileText, RotateCcw, Eye, Search, Building2, Plus, Trash2, X, Megaphone, MapPin, Sparkles, Clock, Key, Database, RefreshCcw, Code, UserPlus, Lock, Unlock, Ban, CheckCircle, Server, UploadCloud, DownloadCloud } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { UserRole, LogEntry } from '../types';
import { syncEntityToSupabase } from '../services/supabaseClient';

const JsonDiffViewer: React.FC<{ before: any, after: any }> = ({ before, after }) => {
    // Flatten helper or just display keys
    const allKeys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
    
    return (
        <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-700 text-slate-500">
                        <th className="py-2">Campo</th>
                        <th className="py-2 text-red-400">Antes</th>
                        <th className="py-2 text-green-400">Depois</th>
                    </tr>
                </thead>
                <tbody>
                    {allKeys.map(key => {
                        const valBefore = before?.[key];
                        const valAfter = after?.[key];
                        const isDiff = JSON.stringify(valBefore) !== JSON.stringify(valAfter);
                        
                        // Ignore internal keys like ID if equal, or deep objects for simplicity
                        if (!isDiff) return null;

                        return (
                            <tr key={key} className="border-b border-slate-800 hover:bg-slate-800/50">
                                <td className="py-2 font-semibold text-slate-400">{key}</td>
                                <td className="py-2 text-red-300/80 max-w-[150px] truncate" title={JSON.stringify(valBefore)}>
                                    {valBefore === undefined ? 'undefined' : typeof valBefore === 'object' ? JSON.stringify(valBefore) : String(valBefore)}
                                </td>
                                <td className="py-2 text-green-300/80 max-w-[150px] truncate" title={JSON.stringify(valAfter)}>
                                    {valAfter === undefined ? 'undefined' : typeof valAfter === 'object' ? JSON.stringify(valAfter) : String(valAfter)}
                                </td>
                            </tr>
                        );
                    })}
                    {allKeys.every(k => JSON.stringify(before?.[k]) === JSON.stringify(after?.[k])) && (
                        <tr><td colSpan={3} className="py-4 text-center text-slate-600">Nenhuma alteração detectada nas propriedades de primeiro nível.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

// Reusable List Manager Component
const StringListManager: React.FC<{ 
    title: string; 
    description: string; 
    items: string[]; 
    onAdd: (val: string) => void; 
    onRemove: (val: string) => void; 
    placeholder: string 
}> = ({ title, description, items, onAdd, onRemove, placeholder }) => {
    const [newItem, setNewItem] = useState('');

    const handleAdd = () => {
        if(newItem.trim()) {
            onAdd(newItem.trim());
            setNewItem('');
        }
    }

    return (
        <Card className="flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                <p className="text-sm text-slate-500">{description}</p>
            </div>
            <div className="p-4 border-b border-slate-100 flex gap-2">
                <Input 
                    placeholder={placeholder} 
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    className="flex-1"
                    onKeyDown={e => { if(e.key === 'Enter') handleAdd() }}
                />
                <Button onClick={handleAdd} disabled={!newItem}><Plus size={18}/></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200 group">
                        <span className="text-slate-700 font-medium">{item}</span>
                        <button 
                            onClick={() => onRemove(item)}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export const AdminPage: React.FC = () => {
  const { currentUser, users, updateUserRole, addUser, removeUser, toggleUserBlock, systemSettings, updateSystemSettings, logs, restoreState, properties, clients, pipelines, addNotification, loadFromSupabase } = useStore();
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'properties' | 'crm' | 'logs' | 'database'>('users');
  
  // Local state for settings form
  const [settingsForm, setSettingsForm] = useState(systemSettings);
  const [logSearch, setLogSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // New User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'employee' as UserRole });

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  // Property Config States
  const [newTypeLabel, setNewTypeLabel] = useState('');
  
  // AI Prompt State
  const [promptText, setPromptText] = useState(systemSettings.propertyDescriptionPrompt);
  
  // CRM AI Prompts State
  const [crmPrompts, setCrmPrompts] = useState({
      matchAi: systemSettings.matchAiPrompt,
      crmGlobal: systemSettings.crmGlobalInsightsPrompt,
      crmCard: systemSettings.crmCardInsightsPrompt
  });
  const [activeCrmPromptTab, setActiveCrmPromptTab] = useState<'match' | 'global' | 'card'>('match');

  // Lead Aging State
  const [agingConfig, setAgingConfig] = useState(systemSettings.leadAging || {
      freshLimit: 2,
      warmLimit: 7,
      freshColor: 'green',
      warmColor: 'yellow',
      coldColor: 'red'
  });

  // Security Check
  if (currentUser?.role !== 'admin') {
      return <Navigate to="/" replace />;
  }

  const handleSettingsSave = () => {
      updateSystemSettings(settingsForm);
  };
  
  const handlePromptSave = () => {
      updateSystemSettings({ propertyDescriptionPrompt: promptText });
  };

  const handleCrmPromptsSave = () => {
      updateSystemSettings({ 
          matchAiPrompt: crmPrompts.matchAi,
          crmGlobalInsightsPrompt: crmPrompts.crmGlobal,
          crmCardInsightsPrompt: crmPrompts.crmCard
      });
  };

  const handleAgingSave = () => {
      updateSystemSettings({ leadAging: agingConfig });
  };

  const handleAddUser = () => {
      if(!newUser.name || !newUser.email) {
          addNotification('error', 'Nome e email são obrigatórios.');
          return;
      }
      const success = addUser(newUser);
      if (success) {
          setIsAddUserOpen(false);
          setNewUser({ name: '', email: '', role: 'employee' });
      }
  };

  const handleRemoveUser = (id: string) => {
      if(window.confirm('Tem certeza que deseja remover este usuário?')) {
          removeUser(id);
      }
  };

  const handleToggleBlock = (id: string) => {
      toggleUserBlock(id);
  }

  const addPropertyType = () => {
      if(!newTypeLabel.trim()) return;
      const value = newTypeLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      const exists = systemSettings.propertyTypes.some(t => t.value === value);
      if(exists) return;

      const updatedTypes = [...systemSettings.propertyTypes, { value, label: newTypeLabel }];
      updateSystemSettings({ propertyTypes: updatedTypes });
      setNewTypeLabel('');
  }

  const removePropertyType = (val: string) => {
      if(window.confirm('Remover este tipo de imóvel? Imóveis existentes manterão o valor antigo.')) {
          const updatedTypes = systemSettings.propertyTypes.filter(t => t.value !== val);
          updateSystemSettings({ propertyTypes: updatedTypes });
      }
  }

  const addFeature = (val: string) => {
      if(!val.trim()) return;
      if(systemSettings.propertyFeatures.includes(val)) return;
      
      const updatedFeatures = [...systemSettings.propertyFeatures, val];
      updateSystemSettings({ propertyFeatures: updatedFeatures });
  }

  const removeFeature = (feat: string) => {
       if(window.confirm('Remover este diferencial da lista?')) {
          const updatedFeatures = systemSettings.propertyFeatures.filter(f => f !== feat);
          updateSystemSettings({ propertyFeatures: updatedFeatures });
      }
  }

  // --- CRM Configuration Handlers ---
  const addLeadSource = (val: string) => {
      if(systemSettings.leadSources.includes(val)) return;
      updateSystemSettings({ leadSources: [...systemSettings.leadSources, val] });
  }

  const removeLeadSource = (val: string) => {
      if(window.confirm('Remover esta origem? Leads existentes não serão alterados.')) {
          updateSystemSettings({ leadSources: systemSettings.leadSources.filter(s => s !== val) });
      }
  }

  const addLocation = (val: string) => {
      if(systemSettings.availableLocations.includes(val)) return;
      updateSystemSettings({ availableLocations: [...systemSettings.availableLocations, val] });
  }

  const removeLocation = (val: string) => {
      if(window.confirm('Remover esta localização da lista de sugestões?')) {
          updateSystemSettings({ availableLocations: systemSettings.availableLocations.filter(l => l !== val) });
      }
  }

  // --- Database Seed ---
  const handleSeedDatabase = async () => {
      if (!window.confirm("ATENÇÃO: Isso enviará TODOS os dados locais (Imóveis, Clientes, Usuários, Pipelines, Logs, Configurações) para o banco de dados. Certifique-se que as tabelas foram criadas. Continuar?")) return;
      
      const url = systemSettings.supabaseUrl;
      const key = systemSettings.supabaseAnonKey;

      if (!url || !key) {
          addNotification('error', 'Configure as credenciais do Supabase na aba Sistema primeiro.');
          return;
      }

      setIsSyncing(true);
      setSyncLog(['Iniciando backup completo para nuvem...']);
      
      let successCount = 0;
      let errorCount = 0;

      // Helper for sync
      const syncList = async (list: any[], tableName: string, label: string) => {
          setSyncLog(prev => [...prev, `Sincronizando ${label}... (${list.length} itens)`]);
          for (const item of list) {
              const res = await syncEntityToSupabase(tableName, item, url, key);
              if (res.error) {
                  setSyncLog(prev => [...prev, `[ERRO] ${label} ID ${item.id}: ${JSON.stringify(res.error)}`]);
                  errorCount++;
              } else {
                  successCount++;
              }
          }
      };

      // 1. Users
      await syncList(users, 'users', 'Usuários');
      // 2. Pipelines (Config)
      await syncList(pipelines, 'pipelines', 'Pipelines (CRM)');
      // 3. Properties
      await syncList(properties, 'properties', 'Imóveis');
      // 4. Clients (Includes Visits)
      await syncList(clients, 'clients', 'Clientes e Visitas');
      // 5. Logs
      await syncList(logs, 'logs', 'Logs de Auditoria');
      // 6. Global Settings (Single Row)
      setSyncLog(prev => [...prev, `Sincronizando Configurações Globais...`]);
      await syncEntityToSupabase('system_settings', { id: 'global-settings', ...systemSettings }, url, key);
      successCount++;

      setSyncLog(prev => [...prev, `---------------------------------`]);
      setSyncLog(prev => [...prev, `Processo finalizado.`]);
      setSyncLog(prev => [...prev, `Total Enviado: ${successCount}`]);
      setSyncLog(prev => [...prev, `Total Falhas: ${errorCount}`]);
      
      setIsSyncing(false);
      
      if(errorCount === 0) {
          addNotification('success', 'Backup completo realizado com sucesso!');
      } else {
          addNotification('info', 'Backup concluído com alertas. Verifique o log.');
      }
  };

  const handlePullDatabase = async () => {
      if(!window.confirm("Isso irá SUBSTITUIR os dados locais pelos dados da nuvem. Use com cuidado. Continuar?")) return;
      
      setIsSyncing(true);
      setSyncLog(['Baixando dados da nuvem...']);
      await loadFromSupabase();
      setSyncLog(prev => [...prev, 'Concluído. O sistema foi atualizado.']);
      setIsSyncing(false);
      addNotification('success', 'Dados sincronizados da nuvem.');
  };

  const copySqlSchema = () => {
      // PREPARE DEFAULT SETTINGS JSON FOR SEEDING
      const defaultSettingsJson = JSON.stringify({
          companyName: 'WebImob',
          allowNewRegistrations: true,
          requirePropertyApproval: true,
          maintenanceMode: false,
          propertyTypes: DEFAULT_PROPERTY_TYPES,
          propertyFeatures: DEFAULT_FEATURES,
          leadSources: DEFAULT_LEAD_SOURCES,
          availableLocations: DEFAULT_LOCATIONS,
          propertyDescriptionPrompt: DEFAULT_DESC_PROMPT,
          matchAiPrompt: DEFAULT_MATCH_PROMPT,
          crmGlobalInsightsPrompt: DEFAULT_CRM_GLOBAL_PROMPT,
          crmCardInsightsPrompt: DEFAULT_CRM_CARD_PROMPT,
          leadAging: {
              freshLimit: 2,
              warmLimit: 7,
              freshColor: 'green',
              warmColor: 'yellow',
              coldColor: 'red'
          }
      });

      const sql = `
-- TABELAS DO SISTEMA WEBIMOB
-- Execute este script no SQL Editor do Supabase para criar a estrutura completa.

-- Extensão para geração de UUIDs
create extension if not exists "uuid-ossp";

-- 1. Imóveis
create table if not exists properties (
  id text primary key default uuid_generate_v4(),
  content jsonb not null, 
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Clientes / Leads
create table if not exists clients (
  id text primary key default uuid_generate_v4(),
  content jsonb not null, 
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Usuários
create table if not exists users (
  id text primary key default uuid_generate_v4(),
  content jsonb not null, 
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Pipelines
create table if not exists pipelines (
  id text primary key default uuid_generate_v4(),
  content jsonb not null, 
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Logs
create table if not exists logs (
  id text primary key default uuid_generate_v4(),
  content jsonb not null, 
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Configurações Globais (Prompts, Listas, Regras)
create table if not exists system_settings (
  id text primary key default uuid_generate_v4(),
  content jsonb not null, 
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. INSERIR USUÁRIO ADMIN PADRÃO
INSERT INTO users (id, content)
VALUES (
  'admin-master',
  '{
    "id": "admin-master",
    "name": "Administrador",
    "email": "admin@webimob.com",
    "role": "admin",
    "avatar": "https://ui-avatars.com/api/?name=Admin&background=0c4a6e&color=fff",
    "blocked": false
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 8. INSERIR CONFIGURAÇÕES PADRÃO (PROMPTS, TIPOS, ETC.)
INSERT INTO system_settings (id, content)
VALUES (
  'global-settings',
  '${defaultSettingsJson}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- POLÍTICAS DE SEGURANÇA (RLS)
alter table properties enable row level security;
alter table clients enable row level security;
alter table users enable row level security;
alter table pipelines enable row level security;
alter table logs enable row level security;
alter table system_settings enable row level security;

-- Permissões Públicas (Dev Mode)
create policy "Public Access Properties" on properties for all using (true) with check (true);
create policy "Public Access Clients" on clients for all using (true) with check (true);
create policy "Public Access Users" on users for all using (true) with check (true);
create policy "Public Access Pipelines" on pipelines for all using (true) with check (true);
create policy "Public Access Logs" on logs for all using (true) with check (true);
create policy "Public Access Settings" on system_settings for all using (true) with check (true);
      `;
      navigator.clipboard.writeText(sql);
      addNotification('success', 'SQL Completo (com geração de IDs) copiado!');
  };

  const roleOptions: { value: UserRole; label: string }[] = [
      { value: 'admin', label: 'Administrador' },
      { value: 'finance', label: 'Financeiro' },
      { value: 'employee', label: 'Funcionário' },
      { value: 'broker', label: 'Corretor' },
      { value: 'captator', label: 'Captador (Parceiro)' },
  ];

  const colorOptions = [
      { value: 'green', label: 'Verde (Green)' },
      { value: 'yellow', label: 'Amarelo (Yellow)' },
      { value: 'red', label: 'Vermelho (Red)' },
      { value: 'blue', label: 'Azul (Blue)' },
      { value: 'purple', label: 'Roxo (Purple)' },
      { value: 'gray', label: 'Cinza (Gray)' },
      { value: 'orange', label: 'Laranja (Orange)' },
  ];

  const getColorClass = (colorName: string) => {
      const map: Record<string, string> = {
          'green': 'bg-green-100 text-green-700 border-green-200',
          'yellow': 'bg-yellow-100 text-yellow-700 border-yellow-200',
          'red': 'bg-red-100 text-red-700 border-red-200',
          'blue': 'bg-blue-100 text-blue-700 border-blue-200',
          'purple': 'bg-purple-100 text-purple-700 border-purple-200',
          'gray': 'bg-slate-100 text-slate-700 border-slate-200',
          'orange': 'bg-orange-100 text-orange-700 border-orange-200',
      };
      return map[colorName] || map['gray'];
  }

  const filteredLogs = logs.filter(log => 
      log.entityName.toLowerCase().includes(logSearch.toLowerCase()) || 
      log.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(logSearch.toLowerCase())
  );

  const getActionBadge = (action: string) => {
      switch(action) {
          case 'create': return <Badge color="green">Criação</Badge>;
          case 'update': return <Badge color="blue">Edição</Badge>;
          case 'delete': return <Badge color="red">Exclusão</Badge>;
          case 'restore': return <Badge color="yellow">Restauração</Badge>;
          case 'approval': return <Badge color="green">Aprovação</Badge>;
          default: return <Badge color="gray">{action}</Badge>;
      }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Shield className="text-primary-600" />
                Painel Administrativo
            </h1>
            <p className="text-slate-500">Gerenciamento global, permissões e auditoria.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
          <button onClick={() => setActiveTab('users')} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <div className="flex items-center gap-2"><Users size={18} /> Usuários</div>
          </button>
          <button onClick={() => setActiveTab('system')} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'system' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <div className="flex items-center gap-2"><Settings size={18} /> Sistema</div>
          </button>
          <button onClick={() => setActiveTab('database')} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'database' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <div className="flex items-center gap-2"><Database size={18} /> Banco de Dados</div>
          </button>
           <button onClick={() => setActiveTab('properties')} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'properties' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <div className="flex items-center gap-2"><Building2 size={18} /> Imóveis</div>
          </button>
          <button onClick={() => setActiveTab('crm')} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'crm' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <div className="flex items-center gap-2"><Megaphone size={18} /> CRM</div>
          </button>
          <button onClick={() => setActiveTab('logs')} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <div className="flex items-center gap-2"><FileText size={18} /> Logs de Auditoria</div>
          </button>
      </div>

      {activeTab === 'users' && (
          <Card className="overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                      <h2 className="text-lg font-semibold text-slate-800">Controle de Acesso (RBAC)</h2>
                      <p className="text-sm text-slate-500">Gerencie usuários e suas permissões.</p>
                  </div>
                  <Button onClick={() => setIsAddUserOpen(true)}>
                      <UserPlus size={18} className="mr-2" /> Novo Usuário
                  </Button>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-800 font-semibold uppercase text-xs">
                          <tr>
                              <th className="px-6 py-4">Usuário</th>
                              <th className="px-6 py-4">Email</th>
                              <th className="px-6 py-4">Nível de Permissão Atual</th>
                              <th className="px-6 py-4 text-right">Ação</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {users.map(user => (
                              <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.blocked ? 'bg-red-50/50' : ''}`}>
                                  <td className="px-6 py-4 flex items-center gap-3">
                                      <img src={user.avatar} className={`w-8 h-8 rounded-full ${user.blocked ? 'grayscale opacity-50' : ''}`} alt="" />
                                      <div>
                                          <span className={`font-medium block ${user.blocked ? 'text-red-700 line-through' : ''}`}>{user.name}</span>
                                          {user.blocked && <span className="text-[10px] text-red-600 font-bold uppercase">Acesso Bloqueado</span>}
                                      </div>
                                      {currentUser.id === user.id && <Badge color="blue">Você</Badge>}
                                  </td>
                                  <td className="px-6 py-4">{user.email}</td>
                                  <td className="px-6 py-4">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize
                                        ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                          user.role === 'broker' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                          'bg-slate-50 text-slate-700 border-slate-200'}
                                      `}>
                                          {user.role === 'captator' ? 'Captador' : user.role}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 flex justify-end gap-2">
                                      <select 
                                        value={user.role}
                                        onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                                        disabled={user.blocked || (user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1)} // Prevent lockout
                                        className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                          {roleOptions.map(opt => (
                                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                                          ))}
                                      </select>
                                      {user.id !== currentUser.id && (
                                          <>
                                              <button 
                                                onClick={() => handleToggleBlock(user.id)}
                                                className={`p-2 rounded transition-colors ${user.blocked ? 'text-green-500 hover:bg-green-50' : 'text-orange-400 hover:bg-orange-50'}`}
                                                title={user.blocked ? "Desbloquear Acesso" : "Bloquear Acesso"}
                                              >
                                                  {user.blocked ? <Unlock size={18} /> : <Lock size={18} />}
                                              </button>
                                              <button 
                                                onClick={() => handleRemoveUser(user.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                title="Remover Usuário"
                                              >
                                                  <Trash2 size={18} />
                                              </button>
                                          </>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </Card>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <UserPlus size={20} className="text-primary-600"/> Novo Usuário
                      </h2>
                      <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <Input 
                        label="Nome" 
                        placeholder="Ex: Maria Silva" 
                        value={newUser.name}
                        onChange={e => setNewUser({...newUser, name: e.target.value})}
                      />
                      <Input 
                        label="Email" 
                        type="email" 
                        placeholder="Ex: maria@imob.com" 
                        value={newUser.email}
                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                      />
                      <div>
                          <label className="text-sm font-medium text-slate-700 block mb-1">Permissão / Função</label>
                          <select 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20"
                            value={newUser.role}
                            onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                          >
                              {roleOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                          </select>
                      </div>
                      <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                          A senha padrão será <strong>123456</strong>. O usuário poderá alterá-la no primeiro acesso (simulado).
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
                      <Button variant="outline" onClick={() => setIsAddUserOpen(false)} className="text-xs h-9">Cancelar</Button>
                      <Button onClick={handleAddUser} className="text-xs h-9">Criar Usuário</Button>
                  </div>
              </div>
          </div>
      )}

      {/* ... (Rest of component remains unchanged) ... */}
      {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                  
                  {/* Supabase Integration Card */}
                  <Card className="p-6 border-l-4 border-l-emerald-500">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                          <Database size={20} className="text-emerald-600" /> Banco de Dados em Nuvem (Supabase)
                      </h3>
                      <div className="space-y-4">
                          <div className="flex flex-col space-y-1">
                              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                  URL do Projeto
                              </label>
                              <Input 
                                placeholder="https://xyz.supabase.co" 
                                value={settingsForm.supabaseUrl || ''}
                                onChange={(e) => setSettingsForm({...settingsForm, supabaseUrl: e.target.value})}
                              />
                          </div>
                          <div className="flex flex-col space-y-1">
                              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                  Chave Pública (Anon Key)
                              </label>
                              <Input 
                                type="password"
                                placeholder="eyJh..." 
                                value={settingsForm.supabaseAnonKey || ''}
                                onChange={(e) => setSettingsForm({...settingsForm, supabaseAnonKey: e.target.value})}
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                  Essas credenciais permitem sincronizar seus dados na nuvem para acesso multi-dispositivo.
                                  <a href="https://supabase.com/dashboard/project/_/settings/api" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline ml-1">
                                      Onde encontrar?
                                  </a>
                              </p>
                          </div>
                      </div>
                  </Card>

                  {/* Google Gemini Integration Card */}
                  <Card className="p-6 border-l-4 border-l-indigo-500">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                          <Sparkles size={20} className="text-indigo-600" /> Integração Inteligência Artificial
                      </h3>
                      <div className="space-y-4">
                          <div className="flex flex-col space-y-1">
                              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                  <Key size={14} className="text-slate-400" /> Chave da API (Gemini API Key)
                              </label>
                              <Input 
                                type="password"
                                placeholder="Cole sua chave aqui (ex: AIzaSy...)" 
                                value={settingsForm.geminiApiKey || ''}
                                onChange={(e) => setSettingsForm({...settingsForm, geminiApiKey: e.target.value})}
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                  Necessário para gerar descrições, calcular compatibilidade (match) e fornecer insights de leads.
                                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline ml-1">
                                      Obter chave
                                  </a>
                              </p>
                          </div>
                      </div>
                  </Card>

                  <Card className="p-6">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                          <Settings size={20} className="text-slate-500" /> Geral
                      </h3>
                      <div className="space-y-4">
                          <Input 
                            label="Nome da Empresa" 
                            value={settingsForm.companyName}
                            onChange={(e) => setSettingsForm({...settingsForm, companyName: e.target.value})}
                          />
                          
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div>
                                  <p className="font-medium text-slate-700">Aprovação de Imóveis</p>
                                  <p className="text-xs text-slate-500">Exigir que funcionários aprovem imóveis de corretores antes de publicar.</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={settingsForm.requirePropertyApproval}
                                    onChange={(e) => setSettingsForm({...settingsForm, requirePropertyApproval: e.target.checked})}
                                  />
                                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                              </label>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div>
                                  <p className="font-medium text-slate-700">Novos Cadastros</p>
                                  <p className="text-xs text-slate-500">Permitir que novos usuários se registrem na plataforma.</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={settingsForm.allowNewRegistrations}
                                    onChange={(e) => setSettingsForm({...settingsForm, allowNewRegistrations: e.target.checked})}
                                  />
                                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                              </label>
                          </div>
                      </div>
                  </Card>

                  <Card className="p-6 border-l-4 border-l-red-500">
                      <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                          <AlertTriangle size={20} /> Zona de Perigo
                      </h3>
                      <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                              <div>
                                  <p className="font-bold text-red-800">Modo de Manutenção</p>
                                  <p className="text-xs text-red-600">Bloqueia o acesso de todos os usuários (exceto admins).</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={settingsForm.maintenanceMode}
                                    onChange={(e) => setSettingsForm({...settingsForm, maintenanceMode: e.target.checked})}
                                  />
                                  <div className="w-11 h-6 bg-red-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                              </label>
                          </div>
                  </Card>
                  
                  <div className="flex justify-end">
                      <Button onClick={handleSettingsSave} className="gap-2">
                          <Save size={18} /> Salvar Configurações
                      </Button>
                  </div>
              </div>

              <div className="col-span-1">
                  <Card className="p-6 bg-slate-50 h-fit sticky top-6">
                      <h3 className="font-semibold text-slate-800 mb-2">Dica do Sistema</h3>
                      <p className="text-sm text-slate-600 mb-4">
                          Alterações nas configurações globais afetam todos os usuários em tempo real.
                      </p>
                      <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
                          <li>Admins têm acesso total.</li>
                          <li>A chave de API é essencial para funcionalidades de IA.</li>
                          <li>A aprovação de imóveis afeta apenas Corretores.</li>
                          <li>Modo manutenção exibe tela de bloqueio.</li>
                      </ul>
                  </Card>
              </div>
          </div>
      )}

      {activeTab === 'database' && (
          <div className="space-y-6">
              <Card className="p-6 border-l-4 border-l-emerald-600">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <Database className="text-emerald-600" size={24} />
                              Gerenciamento do Banco de Dados
                          </h3>
                          <p className="text-sm text-slate-500">Ferramentas para configurar e popular o Supabase (Nuvem).</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Section 1: Schema Structure */}
                      <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                              <span className="bg-slate-200 text-slate-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">1</span>
                              <h4 className="font-bold text-slate-700 text-lg">Criar Tabela com Todos os Campos</h4>
                          </div>
                          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 h-full flex flex-col justify-between">
                              <div className="mb-4">
                                  <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2">
                                      <Server size={18} /> Estrutura SQL
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed">
                                      Gera o script SQL para criar as tabelas necessárias para armazenar <strong>todos os dados do sistema</strong>.
                                  </p>
                                  <ul className="text-xs text-slate-500 mt-3 space-y-1 list-disc list-inside">
                                      <li>Imóveis (Properties)</li>
                                      <li>Clientes e Visitas (Clients)</li>
                                      <li>Usuários e Equipe (Users)</li>
                                      <li>Funis de Venda e Etapas (Pipelines)</li>
                                      <li>Logs de Auditoria (Logs)</li>
                                      <li>Configurações Globais (SystemSettings)</li>
                                  </ul>
                              </div>
                              <Button variant="outline" className="w-full gap-2 border-slate-300 hover:bg-white hover:border-primary-500 hover:text-primary-600 transition-all" onClick={copySqlSchema}>
                                  <Code size={18} /> Copiar SQL Completo
                              </Button>
                          </div>
                      </div>

                      {/* Section 2: Data Population */}
                      <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                              <span className="bg-slate-200 text-slate-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">2</span>
                              <h4 className="font-bold text-slate-700 text-lg">Sincronização de Dados</h4>
                          </div>
                          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 h-full flex flex-col justify-between">
                              <div className="mb-4">
                                  <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2">
                                      <RefreshCcw size={18} /> Nuvem
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed">
                                      Escolha a direção da sincronização. Você pode enviar seus dados locais para a nuvem (Backup) ou baixar os dados da nuvem para este dispositivo (Restaurar).
                                  </p>
                              </div>
                              <div className="flex flex-col gap-3">
                                  <Button 
                                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20" 
                                    onClick={handleSeedDatabase}
                                    isLoading={isSyncing}
                                  >
                                      <UploadCloud size={18} /> Enviar (Backup Local &rarr; Nuvem)
                                  </Button>
                                  <Button 
                                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20" 
                                    onClick={handlePullDatabase}
                                    isLoading={isSyncing}
                                  >
                                      <DownloadCloud size={18} /> Baixar (Restaurar Nuvem &rarr; Local)
                                  </Button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Log Area */}
                  {syncLog.length > 0 && (
                      <div className="mt-8 bg-slate-900 text-slate-300 p-5 rounded-xl font-mono text-xs max-h-60 overflow-y-auto border border-slate-800 shadow-inner">
                          <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-3">
                              <p className="text-slate-400 font-bold uppercase flex items-center gap-2">
                                  <CheckCircle size={14}/> Log de Execução
                              </p>
                              <button onClick={() => setSyncLog([])} className="text-slate-500 hover:text-white"><X size={14}/></button>
                          </div>
                          <div className="space-y-1.5">
                              {syncLog.map((line, idx) => (
                                  <div key={idx} className={`${line.includes('[ERRO]') ? 'text-red-400' : 'text-slate-300'}`}>
                                      <span className="opacity-30 mr-2">{new Date().toLocaleTimeString()}</span>
                                      {line}
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </Card>
          </div>
      )}

      {/* Properties Tab, CRM Tab, Logs Tab code blocks remain unchanged */}
      {/* ... keeping the rest of the existing code for these tabs ... */}
      {activeTab === 'properties' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipos de Imóveis */}
              <Card className="flex flex-col h-[500px]">
                  <div className="p-4 border-b border-slate-100">
                      <h2 className="text-lg font-semibold text-slate-800">Tipos de Imóveis</h2>
                      <p className="text-sm text-slate-500">Categorias para cadastro e filtro.</p>
                  </div>
                  <div className="p-4 border-b border-slate-100 flex gap-2">
                      <Input 
                        placeholder="Novo tipo (ex: Loft)" 
                        value={newTypeLabel}
                        onChange={e => setNewTypeLabel(e.target.value)}
                        className="flex-1"
                        onKeyDown={e => { if(e.key === 'Enter') addPropertyType() }}
                      />
                      <Button onClick={addPropertyType} disabled={!newTypeLabel}><Plus size={18}/></Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {systemSettings.propertyTypes.map((type, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200 group">
                              <span className="text-slate-700 font-medium">{type.label}</span>
                              <button 
                                onClick={() => removePropertyType(type.value)}
                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      ))}
                  </div>
              </Card>

              {/* Diferenciais */}
              <StringListManager 
                  title="Diferenciais e Comodidades"
                  description="Itens selecionáveis no cadastro (tags)."
                  items={systemSettings.propertyFeatures}
                  onAdd={addFeature}
                  onRemove={removeFeature}
                  placeholder="Nova comodidade (ex: Adega)"
              />
              
              {/* AI Prompt Editor */}
              <Card className="md:col-span-2 p-6 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
                  <div className="flex items-center justify-between mb-4">
                      <div>
                          <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                              <Sparkles className="text-indigo-600" size={20} />
                              Prompt da Inteligência Artificial (Descrição de Imóveis)
                          </h2>
                          <p className="text-sm text-slate-500">Personalize como a IA gera as descrições dos imóveis.</p>
                      </div>
                      <Button onClick={handlePromptSave} className="gap-2">
                          <Save size={18} /> Salvar Prompt
                      </Button>
                  </div>
                  
                  <div className="mb-2">
                      <p className="text-xs text-slate-600 font-semibold mb-2">Variáveis Disponíveis (serão substituídas pelos dados do imóvel):</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                          {['{{title}}', '{{type}}', '{{price}}', '{{address}}', '{{area}}', '{{bedrooms}}', '{{bathrooms}}', '{{features}}'].map(tag => (
                              <code key={tag} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-indigo-600 font-mono">{tag}</code>
                          ))}
                      </div>
                  </div>

                  <textarea 
                      className="w-full h-64 p-4 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm leading-relaxed text-slate-700"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      spellCheck={false}
                  />
              </Card>
          </div>
      )}

      {activeTab === 'crm' && (
          <div className="space-y-6">
              {/* AI Prompts Section */}
              <Card className="p-6 border-l-4 border-l-purple-500">
                  <div className="flex items-center justify-between mb-6">
                      <div>
                          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <Sparkles className="text-purple-600" size={20} />
                              Configuração de IA do CRM
                          </h2>
                          <p className="text-sm text-slate-500">Personalize os prompts usados para gerar insights e compatibilidade no CRM.</p>
                      </div>
                      <Button onClick={handleCrmPromptsSave} className="gap-2">
                          <Save size={18} /> Salvar Prompts
                      </Button>
                  </div>

                  <div className="flex gap-4 mb-4 border-b border-slate-200">
                      <button 
                        onClick={() => setActiveCrmPromptTab('match')} 
                        className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeCrmPromptTab === 'match' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                          Match IA
                      </button>
                      <button 
                        onClick={() => setActiveCrmPromptTab('global')} 
                        className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeCrmPromptTab === 'global' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                          Insights Globais (Pipeline)
                      </button>
                      <button 
                        onClick={() => setActiveCrmPromptTab('card')} 
                        className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeCrmPromptTab === 'card' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                          Insights do Card (Lead)
                      </button>
                  </div>

                  {/* Dynamic Editor Content */}
                  <div>
                      {activeCrmPromptTab === 'match' && (
                          <div className="animate-in fade-in duration-200">
                              <p className="text-xs text-slate-500 mb-2">
                                  Este prompt é usado quando você clica em "Match (IA)" no card do lead. Ele compara o perfil do cliente com um imóvel específico.
                              </p>
                              <div className="flex flex-wrap gap-2 mb-3">
                                  <span className="text-xs font-semibold text-slate-600 mr-2">Variáveis Cliente:</span>
                                  {['{{clientName}}', '{{budget}}', '{{interest}}', '{{locations}}', '{{minBedrooms}}', '{{minArea}}', '{{notes}}'].map(tag => (
                                      <code key={tag} className="px-1.5 py-0.5 bg-purple-50 border border-purple-100 rounded text-[10px] text-purple-700 font-mono">{tag}</code>
                                  ))}
                                  <span className="text-xs font-semibold text-slate-600 ml-4 mr-2">Variáveis Imóvel:</span>
                                  {['{{propertyTitle}}', '{{propertyType}}', '{{propertyPrice}}', '{{propertyAddress}}', '{{propertyBedrooms}}', '{{propertyArea}}', '{{propertyFeatures}}'].map(tag => (
                                      <code key={tag} className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-700 font-mono">{tag}</code>
                                  ))}
                              </div>
                              <textarea 
                                  className="w-full h-64 p-4 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono text-sm leading-relaxed text-slate-700"
                                  value={crmPrompts.matchAi}
                                  onChange={(e) => setCrmPrompts({...crmPrompts, matchAi: e.target.value})}
                                  spellCheck={false}
                              />
                          </div>
                      )}

                      {activeCrmPromptTab === 'global' && (
                          <div className="animate-in fade-in duration-200">
                              <p className="text-xs text-slate-500 mb-2">
                                  Este prompt gera os insights gerais do pipeline (botão "Insights IA" no topo do CRM).
                              </p>
                              <div className="flex flex-wrap gap-2 mb-3">
                                  <span className="text-xs font-semibold text-slate-600 mr-2">Variável Obrigatória:</span>
                                  <code className="px-1.5 py-0.5 bg-green-50 border border-green-100 rounded text-[10px] text-green-700 font-mono">{'{{pipelineData}}'}</code>
                                  <span className="text-xs text-slate-400 ml-2">(Contém um JSON resumido de todos os leads do pipeline)</span>
                              </div>
                              <textarea 
                                  className="w-full h-64 p-4 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono text-sm leading-relaxed text-slate-700"
                                  value={crmPrompts.crmGlobal}
                                  onChange={(e) => setCrmPrompts({...crmPrompts, crmGlobal: e.target.value})}
                                  spellCheck={false}
                              />
                          </div>
                      )}

                      {activeCrmPromptTab === 'card' && (
                          <div className="animate-in fade-in duration-200">
                              <p className="text-xs text-slate-500 mb-2">
                                  Este prompt gera a estratégia comercial individual para um lead (ícone de brilho no card).
                              </p>
                              <div className="flex flex-wrap gap-2 mb-3">
                                  <span className="text-xs font-semibold text-slate-600 mr-2">Variáveis:</span>
                                  {['{{clientName}}', '{{createdAt}}', '{{lastContact}}', '{{visitsHistory}}', '{{interest}}', '{{locations}}', '{{budget}}', '{{matchingProperties}}'].map(tag => (
                                      <code key={tag} className="px-1.5 py-0.5 bg-purple-50 border border-purple-100 rounded text-[10px] text-purple-700 font-mono">{tag}</code>
                                  ))}
                              </div>
                              <textarea 
                                  className="w-full h-64 p-4 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono text-sm leading-relaxed text-slate-700"
                                  value={crmPrompts.crmCard}
                                  onChange={(e) => setCrmPrompts({...crmPrompts, crmCard: e.target.value})}
                                  spellCheck={false}
                              />
                          </div>
                      )}
                  </div>
              </Card>

              {/* Lead Aging Config */}
              <Card className="p-6 border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between mb-6">
                      <div>
                          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <Clock className="text-blue-600" size={20} />
                              Configuração de Envelhecimento de Leads
                          </h2>
                          <p className="text-sm text-slate-500">Defina as cores e o tempo para o status visual dos leads no Kanban.</p>
                      </div>
                      <Button onClick={handleAgingSave} className="gap-2">
                          <Save size={18} /> Salvar Regras
                      </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Fresh / Novo */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                              1. Fase Inicial (Novo)
                          </h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-medium text-slate-500 uppercase">Até quantos dias?</label>
                                  <Input 
                                    type="number" 
                                    value={agingConfig.freshLimit}
                                    onChange={e => setAgingConfig({...agingConfig, freshLimit: Number(e.target.value)})}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-medium text-slate-500 uppercase">Cor</label>
                                  <select 
                                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm"
                                    value={agingConfig.freshColor}
                                    onChange={e => setAgingConfig({...agingConfig, freshColor: e.target.value})}
                                  >
                                      {colorOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                  </select>
                              </div>
                              <div className={`mt-2 p-2 rounded text-center text-xs font-bold border ${getColorClass(agingConfig.freshColor)}`}>
                                  Visualização
                              </div>
                          </div>
                      </div>

                      {/* Warm / Morno */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                              2. Fase Intermediária (Morno)
                          </h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-medium text-slate-500 uppercase">Até quantos dias?</label>
                                  <Input 
                                    type="number" 
                                    value={agingConfig.warmLimit}
                                    onChange={e => setAgingConfig({...agingConfig, warmLimit: Number(e.target.value)})}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-medium text-slate-500 uppercase">Cor</label>
                                  <select 
                                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm"
                                    value={agingConfig.warmColor}
                                    onChange={e => setAgingConfig({...agingConfig, warmColor: e.target.value})}
                                  >
                                      {colorOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                  </select>
                              </div>
                              <div className={`mt-2 p-2 rounded text-center text-xs font-bold border ${getColorClass(agingConfig.warmColor)}`}>
                                  Visualização
                              </div>
                          </div>
                      </div>

                      {/* Cold / Frio */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                              3. Fase Avançada (Frio)
                          </h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-medium text-slate-500 uppercase">Tempo</label>
                                  <div className="px-3 py-2 bg-slate-200 rounded text-slate-600 text-sm italic">
                                      Acima de {agingConfig.warmLimit} dias
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-medium text-slate-500 uppercase">Cor</label>
                                  <select 
                                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm"
                                    value={agingConfig.coldColor}
                                    onChange={e => setAgingConfig({...agingConfig, coldColor: e.target.value})}
                                  >
                                      {colorOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                  </select>
                              </div>
                              <div className={`mt-2 p-2 rounded text-center text-xs font-bold border ${getColorClass(agingConfig.coldColor)}`}>
                                  Visualização
                              </div>
                          </div>
                      </div>
                  </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <StringListManager 
                      title="Origens de Lead (Sources)"
                      description="Opções para o campo 'Origem' no cadastro de leads."
                      items={systemSettings.leadSources}
                      onAdd={addLeadSource}
                      onRemove={removeLeadSource}
                      placeholder="Nova origem (ex: Evento)"
                  />
                  
                  <StringListManager 
                      title="Localizações Sugeridas"
                      description="Bairros ou cidades que aparecem no autocomplete."
                      items={systemSettings.availableLocations}
                      onAdd={addLocation}
                      onRemove={removeLocation}
                      placeholder="Cidade - Bairro (ex: SP - Moema)"
                  />
              </div>
          </div>
      )}

      {activeTab === 'logs' && (
          <Card className="flex flex-col h-[600px]">
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                      <h2 className="text-lg font-semibold text-slate-800">Histórico de Alterações</h2>
                      <p className="text-sm text-slate-500">Rastreabilidade completa de ações no sistema.</p>
                  </div>
                  <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Buscar log..." 
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                      />
                  </div>
              </div>
              
              <div className="flex-1 overflow-auto flex">
                  {/* Log List */}
                  <div className={`${selectedLog ? 'w-1/2' : 'w-full'} overflow-y-auto border-r border-slate-100 transition-all`}>
                      <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs sticky top-0 z-10 shadow-sm">
                              <tr>
                                  <th className="px-4 py-3">Data/Hora</th>
                                  <th className="px-4 py-3">Usuário</th>
                                  <th className="px-4 py-3">Ação</th>
                                  <th className="px-4 py-3">Detalhes</th>
                                  <th className="px-4 py-3"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredLogs.map(log => (
                                  <tr key={log.id} className={`hover:bg-slate-50 cursor-pointer ${selectedLog?.id === log.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedLog(log)}>
                                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                                          {new Date(log.timestamp).toLocaleString()}
                                      </td>
                                      <td className="px-4 py-3 font-medium text-slate-800">{log.userName}</td>
                                      <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                                      <td className="px-4 py-3">
                                          <div className="font-medium text-slate-700">{log.entityName}</div>
                                          <div className="text-xs text-slate-400">{log.details}</div>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                          <Eye size={16} className="text-slate-400" />
                                      </td>
                                  </tr>
                              ))}
                              {filteredLogs.length === 0 && (
                                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhum registro encontrado.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>

                  {/* Log Detail Panel */}
                  {selectedLog && (
                      <div className="w-1/2 bg-slate-50 p-6 overflow-y-auto flex flex-col h-full animate-in slide-in-from-right duration-200">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                      {getActionBadge(selectedLog.action)} 
                                      <span className="truncate">{selectedLog.entityName}</span>
                                  </h3>
                                  <p className="text-sm text-slate-500">ID: {selectedLog.entityId}</p>
                              </div>
                              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600"><Settings size={20} className="opacity-0" /></button> {/* Spacer */}
                          </div>

                          <div className="space-y-4 flex-1">
                              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Dados da Alteração</h4>
                                  <JsonDiffViewer before={selectedLog.previousData} after={selectedLog.newData} />
                              </div>
                          </div>

                          <div className="mt-6 pt-6 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                  <div className="text-xs text-slate-400">
                                      Responsável: <strong>{selectedLog.userName}</strong>
                                  </div>
                                  {selectedLog.previousData && selectedLog.action !== 'create' && (
                                      <Button 
                                        variant="outline" 
                                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                        onClick={() => { if(window.confirm('Isso reverterá os dados para o estado ANTERIOR a esta mudança. Uma nova entrada de log será criada. Confirmar?')) restoreState(selectedLog.id) }}
                                      >
                                          <RotateCcw size={16} /> Restaurar Versão Anterior
                                      </Button>
                                  )}
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </Card>
      )}
    </div>
  );
};