import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Card, Button, Input, Badge, PhoneInput, formatPhone } from '../components/ui/Elements';
import { Plus, Search, Mail, Phone, MapPin, UserPlus, Filter, ArrowRight, Edit3, Save, X, FileText, User, Trash, Check, Loader2, History, Calendar, LayoutList, Clock, ArrowUpRight, Briefcase, Building, MessageCircle, CalendarPlus, FolderOpen, Users, Star, Smile, Share2, Activity, MessageSquare, Home, Link, ExternalLink, Send, Sparkles, DollarSign, Compass, Layers, Bed, Ruler } from 'lucide-react';
import { Client, LeadSource, PropertyType, LogEntry, Visit, Property, DetailedInterestProfile } from '../types';
import { searchCep } from '../services/viaCep';

// --- Lead Detail Component (The "360 View") ---
const LeadDetailModal = ({ clientId, onClose, onSwitchClient }: { clientId: string, onClose: () => void, onSwitchClient?: (id: string) => void }) => {
    const { clients, updateClient, addFamilyMember, users, pipelines, logs, properties, addNotification, systemSettings } = useStore();
    const client = clients.find(c => c.id === clientId);
    
    // New Detailed View States
    const [mainTab, setMainTab] = useState<'history' | 'properties' | 'actions'>('history');
    
    // Family Form State
    const [showFamilyForm, setShowFamilyForm] = useState(false);
    const [familyForm, setFamilyForm] = useState({ name: '', relationship: 'Cônjuge', phone: '', email: '' });

    // Interest Profile State
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
                    propertyTypes: client.interest || [],
                    maxPrice: client.budget || 0,
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

    const renderHistoryContent = () => (
        <div className="space-y-8">
            {/* Visits Section */}
            <div>
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Calendar size={18} className="text-primary-600"/> Visitas
                </h4>
                {clientVisits.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm bg-slate-50">
                        <Calendar size={32} className="mx-auto mb-2 opacity-50"/>
                        Nenhuma visita registrada para este cliente.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {clientVisits.map(visit => {
                            const prop = properties.find(p => p.id === visit.propertyId);
                            return (
                                <div key={visit.id} className="flex gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className={`flex flex-col items-center justify-center rounded-lg min-w-[60px] h-16 ${visit.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                        <span className="text-xs font-bold uppercase">{new Date(visit.date).toLocaleDateString('pt-BR', {month: 'short'})}</span>
                                        <span className="text-xl font-bold">{new Date(visit.date).getDate()}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h5 className="font-bold text-slate-800">{prop?.title || 'Imóvel Desconhecido'}</h5>
                                            <Badge color={visit.status === 'completed' ? 'green' : visit.status === 'cancelled' ? 'red' : 'blue'}>
                                                {visit.status === 'scheduled' ? 'Agendada' : visit.status === 'completed' ? 'Realizada' : 'Cancelada'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Clock size={12}/> {new Date(visit.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • Ref: {prop?.code}</p>
                                        {visit.notes && <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-100">Obs: "{visit.notes}"</p>}
                                        {visit.feedback && (
                                            <div className="mt-2 text-xs text-slate-500 border-l-2 border-green-300 pl-2">
                                                <strong>Feedback:</strong> {visit.feedback}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* System Logs */}
            <div>
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <History size={18} className="text-primary-600"/> Histórico de Atividades
                </h4>
                <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
                    {clientLogs.length === 0 && <p className="text-sm text-slate-400 pl-4">Sem histórico registrado.</p>}
                    {clientLogs.map(log => (
                        <div key={log.id} className="relative pl-4">
                            <div className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-white ${log.action === 'create' ? 'bg-green-500' : log.action === 'delete' ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                            <p className="text-sm font-medium text-slate-800">{log.details}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                                <span>•</span>
                                <span>{log.userName}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderPropertiesContent = () => (
        <div className="space-y-8">
            {/* Properties linked explicitly */}
            <div>
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Link size={18} className="text-indigo-600"/> Imóveis de Interesse (Vinculados)
                </h4>
                {linkedProperties.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm bg-slate-50">
                        Nenhum imóvel vinculado manualmente.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {linkedProperties.map(p => (
                            <div key={p.id} className="flex gap-4 p-3 bg-white border border-indigo-100 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                                <img src={p.images[0] || 'https://via.placeholder.com/150'} className="w-24 h-24 object-cover rounded-lg" alt=""/>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <h5 className="font-bold text-slate-800 line-clamp-1">{p.title}</h5>
                                        <button onClick={() => handleToggleLinkProperty(p.id)} className="text-slate-300 hover:text-red-500 p-1"><X size={16}/></button>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-2 font-medium">{p.code} • <span className="text-green-600">{new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(p.price)}</span></p>
                                    <div className="flex gap-2">
                                        <span className="text-xs bg-slate-100 px-2 py-1 rounded flex items-center gap-1 text-slate-600"><Bed size={12}/> {p.bedrooms}</span>
                                        <span className="text-xs bg-slate-100 px-2 py-1 rounded flex items-center gap-1 text-slate-600"><Ruler size={12}/> {p.area}m²</span>
                                        <span className="text-xs bg-slate-100 px-2 py-1 rounded flex items-center gap-1 text-slate-600"><MapPin size={12}/> {p.neighborhood}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* AI Recommendations */}
            <div>
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Sparkles size={18} className="text-amber-500"/> Sugestões Inteligentes (Match)
                </h4>
                {recommendedProperties.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhuma sugestão automática baseada no perfil atual.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {recommendedProperties.map(p => (
                            <div key={p.id} className="flex gap-4 p-3 bg-white border border-slate-200 rounded-xl hover:border-amber-300 transition-colors">
                                <img src={p.images[0] || 'https://via.placeholder.com/150'} className="w-24 h-24 object-cover rounded-lg" alt=""/>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <h5 className="font-bold text-slate-800 line-clamp-1">{p.title}</h5>
                                        <button onClick={() => handleToggleLinkProperty(p.id)} className="text-indigo-600 hover:text-white hover:bg-indigo-600 text-xs font-bold border border-indigo-200 px-3 py-1 rounded transition-all">
                                            Vincular
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-2 font-medium">{p.code} • {new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(p.price)}</p>
                                    <p className="text-xs text-slate-400 line-clamp-1 flex items-center gap-1"><MapPin size={12}/> {p.address}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderActionsContent = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => handleQuickAction('whatsapp')} className="flex flex-col items-center justify-center gap-3 p-6 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-all border border-green-200 hover:-translate-y-1 shadow-sm">
                    <MessageCircle size={32} />
                    <span className="font-bold">WhatsApp</span>
                </button>
                <button onClick={() => handleQuickAction('email')} className="flex flex-col items-center justify-center gap-3 p-6 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all border border-blue-200 hover:-translate-y-1 shadow-sm">
                    <Mail size={32} />
                    <span className="font-bold">E-mail</span>
                </button>
                <button onClick={() => handleQuickAction('call')} className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 hover:-translate-y-1 shadow-sm">
                    <Phone size={32} />
                    <span className="font-bold">Ligar</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-3 p-6 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all border border-purple-200 hover:-translate-y-1 shadow-sm cursor-not-allowed opacity-60">
                    <Share2 size={32} />
                    <span className="font-bold">Compartilhar</span>
                </button>
            </div>

            <div className="p-6 bg-slate-100 rounded-xl border border-slate-200 text-center">
                <h4 className="font-bold text-slate-700 mb-2">Área do Cliente (Em breve)</h4>
                <p className="text-sm text-slate-500 mb-4">Envie um link para o cliente acessar seus imóveis favoritos e status.</p>
                <Button variant="outline" disabled className="w-full justify-center">Gerar Link de Acesso</Button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-200/50 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto pt-4 pb-4">
            <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden min-h-[90vh] flex flex-col relative animate-in fade-in zoom-in duration-200">
               {/* ... Top Bar ... */} 
               <div className="bg-white border-b border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-xl">
                            {client.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {client.name}
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
                    
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 bg-slate-50/50">
                    {/* LEFT COLUMN: Static Data */}
                    <div className="w-full md:w-1/3 border-r border-slate-200 bg-white p-6 overflow-y-auto">
                        {/* Personal Data Form */}
                        <section className="mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800">Dados da Pessoa</h3>
                                <button onClick={handleSave} className="text-primary-600 hover:text-primary-700 text-xs font-semibold flex items-center gap-1">
                                    {isSaving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12} />} Salvar
                                </button>
                            </div>
                            <div className="space-y-5"> {/* Increased Spacing */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</label>
                                    <input 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1.5 text-sm font-medium text-slate-700 bg-transparent transition-colors"
                                        value={localData.firstName}
                                        onChange={e => setLocalData({...localData, firstName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sobrenome</label>
                                    <input 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1.5 text-sm font-medium text-slate-700 bg-transparent transition-colors"
                                        value={localData.lastName}
                                        onChange={e => setLocalData({...localData, lastName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">E-mail</label>
                                    <input 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1.5 text-sm text-slate-700 bg-transparent transition-colors"
                                        value={localData.email}
                                        onChange={e => setLocalData({...localData, email: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Telefone</label>
                                    <input 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1.5 text-sm text-slate-700 bg-transparent transition-colors"
                                        value={localData.phone}
                                        onChange={e => setLocalData({...localData, phone: formatPhone(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</label>
                                    <select 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1.5 text-sm text-slate-700 bg-transparent cursor-pointer"
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
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Origem</label>
                                    <select 
                                        className="w-full border-b border-slate-200 focus:border-primary-500 outline-none py-1.5 text-sm text-slate-700 bg-transparent cursor-pointer"
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
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800">Familiares</h3>
                                <button onClick={() => setShowFamilyForm(!showFamilyForm)} className="text-primary-600 hover:text-primary-700 text-xs font-semibold flex items-center gap-1">
                                    <Plus size={12} /> Adicionar
                                </button>
                            </div>
                            
                            {showFamilyForm && (
                                <div className="bg-slate-50 p-3 rounded-lg mb-3 border border-slate-200 animate-in slide-in-from-top-2">
                                    <input placeholder="Nome" className="w-full mb-2 text-sm p-1 border rounded" value={familyForm.name} onChange={e => setFamilyForm({...familyForm, name: e.target.value})} />
                                    <div className="flex gap-2 mb-2">
                                        <input placeholder="Parentesco" className="w-1/2 text-sm p-1 border rounded" value={familyForm.relationship} onChange={e => setFamilyForm({...familyForm, relationship: e.target.value})} />
                                        <input placeholder="Tel" className="w-1/2 text-sm p-1 border rounded" value={familyForm.phone} onChange={e => setFamilyForm({...familyForm, phone: formatPhone(e.target.value)})} />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setShowFamilyForm(false)} className="text-xs text-slate-500">Cancelar</button>
                                        <button onClick={handleAddFamily} className="text-xs bg-primary-600 text-white px-2 py-1 rounded">Salvar</button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {client.familyMembers && client.familyMembers.length > 0 ? (
                                    client.familyMembers.map((member, idx) => (
                                        <div key={idx} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">{member.name}</p>
                                                    <p className="text-xs text-slate-500">{member.relationship}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => onSwitchClient && onSwitchClient(member.id)}
                                                className="text-primary-600 hover:bg-primary-50 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all" 
                                                title="Ver perfil"
                                            >
                                                <ArrowUpRight size={14} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Nenhum familiar cadastrado.</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Dynamic Content */}
                    <div className="w-full md:w-2/3 bg-slate-50 p-6 overflow-y-auto">
                        <div className="mb-6 flex gap-6 border-b border-slate-200">
                            <button onClick={() => setMainTab('history')} className={`pb-3 border-b-2 font-semibold text-sm transition-colors ${mainTab === 'history' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Histórico e Atividades</button>
                            <button onClick={() => setMainTab('properties')} className={`pb-3 border-b-2 font-semibold text-sm transition-colors ${mainTab === 'properties' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Imóveis e Match</button>
                            <button onClick={() => setMainTab('actions')} className={`pb-3 border-b-2 font-semibold text-sm transition-colors ${mainTab === 'actions' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Ações Rápidas</button>
                        </div>
                        
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {mainTab === 'history' && renderHistoryContent()}
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
  
  // Local state for adding location in the modal
  const [locationInput, setLocationInput] = useState('');
  const [cepSearchInput, setCepSearchInput] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);
  
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

  const handleAddLocation = () => {
      if(!locationInput.trim()) return;
      if(!formData.interestProfile.neighborhoods.includes(locationInput.trim())) {
          setFormData(prev => ({ 
              ...prev, 
              interestProfile: {
                  ...prev.interestProfile,
                  neighborhoods: [...prev.interestProfile.neighborhoods, locationInput.trim()]
              }
          }));
      }
      setLocationInput('');
  };

  const handleCepSearch = async () => {
      if(cepSearchInput.length < 8) return;
      setIsCepLoading(true);
      const data = await searchCep(cepSearchInput);
      setIsCepLoading(false);
      
      if(data) {
          const locString = `${data.localidade} - ${data.bairro}`;
          setLocationInput(locString);
          setCepSearchInput('');
      } else {
          console.log('CEP not found');
      }
  }

  const removeLocation = (loc: string) => {
      setFormData(prev => ({ 
          ...prev, 
          interestProfile: {
              ...prev.interestProfile,
              neighborhoods: prev.interestProfile.neighborhoods.filter(l => l !== loc)
          }
      }));
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

  // --- ADDED: Handle Add Lead Function ---
  const handleAddLead = (e: React.FormEvent) => {
      e.preventDefault();
      
      const profile = formData.interestProfile;
      let finalOwnerId = currentUser?.id;
      
      if (isStaff && formData.ownerId) {
          finalOwnerId = formData.ownerId;
      }

      const success = addClient({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          pipelineId: undefined,
          stage: 'new',
          source: formData.source,
          
          // Sync root fields
          budget: profile.maxPrice,
          minBudget: 0,
          interest: profile.propertyTypes.length > 0 ? profile.propertyTypes : ['apartamento'],
          desiredLocation: profile.neighborhoods,
          minBedrooms: profile.minBedrooms,
          minParking: profile.minParking,
          minArea: profile.minArea,
          desiredFeatures: profile.mustHaveFeatures,
          notes: profile.notes,
          
          interestProfile: profile,
          interestedPropertyIds: [],
          familyMembers: [],
          documents: [],
          followers: []
      }, finalOwnerId);

      if (success) {
          setIsAddModalOpen(false);
          setFormData({
              ...initialProfileState,
              ownerId: currentUser?.id || ''
          });
      }
  }

  // --- NEW Render Form Content (Detailed - Matches CRM Page) ---
  const renderLeadForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => {
      const profile = formData.interestProfile;
      const setProfileField = (field: keyof DetailedInterestProfile, value: any) => {
          setFormData(prev => ({
              ...prev,
              interestProfile: { ...prev.interestProfile, [field]: value }
          }));
      };

      return (
      <form onSubmit={onSubmit} className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <User size={16} /> Dados Pessoais
              </h3>
              
              {isStaff && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-2">
                        <label className="text-sm font-medium text-blue-800 mb-2 block flex items-center gap-2">
                            <User size={16} /> Corretor Responsável
                        </label>
                        <select 
                            className="w-full px-4 py-2.5 rounded-lg border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500/20 bg-white"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input 
                    label="Nome Completo" 
                    required 
                    placeholder="Ex: Roger Silva" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                  <PhoneInput 
                    label="Telefone / Celular" 
                    value={formData.phone}
                    onChange={handlePhoneChange}
                  />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input 
                    label="E-mail Principal" 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                   <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Origem do Lead</label>
                        <select className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value as LeadSource})}>
                            {systemSettings.leadSources.map((source, idx) => (<option key={idx} value={source}>{source}</option>))}
                        </select>
                    </div>
              </div>
          </div>

          {/* 1. Imóvel */}
            <div className="space-y-5">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                    <Building size={16} /> Preferências do Imóvel
                </h4>
                <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Tipos de Imóvel</label>
                        <div className="flex flex-wrap gap-2">
                            {systemSettings.propertyTypes.map(t => (
                                <button 
                                key={t.value} 
                                type="button"
                                onClick={() => toggleProfileList('propertyTypes', t.value)}
                                className={`px-3 py-1.5 text-sm border rounded-lg transition-all ${profile.propertyTypes.includes(t.value) ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Condição / Estágio</label>
                            <select 
                            className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white"
                            value={profile.condition}
                            onChange={e => setProfileField('condition', e.target.value)}
                            >
                                <option value="indiferente">Indiferente</option>
                                <option value="pronto">Pronto para Morar</option>
                                <option value="planta">Na Planta</option>
                                <option value="construcao">Em Construção</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Finalidade</label>
                            <select 
                            className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white"
                            value={profile.usage}
                            onChange={e => setProfileField('usage', e.target.value)}
                            >
                                <option value="moradia">Moradia</option>
                                <option value="investimento">Investimento</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Características */}
            <div className="space-y-5">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                    <Layers size={16} /> Características e Comodidades
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input label="Mín. Quartos" type="number" value={profile.minBedrooms} onChange={e => setProfileField('minBedrooms', Number(e.target.value))} />
                    <Input label="Mín. Suítes" type="number" value={profile.minSuites} onChange={e => setProfileField('minSuites', Number(e.target.value))} />
                    <Input label="Mín. Vagas" type="number" value={profile.minParking} onChange={e => setProfileField('minParking', Number(e.target.value))} />
                    <Input label="Área Útil (m²)" type="number" value={profile.minArea} onChange={e => setProfileField('minArea', Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Diferenciais Obrigatórios (Tags)</label>
                    <div className="flex flex-wrap gap-2">
                        {systemSettings.propertyFeatures.map(f => (
                            <button 
                            key={f} 
                            type="button"
                            onClick={() => toggleProfileList('mustHaveFeatures', f)}
                            className={`px-3 py-1.5 text-xs border rounded-full transition-all ${profile.mustHaveFeatures.includes(f) ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Localização */}
            <div className="space-y-5">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                    <MapPin size={16} /> Localização Desejada
                </h4>
                <div className="space-y-3">
                    <div className="flex flex-col md:flex-row justify-between gap-2">
                        <label className="text-sm font-medium text-slate-700 pt-2">Bairros de Interesse</label>
                        <div className="flex items-center gap-2">
                            <input placeholder="Busca por CEP" className="w-32 px-3 py-1.5 text-xs border border-slate-200 rounded-lg" value={cepSearchInput} onChange={(e) => setCepSearchInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleCepSearch(); } }} />
                            <button type="button" onClick={handleCepSearch} disabled={isCepLoading} className="text-slate-500 hover:text-primary-600 p-1 bg-slate-100 rounded">{isCepLoading ? <Loader2 size={14} className="animate-spin"/> : <Search size={14} />}</button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input type="text" list="location-suggestions" placeholder="Digite um bairro..." className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/20" value={locationInput} onChange={e => setLocationInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddLocation(); }}} />
                        <datalist id="location-suggestions">{systemSettings.availableLocations.map((loc, idx) => (<option key={idx} value={loc} />))}</datalist>
                        <Button type="button" variant="secondary" className="px-4 py-2" onClick={handleAddLocation}><Plus size={16} /></Button>
                    </div>
                    {profile.neighborhoods.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            {profile.neighborhoods.map((loc, idx) => (<span key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded bg-white text-indigo-700 text-sm border border-indigo-100 shadow-sm font-medium">{loc}<button type="button" onClick={() => removeLocation(loc)} className="hover:text-red-500 transition-colors"><X size={14}/></button></span>))}
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Financeiro */}
            <div className="space-y-5">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                    <DollarSign size={16} /> Financeiro
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Valor Máximo (Teto)" type="number" value={profile.maxPrice} onChange={e => setProfileField('maxPrice', Number(e.target.value))} />
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Forma de Pagamento</label>
                        <select 
                        className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white"
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
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <input type="checkbox" id="fgts-check" className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500" checked={profile.hasFgts} onChange={e => setProfileField('hasFgts', e.target.checked)} />
                    <label htmlFor="fgts-check" className="text-sm text-slate-700 font-medium cursor-pointer">Pretende utilizar FGTS na compra?</label>
                </div>
            </div>

            {/* 5. Lifestyle */}
            <div className="space-y-5">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                    <Compass size={16} /> Estilo de Vida e Observações
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Sol / Orientação</label>
                        <select 
                        className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white"
                        value={profile.sunOrientation}
                        onChange={e => setProfileField('sunOrientation', e.target.value)}
                        >
                            <option value="indiferente">Indiferente</option>
                            <option value="norte">Sol da Manhã (Norte/Leste)</option>
                            <option value="oeste">Sol da Tarde (Oeste)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Andar Preferido</label>
                        <select 
                        className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white"
                        value={profile.floorPreference}
                        onChange={e => setProfileField('floorPreference', e.target.value)}
                        >
                            <option value="indiferente">Indiferente</option>
                            <option value="baixo">Baixo</option>
                            <option value="alto">Alto (Vista)</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Observações Gerais (Sonho de Consumo)</label>
                    <textarea 
                    className="w-full border rounded-lg p-3 text-sm h-24 focus:ring-2 focus:ring-primary-500/20 outline-none" 
                    placeholder="Ex: Cliente tem um Golden Retriever, precisa de área verde próxima. Odeia barulho de rua..."
                    value={profile.notes}
                    onChange={e => setProfileField('notes', e.target.value)}
                    />
                </div>
            </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="gap-2 px-6"><Save size={18} /> {submitLabel}</Button>
          </div>
      </form>
  )};

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
          {/* ... Table Content (Keep unchanged) ... */}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800">Novo Lead</h2>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                </div>
                {renderLeadForm(handleAddLead, 'Cadastrar Lead')}
            </div>
        </div>
      )}

      {/* Lead Detail Modal (Replaces old edit modal) */}
      {isEditModalOpen && editingClientId && (
          <LeadDetailModal 
              clientId={editingClientId} 
              onClose={() => { setIsEditModalOpen(false); setEditingClientId(null); }} 
              onSwitchClient={(id) => setEditingClientId(id)}
          />
      )}
    </div>
  );
};