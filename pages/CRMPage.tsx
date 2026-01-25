import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Card, Badge, Button, Input, PhoneInput, formatPhone } from '../components/ui/Elements';
import { Client, PipelineStageConfig, PropertyType, LeadSource, Property, Visit, DetailedInterestProfile } from '../types';
import { MoreHorizontal, Phone, Mail, Sparkles, Trash2, X, Plus, Globe, Share2, Copy, Terminal, UserPlus, MapPin, Bed, Ruler, Filter, Search, Settings, Edit3, ArrowLeft, ArrowRight, Save, FileText, User, Users, CheckCircle, AlertCircle, Calendar, Loader2, ThumbsUp, ThumbsDown, Pencil, XCircle, Link, CalendarPlus, Bath, Car, Building, DollarSign, Compass, Layers, GripVertical, Archive, PlayCircle, Tag, MessageCircle, Clock } from 'lucide-react';
import { calculateClientMatch, generatePipelineInsights, generateLeadCommercialInsights, findBestMatch } from '../services/geminiService';
import { searchCep } from '../services/viaCep';
import { PropertyDetailModal } from '../components/PropertyDetailModal';

// --- Components ---

const KanbanColumn: React.FC<{ 
    stage: PipelineStageConfig; 
    clients: Client[]; 
    onUpdate: any; 
    onDelete: any; 
    onMatch: any; 
    onLink: any;
    onQuickVisit: any;
    onInsights: any;
    onEdit: any;
    isFirst: boolean;
    onQuickAdd: () => void;
    onViewProperty: (property: Property) => void;
    onCompleteVisit: (client: Client, visit: Visit) => void;
    onRescheduleVisit: (client: Client, visit: Visit) => void;
    onRemoveVisit: (clientId: string, visitId: string) => void;
    onDropClient: (clientId: string, stageId: string) => void;
}> = ({ stage, clients, onUpdate, onDelete, onMatch, onLink, onQuickVisit, onInsights, onEdit, isFirst, onQuickAdd, onViewProperty, onCompleteVisit, onRescheduleVisit, onRemoveVisit, onDropClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Filter clients based on local search (Name or Phone)
  const filteredClients = useMemo(() => {
      if (!searchTerm) return clients;
      const lowerTerm = searchTerm.toLowerCase();
      return clients.filter(c => 
          c.name.toLowerCase().includes(lowerTerm) || 
          c.phone.includes(lowerTerm) ||
          c.email.toLowerCase().includes(lowerTerm)
      );
  }, [clients, searchTerm]);

  // Calculate Total Value (Sum of Budget)
  const totalValue = useMemo(() => {
      return filteredClients.reduce((acc, client) => acc + (client.budget || 0), 0);
  }, [filteredClients]);

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      setIsDragOver(true);
  };

  const handleDragLeave = () => {
      setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const clientId = e.dataTransfer.getData('clientId');
      if (clientId) {
          onDropClient(clientId, stage.id);
      }
  };

  return (
    <div 
        className={`flex-1 min-w-[280px] md:min-w-[300px] flex flex-col h-full max-h-full transition-colors rounded-xl ${isDragOver ? 'bg-primary-50 ring-2 ring-primary-300 ring-inset' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
        {/* Header */}
        <div className={`flex flex-col px-4 py-3 rounded-t-xl border-b-4 ${stage.color} bg-white shadow-sm mb-3 cursor-default transition-all`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-700">{stage.name}</h3>
                    <Badge color="gray">{filteredClients.length}</Badge>
                </div>
                {totalValue > 0 && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalValue)}
                    </span>
                )}
            </div>
            
            {/* Column Search */}
            <div className="relative">
                <Search className="absolute left-2 top-1.5 text-slate-400" size={12} />
                <input 
                    type="text" 
                    placeholder="Buscar nome ou telefone..." 
                    className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:border-primary-300 transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>

        {/* List */}
        <div className="flex-1 space-y-3 overflow-y-auto pb-4 pr-1 custom-scrollbar px-1">
            {filteredClients.map((client: Client) => (
                <ClientCard 
                    key={client.id} 
                    client={client} 
                    onUpdate={onUpdate} 
                    onDelete={onDelete} 
                    onMatch={onMatch} 
                    onLink={onLink}
                    onQuickVisit={onQuickVisit}
                    onInsights={onInsights}
                    onEdit={onEdit} 
                    onViewProperty={onViewProperty} 
                    onCompleteVisit={onCompleteVisit} 
                    onRescheduleVisit={onRescheduleVisit}
                    onRemoveVisit={onRemoveVisit}
                />
            ))}
            
            {isFirst && !searchTerm && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-medium flex items-center justify-center gap-2 hover:border-primary-400 hover:text-primary-600 hover:bg-white/50 transition-all group opacity-70 hover:opacity-100"
                >
                    <Plus size={18} className="group-hover:scale-110 transition-transform"/>
                    Novo Lead
                </button>
            )}
            
            {stage.id === 'lost_zone' && (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2 border-2 border-dashed border-red-100 rounded-xl bg-red-50/30">
                    <Archive size={32} className="opacity-50" />
                    <span className="text-xs font-medium">Arraste aqui para marcar como Perdido</span>
                </div>
            )}
            
            {filteredClients.length === 0 && searchTerm && (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                    Nenhum lead encontrado nesta coluna.
                </div>
            )}
        </div>
    </div>
  );
};

const ClientCard: React.FC<{ 
    client: Client, 
    onUpdate: any, 
    onDelete: any, 
    onMatch: any, 
    onLink: any,
    onQuickVisit: any,
    onInsights: any,
    onEdit: any, 
    onViewProperty: (p: Property) => void, 
    onCompleteVisit: (client: Client, visit: Visit) => void,
    onRescheduleVisit: (client: Client, visit: Visit) => void,
    onRemoveVisit: (clientId: string, visitId: string) => void
}> = ({ client, onUpdate, onDelete, onMatch, onLink, onQuickVisit, onInsights, onEdit, onViewProperty, onCompleteVisit, onRescheduleVisit, onRemoveVisit }) => {
    const [showMenu, setShowMenu] = useState(false);
    const { pipelines, users, properties, currentUser, systemSettings } = useStore();
    
    // Get stages for current pipeline
    const pipeline = pipelines.find(p => p.id === client.pipelineId);
    const stages = pipeline?.stages || [];
    const owner = users.find(u => u.id === client.ownerId);
    const isStaff = ['admin', 'finance', 'employee'].includes(currentUser?.role || '');

    // Data Normalization (Profile vs Legacy Root Fields)
    const profile = client.interestProfile;
    const locations = profile?.neighborhoods?.length ? profile.neighborhoods : client.desiredLocation;
    const features = profile?.mustHaveFeatures?.length ? profile.mustHaveFeatures : client.desiredFeatures;
    const interestTypes = profile?.propertyTypes?.length ? profile.propertyTypes : client.interest;
    const bedrooms = profile?.minBedrooms || client.minBedrooms;
    const suites = profile?.minSuites || client.minBathrooms; 
    const parking = profile?.minParking || client.minParking;
    const area = profile?.minArea || client.minArea;

    const getSourceIcon = (source: LeadSource) => {
        if (source.toLowerCase().includes('instagram')) return <span className="text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded text-[10px] font-bold">INSTA</span>;
        if (source.toLowerCase().includes('site')) return <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold">SITE</span>;
        if (source.toLowerCase().includes('portal') || source.toLowerCase().includes('zap')) return <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded text-[10px] font-bold">PORTAL</span>;
        if (source.toLowerCase().includes('indic')) return <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] font-bold">INDIC</span>;
        return null;
    }

    const getInterestLabel = (val: string) => {
        return systemSettings.propertyTypes.find(t => t.value === val)?.label || val;
    };

    const scheduledVisits = client.visits && client.visits.length > 0 
        ? client.visits
            .filter(v => v.status === 'scheduled')
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];

    const linkedCodes = (client.interestedPropertyIds || []).map(id => {
        const prop = properties.find(p => p.id === id);
        return prop ? prop.code : null;
    }).filter(Boolean);

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('clientId', client.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const getAgingColor = () => {
        const lastContactDate = new Date(client.lastContact || client.createdAt);
        const diffTime = Math.abs(new Date().getTime() - lastContactDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const config = systemSettings.leadAging || { freshLimit: 2, warmLimit: 7, freshColor: 'green', warmColor: 'yellow', coldColor: 'red' };
        let colorName = config.coldColor;
        if (diffDays <= config.freshLimit) colorName = config.freshColor;
        else if (diffDays <= config.warmLimit) colorName = config.warmColor;
        const colorMap: Record<string, string> = {
            'green': 'border-l-green-500 hover:border-l-green-600',
            'yellow': 'border-l-yellow-500 hover:border-l-yellow-600',
            'red': 'border-l-red-500 hover:border-l-red-600',
            'blue': 'border-l-blue-500 hover:border-l-blue-600',
            'purple': 'border-l-purple-500 hover:border-l-purple-600',
            'gray': 'border-l-gray-500 hover:border-l-gray-600',
            'orange': 'border-l-orange-500 hover:border-l-orange-600',
        };
        return colorMap[colorName] || colorMap['red'];
    };

    const agingBorderClass = getAgingColor();
    const entryDate = new Date(client.createdAt);
    const timeSinceEntry = Math.abs(new Date().getTime() - entryDate.getTime());
    const daysSinceEntry = Math.floor(timeSinceEntry / (1000 * 60 * 60 * 24));
    const entryDateStr = entryDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    return (
        <Card 
            className={`p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group border-l-4 relative bg-white ${agingBorderClass}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()} 
            onDoubleClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(client); }}
            draggable 
            onDragStart={handleDragStart}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col gap-1 w-full pr-6">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 text-sm leading-tight select-none">
                        <GripVertical size={12} className="text-slate-300 shrink-0 cursor-grab" />
                        {client.name}
                        {getSourceIcon(client.source)}
                    </h4>
                    {isStaff && owner && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 pl-5">
                            <User size={10} /> {owner.name.split(' ')[0]}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 absolute top-3 right-3">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onQuickVisit(client); }}
                        className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50 transition-colors"
                        title="Agendar Visita"
                    >
                        <CalendarPlus size={14} className="pointer-events-none" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onInsights(client); }}
                        className="text-amber-500 hover:text-amber-600 p-1 rounded-full hover:bg-amber-50 transition-colors"
                        title="Insights Comerciais (IA)"
                    >
                        <Sparkles size={14} fill="currentColor" className="opacity-80 pointer-events-none" />
                    </button>
                    <div className="relative">
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                        >
                            <MoreHorizontal size={14} className="pointer-events-none" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-6 bg-white shadow-lg rounded-lg border border-slate-100 z-10 w-32 py-1 overflow-hidden">
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onEdit(client); setShowMenu(false); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <Edit3 size={12} /> Editar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {showMenu && <div className="fixed inset-0 z-0" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}></div>}

            <div className="space-y-2 text-sm text-slate-500 mb-3 pl-5">
                <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    <Phone size={12} className="shrink-0" /> {client.phone}
                </div>
                
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 space-y-1.5 mt-1">
                    <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1 font-bold text-emerald-600">
                            <DollarSign size={12} />
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(client.budget)}
                        </div>
                        <div className="flex gap-1">
                            {interestTypes && interestTypes.length > 0 ? (
                                interestTypes.slice(0, 2).map((type, idx) => (
                                    <span key={idx} className="capitalize bg-white border border-slate-200 px-1 rounded text-[10px] text-slate-600">
                                        {getInterestLabel(type)}
                                    </span>
                                ))
                            ) : <span className="text-[10px] text-slate-400">Qualquer</span>}
                            {interestTypes && interestTypes.length > 2 && <span className="text-[10px] text-slate-400">+{interestTypes.length - 2}</span>}
                        </div>
                    </div>

                    {(bedrooms || suites || parking || area) && (
                        <div className="flex items-center gap-3 text-[10px] text-slate-600 border-t border-slate-200 pt-1.5">
                            {bedrooms > 0 && <span className="flex items-center gap-0.5" title="Mínimo Quartos"><Bed size={10} /> {bedrooms}</span>}
                            {suites > 0 && <span className="flex items-center gap-0.5" title="Mínimo Banheiros/Suítes"><Bath size={10} /> {suites}</span>}
                            {parking > 0 && <span className="flex items-center gap-0.5" title="Mínimo Vagas"><Car size={10} /> {parking}</span>}
                            {area > 0 && <span className="flex items-center gap-0.5" title="Mínimo Área"><Ruler size={10} /> {area}m²</span>}
                        </div>
                    )}

                    {locations && locations.length > 0 && (
                        <div className="flex items-start gap-1 text-[10px] text-slate-600">
                            <MapPin size={10} className="mt-0.5 shrink-0 text-slate-400" />
                            <span className="truncate leading-tight max-w-[180px]">{locations.join(', ')}</span>
                        </div>
                    )}

                    {features && features.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                            {features.slice(0, 3).map((f, i) => (
                                <span key={i} className="text-[9px] bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-500 flex items-center gap-0.5">
                                    <Tag size={8} /> {f}
                                </span>
                            ))}
                            {features.length > 3 && <span className="text-[9px] text-slate-400">+{features.length - 3}</span>}
                        </div>
                    )}
                </div>

                {scheduledVisits.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                        {scheduledVisits.map(visit => (
                            <div key={visit.id} className="flex items-center justify-between text-primary-600 font-medium bg-primary-50 px-2 py-1.5 rounded w-full">
                                <div className="flex items-center gap-2 text-xs">
                                    <Calendar size={12} className="shrink-0" /> 
                                    <span>
                                        {new Date(visit.date).toLocaleDateString()}
                                        <span className="ml-1 text-primary-400">
                                            {new Date(visit.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); onCompleteVisit(client, visit); }} className="text-green-600 hover:text-green-700 bg-white hover:bg-green-50 p-1 rounded-full border border-primary-200 hover:border-green-200 transition-all"><CheckCircle size={14} className="pointer-events-none" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); onRescheduleVisit(client, visit); }} className="text-blue-500 hover:text-blue-700 bg-white hover:bg-blue-50 p-1 rounded-full border border-primary-200 hover:border-blue-200 transition-all"><Edit3 size={14} className="pointer-events-none" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); onRemoveVisit(client.id, visit.id); }} className="text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 p-1 rounded-full border border-slate-200 hover:border-red-200 transition-all"><Trash2 size={14} className="pointer-events-none" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {linkedCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {linkedCodes.map((code, idx) => (
                            <span key={idx} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-mono font-medium">{code}</span>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex gap-2 mb-3 pl-5">
                <button type="button" onClick={(e) => { e.stopPropagation(); onMatch(client); }} className="flex-1 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded flex items-center justify-center gap-1 transition-colors border border-indigo-100"><Sparkles size={12} className="pointer-events-none" /> Match Imóvel</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); onLink(client); }} className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded flex items-center justify-center gap-1 transition-colors border border-slate-200"><Link size={12} className="pointer-events-none" /> Vincular Imóvel</button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center pl-5">
                <span className="text-[10px] text-slate-400 font-medium">{entryDateStr} <span className="text-slate-300">•</span> {daysSinceEntry} dias</span>
                {stages.length > 0 && (
                    <select className="text-[10px] bg-slate-100 border-none rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 max-w-[100px] cursor-pointer" value={client.stage} onChange={(e) => onUpdate(client.id, { stage: e.target.value })} onClick={(e) => e.stopPropagation()}>
                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                )}
            </div>
        </Card>
    )
}

