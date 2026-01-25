import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, Button, Input, Badge } from '../components/ui/Elements';
import { Users, Shield, Settings, Save, AlertTriangle, FileText, RotateCcw, Eye, Search, Building2, Plus, Trash2, X, Megaphone, MapPin, Sparkles } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { UserRole, LogEntry } from '../types';

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
  const { currentUser, users, updateUserRole, systemSettings, updateSystemSettings, logs, restoreState } = useStore();
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'properties' | 'crm' | 'logs'>('users');
  
  // Local state for settings form
  const [settingsForm, setSettingsForm] = useState(systemSettings);
  const [logSearch, setLogSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Property Config States
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newFeature, setNewFeature] = useState('');
  
  // AI Prompt State
  const [promptText, setPromptText] = useState(systemSettings.propertyDescriptionPrompt);

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

  const addFeature = () => {
      if(!newFeature.trim()) return;
      if(systemSettings.propertyFeatures.includes(newFeature)) return;
      
      const updatedFeatures = [...systemSettings.propertyFeatures, newFeature];
      updateSystemSettings({ propertyFeatures: updatedFeatures });
      setNewFeature('');
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

  const roleOptions: { value: UserRole; label: string }[] = [
      { value: 'admin', label: 'Administrador' },
      { value: 'finance', label: 'Financeiro' },
      { value: 'employee', label: 'Funcionário' },
      { value: 'broker', label: 'Corretor' },
  ];

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
           <button onClick={() => setActiveTab('properties')} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'properties' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <div className="flex items-center gap-2"><Building2 size={18} /> Imóveis</div>
          </button>
          <button onClick={() => setActiveTab('crm')} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'crm' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <div className="flex items-center gap-2"><Megaphone size={18} /> CRM & Leads</div>
          </button>
          <button onClick={() => setActiveTab('logs')} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <div className="flex items-center gap-2"><FileText size={18} /> Logs de Auditoria</div>
          </button>
      </div>

      {activeTab === 'users' && (
          <Card className="overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800">Controle de Acesso (RBAC)</h2>
                  <p className="text-sm text-slate-500">Altere as permissões de acesso de qualquer usuário cadastrado.</p>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-800 font-semibold uppercase text-xs">
                          <tr>
                              <th className="px-6 py-4">Usuário</th>
                              <th className="px-6 py-4">Email</th>
                              <th className="px-6 py-4">Nível de Permissão Atual</th>
                              <th className="px-6 py-4">Ação</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {users.map(user => (
                              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 flex items-center gap-3">
                                      <img src={user.avatar} className="w-8 h-8 rounded-full" alt="" />
                                      <span className="font-medium">{user.name}</span>
                                      {currentUser.id === user.id && <Badge color="blue">Você</Badge>}
                                  </td>
                                  <td className="px-6 py-4">{user.email}</td>
                                  <td className="px-6 py-4">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize
                                        ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                          user.role === 'broker' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                          'bg-slate-50 text-slate-700 border-slate-200'}
                                      `}>
                                          {user.role}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <select 
                                        value={user.role}
                                        onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                                        disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1} // Prevent lockout
                                        className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                          {roleOptions.map(opt => (
                                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                                          ))}
                                      </select>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </Card>
      )}

      {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
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
                          <li>A aprovação de imóveis afeta apenas Corretores.</li>
                          <li>Modo manutenção exibe tela de bloqueio.</li>
                      </ul>
                  </Card>
              </div>
          </div>
      )}

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
                              Prompt da Inteligência Artificial
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
