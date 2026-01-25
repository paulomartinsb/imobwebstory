import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Card, Input, Badge, Button, PhoneInput } from '../components/ui/Elements';
import { 
    Search, MessageCircle, Mail, Phone, Share2, 
    Trash2, X, Filter, User, Plus, Save, DollarSign, MapPin, Bed, Ruler,
    Bath, Car, Loader2, Edit3, Eye, Clock, FileText, CheckCircle, Calendar, Shield, Tag, Building
} from 'lucide-react';
import { Client, LeadSource, DetailedInterestProfile, LogEntry } from '../types';
import { searchCep } from '../services/viaCep';

export const LeadsPage: React.FC = () => {
    const { clients, currentUser, removeClient, addNotification, addClient, updateClient, systemSettings, pipelines, users, logs } = useStore();
    const [searchText, setSearchText] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null); // For Quick Actions
    const [viewClient, setViewClient] = useState<Client | null>(null); // For Detail Modal
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [filterSource, setFilterSource] = useState<string>('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Initial State for Detailed Form
    const initialFormState = {
        name: '',
        phone: '',
        email: '',
        source: 'Manual / Balcão' as LeadSource,
        ownerId: '',
        interestProfile: {
            propertyTypes: [] as string[],
            condition: 'indiferente',
            usage: 'moradia',
            cities: [] as string[],
            neighborhoods: [] as string[],
            proximityTo: [] as string[],
            minBedrooms: 0,
            minSuites: 0,
            minParking: 0,
            minArea: 0,
            mustHaveFeatures: [] as string[],
            maxPrice: 0,
            paymentMethod: 'vista',
            hasFgts: false,
            sunOrientation: 'indiferente',
            floorPreference: 'indiferente',
            notes: ''
        } as DetailedInterestProfile
    };

    const [newLeadData, setNewLeadData] = useState(initialFormState);
    const [locationInput, setLocationInput] = useState('');
    const [cepInput, setCepInput] = useState('');
    const [isCepLoading, setIsCepLoading] = useState(false);

    // Filtering
    const filteredClients = useMemo(() => {
        let result = clients;

        // Permission Filter
        if (currentUser?.role === 'broker') {
            result = result.filter(c => c.ownerId === currentUser.id);
        }

        // Search Filter
        if (searchText) {
            const lower = searchText.toLowerCase();
            result = result.filter(c => 
                c.name.toLowerCase().includes(lower) || 
                c.email.toLowerCase().includes(lower) || 
                c.phone.includes(lower)
            );
        }

        // Source Filter
        if (filterSource) {
            result = result.filter(c => c.source === filterSource);
        }

        // Sort by Newest
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [clients, searchText, filterSource, currentUser]);

    const handleQuickAction = (action: string) => {
        if (!selectedClient) return;
        
        const cleanPhone = selectedClient.phone.replace(/\D/g, '');

        switch(action) {
            case 'whatsapp':
                window.open(`https://wa.me/55${cleanPhone}`, '_blank');
                break;
            case 'email':
                window.location.href = `mailto:${selectedClient.email}`;
                break;
            case 'call':
                window.location.href = `tel:${selectedClient.phone}`;
                break;
            default:
                addNotification('info', 'Funcionalidade não disponível.');
        }
        setIsActionModalOpen(false);
    };

    const openActionModal = (client: Client) => {
        setSelectedClient(client);
        setIsActionModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este lead?')) {
            removeClient(id);
        }
    };

    const handleEditClick = (client: Client) => {
        setNewLeadData({
            name: client.name,
            phone: client.phone,
            email: client.email,
            source: client.source as LeadSource,
            ownerId: client.ownerId,
            interestProfile: client.interestProfile || {
                propertyTypes: client.interest || [],
                condition: 'indiferente',
                usage: 'moradia',
                cities: [],
                neighborhoods: client.desiredLocation || [],
                proximityTo: [],
                minBedrooms: client.minBedrooms || 0,
                minSuites: client.minBathrooms || 0, // Fallback mapping
                minParking: client.minParking || 0,
                minArea: client.minArea || 0,
                mustHaveFeatures: client.desiredFeatures || [],
                maxPrice: client.budget || 0,
                paymentMethod: 'vista',
                hasFgts: false,
                sunOrientation: 'indiferente',
                floorPreference: 'indiferente',
                notes: client.notes || ''
            }
        });
        setEditingId(client.id);
        setIsAddModalOpen(true);
    };

    const toggleProfileList = (field: keyof DetailedInterestProfile, value: string) => {
        setNewLeadData(prev => {
            const list = prev.interestProfile[field] as string[];
            const newList = list.includes(value) ? list.filter(i => i !== value) : [...list, value];
            return { ...prev, interestProfile: { ...prev.interestProfile, [field]: newList } };
        });
    };

    const addLocation = () => {
        if (locationInput.trim()) {
            toggleProfileList('neighborhoods', locationInput.trim());
            setLocationInput('');
        }
    }

    const removeLocation = (loc: string) => {
        setNewLeadData(prev => ({
            ...prev,
            interestProfile: {
                ...prev.interestProfile,
                neighborhoods: prev.interestProfile.neighborhoods.filter(l => l !== loc)
            }
        }));
    }

    const handleCepSearch = async () => {
        const cleanCep = cepInput.replace(/\D/g, '');
        if (cleanCep.length < 8) return;
        
        setIsCepLoading(true);
        const data = await searchCep(cleanCep);
        setIsCepLoading(false);
        
        if (data && !data.erro) {
            const loc = `${data.localidade} - ${data.bairro}`;
            // Add to neighborhoods list directly
            if(!newLeadData.interestProfile.neighborhoods.includes(loc)) {
                setNewLeadData(prev => ({
                    ...prev,
                    interestProfile: {
                        ...prev.interestProfile,
                        neighborhoods: [...prev.interestProfile.neighborhoods, loc]
                    }
                }));
            }
            addNotification('success', 'Localização adicionada!');
            setCepInput('');
        } else {
            addNotification('error', 'CEP não encontrado.');
        }
    };

    const handleSaveLead = (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload = {
            name: newLeadData.name,
            phone: newLeadData.phone,
            email: newLeadData.email,
            source: newLeadData.source,
            ownerId: newLeadData.ownerId || currentUser?.id || '',
            
            // Detailed Profile
            interestProfile: newLeadData.interestProfile,

            // Legacy/Root Fields Mapping (For table view & simple filters)
            budget: newLeadData.interestProfile.maxPrice || 0,
            interest: newLeadData.interestProfile.propertyTypes || [],
            desiredLocation: newLeadData.interestProfile.neighborhoods || [],
            minBedrooms: newLeadData.interestProfile.minBedrooms || 0,
            minBathrooms: newLeadData.interestProfile.minSuites || 0,
            minParking: newLeadData.interestProfile.minParking || 0,
            minArea: newLeadData.interestProfile.minArea || 0,
            desiredFeatures: newLeadData.interestProfile.mustHaveFeatures || [],
            notes: newLeadData.interestProfile.notes
        };

        if (editingId) {
            updateClient(editingId, payload);
            addNotification('success', 'Lead atualizado com sucesso!');
        } else {
            // Find default pipeline (first one)
            const defaultPipelineId = pipelines[0]?.id;
            const defaultStageId = pipelines[0]?.stages[0]?.id || 'new';

            addClient({
                ...payload,
                pipelineId: defaultPipelineId,
                stage: defaultStageId,
                interestedPropertyIds: [],
                familyMembers: [],
                documents: [],
                followers: []
            });
            addNotification('success', 'Lead cadastrado com sucesso!');
        }

        setIsAddModalOpen(false);
        setEditingId(null);
        setNewLeadData(initialFormState);
        setCepInput('');
    };

    const handleOpenAddModal = () => {
        setEditingId(null);
        setNewLeadData(initialFormState);
        setIsAddModalOpen(true);
    }

    // Helper for View Modal
    const getInterestLabel = (val: string) => systemSettings.propertyTypes.find(t => t.value === val)?.label || val;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Leads</h1>
                    <p className="text-slate-500">Gerencie todos os contatos cadastrados no sistema.</p>
                </div>
                <Button onClick={handleOpenAddModal}>
                    <Plus size={18} /> Novo Lead
                </Button>
            </div>

            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                        <Input 
                            placeholder="Buscar por nome, email ou telefone..." 
                            className="pl-10"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-64">
                         <div className="relative">
                            <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <select 
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500/20 outline-none text-slate-600 appearance-none"
                                value={filterSource}
                                onChange={(e) => setFilterSource(e.target.value)}
                            >
                                <option value="">Todas as Origens</option>
                                {systemSettings.leadSources.map((s, i) => (
                                    <option key={i} value={s}>{s}</option>
                                ))}
                            </select>
                         </div>
                    </div>
                </div>
            </Card>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Nome / Responsável</th>
                                <th className="px-6 py-4">Contato</th>
                                <th className="px-6 py-4">Origem</th>
                                <th className="px-6 py-4">Status / Pipeline</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredClients.map(client => {
                                const owner = users.find(u => u.id === client.ownerId);
                                return (
                                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800 flex items-center gap-2">
                                                <User size={16} className="text-slate-400" />
                                                {client.name}
                                            </div>
                                            
                                            <div className="text-xs text-slate-400 mt-1">
                                                Cadastrado em: {new Date(client.createdAt).toLocaleDateString()}
                                            </div>

                                            {/* OWNER VISUALIZATION FOR ADMINS/STAFF */}
                                            {owner && (currentUser?.role === 'admin' || currentUser?.role === 'finance' || currentUser?.role === 'employee') && (
                                                <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-indigo-600 bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-100">
                                                    <Shield size={10} />
                                                    {owner.name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-700">
                                                <Phone size={14} className="text-slate-400"/> {client.phone}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                                                <Mail size={14} className="text-slate-400"/> {client.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge color="blue">{client.source}</Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            {client.pipelineId ? (
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    No Pipeline
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full w-fit">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                                    Banco de Leads
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => setViewClient(client)}
                                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Visualizar Perfil e Histórico"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => openActionModal(client)}
                                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Contatar"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleEditClick(client)}
                                                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(client.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        Nenhum lead encontrado com os filtros atuais.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Action Modal */}
            {isActionModalOpen && selectedClient && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Contatar Lead</h3>
                                <p className="text-sm text-slate-500">{selectedClient.name}</p>
                            </div>
                            <button onClick={() => setIsActionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => handleQuickAction('whatsapp')} className="flex flex-col items-center justify-center gap-3 p-4 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-all border border-green-200 hover:-translate-y-1 shadow-sm">
                                    <MessageCircle size={28} />
                                    <span className="font-bold text-sm">WhatsApp</span>
                                </button>
                                <button onClick={() => handleQuickAction('email')} className="flex flex-col items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all border border-blue-200 hover:-translate-y-1 shadow-sm">
                                    <Mail size={28} />
                                    <span className="font-bold text-sm">E-mail</span>
                                </button>
                                <button onClick={() => handleQuickAction('call')} className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 hover:-translate-y-1 shadow-sm">
                                    <Phone size={28} />
                                    <span className="font-bold text-sm">Ligar</span>
                                </button>
                                <button className="flex flex-col items-center justify-center gap-3 p-4 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all border border-purple-200 hover:-translate-y-1 shadow-sm opacity-60 cursor-not-allowed">
                                    <Share2 size={28} />
                                    <span className="font-bold text-sm">Compartilhar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL & HISTORY MODAL (IMPROVED) */}
            {viewClient && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">{viewClient.name}</h2>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Clock size={12} />
                                        Criado em {new Date(viewClient.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setViewClient(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Left Column: Info */}
                                <div className="space-y-6 md:col-span-2">
                                    {/* Contact & Owner */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                                            <div className="text-sm font-medium text-slate-700">{viewClient.email || '-'}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase">Telefone</label>
                                            <div className="text-sm font-medium text-slate-700">{viewClient.phone || '-'}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase">Origem</label>
                                            <div className="text-sm font-medium text-slate-700">{viewClient.source}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase">Responsável</label>
                                            <div className="text-sm font-medium text-indigo-700 flex items-center gap-1">
                                                {users.find(u => u.id === viewClient.ownerId)?.name || 'Desconhecido'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Interests */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                                            <MapPin size={16} className="text-primary-500"/>
                                            Perfil de Interesse Completo
                                        </h3>
                                        <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                                            
                                            {/* Tags Row */}
                                            <div className="flex flex-wrap gap-2">
                                                {viewClient.interestProfile?.usage && (
                                                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-100 capitalize font-medium flex items-center gap-1">
                                                        <Building size={12}/> {viewClient.interestProfile.usage}
                                                    </span>
                                                )}
                                                {viewClient.interestProfile?.condition !== 'indiferente' && (
                                                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded border border-amber-100 capitalize font-medium">
                                                        {viewClient.interestProfile?.condition}
                                                    </span>
                                                )}
                                                {viewClient.interest.map(i => (
                                                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200 capitalize">{getInterestLabel(i)}</span>
                                                ))}
                                                {viewClient.desiredLocation.map(l => (
                                                    <span key={l} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">{l}</span>
                                                ))}
                                            </div>

                                            {/* Metrics Row */}
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <span className="flex items-center gap-1 font-bold text-emerald-600"><DollarSign size={14}/> Até {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(viewClient.budget)}</span>
                                                {viewClient.minBedrooms && <span className="flex items-center gap-1"><Bed size={14}/> {viewClient.minBedrooms}+ Qtos</span>}
                                                {viewClient.minBathrooms && <span className="flex items-center gap-1"><Bath size={14}/> {viewClient.minBathrooms}+ Banh</span>}
                                                {viewClient.minParking && <span className="flex items-center gap-1"><Car size={14}/> {viewClient.minParking}+ Vagas</span>}
                                                {viewClient.minArea && <span className="flex items-center gap-1"><Ruler size={14}/> {viewClient.minArea}m²+</span>}
                                            </div>

                                            {/* Features Row */}
                                            {(viewClient.interestProfile?.mustHaveFeatures?.length || 0) > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Diferenciais Buscados</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {viewClient.interestProfile?.mustHaveFeatures?.map((f, i) => (
                                                            <span key={i} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-full text-slate-600 flex items-center gap-1">
                                                                <Tag size={10} /> {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Notes */}
                                            {viewClient.notes && (
                                                <div className="mt-2 text-sm text-slate-500 italic bg-slate-50 p-3 rounded border-l-2 border-slate-300">
                                                    "{viewClient.notes}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: History (Logs) */}
                                <div className="border-l border-slate-100 pl-6 md:col-span-1 h-full">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                                        <FileText size={16} className="text-primary-500"/>
                                        Histórico de Atividades
                                    </h3>
                                    
                                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200 before:content-['']">
                                        {logs.filter(l => l.entityId === viewClient.id).length === 0 && (
                                            <div className="text-xs text-slate-400 pl-6 italic">Sem histórico registrado.</div>
                                        )}
                                        
                                        {logs
                                            .filter(l => l.entityId === viewClient.id)
                                            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                            .map(log => (
                                                <div key={log.id} className="relative pl-6">
                                                    <div className="absolute left-0 top-1 w-5 h-5 bg-white border-2 border-primary-500 rounded-full z-10 flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                            {new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-700 mt-0.5">
                                                            {log.action === 'create' ? 'Lead Criado' : log.action === 'update' ? 'Atualização' : log.action}
                                                        </span>
                                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                            {log.details}
                                                        </p>
                                                        <span className="text-[10px] text-slate-400 mt-1">Por: {log.userName}</span>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-2xl">
                            <Button onClick={() => setViewClient(null)} variant="outline">Fechar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Lead Modal - UPDATED TO FULL PROFILE */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {editingId ? <Edit3 size={20} className="text-primary-600"/> : <Plus size={20} className="text-primary-600"/>} 
                                {editingId ? 'Editar Lead' : 'Cadastrar Lead'}
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveLead} className="p-6 space-y-6">
                            
                            {/* SECTION 1: CONTACT */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Dados do Contato</h3>
                                <Input 
                                    label="Nome Completo" 
                                    required 
                                    value={newLeadData.name}
                                    onChange={e => setNewLeadData({...newLeadData, name: e.target.value})}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <PhoneInput 
                                        label="Telefone / WhatsApp"
                                        required
                                        value={newLeadData.phone}
                                        onChange={e => setNewLeadData({...newLeadData, phone: e.target.value})}
                                    />
                                    <Input 
                                        label="Email" 
                                        type="email"
                                        value={newLeadData.email}
                                        onChange={e => setNewLeadData({...newLeadData, email: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-1">Origem do Lead</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                        value={newLeadData.source}
                                        onChange={e => setNewLeadData({...newLeadData, source: e.target.value as LeadSource})}
                                    >
                                        {systemSettings.leadSources.map((s, i) => (
                                            <option key={i} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* SECTION 2: INTEREST PROFILE */}
                            <div className="space-y-5">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Perfil de Interesse Detalhado</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <Input 
                                        label="Orçamento Máximo (R$)" 
                                        type="number" 
                                        value={newLeadData.interestProfile.maxPrice} 
                                        onChange={e => setNewLeadData({ ...newLeadData, interestProfile: { ...newLeadData.interestProfile, maxPrice: Number(e.target.value) } })} 
                                    />
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">Finalidade</label>
                                        <select 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" 
                                            value={newLeadData.interestProfile.usage} 
                                            onChange={e => setNewLeadData({ ...newLeadData, interestProfile: { ...newLeadData.interestProfile, usage: e.target.value as any } })}
                                        >
                                            <option value="moradia">Moradia</option>
                                            <option value="investimento">Investimento</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-2">Tipos de Imóvel</label>
                                    <div className="flex flex-wrap gap-2">
                                        {systemSettings.propertyTypes.map(t => (
                                            <button 
                                                type="button" 
                                                key={t.value} 
                                                onClick={() => toggleProfileList('propertyTypes', t.value)} 
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${newLeadData.interestProfile.propertyTypes.includes(t.value) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-2">Localização (Bairros/Cidades)</label>
                                    <div className="flex gap-2 mb-2">
                                        <div className="w-1/3 relative">
                                            <Input 
                                                placeholder="CEP"
                                                value={cepInput}
                                                onChange={e => setCepInput(e.target.value)}
                                                onBlur={handleCepSearch}
                                                maxLength={9}
                                                className="text-sm"
                                            />
                                            {isCepLoading && <Loader2 className="absolute right-3 top-2.5 animate-spin text-primary-600" size={16} />}
                                        </div>
                                        <div className="w-2/3 flex gap-1">
                                            <input 
                                                type="text" 
                                                list="locations-datalist"
                                                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg" 
                                                placeholder="Digite ou selecione..." 
                                                value={locationInput} 
                                                onChange={e => setLocationInput(e.target.value)} 
                                                onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addLocation(); }}} 
                                            />
                                            <datalist id="locations-datalist">
                                                {systemSettings.availableLocations.map((loc, i) => <option key={i} value={loc} />)}
                                            </datalist>
                                            <Button type="button" onClick={addLocation} variant="secondary" className="px-3"><Plus size={16}/></Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {newLeadData.interestProfile.neighborhoods.map((loc, i) => (
                                            <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded text-xs flex items-center gap-1">
                                                {loc} <button type="button" onClick={() => removeLocation(loc)}><X size={12}/></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <div className="col-span-1"><Input label="Min Quartos" type="number" className="bg-white" value={newLeadData.interestProfile.minBedrooms} onChange={e => setNewLeadData({ ...newLeadData, interestProfile: { ...newLeadData.interestProfile, minBedrooms: Number(e.target.value) } })} /></div>
                                    <div className="col-span-1"><Input label="Min Banheiros" type="number" className="bg-white" value={newLeadData.interestProfile.minSuites} onChange={e => setNewLeadData({ ...newLeadData, interestProfile: { ...newLeadData.interestProfile, minSuites: Number(e.target.value) } })} /></div>
                                    <div className="col-span-1"><Input label="Min Vagas" type="number" className="bg-white" value={newLeadData.interestProfile.minParking} onChange={e => setNewLeadData({ ...newLeadData, interestProfile: { ...newLeadData.interestProfile, minParking: Number(e.target.value) } })} /></div>
                                    <div className="col-span-1"><Input label="Min Área (m²)" type="number" className="bg-white" value={newLeadData.interestProfile.minArea} onChange={e => setNewLeadData({ ...newLeadData, interestProfile: { ...newLeadData.interestProfile, minArea: Number(e.target.value) } })} /></div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-2">Diferenciais Buscados</label>
                                    <div className="flex flex-wrap gap-2">
                                        {systemSettings.propertyFeatures.map(f => (
                                            <button type="button" key={f} onClick={() => toggleProfileList('mustHaveFeatures', f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${newLeadData.interestProfile.mustHaveFeatures.includes(f) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-1">Observações Gerais</label>
                                    <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-20" placeholder="Ex: Cliente tem pressa, prefere andar alto..." value={newLeadData.interestProfile.notes} onChange={e => setNewLeadData({ ...newLeadData, interestProfile: { ...newLeadData.interestProfile, notes: e.target.value } })} />
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">{editingId ? 'Salvar Alterações' : 'Cadastrar'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};