import React, { useState, useEffect } from 'react';
import { useStore, DEFAULT_DESC_PROMPT, DEFAULT_MATCH_PROMPT, DEFAULT_CRM_GLOBAL_PROMPT, DEFAULT_CRM_CARD_PROMPT } from '../store';
import { DEFAULT_EMAIL_TEMPLATES } from '../services/emailService';
import { Card, Button, Input, Badge } from '../components/ui/Elements';
import { Users, Shield, Settings, Save, AlertTriangle, FileText, RotateCcw, Eye, Search, Building2, Plus, Trash2, X, Megaphone, MapPin, Sparkles, Clock, Key, Database, RefreshCcw, Code, UserPlus, Lock, Unlock, Ban, CheckCircle, Activity, Target, Mail, Send, Link, Edit3 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { UserRole, LogEntry, User, SmtpConfig, EmailTemplatesConfig } from '../types';
import { sendSystemEmail } from '../services/emailService';

const JsonDiffViewer: React.FC<{ before: any, after: any }> = ({ before, after }) => {
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
  const { currentUser, users, updateUser, addUser, removeUser, toggleUserBlock, systemSettings, updateSystemSettings, logs, restoreState, addNotification, sendTestEmail } = useStore();
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'properties' | 'crm' | 'logs'>('users');
  
  const [settingsForm, setSettingsForm] = useState(systemSettings);
  const [logSearch, setLogSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'employee' as UserRole });

  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState('');

  const [testEmail, setTestEmail] = useState(currentUser?.email || '');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const [newTypeLabel, setNewTypeLabel] = useState('');
  
  const [promptText, setPromptText] = useState(systemSettings.propertyDescriptionPrompt);
  
  const [crmPrompts, setCrmPrompts] = useState({
      matchAi: systemSettings.matchAiPrompt,
      crmGlobal: systemSettings.crmGlobalInsightsPrompt,
      crmCard: systemSettings.crmCardInsightsPrompt
  });
  const [activeCrmPromptTab, setActiveCrmPromptTab] = useState<'match' | 'global' | 'card'>('match');

  if (currentUser?.role !== 'admin') {
      return <Navigate to="/" replace />;
  }

  const handleSettingsSave = () => {
      updateSystemSettings(settingsForm);
      addNotification('success', 'Configurações salvas.');
  };
  
  const handlePromptSave = () => {
      updateSystemSettings({ propertyDescriptionPrompt: promptText });
      addNotification('success', 'Prompt de descrição salvo.');
  };

  const handleCrmPromptsSave = () => {
      updateSystemSettings({ 
          matchAiPrompt: crmPrompts.matchAi,
          crmGlobalInsightsPrompt: crmPrompts.crmGlobal,
          crmCardInsightsPrompt: crmPrompts.crmCard
      });
      addNotification('success', 'Prompts do CRM salvos.');
  };

  const updateSmtp = (updates: Partial<SmtpConfig>) => {
      const current = settingsForm.smtpConfig || {
          host: 'smtp.gmail.com',
          port: 587,
          user: '',
          pass: '',
          secure: false,
          fromName: 'Sistema WebImob',
          enabled: false
      };
      setSettingsForm({ ...settingsForm, smtpConfig: { ...current, ...updates } });
  };

  const handleTestSmtp = async () => {
      if(!settingsForm.smtpConfig?.host || !settingsForm.smtpConfig?.user || !settingsForm.smtpConfig?.pass) {
          addNotification('error', 'Preencha as configurações de SMTP antes de testar.');
          return;
      }
      setIsTestingSmtp(true);
      // Corrected call signature: pass email string directly
      const success = await sendTestEmail(testEmail, settingsForm.smtpConfig);
      setIsTestingSmtp(false);
      
      if(success) {
          addNotification('success', 'Email de teste enviado (Simulado). Verifique o console.');
      } else {
          addNotification('error', 'Falha ao enviar email.');
      }
  }

  const handleAddUser = () => {
      if(!newUser.name || !newUser.email) {
          addNotification('error', 'Nome e email são obrigatórios.');
          return;
      }
      const success = addUser(newUser);
      if (success) {
          setIsAddUserOpen(false);
          setNewUser({ name: '', email: '', role: 'employee' });
          addNotification('success', 'Usuário adicionado.');
      } else {
          addNotification('error', 'Email já cadastrado.');
      }
  };

  const openEditUser = (user: User) => {
      setEditingUser(user);
      setEditPassword('');
      setIsEditUserOpen(true);
  }

  const handleSaveUserEdit = () => {
      if(!editingUser) return;
      const updates: Partial<User> = {
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role
      };
      if(editPassword.trim()) {
          updates.password = editPassword;
      }
      updateUser(editingUser.id, updates);
      setIsEditUserOpen(false);
      setEditingUser(null);
      setEditPassword('');
      addNotification('success', 'Usuário atualizado.');
  }

  const handleRemoveUser = (id: string) => {
      if(window.confirm('Tem certeza que deseja remover este usuário?')) {
          removeUser(id);
          addNotification('success', 'Usuário removido.');
      }
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
      if(window.confirm('Remover este tipo de imóvel?')) {
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
       if(window.confirm('Remover este diferencial?')) {
          const updatedFeatures = systemSettings.propertyFeatures.filter(f => f !== feat);
          updateSystemSettings({ propertyFeatures: updatedFeatures });
      }
  }

  const addLeadSource = (val: string) => {
      if(systemSettings.leadSources.includes(val)) return;
      updateSystemSettings({ leadSources: [...systemSettings.leadSources, val] });
  }

  const removeLeadSource = (val: string) => {
      if(window.confirm('Remover esta origem?')) {
          updateSystemSettings({ leadSources: systemSettings.leadSources.filter(s => s !== val) });
      }
  }

  const addLocation = (val: string) => {
      if(systemSettings.availableLocations.includes(val)) return;
      updateSystemSettings({ availableLocations: [...systemSettings.availableLocations, val] });
  }

  const removeLocation = (val: string) => {
      if(window.confirm('Remover esta localização?')) {
          updateSystemSettings({ availableLocations: systemSettings.availableLocations.filter(l => l !== val) });
      }
  }

  const filteredLogs = logs.filter(l => 
      l.details.toLowerCase().includes(logSearch.toLowerCase()) || 
      l.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.entityName.toLowerCase().includes(logSearch.toLowerCase())
  ).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Administração</h1>
                <p className="text-slate-500">Controle total do sistema e configurações globais.</p>
            </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
            {[
                { id: 'users', label: 'Usuários', icon: Users },
                { id: 'system', label: 'Configurações do Sistema', icon: Settings },
                { id: 'properties', label: 'Listas e Tipos', icon: Building2 },
                { id: 'crm', label: 'IA e CRM', icon: Megaphone },
                { id: 'logs', label: 'Auditoria (Logs)', icon: Shield },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium transition-colors text-sm ${activeTab === tab.id ? 'bg-white border-x border-t border-slate-200 text-primary-600 -mb-px relative z-10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                    <tab.icon size={16} />
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="min-h-[500px]">
            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={() => setIsAddUserOpen(true)}>
                            <UserPlus size={18} /> Adicionar Usuário
                        </Button>
                    </div>
                    <Card className="overflow-hidden">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Usuário</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Função</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-200" alt="" />
                                            <span className="font-medium text-slate-800">{u.name}</span>
                                        </td>
                                        <td className="px-6 py-4">{u.email}</td>
                                        <td className="px-6 py-4 capitalize">{u.role}</td>
                                        <td className="px-6 py-4">
                                            {u.blocked ? (
                                                <Badge color="red">Bloqueado</Badge>
                                            ) : (
                                                <Badge color="green">Ativo</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button onClick={() => toggleUserBlock(u.id)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title={u.blocked ? "Desbloquear" : "Bloquear"}>
                                                {u.blocked ? <Unlock size={18}/> : <Ban size={18}/>}
                                            </button>
                                            <button onClick={() => openEditUser(u)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                                                <Edit3 size={18}/>
                                            </button>
                                            <button onClick={() => handleRemoveUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remover">
                                                <Trash2 size={18}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            {/* SYSTEM TAB */}
            {activeTab === 'system' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Building2 size={20}/> Informações da Imobiliária</h2>
                        <div className="space-y-4">
                            <Input 
                                label="Nome da Empresa" 
                                value={settingsForm.companyName}
                                onChange={e => setSettingsForm({...settingsForm, companyName: e.target.value})}
                            />
                            
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div>
                                    <span className="font-medium text-slate-700 block">Novos Cadastros</span>
                                    <span className="text-xs text-slate-500">Permitir que novos usuários se cadastrem na tela de login?</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5"
                                    checked={settingsForm.allowNewRegistrations}
                                    onChange={e => setSettingsForm({...settingsForm, allowNewRegistrations: e.target.checked})}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div>
                                    <span className="font-medium text-slate-700 block">Aprovação de Imóveis</span>
                                    <span className="text-xs text-slate-500">Exigir aprovação de admin para publicar imóveis?</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5"
                                    checked={settingsForm.requirePropertyApproval}
                                    onChange={e => setSettingsForm({...settingsForm, requirePropertyApproval: e.target.checked})}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div>
                                    <span className="font-medium text-slate-700 block">Modo Manutenção</span>
                                    <span className="text-xs text-slate-500">Bloquear acesso de usuários não-admin?</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5"
                                    checked={settingsForm.maintenanceMode}
                                    onChange={e => setSettingsForm({...settingsForm, maintenanceMode: e.target.checked})}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Key size={20}/> Chaves de API</h2>
                        <div className="space-y-4">
                            <Input 
                                label="Google Gemini API Key (IA)" 
                                type="password"
                                value={settingsForm.geminiApiKey}
                                onChange={e => setSettingsForm({...settingsForm, geminiApiKey: e.target.value})}
                                placeholder="sk-..."
                            />
                            <div className="pt-4 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 mb-2">Supabase (Banco de Dados)</h3>
                                <Input 
                                    label="Project URL" 
                                    value={settingsForm.supabaseUrl}
                                    onChange={e => setSettingsForm({...settingsForm, supabaseUrl: e.target.value})}
                                    placeholder="https://..."
                                    className="mb-3"
                                />
                                <Input 
                                    label="Anon Key" 
                                    type="password"
                                    value={settingsForm.supabaseAnonKey}
                                    onChange={e => setSettingsForm({...settingsForm, supabaseAnonKey: e.target.value})}
                                    placeholder="eyJ..."
                                />
                            </div>
                        </div>
                    </Card>

                    {/* NEW INTEGRATION SECTION */}
                    <Card className="p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Link size={20}/> Integrações (Webhooks)
                        </h2>
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                Configure Webhooks para integrar com <strong>n8n, Zapier, Make</strong> ou outros sistemas.
                                O sistema enviará um POST JSON sempre que um imóvel for: 
                                <span className="font-semibold text-blue-700"> Publicado, Editado, Vendido ou Removido.</span>
                            </p>
                            <Input 
                                label="Webhook URL (n8n / Zapier)" 
                                value={settingsForm.n8nWebhookUrl || ''}
                                onChange={e => setSettingsForm({...settingsForm, n8nWebhookUrl: e.target.value})}
                                placeholder="https://seu-n8n.com/webhook/..."
                            />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Mail size={20}/> Configuração SMTP (Email)</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-700">Habilitar Envio de Emails</span>
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5"
                                    checked={settingsForm.smtpConfig?.enabled || false}
                                    onChange={e => updateSmtp({ enabled: e.target.checked })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Host SMTP" value={settingsForm.smtpConfig?.host} onChange={e => updateSmtp({ host: e.target.value })} />
                                <Input label="Porta" type="number" value={settingsForm.smtpConfig?.port} onChange={e => updateSmtp({ port: Number(e.target.value) })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Usuário" value={settingsForm.smtpConfig?.user} onChange={e => updateSmtp({ user: e.target.value })} />
                                <Input label="Senha" type="password" value={settingsForm.smtpConfig?.pass} onChange={e => updateSmtp({ pass: e.target.value })} />
                            </div>
                            <Input label="Nome do Remetente" value={settingsForm.smtpConfig?.fromName} onChange={e => updateSmtp({ fromName: e.target.value })} />
                            
                            <div className="pt-4 border-t border-slate-100 flex gap-2 items-end">
                                <Input 
                                    label="Testar envio para:" 
                                    value={testEmail} 
                                    onChange={e => setTestEmail(e.target.value)} 
                                    className="flex-1"
                                />
                                <Button variant="outline" onClick={handleTestSmtp} disabled={isTestingSmtp}>
                                    {isTestingSmtp ? 'Enviando...' : 'Enviar Teste'}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <div className="lg:col-span-2 flex justify-end pt-4">
                        <Button onClick={handleSettingsSave} className="w-full md:w-auto">
                            <Save size={18} /> Salvar Todas Configurações
                        </Button>
                    </div>
                </div>
            )}

            {/* PROPERTIES CONFIG TAB */}
            {activeTab === 'properties' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="flex flex-col h-[500px]">
                        <div className="p-4 border-b border-slate-100">
                            <h2 className="text-lg font-semibold text-slate-800">Tipos de Imóvel</h2>
                            <p className="text-sm text-slate-500">Opções disponíveis no cadastro.</p>
                        </div>
                        <div className="p-4 border-b border-slate-100 flex gap-2">
                            <Input 
                                placeholder="Novo tipo (Ex: Loft)" 
                                value={newTypeLabel}
                                onChange={e => setNewTypeLabel(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={addPropertyType} disabled={!newTypeLabel}><Plus size={18}/></Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {systemSettings.propertyTypes.map((type) => (
                                <div key={type.value} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200 group">
                                    <div>
                                        <span className="text-slate-700 font-medium block">{type.label}</span>
                                        <span className="text-xs text-slate-400 font-mono">{type.value}</span>
                                    </div>
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

                    <StringListManager 
                        title="Diferenciais (Features)" 
                        description="Itens de lazer e comodidades."
                        items={systemSettings.propertyFeatures}
                        onAdd={addFeature}
                        onRemove={removeFeature}
                        placeholder="Ex: Piscina Aquecida"
                    />

                    <StringListManager 
                        title="Localizações (Sugestões)" 
                        description="Bairros ou Cidades para autocomplete."
                        items={systemSettings.availableLocations}
                        onAdd={addLocation}
                        onRemove={removeLocation}
                        placeholder="Ex: São Paulo - Morumbi"
                    />
                </div>
            )}

            {/* CRM & AI TAB */}
            {activeTab === 'crm' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StringListManager 
                            title="Origens de Leads" 
                            description="Canais de entrada de clientes."
                            items={systemSettings.leadSources}
                            onAdd={addLeadSource}
                            onRemove={removeLeadSource}
                            placeholder="Ex: LinkedIn Ads"
                        />
                        
                        {/* Prompt Configuration */}
                        <Card className="flex flex-col h-[500px]">
                            <div className="p-4 border-b border-slate-100">
                                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                    <Sparkles size={18} className="text-purple-600"/> Prompts da IA
                                </h2>
                                <p className="text-sm text-slate-500">Personalize como a IA escreve e analisa.</p>
                            </div>
                            
                            <div className="flex border-b border-slate-100 overflow-x-auto">
                                <button onClick={() => setActiveCrmPromptTab('match')} className={`px-4 py-2 text-xs font-bold uppercase transition-colors ${activeCrmPromptTab === 'match' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}>Matchmaking</button>
                                <button onClick={() => setActiveCrmPromptTab('global')} className={`px-4 py-2 text-xs font-bold uppercase transition-colors ${activeCrmPromptTab === 'global' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}>Insights Global</button>
                                <button onClick={() => setActiveCrmPromptTab('card')} className={`px-4 py-2 text-xs font-bold uppercase transition-colors ${activeCrmPromptTab === 'card' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}>Insights Lead</button>
                                <button className={`px-4 py-2 text-xs font-bold uppercase transition-colors text-slate-500 cursor-not-allowed border-b-2 border-transparent`} disabled>Descrição Imóvel (Abaixo)</button>
                            </div>

                            <div className="flex-1 p-4 flex flex-col">
                                {activeCrmPromptTab === 'match' && (
                                    <textarea 
                                        className="flex-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono resize-none focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        value={crmPrompts.matchAi}
                                        onChange={e => setCrmPrompts({...crmPrompts, matchAi: e.target.value})}
                                        placeholder="Prompt para análise de compatibilidade..."
                                    />
                                )}
                                {activeCrmPromptTab === 'global' && (
                                    <textarea 
                                        className="flex-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono resize-none focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        value={crmPrompts.crmGlobal}
                                        onChange={e => setCrmPrompts({...crmPrompts, crmGlobal: e.target.value})}
                                        placeholder="Prompt para análise global do pipeline..."
                                    />
                                )}
                                {activeCrmPromptTab === 'card' && (
                                    <textarea 
                                        className="flex-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono resize-none focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        value={crmPrompts.crmCard}
                                        onChange={e => setCrmPrompts({...crmPrompts, crmCard: e.target.value})}
                                        placeholder="Prompt para insights individuais do lead..."
                                    />
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-100 flex justify-end">
                                <Button onClick={handleCrmPromptsSave} className="text-xs py-1 px-3">Salvar Prompts CRM</Button>
                            </div>
                        </Card>
                    </div>

                    {/* Property Description Prompt */}
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Prompt de Descrição de Imóveis</h3>
                                <p className="text-sm text-slate-500">Variáveis disponíveis: {'{{title}}, {{type}}, {{price}}, {{address}}, {{features}}, {{area}}, {{bedrooms}}, {{bathrooms}}'}</p>
                            </div>
                            <Button onClick={handlePromptSave}>Salvar Prompt</Button>
                        </div>
                        <textarea 
                            className="w-full h-64 p-4 bg-slate-900 text-slate-300 rounded-lg font-mono text-sm leading-relaxed"
                            value={promptText}
                            onChange={e => setPromptText(e.target.value)}
                        />
                    </Card>
                </div>
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                    <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar logs..." 
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                    value={logSearch}
                                    onChange={e => setLogSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {filteredLogs.map(log => (
                                <div 
                                    key={log.id} 
                                    onClick={() => setSelectedLog(log)}
                                    className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${selectedLog?.id === log.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-semibold text-slate-700 text-sm">{log.action.toUpperCase()}</span>
                                        <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2">{log.details}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge color="gray" className="text-[10px]">{log.entity}</Badge>
                                        <span className="text-[10px] text-slate-400">por {log.userName}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                        {selectedLog ? (
                            <div className="flex flex-col h-full">
                                <div className="p-6 border-b border-slate-100 bg-slate-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800 mb-1">Detalhes da Atividade</h2>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Clock size={14}/> {new Date(selectedLog.timestamp).toLocaleString()}
                                                <span>•</span>
                                                <UserPlus size={14}/> {selectedLog.userName}
                                            </div>
                                        </div>
                                        {selectedLog.action === 'update' && selectedLog.previousData && (
                                            <Button variant="outline" onClick={() => restoreState(selectedLog.id)} className="text-xs">
                                                <RotateCcw size={14}/> Reverter Alteração
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">Descrição</h3>
                                        <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">{selectedLog.details}</p>
                                    </div>

                                    {(selectedLog.previousData || selectedLog.newData) && (
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">Dados Técnicos (Diff)</h3>
                                            <JsonDiffViewer before={selectedLog.previousData} after={selectedLog.newData} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Shield size={48} className="mb-4 opacity-20" />
                                <p>Selecione um log para ver os detalhes</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* MODALS */}
        {/* ADD USER MODAL */}
        {isAddUserOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Adicionar Usuário</h2>
                    <div className="space-y-4">
                        <Input label="Nome" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                        <Input label="Email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Função</label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                            >
                                <option value="admin">Administrador</option>
                                <option value="finance">Financeiro</option>
                                <option value="employee">Funcionário</option>
                                <option value="broker">Corretor</option>
                                <option value="captator">Captador (Externo)</option>
                            </select>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg">
                            Senha padrão inicial: <strong>123456</strong>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddUser}>Cadastrar</Button>
                    </div>
                </div>
            </div>
        )}

        {/* EDIT USER MODAL */}
        {isEditUserOpen && editingUser && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Editar Usuário</h2>
                    <div className="space-y-4">
                        <Input label="Nome" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                        <Input label="Email" type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Função</label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                value={editingUser.role}
                                onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                            >
                                <option value="admin">Administrador</option>
                                <option value="finance">Financeiro</option>
                                <option value="employee">Funcionário</option>
                                <option value="broker">Corretor</option>
                                <option value="captator">Captador (Externo)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Redefinir Senha (Opcional)</label>
                            <Input 
                                type="password" 
                                placeholder="Nova senha..." 
                                value={editPassword}
                                onChange={e => setEditPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveUserEdit}>Salvar Alterações</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};