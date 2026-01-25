import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Card, Button, Input, Badge, PhoneInput, formatPhone } from '../components/ui/Elements';
import { Send, Clock, CheckCircle, AlertCircle, Plus, Calendar, MapPin, DollarSign, Home, User, Image as ImageIcon, Camera, X } from 'lucide-react';
import { Property, PropertyType } from '../types';

// Tab Component for mobile switcher
const MobileTab = ({ active, onClick, label, icon: Icon }: any) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center p-3 text-sm font-medium border-b-2 transition-colors ${active ? 'border-primary-600 text-primary-700 bg-primary-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
    >
        <Icon size={20} className="mb-1" />
        {label}
    </button>
);

export const ReferralPage: React.FC = () => {
    const { properties, addProperty, currentUser, systemSettings, addNotification } = useStore();
    const [view, setView] = useState<'list' | 'form'>('list');
    const [formType, setFormType] = useState<'simple' | 'complete'>('simple');
    
    // List Filters
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');

    // Form State
    const initialFormState = {
        title: '',
        type: 'apartamento' as PropertyType,
        address: '', // Will double as 'Location Hint' in simple mode
        price: 0,
        ownerName: '',
        ownerPhone: '',
        description: '',
        images: [] as string[]
    };
    const [formData, setFormData] = useState(initialFormState);

    // --- List Logic ---
    const myReferrals = useMemo(() => {
        if (!currentUser) return [];
        let filtered = properties.filter(p => p.authorId === currentUser.id);

        if (dateStart) {
            filtered = filtered.filter(p => p.createdAt && new Date(p.createdAt) >= new Date(dateStart));
        }
        if (dateEnd) {
            // End date set to end of day
            const end = new Date(dateEnd);
            end.setHours(23, 59, 59);
            filtered = filtered.filter(p => p.createdAt && new Date(p.createdAt) <= end);
        }

        return filtered.sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    }, [properties, currentUser, dateStart, dateEnd]);

    // --- Image Logic ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            
            // Limit check (e.g. 5 photos per referral to keep simple)
            if (formData.images.length + files.length > 5) {
                addNotification('error', 'Máximo de 5 fotos por indicação.');
                return;
            }

            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        setFormData(prev => ({
                            ...prev,
                            images: [...prev.images, reader.result as string]
                        }));
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    // --- Form Logic ---
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation based on form type
        if (formType === 'simple') {
            if (!formData.address || !formData.ownerPhone) {
                addNotification('error', 'Preencha o local e telefone do proprietário.');
                return;
            }
        } else {
            if (!formData.title || !formData.price || !formData.address) {
                addNotification('error', 'Preencha os dados obrigatórios do imóvel.');
                return;
            }
        }

        // Prepare payload
        const payload: any = {
            ...formData,
            // Defaults for fields hidden in simple mode
            title: formData.title || `Indicação em ${formData.address.substring(0, 20)}...`,
            features: [],
            bedrooms: 0,
            bathrooms: 0,
            area: 0,
            images: formData.images.length > 0 ? formData.images : ['https://via.placeholder.com/800x600?text=Sem+Foto']
        };

        addProperty(payload);
        addNotification('success', 'Indicação enviada com sucesso!');
        
        // Reset and go back to list
        setFormData(initialFormState);
        setView('list');
    };

    const getStatusInfo = (status: string) => {
        switch(status) {
            case 'published': return { color: 'green', label: 'Publicado', icon: CheckCircle };
            case 'pending_approval': return { color: 'yellow', label: 'Em Análise', icon: Clock };
            case 'draft': return { color: 'gray', label: 'Rascunho', icon:  AlertCircle};
            case 'sold': return { color: 'blue', label: 'Vendido', icon: DollarSign };
            default: return { color: 'gray', label: status, icon: AlertCircle };
        }
    };

    // Shared Image Upload Component
    const ImageUploadSection = () => (
        <div className="space-y-2 pt-2">
            <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                Fotos do Imóvel <span className="text-xs text-slate-400 font-normal">Máx 5 fotos</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
                {formData.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={img} className="w-full h-full object-cover" alt="" />
                        <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
                
                {formData.images.length < 5 && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-primary-400 hover:text-primary-500 transition-all">
                        <Camera size={24} />
                        <span className="text-[10px] mt-1 font-medium">Adicionar</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                )}
            </div>
        </div>
    );

    if (view === 'form') {
        return (
            <div className="max-w-lg mx-auto pb-20">
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => setView('list')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500">
                        Voltar
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">Nova Indicação</h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div className="flex border-b border-slate-100">
                        <button 
                            onClick={() => setFormType('simple')}
                            className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${formType === 'simple' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-slate-500'}`}
                        >
                            Rápido (Contato)
                        </button>
                        <button 
                            onClick={() => setFormType('complete')}
                            className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${formType === 'complete' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-slate-500'}`}
                        >
                            Completo (Detalhes)
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {formType === 'simple' ? (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
                                    <p>Informe o contato do proprietário e o local. Nós faremos o resto!</p>
                                </div>
                                <Input 
                                    label="Localização / Endereço *"
                                    placeholder="Ex: Prédio azul na Rua X, nº 100"
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                />
                                <Input 
                                    label="Nome do Proprietário"
                                    placeholder="Ex: Sr. João"
                                    value={formData.ownerName}
                                    onChange={e => setFormData({...formData, ownerName: e.target.value})}
                                />
                                <PhoneInput 
                                    label="Telefone do Proprietário *"
                                    value={formData.ownerPhone}
                                    onChange={e => setFormData({...formData, ownerPhone: formatPhone(e.target.value)})}
                                />
                                <ImageUploadSection />
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Observações</label>
                                    <textarea 
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm h-24"
                                        placeholder="Ex: Ele quer vender rápido..."
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in">
                                <Input 
                                    label="Título do Anúncio *"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Tipo</label>
                                        <select 
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                                            value={formData.type}
                                            onChange={e => setFormData({...formData, type: e.target.value as PropertyType})}
                                        >
                                            {systemSettings.propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <Input 
                                        label="Preço (R$) *"
                                        type="number"
                                        value={formData.price}
                                        onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                                    />
                                </div>
                                <Input 
                                    label="Endereço Completo *"
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                />
                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><User size={16}/> Dados do Proprietário</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <Input 
                                            placeholder="Nome"
                                            value={formData.ownerName}
                                            onChange={e => setFormData({...formData, ownerName: e.target.value})}
                                        />
                                        <PhoneInput 
                                            placeholder="Telefone"
                                            value={formData.ownerPhone}
                                            onChange={e => setFormData({...formData, ownerPhone: formatPhone(e.target.value)})}
                                        />
                                    </div>
                                </div>
                                <ImageUploadSection />
                            </div>
                        )}

                        <div className="pt-2">
                            <Button type="submit" className="w-full py-3.5 text-lg shadow-lg shadow-primary-500/20">
                                <Send size={20} /> Enviar Indicação
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Default View: List
    return (
        <div className="max-w-lg mx-auto pb-24">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Minhas Indicações</h1>
                <Button onClick={() => setView('form')} className="shadow-lg shadow-primary-500/20">
                    <Plus size={20} /> <span className="hidden md:inline">Nova</span>
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 text-white border-none">
                    <p className="text-primary-100 text-xs font-medium uppercase">Total Enviado</p>
                    <h3 className="text-3xl font-bold">{myReferrals.length}</h3>
                </Card>
                <Card className="p-4">
                    <p className="text-slate-400 text-xs font-medium uppercase">Aprovados</p>
                    <h3 className="text-3xl font-bold text-green-600">{myReferrals.filter(p => p.status === 'published').length}</h3>
                </Card>
            </div>

            {/* Filters */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4 flex gap-2 overflow-x-auto">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 min-w-fit">
                    <Calendar size={14} className="text-slate-400"/>
                    <input 
                        type="date" 
                        className="bg-transparent text-xs text-slate-600 outline-none"
                        value={dateStart}
                        onChange={e => setDateStart(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 min-w-fit">
                    <span className="text-xs text-slate-400">até</span>
                    <input 
                        type="date" 
                        className="bg-transparent text-xs text-slate-600 outline-none"
                        value={dateEnd}
                        onChange={e => setDateEnd(e.target.value)}
                    />
                </div>
                {(dateStart || dateEnd) && (
                    <button onClick={() => { setDateStart(''); setDateEnd(''); }} className="text-xs text-red-500 font-medium px-2">
                        Limpar
                    </button>
                )}
            </div>

            {/* List */}
            <div className="space-y-4">
                {myReferrals.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Home size={32} className="mx-auto mb-2 opacity-50"/>
                        <p>Nenhuma indicação encontrada no período.</p>
                        <Button variant="outline" className="mt-4" onClick={() => setView('form')}>Indicar Agora</Button>
                    </div>
                ) : (
                    myReferrals.map(p => {
                        const status = getStatusInfo(p.status);
                        return (
                            <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-slate-800 line-clamp-1">{p.title}</h3>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <MapPin size={12}/> {p.address}
                                        </p>
                                    </div>
                                    <Badge color={status.color as any}>{status.label}</Badge>
                                </div>
                                
                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Data N/A'}
                                    </div>
                                    {p.price > 0 && (
                                        <div className="font-bold text-slate-700">
                                            {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(p.price)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Floating Action Button for Mobile */}
            <button 
                onClick={() => setView('form')}
                className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg shadow-primary-600/40 flex items-center justify-center md:hidden active:scale-95 transition-transform"
            >
                <Plus size={28} />
            </button>
        </div>
    );
};