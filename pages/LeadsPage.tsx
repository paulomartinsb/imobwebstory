import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Card, Input, Badge, Button, PhoneInput } from '../components/ui/Elements';
import { 
    Search, MessageCircle, Mail, Phone, Share2, 
    Trash2, X, Filter, User, Plus, Save, DollarSign, MapPin, Bed, Ruler,
    Bath, Car, Loader2, Edit3
} from 'lucide-react';
import { Client, LeadSource, PropertyType } from '../types';
import { searchCep } from '../services/viaCep';

export const LeadsPage: React.FC = () => {
    const { clients, currentUser, removeClient, addNotification, addClient, updateClient, systemSettings, pipelines } = useStore();
    const [searchText, setSearchText] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [filterSource, setFilterSource] = useState<string>('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // New Lead Form State
    const [newLeadData, setNewLeadData] = useState({
        name: '',
        phone: '',
        email: '',
        source: 'Manual / Balcão' as LeadSource,
        notes: '',
        // Interest Fields
        budget: '',
        interest: [] as string[],
        location: '', // Used for text input
        locations: [] as string[], // Used for tags/list
        minBedrooms: '',
        minBathrooms: '',
        minParking: '',
        minArea: ''
    });

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
            notes: client.notes || '',
            budget: client.budget ? String(client.budget) : '',
            interest: client.interest || [],
            location: '',
            locations: client.desiredLocation || [],
            minBedrooms: client.minBedrooms ? String(client.minBedrooms) : '',
            minBathrooms: client.minBathrooms ? String(client.minBathrooms) : '',
            minParking: client.minParking ? String(client.minParking) : '',
            minArea: client.minArea ? String(client.minArea) : ''
        });
        setEditingId(client.id);
        setIsAddModalOpen(true);
    };

    const toggleInterest = (type: string) => {
        setNewLeadData(prev => {
            const current = prev.interest;
            if (current.includes(type)) return { ...prev, interest: current.filter(t => t !== type) };
            return { ...prev, interest: [...current, type] };
        });
    }

    const addLocation = () => {
        if (newLeadData.location.trim()) {
            setNewLeadData(prev => ({ 
                ...prev, 
                locations: [...prev.locations, prev.location.trim()],
                location: '' 
            }));
        }
    }

    const removeLocation = (loc: string) => {
        setNewLeadData(prev => ({
            ...prev,
            locations: prev.locations.filter(l => l !== loc)
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
            setNewLeadData(prev => ({ ...prev, locations: [...prev.locations, loc] }));
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
            budget: Number(newLeadData.budget) || 0,
            interest: newLeadData.interest,
            desiredLocation: newLeadData.locations,
            minBedrooms: Number(newLeadData.minBedrooms) || 0,
            minBathrooms: Number(newLeadData.minBathrooms) || 0,
            minParking: Number(newLeadData.minParking) || 0,
            minArea: Number(newLeadData.minArea) || 0,
            notes: newLeadData.notes
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
        setNewLeadData({ 
            name: '', phone: '', email: '', source: 'Manual / Balcão', notes: '',
            budget: '', interest: [], location: '', locations: [], minBedrooms: '', minBathrooms: '', minParking: '', minArea: ''
        });
        setCepInput('');
    };

    const handleOpenAddModal = () => {
        setEditingId(null);
        setNewLeadData({ 
            name: '', phone: '', email: '', source: 'Manual / Balcão', notes: '',
            budget: '', interest: [], location: '', locations: [], minBedrooms: '', minBathrooms: '', minParking: '', minArea: ''
        });
        setIsAddModalOpen(true);
    }

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
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Contato</th>
                                <th className="px-6 py-4">Origem</th>
                                <th className="px-6 py-4">Status / Pipeline</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredClients.map(client => (
                                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800 flex items-center gap-2">
                                            <User size={16} className="text-slate-400" />
                                            {client.name}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">Cadastrado em: {new Date(client.createdAt).toLocaleDateString()}</div>
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
                            ))}
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

            {/* Add/Edit Lead Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {editingId ? <Edit3 size={20} className="text-primary-600"/> : <Plus size={20} className="text-primary-600"/>} 
                                {editingId ? 'Editar Lead' : 'Cadastrar Lead'}
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveLead} className="p-6 space-y-5">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <Input 
                                    label="Nome Completo" 
                                    required 
                                    value={newLeadData.name}
                                    onChange={e => setNewLeadData({...newLeadData, name: e.target.value})}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <PhoneInput 
                                        label="Telefone"
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
                                    <label className="text-sm font-medium text-slate-700 block mb-1">Origem</label>
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

                            <div className="h-px bg-slate-100 my-2"></div>

                            {/* Interest Profile */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Perfil de Interesse</h3>
                                
                                {/* Budget */}
                                <div>
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1"><DollarSign size={14} /> Orçamento Máximo</label>
                                    <Input 
                                        type="number"
                                        placeholder="R$ 0,00"
                                        value={newLeadData.budget}
                                        onChange={e => setNewLeadData({...newLeadData, budget: e.target.value})}
                                    />
                                </div>

                                {/* Location with CEP & Datalist */}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><MapPin size={14} /> Localização Desejada</label>
                                    <div className="flex gap-2 mb-2">
                                        <div className="w-1/3 relative">
                                            <Input 
                                                placeholder="CEP"
                                                value={cepInput}
                                                onChange={e => setCepInput(e.target.value)}
                                                onBlur={handleCepSearch} // Search on blur too for convenience
                                                maxLength={9}
                                            />
                                            {isCepLoading && <Loader2 className="absolute right-3 top-2.5 animate-spin text-primary-600" size={16} />}
                                        </div>
                                        <div className="w-2/3 flex gap-1">
                                            <input 
                                                placeholder="Bairro ou Cidade..."
                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                list="lead-locations-list"
                                                value={newLeadData.location}
                                                onChange={e => setNewLeadData({...newLeadData, location: e.target.value})}
                                                onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addLocation(); }}}
                                            />
                                            <datalist id="lead-locations-list">
                                                {systemSettings.availableLocations.map((loc, i) => <option key={i} value={loc} />)}
                                            </datalist>
                                            <Button type="button" onClick={addLocation} variant="secondary" className="px-3"><Plus size={16}/></Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {newLeadData.locations.map((loc, i) => (
                                            <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded text-xs flex items-center gap-1">
                                                {loc} <button type="button" onClick={() => removeLocation(loc)}><X size={12}/></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Property Types */}
                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-2">Tipos de Imóvel</label>
                                    <div className="flex flex-wrap gap-2">
                                        {systemSettings.propertyTypes.map(t => (
                                            <button 
                                                key={t.value} 
                                                type="button"
                                                onClick={() => toggleInterest(t.value)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${newLeadData.interest.includes(t.value) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200'}`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Detailed Specs Grid */}
                                <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="col-span-1 space-y-1">
                                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1 truncate"><Bed size={10} /> Quartos</label>
                                        <Input type="number" className="bg-white" value={newLeadData.minBedrooms} onChange={e => setNewLeadData({...newLeadData, minBedrooms: e.target.value})} />
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1 truncate"><Bath size={10} /> Banh.</label>
                                        <Input type="number" className="bg-white" value={newLeadData.minBathrooms} onChange={e => setNewLeadData({...newLeadData, minBathrooms: e.target.value})} />
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1 truncate"><Car size={10} /> Vagas</label>
                                        <Input type="number" className="bg-white" value={newLeadData.minParking} onChange={e => setNewLeadData({...newLeadData, minParking: e.target.value})} />
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1 truncate"><Ruler size={10} /> Área</label>
                                        <Input type="number" className="bg-white" value={newLeadData.minArea} onChange={e => setNewLeadData({...newLeadData, minArea: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 my-2"></div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Observações Gerais</label>
                                <textarea 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-20 resize-none"
                                    placeholder="Ex: Cliente prefere andar alto, sol da manhã..."
                                    value={newLeadData.notes}
                                    onChange={e => setNewLeadData({...newLeadData, notes: e.target.value})}
                                />
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