// --- Main Page ---

export const CRMPage: React.FC = () => {
  // ... (Hooks and States - Unchanged, just ensuring correct usage) ...
  const { clients, properties, updateClient, removeClient, currentUser, addClient, addNotification, pipelines, addPipeline, updatePipeline, deletePipeline, addPipelineStage, updatePipelineStage, deletePipelineStage, users, moveClientToPipeline, systemSettings, addVisit, updateVisit, removeVisit, markLeadAsLost } = useStore();
  
  const [currentPipelineId, setCurrentPipelineId] = useState<string>(pipelines[0]?.id || '');
  const [isManagingPipelines, setIsManagingPipelines] = useState(false);
  const currentPipeline = pipelines.find(p => p.id === currentPipelineId);
  const [ownerFilter, setOwnerFilter] = useState<string>(''); 

  const [insightsOpen, setInsightsOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [viewProperty, setViewProperty] = useState<Property | null>(null);
  
  const [linkPropertyModalOpen, setLinkPropertyModalOpen] = useState(false);
  const [quickVisitModalOpen, setQuickVisitModalOpen] = useState(false);
  
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [clientToMarkLost, setClientToMarkLost] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState('');

  const [leadInsightsModalOpen, setLeadInsightsModalOpen] = useState(false);
  const [loadingLeadInsights, setLoadingLeadInsights] = useState(false);
  const [currentLeadInsights, setCurrentLeadInsights] = useState('');
  const [insightTargetClient, setInsightTargetClient] = useState<Client | null>(null);
  
  const [completingVisit, setCompletingVisit] = useState<{client: Client, visit: Visit} | null>(null);
  const [visitFeedback, setVisitFeedback] = useState({ feedback: '', positive: '', negative: '', liked: true });
  
  const [reschedulingVisit, setReschedulingVisit] = useState<{client: Client, visit: Visit} | null>(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', notes: '' });

  const [insights, setInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedClientForMatch, setSelectedClientForMatch] = useState<Client | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set()); 
  const [selectedClientForLink, setSelectedClientForLink] = useState<Client | null>(null);
  const [selectedClientForVisit, setSelectedClientForVisit] = useState<Client | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const [matchTolerance, setMatchTolerance] = useState(10);
  const [filterType, setFilterType] = useState<PropertyType | 'all'>('all');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterBedrooms, setFilterBedrooms] = useState(0);
  const [filterSuites, setFilterSuites] = useState(0);
  const [filterParking, setFilterParking] = useState(0);
  const [filterArea, setFilterArea] = useState(0);

  const [analyzingPropertyId, setAnalyzingPropertyId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, {score: number, reason: string}>>({});
  
  const [bestMatchSuggestion, setBestMatchSuggestion] = useState<{property: Property, reason: string} | null>(null);
  const [isLoadingBestMatch, setIsLoadingBestMatch] = useState(false);

  const [newPipelineName, setNewPipelineName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  
  const [locationInput, setLocationInput] = useState('');
  const [cepSearchInput, setCepSearchInput] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [foundClient, setFoundClient] = useState<Client | null>(null);

  // Visit Scheduling inside "New Lead"
  const [scheduleVisitNow, setScheduleVisitNow] = useState(false);
  const [newVisitDate, setNewVisitDate] = useState('');
  const [newVisitPropertyCode, setNewVisitPropertyCode] = useState('');
  const [newVisitNotes, setNewVisitNotes] = useState('');
  const [matchingProperties, setMatchingProperties] = useState<Property[]>([]);

  const [linkSearchCode, setLinkSearchCode] = useState('');
  const [linkMatchingProperties, setLinkMatchingProperties] = useState<Property[]>([]);

  // Tab state for New Lead Modal
  const [activeLeadTab, setActiveLeadTab] = useState<'info' | 'profile' | 'visit'>('info');

  const initialFormState = {
      name: '', email: '', phone: '', source: 'Manual / Balcão' as LeadSource, ownerId: '',
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
  const [formData, setFormData] = useState(initialFormState);

  // ... (All Helper functions like toggleProfileList, handleDropClient, etc. preserved) ...
  const toggleProfileList = (field: keyof DetailedInterestProfile, value: string) => {
      setFormData(prev => {
          const list = prev.interestProfile[field] as string[];
          const newList = list.includes(value) ? list.filter(i => i !== value) : [...list, value];
          return { ...prev, interestProfile: { ...prev.interestProfile, [field]: newList } };
      });
  };

  const handleDropClient = (clientId: string, stageId: string) => {
      if (stageId === 'lost_zone') {
          setClientToMarkLost(clientId);
          setLostReason('');
          setLostModalOpen(true);
          return;
      }
      const client = clients.find(c => c.id === clientId);
      if (client && client.stage !== stageId) {
          updateClient(clientId, { stage: stageId });
          addNotification('success', 'Lead movido com sucesso!');
      }
  };

  const confirmMarkAsLost = () => {
      if (!clientToMarkLost || !lostReason.trim()) {
          addNotification('error', 'Por favor, informe o motivo da perda.');
          return;
      }
      markLeadAsLost(clientToMarkLost, lostReason);
      setLostModalOpen(false);
      setClientToMarkLost(null);
      setLostReason('');
  }

  const handlePropertySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNewVisitPropertyCode(value);
      if (value.length > 1) {
          const search = value.toLowerCase();
          const matched = properties.filter(p => p.code.toLowerCase().includes(search) || p.title.toLowerCase().includes(search)).slice(0, 5);
          setMatchingProperties(matched);
      } else {
          setMatchingProperties([]);
      }
  }

  const handlePropertySelect = (property: Property) => {
      setNewVisitPropertyCode(property.code);
      setMatchingProperties([]);
  }

  const handleLinkSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLinkSearchCode(value);
      if(value.length > 1) {
          const search = value.toLowerCase();
          const matched = properties.filter(p => p.code.toLowerCase().includes(search) || p.title.toLowerCase().includes(search)).slice(0, 5);
          setLinkMatchingProperties(matched);
      } else {
          setLinkMatchingProperties([]);
      }
  }

  const toggleLinkedProperty = (propertyId: string) => {
      if(!selectedClientForLink) return;
      const currentIds = selectedClientForLink.interestedPropertyIds || [];
      let newIds;
      if (currentIds.includes(propertyId)) newIds = currentIds.filter(id => id !== propertyId);
      else newIds = [...currentIds, propertyId];
      updateClient(selectedClientForLink.id, { interestedPropertyIds: newIds });
      setSelectedClientForLink({ ...selectedClientForLink, interestedPropertyIds: newIds });
  }

  const isBroker = currentUser?.role === 'broker';
  const isAdmin = currentUser?.role === 'admin';
  const isStaff = ['admin', 'finance', 'employee'].includes(currentUser?.role || '');
  
  const pipelineClients = clients.filter(c => {
      if (c.pipelineId !== currentPipelineId) return false;
      if (isBroker) return c.ownerId === currentUser?.id;
      if (isStaff) {
          if (ownerFilter) return c.ownerId === ownerFilter;
          return true;
      }
      return false;
  });

  const handleInsights = async () => {
      setInsightsOpen(true);
      if (!insights) {
          setLoadingInsights(true);
          const result = await generatePipelineInsights(pipelineClients, systemSettings.crmGlobalInsightsPrompt);
          setInsights(result);
          setLoadingInsights(false);
      }
  };

  const handleLeadInsights = async (client: Client) => {
    setInsightTargetClient(client);
    setLeadInsightsModalOpen(true);
    setLoadingLeadInsights(true);
    const result = await generateLeadCommercialInsights(client, properties, systemSettings.crmCardInsightsPrompt);
    setCurrentLeadInsights(result);
    setLoadingLeadInsights(false);
  };

  const handleQuickVisit = (client: Client) => {
    setSelectedClientForVisit(client);
    setQuickVisitModalOpen(true);
  };

  const handleMatch = (client: Client) => {
    setSelectedClientForMatch(client);
    setMatchModalOpen(true);
  };

  const handleLink = (client: Client) => {
    setSelectedClientForLink(client);
    setLinkPropertyModalOpen(true);
  };

  const handleEdit = (client: Client) => {
      setEditingClientId(client.id);
      // Map client data to form data
      setFormData({
          name: client.name,
          email: client.email,
          phone: client.phone,
          source: client.source as LeadSource,
          ownerId: client.ownerId,
          interestProfile: client.interestProfile || {
            propertyTypes: client.interest,
            condition: 'indiferente',
            usage: 'moradia',
            cities: [],
            neighborhoods: client.desiredLocation,
            proximityTo: [],
            minBedrooms: client.minBedrooms || 0,
            minSuites: client.minBathrooms || 0,
            minParking: client.minParking || 0,
            minArea: client.minArea || 0,
            mustHaveFeatures: client.desiredFeatures || [],
            maxPrice: client.budget,
            paymentMethod: 'vista',
            hasFgts: false,
            sunOrientation: 'indiferente',
            floorPreference: 'indiferente',
            notes: client.notes || ''
          }
      });
      setEditLeadOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      source: formData.source,
      ownerId: formData.ownerId || currentUser?.id || '',
      interestProfile: formData.interestProfile,
      budget: formData.interestProfile.maxPrice || 0,
      interest: formData.interestProfile.propertyTypes || [],
      desiredLocation: formData.interestProfile.neighborhoods || [],
      notes: formData.interestProfile.notes
    };

    if (editingClientId) {
        updateClient(editingClientId, payload);
        addNotification('success', 'Lead atualizado.');
    } else {
        const defaultPipeline = pipelines[0];
        // Create Client and Get ID
        const newClientId = addClient({
            ...payload,
            pipelineId: currentPipelineId || defaultPipeline?.id,
            stage: defaultPipeline?.stages[0]?.id || 'new',
            interestedPropertyIds: [],
            familyMembers: [],
            documents: [],
            followers: []
        });

        // Handle Immediate Visit Scheduling
        if (newClientId && scheduleVisitNow && newVisitDate && newVisitPropertyCode) {
            const property = properties.find(p => p.code === newVisitPropertyCode);
            if (property) {
                addVisit(newClientId, {
                    date: newVisitDate,
                    propertyId: property.id,
                    status: 'scheduled',
                    notes: newVisitNotes || 'Visita inaugural agendada na criação do lead.'
                });
                addNotification('success', 'Visita agendada com sucesso!');
            }
        }
    }
    
    setAddLeadOpen(false);
    setEditLeadOpen(false);
    setEditingClientId(null);
    setFormData(initialFormState);
    // Reset Visit Data
    setScheduleVisitNow(false);
    setNewVisitDate('');
    setNewVisitPropertyCode('');
    setNewVisitNotes('');
  };

  const handleQuickAdd = () => {
    setEditingClientId(null);
    setFormData(initialFormState);
    setScheduleVisitNow(false);
    setActiveLeadTab('info');
    setAddLeadOpen(true);
  };

  const onCompleteVisit = (client: Client, visit: Visit) => {
      setCompletingVisit({client, visit});
  }

  const onRescheduleVisit = (client: Client, visit: Visit) => {
      setReschedulingVisit({client, visit});
      setRescheduleData({ date: visit.date.substring(0, 16), notes: visit.notes || '' });
  }

  // Helper for adding locations
  const [newLocation, setNewLocation] = useState('');
  const addLocation = () => {
      if (newLocation.trim()) {
          toggleProfileList('neighborhoods', newLocation.trim());
          setNewLocation('');
      }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="flex justify-between items-center mb-4 shrink-0">
            <h1 className="text-2xl font-bold text-slate-800">CRM</h1>
            <div className="flex gap-2">
                <Button onClick={handleInsights} variant="secondary">
                    <Sparkles size={18} /> Insights IA
                </Button>
                <Button onClick={handleQuickAdd}>
                    <Plus size={18} /> Novo Lead
                </Button>
            </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full gap-4 min-w-max pb-2">
                {currentPipeline?.stages.map((stage, index) => (
                    <KanbanColumn 
                        key={stage.id}
                        stage={stage}
                        clients={pipelineClients.filter(c => c.stage === stage.id)}
                        onUpdate={updateClient}
                        onDelete={removeClient}
                        onMatch={handleMatch}
                        onLink={handleLink}
                        onQuickVisit={handleQuickVisit}
                        onInsights={handleLeadInsights}
                        onEdit={handleEdit}
                        isFirst={index === 0}
                        onQuickAdd={handleQuickAdd}
                        onViewProperty={setViewProperty}
                        onCompleteVisit={onCompleteVisit}
                        onRescheduleVisit={onRescheduleVisit}
                        onRemoveVisit={removeVisit}
                        onDropClient={handleDropClient}
                    />
                ))}
                 {/* Lost Zone Column Placeholder or actual component if needed */}
            </div>
        </div>

        {/* --- FULL FEATURED LEAD MODAL --- */}
        {(addLeadOpen || editLeadOpen) && (
             <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                     {/* Modal Header */}
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                         <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                             <UserPlus size={22} className="text-primary-600"/>
                             {editingClientId ? 'Editar Lead' : 'Cadastrar Lead'}
                         </h2>
                         <button onClick={() => { setAddLeadOpen(false); setEditLeadOpen(false); }} className="text-slate-400 hover:text-slate-600">
                             <X size={24} />
                         </button>
                     </div>

                     {/* Tabs */}
                     <div className="flex border-b border-slate-100 px-6">
                         <button onClick={() => setActiveLeadTab('info')} className={`pb-3 pt-3 text-sm font-semibold border-b-2 transition-colors mr-6 ${activeLeadTab === 'info' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500'}`}>
                             Dados Básicos
                         </button>
                         <button onClick={() => setActiveLeadTab('profile')} className={`pb-3 pt-3 text-sm font-semibold border-b-2 transition-colors mr-6 ${activeLeadTab === 'profile' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500'}`}>
                             Perfil de Interesse
                         </button>
                         {!editingClientId && (
                             <button onClick={() => setActiveLeadTab('visit')} className={`pb-3 pt-3 text-sm font-semibold border-b-2 transition-colors ${activeLeadTab === 'visit' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500'}`}>
                                 Agendar Visita
                             </button>
                         )}
                     </div>

                     <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto">
                         
                         {/* TAB 1: BASIC INFO */}
                         {activeLeadTab === 'info' && (
                             <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                 <Input label="Nome Completo" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: João da Silva" />
                                 
                                 <div className="grid grid-cols-2 gap-4">
                                     <PhoneInput label="Telefone / WhatsApp" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                     <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="joao@email.com" />
                                 </div>

                                 <div>
                                     <label className="text-sm font-medium text-slate-700 block mb-1">Origem do Lead</label>
                                     <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value as LeadSource})}>
                                         {systemSettings.leadSources.map((s, i) => <option key={i} value={s}>{s}</option>)}
                                     </select>
                                 </div>

                                 {/* Only show owner select for Staff */}
                                 {isStaff && (
                                     <div>
                                         <label className="text-sm font-medium text-slate-700 block mb-1">Responsável (Corretor)</label>
                                         <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={formData.ownerId} onChange={e => setFormData({...formData, ownerId: e.target.value})}>
                                             <option value="">-- Selecione --</option>
                                             {users.filter(u => u.role === 'broker').map(u => (
                                                 <option key={u.id} value={u.id}>{u.name}</option>
                                             ))}
                                         </select>
                                     </div>
                                 )}
                             </div>
                         )}

                         {/* TAB 2: INTEREST PROFILE */}
                         {activeLeadTab === 'profile' && (
                             <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                                 <div className="grid grid-cols-2 gap-4">
                                     <Input label="Orçamento Máximo (R$)" type="number" value={formData.interestProfile.maxPrice} onChange={e => setFormData({ ...formData, interestProfile: { ...formData.interestProfile, maxPrice: Number(e.target.value) } })} />
                                     <div>
                                         <label className="text-sm font-medium text-slate-700 block mb-1">Finalidade</label>
                                         <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={formData.interestProfile.usage} onChange={e => setFormData({ ...formData, interestProfile: { ...formData.interestProfile, usage: e.target.value as any } })}>
                                             <option value="moradia">Moradia</option>
                                             <option value="investimento">Investimento</option>
                                         </select>
                                     </div>
                                 </div>

                                 <div>
                                     <label className="text-sm font-medium text-slate-700 block mb-2">Tipo de Imóvel</label>
                                     <div className="flex flex-wrap gap-2">
                                         {systemSettings.propertyTypes.map(t => (
                                             <button type="button" key={t.value} onClick={() => toggleProfileList('propertyTypes', t.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.interestProfile.propertyTypes.includes(t.value) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                 {t.label}
                                             </button>
                                         ))}
                                     </div>
                                 </div>

                                 <div>
                                     <label className="text-sm font-medium text-slate-700 block mb-2">Localização (Bairros/Cidades)</label>
                                     <div className="flex gap-2 mb-2">
                                         <input type="text" className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg" placeholder="Ex: Jardins" value={newLocation} onChange={e => setNewLocation(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addLocation(); }}} />
                                         <Button type="button" onClick={addLocation} variant="secondary" className="px-3"><Plus size={16}/></Button>
                                     </div>
                                     <div className="flex flex-wrap gap-2">
                                         {formData.interestProfile.neighborhoods.map((loc, i) => (
                                             <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded text-xs flex items-center gap-1">
                                                 {loc} <button type="button" onClick={() => toggleProfileList('neighborhoods', loc)}><X size={12}/></button>
                                             </span>
                                         ))}
                                     </div>
                                 </div>

                                 <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                     <div className="col-span-1"><Input label="Min Quartos" type="number" className="bg-white" value={formData.interestProfile.minBedrooms} onChange={e => setFormData({ ...formData, interestProfile: { ...formData.interestProfile, minBedrooms: Number(e.target.value) } })} /></div>
                                     <div className="col-span-1"><Input label="Min Suítes" type="number" className="bg-white" value={formData.interestProfile.minSuites} onChange={e => setFormData({ ...formData, interestProfile: { ...formData.interestProfile, minSuites: Number(e.target.value) } })} /></div>
                                     <div className="col-span-1"><Input label="Min Vagas" type="number" className="bg-white" value={formData.interestProfile.minParking} onChange={e => setFormData({ ...formData, interestProfile: { ...formData.interestProfile, minParking: Number(e.target.value) } })} /></div>
                                     <div className="col-span-1"><Input label="Min Área (m²)" type="number" className="bg-white" value={formData.interestProfile.minArea} onChange={e => setFormData({ ...formData, interestProfile: { ...formData.interestProfile, minArea: Number(e.target.value) } })} /></div>
                                 </div>

                                 <div>
                                     <label className="text-sm font-medium text-slate-700 block mb-2">Diferenciais Buscados</label>
                                     <div className="flex flex-wrap gap-2">
                                         {systemSettings.propertyFeatures.map(f => (
                                             <button type="button" key={f} onClick={() => toggleProfileList('mustHaveFeatures', f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.interestProfile.mustHaveFeatures.includes(f) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                 {f}
                                             </button>
                                         ))}
                                     </div>
                                 </div>

                                 <div>
                                     <label className="text-sm font-medium text-slate-700 block mb-1">Observações Gerais</label>
                                     <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-20" placeholder="Ex: Cliente tem pressa, prefere andar alto..." value={formData.interestProfile.notes} onChange={e => setFormData({ ...formData, interestProfile: { ...formData.interestProfile, notes: e.target.value } })} />
                                 </div>
                             </div>
                         )}

                         {/* TAB 3: SCHEDULE VISIT (Only for New Leads) */}
                         {!editingClientId && activeLeadTab === 'visit' && (
                             <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                 <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                                     <CalendarPlus className="text-blue-600 shrink-0 mt-1" size={20} />
                                     <div>
                                         <h4 className="font-semibold text-blue-800 text-sm">Agendamento Rápido</h4>
                                         <p className="text-xs text-blue-700 mt-1">
                                             Selecione esta opção para criar o lead já com uma visita agendada na agenda.
                                         </p>
                                     </div>
                                     <label className="relative inline-flex items-center cursor-pointer ml-auto mt-1">
                                         <input type="checkbox" className="sr-only peer" checked={scheduleVisitNow} onChange={(e) => setScheduleVisitNow(e.target.checked)} />
                                         <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                     </label>
                                 </div>

                                 {scheduleVisitNow && (
                                     <div className="space-y-4 pl-4 border-l-2 border-blue-100">
                                         <div className="grid grid-cols-2 gap-4">
                                             <div>
                                                 <label className="text-sm font-medium text-slate-700 block mb-1">Data e Hora</label>
                                                 <input 
                                                     type="datetime-local" 
                                                     className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                                     value={newVisitDate}
                                                     onChange={e => setNewVisitDate(e.target.value)}
                                                 />
                                             </div>
                                             
                                             <div className="relative">
                                                 <label className="text-sm font-medium text-slate-700 block mb-1">Imóvel (Código ou Nome)</label>
                                                 <div className="relative">
                                                     <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                                     <input 
                                                         type="text" 
                                                         className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                                         placeholder="Buscar imóvel..."
                                                         value={newVisitPropertyCode}
                                                         onChange={handlePropertySearchChange}
                                                     />
                                                 </div>
                                                 {/* Dropdown Results */}
                                                 {matchingProperties.length > 0 && (
                                                     <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                         {matchingProperties.map(p => (
                                                             <button 
                                                                 key={p.id}
                                                                 type="button"
                                                                 className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex flex-col border-b border-slate-50"
                                                                 onClick={() => handlePropertySelect(p)}
                                                             >
                                                                 <span className="font-semibold text-slate-800">{p.code} - {p.title}</span>
                                                                 <span className="text-xs text-slate-500">{p.address}</span>
                                                             </button>
                                                         ))}
                                                     </div>
                                                 )}
                                             </div>
                                         </div>
                                         
                                         <div>
                                             <label className="text-sm font-medium text-slate-700 block mb-1">Observações da Visita</label>
                                             <textarea 
                                                 className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-20"
                                                 placeholder="Instruções de acesso, chaves, etc."
                                                 value={newVisitNotes}
                                                 onChange={e => setNewVisitNotes(e.target.value)}
                                             />
                                         </div>
                                     </div>
                                 )}
                             </div>
                         )}
                     </form>

                     <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                         <div className="text-xs text-slate-500 italic">
                             {activeLeadTab === 'info' ? 'Próximo: Perfil de Interesse' : activeLeadTab === 'profile' && !editingClientId ? 'Próximo: Agendar Visita' : ''}
                         </div>
                         <div className="flex gap-2">
                             <Button type="button" variant="outline" onClick={() => { setAddLeadOpen(false); setEditLeadOpen(false); }}>Cancelar</Button>
                             {/* Navigation Buttons or Submit */}
                             {activeLeadTab !== 'visit' && !editingClientId ? (
                                 <Button type="button" onClick={() => setActiveLeadTab(activeLeadTab === 'info' ? 'profile' : 'visit')}>
                                     Próximo <ArrowRight size={16} />
                                 </Button>
                             ) : (
                                 <Button onClick={handleSubmit} className="gap-2">
                                     <Save size={18} /> {editingClientId ? 'Salvar Alterações' : 'Cadastrar Lead'}
                                 </Button>
                             )}
                             {/* Allow direct save from profile if editing */}
                             {editingClientId && (
                                 <Button onClick={handleSubmit} className="gap-2">
                                     <Save size={18} /> Salvar Alterações
                                 </Button>
                             )}
                         </div>
                     </div>
                 </div>
             </div>
        )}
        
        {/* Render other modals if needed based on state */}
        {insightsOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
                    <h2 className="text-lg font-bold mb-4">Insights do Pipeline</h2>
                    {loadingInsights ? <Loader2 className="animate-spin"/> : <div dangerouslySetInnerHTML={{__html: insights}} />}
                    <Button onClick={() => setInsightsOpen(false)} className="mt-4">Fechar</Button>
                </div>
            </div>
        )}
    </div>
  );
};