import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Card, Button, Input, Badge, PhoneInput, formatPhone } from '../components/ui/Elements';
import { Plus, Search, Mail, Phone, MapPin, UserPlus, Filter, ArrowRight, Edit3, Save, X, FileText, User, Trash, Check, Loader2, History, Calendar, LayoutList, Clock, ArrowUpRight, Briefcase, Building, MessageCircle, CalendarPlus, FolderOpen, Users, Star, Smile, Share2, Activity, MessageSquare, Home, Link, ExternalLink, Send, Sparkles, DollarSign, Compass, Layers } from 'lucide-react';
import { Client, LeadSource, PropertyType, LogEntry, Visit, Property, DetailedInterestProfile } from '../types';
import { searchCep } from '../services/viaCep';

// --- Lead Detail Component (The "360 View") ---
// Moved outside to prevent re-renders losing state
const LeadDetailModal = ({ clientId, onClose, onSwitchClient }: { clientId: string, onClose: () => void, onSwitchClient?: (id: string) => void }) => {
    const { clients, updateClient, addFamilyMember, users, pipelines, logs, properties, addNotification, systemSettings } = useStore();
    const client = clients.find(c => c.id === clientId);
    
    // New Detailed View States
    const [mainTab, setMainTab] = useState<'history' | 'properties' | 'actions'>('history');
    const [detailTab, setDetailTab] = useState<'geral' | 'interacoes' | 'atividades' | 'comentarios' | 'rodizios' | 'alteracoes'>('geral');
    
    // Family Form State
    const [showFamilyForm, setShowFamilyForm] = useState(false);
    const [familyForm, setFamilyForm] = useState({ name: '', relationship: 'Cônjuge', phone: '', email: '' });

    // Interest Profile State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileData, setProfileData] = useState<DetailedInterestProfile>({
        propertyTypes: [],
        condition: 'indiferente',
        usage: 'moradia',
        cities: [],
        neighborhoods: [],
        proximityTo: [],
        minBedrooms: 0,
        minSuites: 0,
        minParking: 0,
        minArea: 0,
        mustHaveFeatures: [],
        maxPrice: 0,
        paymentMethod: 'vista',
        hasFgts: false,
        sunOrientation: 'indiferente',
        floorPreference: 'indiferente',
        notes: ''
    });

    // Local State for Form Fields
    const [localData, setLocalData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        clientType: '',
        source: ''
    });

    useEffect(() => {
        if (client) {
            setLocalData({
                firstName: client.name.split(' ')[0],
                lastName: client.name.split(' ').slice(1).join(' '),
                email: client.email,
                phone: client.phone,
                clientType: client.clientType || '',
                source: client.source || 'Manual'
            });

            // Initialize Profile Data
            if (client.interestProfile) {
                setProfileData(client.interestProfile);
            } else {
                // Fallback to legacy fields if profile doesn't exist
                setProfileData(prev => ({
                    ...prev,
                    propertyTypes: client.interest,
                    maxPrice: client.budget,
                    minBedrooms: client.minBedrooms || 0,
                    minArea: client.minArea || 0,
                    minParking: client.minParking || 0,
                    mustHaveFeatures: client.desiredFeatures || [],
                    neighborhoods: client.desiredLocation || []
                }));
            }
        }
    }, [client]);

    const [isSaving, setIsSaving] = useState(false);

    if (!client) return null;

    const handleSave = () => {
        setIsSaving(true);
        updateClient(client.id, {
            name: `${localData.firstName} ${localData.lastName}`.trim(),
            email: localData.email,
            phone: localData.phone,
            clientType: localData.clientType,
            source: localData.source as any
        });
        setTimeout(() => setIsSaving(false), 500);
        addNotification('success', 'Dados atualizados!');
    };

    const handleSaveProfile = () => {
        updateClient(client.id, { 
            interestProfile: profileData,
            // Sync legacy fields for list view compatibility
            budget: profileData.maxPrice,
            interest: profileData.propertyTypes,
            minBedrooms: profileData.minBedrooms,
            minArea: profileData.minArea,
            desiredLocation: profileData.neighborhoods
        });
        setIsEditingProfile(false);
        addNotification('success', 'Perfil de interesse atualizado!');
    };

    const handleAddFamily = () => {
        if(!familyForm.name) {
            addNotification('error', 'Nome é obrigatório.');
            return;
        }
        addFamilyMember(client.id, familyForm);
        setShowFamilyForm(false);
        setFamilyForm({ name: '', relationship: 'Cônjuge', phone: '', email: '' });
    };

    const owner = users.find(u => u.id === client.ownerId);
    const pipeline = pipelines.find(p => p.id === client.pipelineId);
    const stage = pipeline?.stages.find(s => s.id === client.stage);

    // --- History & Activity Logic ---
    const clientLogs = logs.filter(l => l.entityId === client.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const clientVisits = (client.visits || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // --- Properties Logic ---
    const linkedProperties = properties.filter(p => (client.interestedPropertyIds || []).includes(p.id));
    const recommendedProperties = properties.filter(p => {
        // Filter logic: Type match AND Budget match (within 20% margin) AND Not already linked
        if ((client.interestedPropertyIds || []).includes(p.id)) return false;
        const typeMatch = client.interest.includes(p.type);
        const budgetMatch = p.price <= (client.budget * 1.2) && p.price >= ((client.minBudget || 0) * 0.8);
        return typeMatch && budgetMatch && p.status === 'published';
    });

    const handleToggleLinkProperty = (propertyId: string) => {
        const current = client.interestedPropertyIds || [];
        let newIds;
        if (current.includes(propertyId)) {
            newIds = current.filter(id => id !== propertyId);
            addNotification('info', 'Imóvel desvinculado com sucesso.');
        } else {
            newIds = [...current, propertyId];
            addNotification('success', 'Imóvel vinculado ao cliente.');
        }
        updateClient(client.id, { interestedPropertyIds: newIds });
    };

    // --- Actions Logic ---
    const handleQuickAction = (action: string) => {
        switch(action) {
            case 'whatsapp':
                window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}`, '_blank');
                break;
            case 'email':
                window.open(`mailto:${client.email}`);
                break;
            case 'call':
                window.open(`tel:${client.phone}`);
                break;
            default:
                addNotification('info', 'Ação registrada.');
        }
    };

    // --- Profile Form Helpers ---
    const toggleProfileList = (field: keyof DetailedInterestProfile, value: string) => {
        setProfileData(prev => {
            const list = prev[field] as string[];
            if (list.includes(value)) {
                return { ...prev, [field]: list.filter(i => i !== value) };
            }
            return { ...prev, [field]: [...list, value] };
        });
    };

    const renderHistoryContent = () => {
        if (detailTab === 'geral') {
            return (
                <div className="space-y-4">
                    {/* Creation Log */}
                    <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 border border-slate-100">
                        Criado por <strong>{logs.find(l => l.entityId === client.id && l.action === 'create')?.userName || 'Sistema'}</strong> em {new Date(client.createdAt).toLocaleDateString()} às {new Date(client.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs
                    </div>
                    
                    {/* Visits */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Atendimentos / Visitas</h4>
                        {clientVisits.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">{client.name.split(' ')[0]} não possui atendimentos em aberto.</p>
                        ) : (
                            clientVisits.map(v => {
                                const prop = properties.find(p => p.id === v.propertyId);
                                return (
                                    <div key={v.id} className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                        <div className={`p-2 rounded-full ${v.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">
                                                Visita {v.status === 'completed' ? 'Realizada' : 'Agendada'}: {prop?.code || 'Imóvel'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(v.date).toLocaleDateString()} às {new Date(v.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </p>
                                            {v.notes && <p className="text-xs text-slate-600 mt-1">"{v.notes}"</p>}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Recent Logs */}
                    <div className="space-y-2 mt-4">
                        <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Últimas Alterações</h4>
                        {clientLogs.slice(0, 3).map(log => (
                            <div key={log.id} className="text-xs text-slate-500 flex gap-2">
                                <span className="text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                                <span>{log.details} por <strong>{log.userName}</strong></span>
                            </div>
                        ))}
                    </div>
                </div>
            )
        }
        return <div className="text-center py-8 text-slate-400 text-sm">Nenhum registro encontrado nesta categoria.</div>;
    };

    const renderPropertiesContent = () => (
        <div className="space-y-6">
            {/* Linked Properties */}
            <div className="space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Link size={18} className="text-indigo-600" /> Imóveis de Interesse (Vinculados)
                </h4>
                {linkedProperties.length === 0 ? (
                    <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-200">
                        Nenhum imóvel vinculado manualmente a este cliente.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {linkedProperties.map(p => (
                            <div key={p.id} className="flex gap-4 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                                <img src={p.images?.[0] || 'https://via.placeholder.com/200'} className="w-20 h-20 object-cover rounded-md" alt="" />
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <h5 className="font-bold text-slate-800">{p.title}</h5>
                                        <span className="text-xs font-mono text-slate-400">{p.code}</span>
                                    </div>
                                    <p className="text-sm text-primary-600 font-bold">{new Intl.NumberFormat('pt-BR', {style:'currency', currency: 'BRL'}).format(p.price)}</p>
                                    <p className="text-xs text-slate-500 line-clamp-1">{p.address}</p>
                                    <div className="flex gap-2 mt-2">
                                        <button 
                                          onClick={() => handleToggleLinkProperty(p.id)}
                                          className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1 border border-red-100"
                                        >
                                            <Trash size={12} /> Desvincular
                                        </button>
                                        <button className="text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1 border border-indigo-100">
                                            <ExternalLink size={12} /> Ver Detalhes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recommended Properties */}
            <div className="space-y-3 pt-6 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" /> Recomendados (Match IA)
                </h4>
                {recommendedProperties.length === 0 ? (
                    <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-200">
                        Nenhum imóvel compatível encontrado automaticamente com base no perfil.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {recommendedProperties.slice(0, 3).map(p => (
                            <div key={p.id} className="flex gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                                <img src={p.images?.[0] || 'https://via.placeholder.com/200'} className="w-20 h-20 object-cover rounded-md" alt="" />
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <h5 className="font-bold text-slate-800">{p.title}</h5>
                                        <Badge color="green">Match</Badge>
                                    </div>
                                    <p className="text-sm text-primary-600 font-bold">{new Intl.NumberFormat('pt-BR', {style:'currency', currency: 'BRL'}).format(p.price)}</p>
                                    <p className="text-xs text-slate-500 line-clamp-1">{p.address}</p>
                                    <div className="flex gap-2 mt-2">
                                        <button 
                                          onClick={() => handleToggleLinkProperty(p.id)}
                                          className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1 rounded transition-colors font-medium border border-indigo-200"
                                        >
                                            Vincular Interesse
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderActionsContent = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button 
              onClick={() => handleQuickAction('whatsapp')}
              className="flex flex-col items-center justify-center p-6 bg-green-50 border border-green-100 rounded-xl hover:shadow-md transition-all hover:bg-green-100 group"
            >
                <MessageCircle size={32} className="text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-green-800 text-sm">WhatsApp</span>
            </button>
            
            <button 
              onClick={() => handleQuickAction('call')}
              className="flex flex-col items-center justify-center p-6 bg-blue-50 border border-blue-100 rounded-xl hover:shadow-md transition-all hover:bg-blue-100 group"
            >
                <Phone size={32} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-blue-800 text-sm">Ligar Agora</span>
            </button>

            <button 
              onClick={() => handleQuickAction('email')}
              className="flex flex-col items-center justify-center p-6 bg-orange-50 border border-orange-100 rounded-xl hover:shadow-md transition-all hover:bg-orange-100 group"
            >
                <Mail size={32} className="text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-orange-800 text-sm">Enviar E-mail</span>
            </button>

            <button 
              className="flex flex-col items-center justify-center p-6 bg-purple-50 border border-purple-100 rounded-xl hover:shadow-md transition-all hover:bg-purple-100 group"
            >
                <CalendarPlus size={32} className="text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-purple-800 text-sm">Agendar Visita</span>
            </button>

            {/* Contract button removed per request */}

            <button 
              className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl hover:shadow-md transition-all hover:bg-slate-100 group"
            >
                <Trash size={32} className="text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-red-700 text-sm">Arquivar Lead</span>
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-200/50 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto pt-4 pb-4">
            <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden min-h-[90vh] flex flex-col relative animate-in fade-in zoom-in duration-200">
                
                {/* Top Bar / Header */}
                <div className="bg-white border-b border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-xl">
                            {client.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {client.name}
                                {/* Stage Badge */}
                                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${stage ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {stage ? stage.name : 'Sem Estágio'}
                                </span>
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                <User size={14} />
                                <span>{owner ? owner.name : 'Sem Responsável'}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs bg-slate-100 px-2 rounded">Corretor responsável</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions (Mini) */}
                    <div className="flex gap-2">
                        <button onClick={() => handleQuickAction('whatsapp')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded transition-colors text-slate-600 hover:text-green-600">
                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center border border-green-100"><MessageCircle size={16} /></div>
                            <span className="text-[10px] font-medium">WhatsApp</span>
                        </button>
                        <button onClick={() => handleQuickAction('call')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded transition-colors text-slate-600 hover:text-blue-600">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100"><Phone size={16} /></div>
                            <span className="text-[10px] font-medium">Ligar</span>
                        </button>
                    </div>
                    
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 bg-slate-50/50">
                    
                    {/* LEFT COLUMN: Static Data (Editable) */}
                    <div className="w-full md:w-1/3 border-r border-slate-200 bg-white p-6 overflow-y-auto">
                        
                        {/* Personal Data Form */}
                        <section className="mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800">Dados da Pessoa</h3>
                                <button onClick={handleSave} className="text-primary-600 hover:text-primary-700 text-xs font-semibold flex items-center gap-1">
                                    {isSaving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12} />} Salvar
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase">Nome</label>
                                    <input 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1 text-sm font-medium text-slate-700 bg-transparent transition-colors"
                                        value={localData.firstName}
                                        onChange={e => setLocalData({...localData, firstName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase">Sobrenome</label>
                                    <input 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1 text-sm font-medium text-slate-700 bg-transparent transition-colors"
                                        value={localData.lastName}
                                        onChange={e => setLocalData({...localData, lastName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase">E-mail</label>
                                    <input 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1 text-sm text-slate-700 bg-transparent transition-colors"
                                        value={localData.email}
                                        onChange={e => setLocalData({...localData, email: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase">Telefone</label>
                                    <input 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1 text-sm text-slate-700 bg-transparent transition-colors"
                                        value={localData.phone}
                                        onChange={e => setLocalData({...localData, phone: formatPhone(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase">Tipo</label>
                                    <select 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1 text-sm text-slate-700 bg-transparent cursor-pointer"
                                        value={localData.clientType}
                                        onChange={e => setLocalData({...localData, clientType: e.target.value})}
                                    >
                                        <option value="">Selecione</option>
                                        <option value="Proprietário">Proprietário</option>
                                        <option value="Investidor">Investidor</option>
                                        <option value="Comprador">Comprador</option>
                                        <option value="Locatário">Locatário</option>
                                        <option value="Fiador">Fiador</option>
                                        <option value="Colaborador">Colaborador</option>
                                        <option value="Captador">Captador</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase">Origem</label>
                                    <select 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1 text-sm text-slate-700 bg-transparent cursor-pointer"
                                        value={localData.source}
                                        onChange={e => setLocalData({...localData, source: e.target.value})}
                                    >
                                        {systemSettings.leadSources.map(src => (
                                            <option key={src} value={src}>{src}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Family Section */}
                        <section className="mb-8 pt-6 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-slate-800">Familiares</h3>
                                <button onClick={() => setShowFamilyForm(!showFamilyForm)} className="text-slate-400 hover:text-primary-600"><Plus size={16}/></button>
                            </div>
                            
                            {showFamilyForm && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 animate-in slide-in-from-top-2">
                                    <div className="space-y-2 mb-3">
                                        <input 
                                            placeholder="Nome Completo" 
                                            className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
                                            value={familyForm.name}
                                            onChange={e => setFamilyForm({...familyForm, name: e.target.value})}
                                        />
                                        <div className="flex gap-2">
                                            <select 
                                                className="w-1/2 px-2 py-1.5 rounded border border-slate-300 text-sm"
                                                value={familyForm.relationship}
                                                onChange={e => setFamilyForm({...familyForm, relationship: e.target.value})}
                                            >
                                                <option value="Cônjuge">Cônjuge</option>
                                                <option value="Filho(a)">Filho(a)</option>
                                                <option value="Pai/Mãe">Pai/Mãe</option>
                                                <option value="Irmão(ã)">Irmão(ã)</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                            <input 
                                                placeholder="Celular (Opcional)" 
                                                className="w-1/2 px-2 py-1.5 rounded border border-slate-300 text-sm"
                                                value={familyForm.phone}
                                                onChange={e => setFamilyForm({...familyForm, phone: formatPhone(e.target.value)})}
                                            />
                                        </div>
                                        <input 
                                            placeholder="Email (Opcional)" 
                                            className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
                                            value={familyForm.email}
                                            onChange={e => setFamilyForm({...familyForm, email: e.target.value})}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => setShowFamilyForm(false)}>Cancelar</Button>
                                        <Button className="px-2 py-1 text-xs" onClick={handleAddFamily}>Adicionar & Criar Lead</Button>
                                    </div>
                                </div>
                            )}

                            {(client.familyMembers && client.familyMembers.length > 0) ? (
                                <div className="space-y-2">
                                    {client.familyMembers.map((member, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-slate-100 hover:border-primary-100 transition-colors group">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                <div className="flex flex-col">
                                                    <span 
                                                        className="text-sm font-medium text-slate-700 hover:text-primary-600 cursor-pointer"
                                                        onClick={() => { if(onSwitchClient) onSwitchClient(member.id); }}
                                                        title="Ver perfil"
                                                    >
                                                        {member.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 uppercase">{member.relationship}</span>
                                                </div>
                                            </div>
                                            <button className="text-slate-300 hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { if(onSwitchClient) onSwitchClient(member.id); }}>
                                                <ArrowUpRight size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded border border-slate-100">
                                    {client.name.split(' ')[0]} não possui nenhum membro da família adicionado.
                                </div>
                            )}
                        </section>

                        {/* Followers Section */}
                        <section className="mb-8 pt-6 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-slate-800">Seguidores</h3>
                                <button className="text-slate-400 hover:text-primary-600"><Plus size={16}/></button>
                            </div>
                            <div className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded border border-slate-100">
                                {client.name.split(' ')[0]} não possui nenhum seguidor.
                            </div>
                        </section>

                    </div>

                    {/* RIGHT COLUMN: Dynamic Content */}
                    <div className="w-full md:w-2/3 bg-slate-50 p-6 overflow-y-auto">
                        
                        {/* Main Tabs */}
                        <div className="mb-6 flex gap-6 border-b border-slate-200">
                            <button 
                              onClick={() => setMainTab('history')}
                              className={`pb-3 border-b-2 font-semibold text-sm transition-colors ${mainTab === 'history' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                              Histórico e Atividades
                            </button>
                            <button 
                              onClick={() => setMainTab('properties')}
                              className={`pb-3 border-b-2 font-semibold text-sm transition-colors ${mainTab === 'properties' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                              Imóveis recomendados
                            </button>
                            <button 
                              onClick={() => setMainTab('actions')}
                              className={`pb-3 border-b-2 font-semibold text-sm transition-colors ${mainTab === 'actions' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                              Ações rápidas
                            </button>
                        </div>

                        {/* Dynamic Content Body */}
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            
                            {mainTab === 'history' && (
                                <>
                                  {/* History Sub-Tabs */}
                                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
                                      <div className="flex border-b border-slate-100 overflow-x-auto">
                                          {['Geral', 'Interações', 'Atividades', 'Comentários', 'Rodízios', 'Alterações'].map(tab => {
                                              const key = tab.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") as any;
                                              return (
                                                  <button 
                                                      key={key}
                                                      onClick={() => setDetailTab(key)}
                                                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${detailTab === key ? 'bg-white text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                                  >
                                                      {tab}
                                                  </button>
                                              )
                                          })}
                                      </div>
                                      <div className="p-6">
                                          {renderHistoryContent()}
                                      </div>
                                  </div>

                                  {/* Detailed Interest Profile Form/View */}
                                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6 overflow-hidden">
                                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                                          <div className="flex items-center gap-2">
                                              <Star className="text-yellow-400 fill-yellow-400" size={20} />
                                              <h3 className="font-bold text-slate-800">Perfil de Interesse (Match IA)</h3>
                                          </div>
                                          {!isEditingProfile && (
                                              <Button variant="outline" className="text-xs h-8" onClick={() => setIsEditingProfile(true)}>
                                                  <Edit3 size={14} /> Editar Perfil
                                              </Button>
                                          )}
                                      </div>
                                      
                                      {isEditingProfile ? (
                                          <div className="p-6 space-y-6">
                                              {/* 1. Imóvel */}
                                              <div className="space-y-3">
                                                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
                                                      <Building size={16} /> O que busca?
                                                  </h4>
                                                  <div className="grid grid-cols-2 gap-4">
                                                      <div className="space-y-1">
                                                          <label className="text-xs font-medium text-slate-500">Tipos de Imóvel</label>
                                                          <div className="flex flex-wrap gap-2">
                                                              {systemSettings.propertyTypes.map(t => (
                                                                  <button 
                                                                    key={t.value} 
                                                                    onClick={() => toggleProfileList('propertyTypes', t.value)}
                                                                    className={`px-2 py-1 text-xs border rounded ${profileData.propertyTypes.includes(t.value) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600'}`}
                                                                  >
                                                                      {t.label}
                                                                  </button>
                                                              ))}
                                                          </div>
                                                      </div>
                                                      <div className="space-y-1">
                                                          <label className="text-xs font-medium text-slate-500">Condição / Estágio</label>
                                                          <select 
                                                            className="w-full border rounded px-2 py-1 text-sm"
                                                            value={profileData.condition}
                                                            onChange={e => setProfileData({...profileData, condition: e.target.value as any})}
                                                          >
                                                              <option value="indiferente">Indiferente</option>
                                                              <option value="pronto">Pronto para Morar</option>
                                                              <option value="planta">Na Planta</option>
                                                              <option value="construcao">Em Construção</option>
                                                          </select>
                                                      </div>
                                                      <div className="space-y-1">
                                                          <label className="text-xs font-medium text-slate-500">Finalidade</label>
                                                          <select 
                                                            className="w-full border rounded px-2 py-1 text-sm"
                                                            value={profileData.usage}
                                                            onChange={e => setProfileData({...profileData, usage: e.target.value as any})}
                                                          >
                                                              <option value="moradia">Moradia</option>
                                                              <option value="investimento">Investimento</option>
                                                          </select>
                                                      </div>
                                                  </div>
                                              </div>

                                              {/* 2. Características */}
                                              <div className="space-y-3">
                                                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
                                                      <Layers size={16} /> Características Mínimas
                                                  </h4>
                                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                      <Input label="Quartos" type="number" value={profileData.minBedrooms} onChange={e => setProfileData({...profileData, minBedrooms: Number(e.target.value)})} />
                                                      <Input label="Suítes" type="number" value={profileData.minSuites} onChange={e => setProfileData({...profileData, minSuites: Number(e.target.value)})} />
                                                      <Input label="Vagas" type="number" value={profileData.minParking} onChange={e => setProfileData({...profileData, minParking: Number(e.target.value)})} />
                                                      <Input label="Área Útil (m²)" type="number" value={profileData.minArea} onChange={e => setProfileData({...profileData, minArea: Number(e.target.value)})} />
                                                  </div>
                                                  <div className="space-y-1">
                                                      <label className="text-xs font-medium text-slate-500">Diferenciais Obrigatórios</label>
                                                      <div className="flex flex-wrap gap-2">
                                                          {systemSettings.propertyFeatures.map(f => (
                                                              <button 
                                                                key={f} 
                                                                onClick={() => toggleProfileList('mustHaveFeatures', f)}
                                                                className={`px-2 py-1 text-xs border rounded-full ${profileData.mustHaveFeatures.includes(f) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}
                                                              >
                                                                  {f}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  </div>
                                              </div>

                                              {/* 3. Localização */}
                                              <div className="space-y-3">
                                                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
                                                      <MapPin size={16} /> Localização
                                                  </h4>
                                                  <div className="space-y-1">
                                                      <label className="text-xs font-medium text-slate-500">Bairros de Interesse (Selecione ou digite)</label>
                                                      <div className="flex flex-wrap gap-2 mb-2">
                                                          {systemSettings.availableLocations.map(loc => (
                                                              <button 
                                                                key={loc} 
                                                                onClick={() => toggleProfileList('neighborhoods', loc)}
                                                                className={`px-2 py-1 text-xs border rounded ${profileData.neighborhoods.includes(loc) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600'}`}
                                                              >
                                                                  {loc}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  </div>
                                              </div>

                                              {/* 4. Financeiro */}
                                              <div className="space-y-3">
                                                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
                                                      <DollarSign size={16} /> Financeiro
                                                  </h4>
                                                  <div className="grid grid-cols-2 gap-4">
                                                      <Input label="Valor Máximo (Teto)" type="number" value={profileData.maxPrice} onChange={e => setProfileData({...profileData, maxPrice: Number(e.target.value)})} />
                                                      <div className="space-y-1">
                                                          <label className="text-xs font-medium text-slate-500">Forma de Pagamento</label>
                                                          <select 
                                                            className="w-full border rounded px-2 py-1 text-sm"
                                                            value={profileData.paymentMethod}
                                                            onChange={e => setProfileData({...profileData, paymentMethod: e.target.value as any})}
                                                          >
                                                              <option value="vista">À Vista</option>
                                                              <option value="financiamento">Financiamento</option>
                                                              <option value="permuta">Permuta</option>
                                                              <option value="indiferente">Indiferente</option>
                                                          </select>
                                                      </div>
                                                  </div>
                                                  <label className="flex items-center gap-2 text-sm text-slate-700">
                                                      <input type="checkbox" checked={profileData.hasFgts} onChange={e => setProfileData({...profileData, hasFgts: e.target.checked})} />
                                                      Pretende usar FGTS?
                                                  </label>
                                              </div>

                                              {/* 5. Lifestyle */}
                                              <div className="space-y-3">
                                                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
                                                      <Compass size={16} /> Estilo de Vida
                                                  </h4>
                                                  <div className="grid grid-cols-2 gap-4">
                                                      <div className="space-y-1">
                                                          <label className="text-xs font-medium text-slate-500">Sol / Orientação</label>
                                                          <select 
                                                            className="w-full border rounded px-2 py-1 text-sm"
                                                            value={profileData.sunOrientation}
                                                            onChange={e => setProfileData({...profileData, sunOrientation: e.target.value as any})}
                                                          >
                                                              <option value="indiferente">Indiferente</option>
                                                              <option value="norte">Sol da Manhã (Norte/Leste)</option>
                                                              <option value="oeste">Sol da Tarde (Oeste)</option>
                                                          </select>
                                                      </div>
                                                      <div className="space-y-1">
                                                          <label className="text-xs font-medium text-slate-500">Andar Preferido</label>
                                                          <select 
                                                            className="w-full border rounded px-2 py-1 text-sm"
                                                            value={profileData.floorPreference}
                                                            onChange={e => setProfileData({...profileData, floorPreference: e.target.value as any})}
                                                          >
                                                              <option value="indiferente">Indiferente</option>
                                                              <option value="baixo">Baixo</option>
                                                              <option value="alto">Alto (Vista)</option>
                                                          </select>
                                                      </div>
                                                  </div>
                                                  <div className="space-y-1">
                                                      <label className="text-xs font-medium text-slate-500">Observações Gerais (Sonho de consumo)</label>
                                                      <textarea 
                                                        className="w-full border rounded p-2 text-sm h-20" 
                                                        placeholder="Ex: Cliente tem um Golden Retriever, precisa de área verde próxima. Odeia barulho de rua."
                                                        value={profileData.notes}
                                                        onChange={e => setProfileData({...profileData, notes: e.target.value})}
                                                      />
                                                  </div>
                                              </div>

                                              <div className="flex justify-end gap-2 pt-4 border-t">
                                                  <Button variant="outline" onClick={() => setIsEditingProfile(false)}>Cancelar</Button>
                                                  <Button onClick={handleSaveProfile}>Salvar Perfil</Button>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="p-6">
                                              {/* Read-Only Summary View */}
                                              {(!profileData.propertyTypes.length && !profileData.neighborhoods.length && !profileData.maxPrice) ? (
                                                  <div className="text-center py-6 text-slate-400">
                                                      <p className="mb-4">Perfil não configurado.</p>
                                                      <Button onClick={() => setIsEditingProfile(true)}>Criar Perfil Agora</Button>
                                                  </div>
                                              ) : (
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                                      <div>
                                                          <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">O que busca</h5>
                                                          <div className="flex flex-wrap gap-1 mb-2">
                                                              {profileData.propertyTypes.map(t => <Badge key={t} color="blue">{t}</Badge>)}
                                                          </div>
                                                          <p className="text-sm text-slate-700">
                                                              <span className="font-semibold">Finalidade:</span> {profileData.usage} <br/>
                                                              <span className="font-semibold">Estágio:</span> {profileData.condition}
                                                          </p>
                                                      </div>
                                                      
                                                      <div>
                                                          <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Localização</h5>
                                                          <p className="text-sm text-slate-700">{profileData.neighborhoods.join(', ') || 'Não especificado'}</p>
                                                      </div>

                                                      <div>
                                                          <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Requisitos Mínimos</h5>
                                                          <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                                                              <span>🛏️ {profileData.minBedrooms} Quartos</span>
                                                              <span>🚿 {profileData.minSuites} Suítes</span>
                                                              <span>🚗 {profileData.minParking} Vagas</span>
                                                              <span>📐 {profileData.minArea}m²</span>
                                                          </div>
                                                          {profileData.mustHaveFeatures.length > 0 && (
                                                              <div className="mt-2 text-xs text-slate-500">
                                                                  <span className="font-semibold">Indispensável:</span> {profileData.mustHaveFeatures.join(', ')}
                                                              </div>
                                                          )}
                                                      </div>

                                                      <div>
                                                          <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Financeiro & Estilo</h5>
                                                          <p className="text-sm text-slate-700 mb-1">
                                                              <span className="font-semibold">Teto:</span> {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(profileData.maxPrice)}
                                                          </p>
                                                          <p className="text-xs text-slate-500">
                                                              Pagamento: {profileData.paymentMethod} {profileData.hasFgts ? '(FGTS)' : ''}
                                                          </p>
                                                          {profileData.notes && (
                                                              <div className="mt-3 bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-100 italic">
                                                                  "{profileData.notes}"
                                                              </div>
                                                          )}
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                  </div>
                                </>
                            )}

                            {mainTab === 'properties' && renderPropertiesContent()}

                            {mainTab === 'actions' && renderActionsContent()}

                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

export const LeadsPage: React.FC = () => {
  const { clients, addClient, currentUser, removeClient, users, systemSettings, pipelines } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Editing State
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // --- REFACTOR: New Detailed State for Create Form (Matches CRM Page) ---
  const initialProfileState = {
      name: '', email: '', phone: '', source: 'Manual / Balcão' as LeadSource, ownerId: '',
      interestProfile: {
        propertyTypes: [] as string[],
        condition: 'indiferente' as any,
        usage: 'moradia' as any,
        cities: [] as string[],
        neighborhoods: [] as string[],
        proximityTo: [] as string[],
        minBedrooms: 0,
        minSuites: 0,
        minParking: 0,
        minArea: 0,
        mustHaveFeatures: [] as string[],
        maxPrice: 0,
        paymentMethod: 'vista' as any,
        hasFgts: false,
        sunOrientation: 'indiferente' as any,
        floorPreference: 'indiferente' as any,
        notes: ''
      }
  };
  const [formData, setFormData] = useState(initialProfileState);

  // Local helper for array toggles
  const toggleProfileList = (field: keyof DetailedInterestProfile, value: string) => {
      setFormData(prev => {
          const list = prev.interestProfile[field] as string[];
          const newList = list.includes(value) ? list.filter(i => i !== value) : [...list, value];
          return { ...prev, interestProfile: { ...prev.interestProfile, [field]: newList } };
      });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, phone: formatPhone(e.target.value) });
  };

  // --- PERMISSIONS LOGIC ---
  const isStaff = ['admin', 'finance', 'employee'].includes(currentUser?.role || '');
  
  const visibleClients = clients
    .filter(c => {
        if (isStaff) return true; // Staff sees everything
        return c.ownerId === currentUser?.id; // Broker sees only theirs
    })
    .filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

  const openAddModal = () => {
      setFormData({
          ...initialProfileState,
          ownerId: currentUser?.id || ''
      });
      setIsAddModalOpen(true);
  }

  const openEditModal = (client: Client) => {
      setEditingClientId(client.id);
      setIsEditModalOpen(true);
  }

  // --- NEW Render Form Content (Detailed) ---
  const renderLeadForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => {
      const profile = formData.interestProfile;
      const setProfileField = (field: keyof DetailedInterestProfile, value: any) => {
          setFormData(prev => ({
              ...prev,
              interestProfile: { ...prev.interestProfile, [field]: value }
          }));
      };

      return (
      <form onSubmit={onSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                  <User size={16} className="text-primary-500" /> Dados Básicos
              </h3>
              
              {isStaff && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                        <label className="text-sm font-medium text-blue-800 mb-1 block flex items-center gap-2">
                            <User size={16} /> Corretor Responsável
                        </label>
                        <select 
                            className="w-full px-4 py-2 rounded-lg border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500/20"
                            value={formData.ownerId}
                            onChange={e => setFormData({...formData, ownerId: e.target.value})}
                        >
                            <option value="">Selecione um corretor...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.role === 'broker' ? 'Corretor' : 'Staff'})
                                </option>
                            ))}
                        </select>
                    </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Nome" 
                    required 
                    placeholder="Ex: Roger Silva" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                  <PhoneInput 
                    label="Telefone" 
                    value={formData.phone}
                    onChange={handlePhoneChange}
                  />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="E-mail" 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                   <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Origem</label>
                        <select className="w-full px-4 py-2 rounded-lg border border-slate-200" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value as LeadSource})}>
                            {systemSettings.leadSources.map((source, idx) => (<option key={idx} value={source}>{source}</option>))}
                        </select>
                    </div>
              </div>
          </div>

          {/* 1. Imóvel */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
                    <Building size={16} /> O que busca?
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Tipos de Imóvel</label>
                        <div className="flex flex-wrap gap-2">
                            {systemSettings.propertyTypes.map(t => (
                                <button 
                                key={t.value} 
                                type="button"
                                onClick={() => toggleProfileList('propertyTypes', t.value)}
                                className={`px-2 py-1 text-xs border rounded ${profile.propertyTypes.includes(t.value) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Condição / Estágio</label>
                        <select 
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={profile.condition}
                        onChange={e => setProfileField('condition', e.target.value)}
                        >
                            <option value="indiferente">Indiferente</option>
                            <option value="pronto">Pronto para Morar</option>
                            <option value="planta">Na Planta</option>
                            <option value="construcao">Em Construção</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 2. Características */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
                    <Layers size={16} /> Características Mínimas
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input label="Quartos" type="number" value={profile.minBedrooms} onChange={e => setProfileField('minBedrooms', Number(e.target.value))} />
                    <Input label="Suítes" type="number" value={profile.minSuites} onChange={e => setProfileField('minSuites', Number(e.target.value))} />
                    <Input label="Vagas" type="number" value={profile.minParking} onChange={e => setProfileField('minParking', Number(e.target.value))} />
                    <Input label="Área Útil (m²)" type="number" value={profile.minArea} onChange={e => setProfileField('minArea', Number(e.target.value))} />
                </div>
            </div>

            {/* 3. Localização */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
                    <MapPin size={16} /> Localização
                </h4>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Bairros de Interesse</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {systemSettings.availableLocations.map(loc => (
                            <button 
                            key={loc} 
                            type="button"
                            onClick={() => toggleProfileList('neighborhoods', loc)}
                            className={`px-2 py-1 text-xs border rounded ${profile.neighborhoods.includes(loc) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600'}`}
                            >
                                {loc}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Financeiro */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
                    <DollarSign size={16} /> Financeiro
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Valor Máximo (Teto)" type="number" value={profile.maxPrice} onChange={e => setProfileField('maxPrice', Number(e.target.value))} />
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Forma de Pagamento</label>
                        <select 
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={profile.paymentMethod}
                        onChange={e => setProfileField('paymentMethod', e.target.value)}
                        >
                            <option value="vista">À Vista</option>
                            <option value="financiamento">Financiamento</option>
                            <option value="permuta">Permuta</option>
                            <option value="indiferente">Indiferente</option>
                        </select>
                    </div>
                </div>
            </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="gap-2"><Save size={18} /> {submitLabel}</Button>
          </div>
      </form>
  )};

  const handleAddLead = (e: React.FormEvent) => {
      e.preventDefault();
      
      const profile = formData.interestProfile;
      let finalOwnerId = currentUser?.id;
      if (isStaff && formData.ownerId) {
          finalOwnerId = formData.ownerId;
      }

      addClient({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          source: formData.source,
          stage: 'new',
          
          // Sync root fields
          budget: profile.maxPrice,
          interest: profile.propertyTypes.length > 0 ? profile.propertyTypes : ['apartamento'],
          desiredLocation: profile.neighborhoods,
          minBedrooms: profile.minBedrooms,
          minParking: profile.minParking,
          minArea: profile.minArea,
          desiredFeatures: profile.mustHaveFeatures,
          notes: profile.notes,
          
          // New Profile
          interestProfile: profile
      }, finalOwnerId);

      setIsAddModalOpen(false);
      setFormData(initialProfileState);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Base de Leads</h1>
            <p className="text-slate-500">
                {isStaff 
                    ? 'Visão geral de todos os leads e seus responsáveis.' 
                    : 'Gerencie sua carteira de clientes.'}
            </p>
        </div>
        <Button onClick={openAddModal}>
            <Plus size={20} /> Novo Lead
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Buscar por nome, email ou telefone..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
      </Card>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">Nome</th>
                        {isStaff && <th className="px-6 py-4">Responsável</th>}
                        <th className="px-6 py-4">Contato</th>
                        <th className="px-6 py-4">Pipeline</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {visibleClients.length === 0 ? (
                        <tr>
                            <td colSpan={isStaff ? 5 : 4} className="px-6 py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                    <UserPlus size={32} className="opacity-50" />
                                    <p>Nenhum lead encontrado.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        visibleClients.map(client => {
                            const owner = users.find(u => u.id === client.ownerId);
                            const activePipeline = pipelines.find(p => p.id === client.pipelineId);
                            
                            return (
                                <tr key={client.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => openEditModal(client)}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{client.name}</div>
                                        <div className="text-xs text-slate-400">
                                            {new Date(client.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    {isStaff && (
                                        <td className="px-6 py-4">
                                            {owner ? (
                                                <div className="flex items-center gap-2">
                                                    <img src={owner.avatar} className="w-5 h-5 rounded-full" alt="" />
                                                    <span className="text-xs font-medium text-slate-700">{owner.name}</span>
                                                </div>
                                            ) : <span className="text-xs text-red-400">Sem Dono</span>}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-slate-400 shrink-0"/> <span className="truncate max-w-[150px]">{client.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-slate-400 shrink-0"/> {client.phone}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {activePipeline ? (
                                            <Badge color="green">{activePipeline.name}</Badge>
                                        ) : (
                                            <Badge color="gray">Sem Pipeline</Badge>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => { if(window.confirm('Excluir este lead permanentemente?')) removeClient(client.id); }}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash size={16} />
                                            </button>
                                            <button 
                                                onClick={() => openEditModal(client)}
                                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                                title="Abrir Detalhes"
                                            >
                                                <ArrowUpRight size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {/* Add Lead Modal (Detailed) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-