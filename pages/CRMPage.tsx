import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Card, Badge, Button, Input, PhoneInput, formatPhone } from '../components/ui/Elements';
import { Client, PipelineStageConfig, PropertyType, LeadSource, Property, Visit, DetailedInterestProfile } from '../types';
import { MoreHorizontal, Phone, Mail, Sparkles, Trash2, X, Plus, Globe, Share2, Copy, Terminal, UserPlus, MapPin, Bed, Ruler, Filter, Search, Settings, Edit3, ArrowLeft, ArrowRight, Save, FileText, User, Users, CheckCircle, AlertCircle, Calendar, Loader2, ThumbsUp, ThumbsDown, Pencil, XCircle, Link, CalendarPlus, Bath, Car, Building, DollarSign, Compass, Layers, GripVertical, Archive, PlayCircle } from 'lucide-react';
import { calculateClientMatch, generatePipelineInsights, generateLeadCommercialInsights } from '../services/geminiService';
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

    // List ALL scheduled visits
    const scheduledVisits = client.visits && client.visits.length > 0 
        ? client.visits
            .filter(v => v.status === 'scheduled')
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];

    // Get linked properties codes
    const linkedCodes = (client.interestedPropertyIds || []).map(id => {
        const prop = properties.find(p => p.id === id);
        return prop ? prop.code : null;
    }).filter(Boolean);

    // --- Drag Handlers ---
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('clientId', client.id);
        // Visual effect for drag
        e.dataTransfer.effectAllowed = 'move';
        // Optional: Set a drag image if you want custom styling
    };

    return (
        <Card 
            className="p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-primary-500 relative bg-white"
            onClick={(e: React.MouseEvent) => e.stopPropagation()} 
            draggable // Enable Native Drag
            onDragStart={handleDragStart}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col gap-1 w-full pr-6">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 text-sm leading-tight">
                        <GripVertical size={12} className="text-slate-300 shrink-0 cursor-grab" />
                        {client.name}
                        {getSourceIcon(client.source)}
                    </h4>
                    {/* Only show owner if current user is Staff/Admin and viewing list */}
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
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDelete(client.id); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={12} /> Excluir
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {showMenu && (
                <div className="fixed inset-0 z-0" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}></div>
            )}

            <div className="space-y-2 text-sm text-slate-500 mb-3 pl-5">
                <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    <Phone size={12} className="shrink-0" /> {client.phone}
                </div>
                
                {/* Interest Types Display */}
                {client.interest && client.interest.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                        {client.interest.map(interest => (
                            <span key={interest} className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded capitalize">
                                {getInterestLabel(interest)}
                            </span>
                        ))}
                    </div>
                )}

                {/* Detailed Requirements Section */}
                {(client.minBedrooms || client.minArea || client.minParking || client.minBathrooms) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {client.minBedrooms && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                                <Bed size={10} /> {client.minBedrooms}+
                            </span>
                        )}
                        {client.minArea && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                                <Ruler size={10} /> {client.minArea}m²
                            </span>
                        )}
                    </div>
                )}

                {/* Visits List */}
                {scheduledVisits.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                        {scheduledVisits.map(visit => {
                            const prop = properties.find(p => p.id === visit.propertyId);
                            return (
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
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onCompleteVisit(client, visit); }}
                                            className="text-green-600 hover:text-green-700 bg-white hover:bg-green-50 p-1 rounded-full border border-primary-200 hover:border-green-200 transition-all"
                                            title="Concluir Visita"
                                        >
                                            <CheckCircle size={14} className="pointer-events-none" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onRescheduleVisit(client, visit); }}
                                            className="text-blue-500 hover:text-blue-700 bg-white hover:bg-blue-50 p-1 rounded-full border border-primary-200 hover:border-blue-200 transition-all"
                                            title="Editar/Reagendar"
                                        >
                                            <Edit3 size={14} className="pointer-events-none" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onRemoveVisit(client.id, visit.id); }}
                                            className="text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 p-1 rounded-full border border-slate-200 hover:border-red-200 transition-all"
                                            title="Excluir Visita"
                                        >
                                            <Trash2 size={14} className="pointer-events-none" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="font-medium text-slate-700 mt-2 text-xs">
                    Teto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumSignificantDigits: 3 }).format(client.budget)}
                </div>
                
                {/* Linked Properties Codes */}
                {linkedCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {linkedCodes.map((code, idx) => (
                            <span key={idx} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-mono font-medium">
                                {code}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex gap-2 mb-3 pl-5">
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMatch(client); }}
                    className="flex-1 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded flex items-center justify-center gap-1 transition-colors border border-indigo-100"
                >
                    <Sparkles size={12} className="pointer-events-none" /> Match (IA)
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onLink(client); }}
                    className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded flex items-center justify-center gap-1 transition-colors border border-slate-200"
                >
                    <Link size={12} className="pointer-events-none" /> Vincular (Manual)
                </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center pl-5">
                <span className="text-[10px] text-slate-400">Há {Math.floor((new Date().getTime() - new Date(client.lastContact).getTime()) / (1000 * 3600 * 24))} dias</span>
                {stages.length > 0 && (
                    <select 
                        className="text-[10px] bg-slate-100 border-none rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 max-w-[100px] cursor-pointer"
                        value={client.stage}
                        onChange={(e) => onUpdate(client.id, { stage: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {stages.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                )}
            </div>
        </Card>
    )
}

// --- Main Page ---

export const CRMPage: React.FC = () => {
  const { clients, properties, updateClient, removeClient, currentUser, addClient, addNotification, pipelines, addPipeline, updatePipeline, deletePipeline, addPipelineStage, updatePipelineStage, deletePipelineStage, users, moveClientToPipeline, systemSettings, addVisit, updateVisit, removeVisit, markLeadAsLost } = useStore();
  
  // Pipeline State
  const [currentPipelineId, setCurrentPipelineId] = useState<string>(pipelines[0]?.id || '');
  const [isManagingPipelines, setIsManagingPipelines] = useState(false);
  const currentPipeline = pipelines.find(p => p.id === currentPipelineId);
  const [ownerFilter, setOwnerFilter] = useState<string>(''); // For Admins to filter view. '' = All.

  // Modals State
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [viewProperty, setViewProperty] = useState<Property | null>(null);
  
  // New Modals
  const [linkPropertyModalOpen, setLinkPropertyModalOpen] = useState(false);
  const [quickVisitModalOpen, setQuickVisitModalOpen] = useState(false);
  
  // Lost Logic State
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [clientToMarkLost, setClientToMarkLost] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState('');

  // Lead Strategy Insights Modal
  const [leadInsightsModalOpen, setLeadInsightsModalOpen] = useState(false);
  const [loadingLeadInsights, setLoadingLeadInsights] = useState(false);
  const [currentLeadInsights, setCurrentLeadInsights] = useState('');
  const [insightTargetClient, setInsightTargetClient] = useState<Client | null>(null);
  
  // Visit Modals State
  const [completingVisit, setCompletingVisit] = useState<{client: Client, visit: Visit} | null>(null);
  const [visitFeedback, setVisitFeedback] = useState({ feedback: '', positive: '', negative: '', liked: true });
  
  const [reschedulingVisit, setReschedulingVisit] = useState<{client: Client, visit: Visit} | null>(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', notes: '' });

  // Logic State
  const [insights, setInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedClientForMatch, setSelectedClientForMatch] = useState<Client | null>(null);
  const [selectedClientForLink, setSelectedClientForLink] = useState<Client | null>(null);
  const [selectedClientForVisit, setSelectedClientForVisit] = useState<Client | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Matching State
  const [matchTolerance, setMatchTolerance] = useState(10);
  const [filterType, setFilterType] = useState<PropertyType | 'all'>('all');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterBedrooms, setFilterBedrooms] = useState(0);

  const [analyzingPropertyId, setAnalyzingPropertyId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, {score: number, reason: string}>>({});

  // Pipeline Management Local State
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  
  // Local state for adding location & Visits
  const [locationInput, setLocationInput] = useState('');
  const [cepSearchInput, setCepSearchInput] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [foundClient, setFoundClient] = useState<Client | null>(null);

  // Visit Form State inside Edit Modal & Quick Visit Modal
  const [newVisitDate, setNewVisitDate] = useState('');
  const [newVisitPropertyCode, setNewVisitPropertyCode] = useState('');
  const [newVisitNotes, setNewVisitNotes] = useState('');
  const [matchingProperties, setMatchingProperties] = useState<Property[]>([]);

  // Link Property Search State
  const [linkSearchCode, setLinkSearchCode] = useState('');
  const [linkMatchingProperties, setLinkMatchingProperties] = useState<Property[]>([]);

  // Form Data (Shared between Add/Edit in CRM)
  const initialFormState = {
      name: '', email: '', phone: '', source: 'Manual / Balcão' as LeadSource, ownerId: '',
      // Detailed Profile Data
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
  const [formData, setFormData] = useState(initialFormState);

  // Helper to toggle array items in profile
  const toggleProfileList = (field: keyof DetailedInterestProfile, value: string) => {
      setFormData(prev => {
          const list = prev.interestProfile[field] as string[];
          const newList = list.includes(value) ? list.filter(i => i !== value) : [...list, value];
          return { ...prev, interestProfile: { ...prev.interestProfile, [field]: newList } };
      });
  };

  // ... (Keep existing code for useEffect, handlePropertySearchChange, etc.) ...
  useEffect(() => {
      if (!currentPipelineId && pipelines.length > 0) {
          setCurrentPipelineId(pipelines[0].id);
      }
  }, [pipelines]);

  // Handle Drop Logic (Move client to new stage)
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

  // Handle Property Search for Visit
  const handlePropertySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNewVisitPropertyCode(value);
      if (value.length > 1) {
          const search = value.toLowerCase();
          const matched = properties.filter(p => 
              p.code.toLowerCase().includes(search) || 
              p.title.toLowerCase().includes(search)
          ).slice(0, 5);
          setMatchingProperties(matched);
      } else {
          setMatchingProperties([]);
      }
  }

  const handlePropertySelect = (property: Property) => {
      setNewVisitPropertyCode(property.code);
      setMatchingProperties([]);
  }

  // Handle Link Property Search
  const handleLinkSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLinkSearchCode(value);
      if(value.length > 1) {
          const search = value.toLowerCase();
          const matched = properties.filter(p => 
              p.code.toLowerCase().includes(search) || 
              p.title.toLowerCase().includes(search)
          ).slice(0, 5);
          setLinkMatchingProperties(matched);
      } else {
          setLinkMatchingProperties([]);
      }
  }

  const toggleLinkedProperty = (propertyId: string) => {
      if(!selectedClientForLink) return;
      
      const currentIds = selectedClientForLink.interestedPropertyIds || [];
      let newIds;
      if (currentIds.includes(propertyId)) {
          newIds = currentIds.filter(id => id !== propertyId);
      } else {
          newIds = [...currentIds, propertyId];
      }
      
      updateClient(selectedClientForLink.id, { interestedPropertyIds: newIds });
      setSelectedClientForLink({ ...selectedClientForLink, interestedPropertyIds: newIds });
  }

  // Permissions Check
  const isBroker = currentUser?.role === 'broker';
  const isAdmin = currentUser?.role === 'admin';
  const isStaff = ['admin', 'finance', 'employee'].includes(currentUser?.role || '');
  
  // Filter Clients for current pipeline
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
          const result = await generatePipelineInsights(pipelineClients);
          setInsights(result);
          setLoadingInsights(false);
      }
  }

  const handleLeadInsights = async (client: Client) => {
      setInsightTargetClient(client);
      setLeadInsightsModalOpen(true);
      setLoadingLeadInsights(true);
      setCurrentLeadInsights('');
      
      const result = await generateLeadCommercialInsights(client, properties);
      setCurrentLeadInsights(result);
      setLoadingLeadInsights(false);
  }

  const handleDeleteClient = (id: string) => {
      if(window.confirm("Tem certeza que deseja remover este cliente?")) {
          removeClient(id);
      }
  }

  // --- Unified Visit Removal Handler ---
  const handleRemoveVisit = (clientId: string, visitId: string) => {
      if (window.confirm("Tem certeza que deseja remover esse horário da agenda?")) {
          removeVisit(clientId, visitId);
      }
  }

  // --- Visit Action Handlers ---
  
  const initiateVisitCompletion = (client: Client, visit: Visit) => {
      setCompletingVisit({ client, visit });
      setVisitFeedback({ feedback: '', positive: '', negative: '', liked: true });
  }

  const initiateReschedule = (client: Client, visit: Visit) => {
      setReschedulingVisit({ client, visit });
      const dateObj = new Date(visit.date);
      const dateStr = dateObj.toISOString().slice(0, 16); 
      setRescheduleData({ date: dateStr, notes: visit.notes || '' });
  }

  const submitReschedule = () => {
      if (!reschedulingVisit) return;
      const { client, visit } = reschedulingVisit;
      
      if (!rescheduleData.date) {
          addNotification('error', 'Informe a nova data e horário.');
          return;
      }

      updateVisit(client.id, visit.id, {
          date: new Date(rescheduleData.date).toISOString(),
          notes: rescheduleData.notes,
          status: 'scheduled'
      });

      addNotification('success', 'Visita reagendada com sucesso!');
      setReschedulingVisit(null);
  }

  const confirmVisitCompletion = (moveNext: boolean) => {
      if (!completingVisit) return;
      const { client, visit } = completingVisit;

      updateVisit(client.id, visit.id, {
          status: 'completed',
          feedback: visitFeedback.feedback,
          positivePoints: visitFeedback.positive,
          negativePoints: visitFeedback.negative,
          liked: visitFeedback.liked
      });

      if (moveNext && currentPipeline) {
          const currentStageIndex = currentPipeline.stages.findIndex(s => s.id === client.stage);
          if (currentStageIndex !== -1 && currentStageIndex < currentPipeline.stages.length - 1) {
              const nextStageId = currentPipeline.stages[currentStageIndex + 1].id;
              updateClient(client.id, { stage: nextStageId });
              addNotification('success', 'Visita concluída e lead avançado!');
          } else {
              addNotification('success', 'Visita concluída! (Lead já está na última etapa)');
          }
      } else {
          addNotification('success', 'Visita concluída!');
      }

      setCompletingVisit(null);
  }

  // ... (Keep other handlers: handleQuickAdd, handleOpenEdit, etc.) ...
  const handleQuickAdd = () => {
      setFormData(initialFormState); 
      setFoundClient(null); 
      setEditingClientId(null); 
      let finalOwnerId = currentUser?.id;
      if (isStaff) {
          if (ownerFilter) {
              finalOwnerId = ownerFilter;
          }
      }
      setFormData(prev => ({ ...prev, ownerId: finalOwnerId || '' }));
      setAddLeadOpen(true);
  }

  const handleOpenEdit = (client: Client) => {
      setEditingClientId(client.id);
      setFoundClient(null);
      // Load client data into form
      setFormData({
          name: client.name,
          email: client.email,
          phone: client.phone,
          source: client.source,
          ownerId: client.ownerId,
          interestProfile: client.interestProfile || {
              // Fallback for legacy clients
              propertyTypes: client.interest,
              condition: 'indiferente',
              usage: 'moradia',
              cities: [],
              neighborhoods: client.desiredLocation || [],
              proximityTo: [],
              minBedrooms: client.minBedrooms || 0,
              minSuites: 0,
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
      setNewVisitDate('');
      setNewVisitPropertyCode('');
      setNewVisitNotes('');
      setMatchingProperties([]);
      setEditLeadOpen(true);
  }

  const handleOpenLinkModal = (client: Client) => {
      setSelectedClientForLink(client);
      setLinkSearchCode('');
      setLinkMatchingProperties([]);
      setLinkPropertyModalOpen(true);
  }

  const handleOpenQuickVisit = (client: Client) => {
      setSelectedClientForVisit(client);
      setNewVisitDate('');
      setNewVisitPropertyCode('');
      setNewVisitNotes('');
      setMatchingProperties([]);
      setQuickVisitModalOpen(true);
  }

  const submitQuickVisit = () => {
      if(!selectedClientForVisit) return;
      if (!newVisitDate || !newVisitPropertyCode) {
          addNotification('error', 'Preencha a data e selecione um imóvel.');
          return;
      }

      const property = properties.find(p => p.code.toLowerCase() === newVisitPropertyCode.toLowerCase() || p.title.toLowerCase() === newVisitPropertyCode.toLowerCase());
      
      if (!property) {
          addNotification('error', 'Imóvel não encontrado. Selecione da lista.');
          return;
      }

      addVisit(selectedClientForVisit.id, {
          date: new Date(newVisitDate).toISOString(),
          propertyId: property.id,
          status: 'scheduled',
          notes: newVisitNotes
      });

      addNotification('success', 'Visita agendada com sucesso!');
      setQuickVisitModalOpen(false);
  }

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
          addNotification('error', 'CEP não encontrado.');
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

  const handleUpdateLead = (e: React.FormEvent) => {
      e.preventDefault();
      const targetId = editingClientId;
      if (!targetId) return;

      const profile = formData.interestProfile;

      const updateData: Partial<Client> = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          source: formData.source,
          // Sync Root fields for legacy support/list view
          budget: profile.maxPrice,
          interest: profile.propertyTypes,
          desiredLocation: profile.neighborhoods,
          minBedrooms: profile.minBedrooms,
          minParking: profile.minParking,
          minArea: profile.minArea,
          desiredFeatures: profile.mustHaveFeatures,
          notes: profile.notes,
          // New Profile Data
          interestProfile: profile
      };

      if(isStaff && formData.ownerId) {
          updateData.ownerId = formData.ownerId;
      }

      updateClient(targetId, updateData);

      addNotification('success', 'Lead atualizado!');
      setEditLeadOpen(false);
      setEditingClientId(null);
  }

  const handleAddVisit = () => {
      if (!editingClientId) return;
      if (!newVisitDate || !newVisitPropertyCode) {
          addNotification('error', 'Preencha a data e selecione um imóvel.');
          return;
      }

      const property = properties.find(p => p.code.toLowerCase() === newVisitPropertyCode.toLowerCase() || p.title.toLowerCase() === newVisitPropertyCode.toLowerCase());
      
      if (!property) {
          addNotification('error', 'Imóvel não encontrado. Selecione da lista.');
          return;
      }

      addVisit(editingClientId, {
          date: new Date(newVisitDate).toISOString(),
          propertyId: property.id,
          status: 'scheduled',
          notes: newVisitNotes
      });

      setNewVisitDate('');
      setNewVisitPropertyCode('');
      setNewVisitNotes('');
      setMatchingProperties([]); 
  }

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentPipelineId) {
          addNotification('error', 'Selecione um pipeline primeiro.');
          return;
      }
      
      const firstStage = pipelines.find(p => p.id === currentPipelineId)?.stages[0]?.id;
      const profile = formData.interestProfile;

      if (editingClientId) {
          handleUpdateLead(e); // Reuse update logic if needed
      } else {
          let finalOwnerId = currentUser?.id;
          
          if (isStaff) {
              if (formData.ownerId) {
                  finalOwnerId = formData.ownerId;
              } else if (ownerFilter) {
                  finalOwnerId = ownerFilter;
              }
          }

          const success = addClient({
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              pipelineId: currentPipelineId,
              stage: firstStage || 'new',
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
              
              // New Profile
              interestProfile: profile
          }, finalOwnerId);
          
          if(success) {
            addNotification('success', 'Lead criado e adicionado ao Pipeline!');
          }
      }
      
      setAddLeadOpen(false);
      setFormData(initialFormState);
      setEditingClientId(null);
      setFoundClient(null);
  }

  const handleOpenMatch = (client: Client) => {
      setSelectedClientForMatch(client);
      setMatchTolerance(10);
      setAnalysisResults({});
      setFilterType(client.interest[0] || 'all');
      setFilterLocation(client.desiredLocation[0] || '');
      setFilterBedrooms(client.minBedrooms || 0);
      setMatchModalOpen(true);
  }

  const handleRunAiAnalysis = async (property: Property) => {
      if(!selectedClientForMatch) return;
      setAnalyzingPropertyId(property.id);
      const result = await calculateClientMatch(selectedClientForMatch, property);
      setAnalysisResults(prev => ({ ...prev, [property.id]: result }));
      setAnalyzingPropertyId(null);
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setFormData({ ...formData, phone: raw });
      
      const cleanPhone = raw.replace(/\D/g, '');
      if (cleanPhone.length > 8) {
          const exists = clients.find(c => c.phone.replace(/\D/g, '') === cleanPhone);
          setFoundClient(exists || null);
      } else {
          setFoundClient(null);
      }
  };

  const loadExistingClient = () => {
      if (!foundClient) return;
      setFormData({
          name: foundClient.name,
          email: foundClient.email,
          phone: foundClient.phone,
          source: foundClient.source,
          ownerId: foundClient.ownerId,
          interestProfile: foundClient.interestProfile || {
              // Legacy map
              propertyTypes: foundClient.interest,
              condition: 'indiferente',
              usage: 'moradia',
              cities: [],
              neighborhoods: foundClient.desiredLocation || [],
              proximityTo: [],
              minBedrooms: foundClient.minBedrooms || 0,
              minSuites: 0,
              minParking: foundClient.minParking || 0,
              minArea: foundClient.minArea || 0,
              mustHaveFeatures: foundClient.desiredFeatures || [],
              maxPrice: foundClient.budget,
              paymentMethod: 'vista',
              hasFgts: false,
              sunOrientation: 'indiferente',
              floorPreference: 'indiferente',
              notes: foundClient.notes || ''
          }
      });
      setEditingClientId(foundClient.id);
      setFoundClient(null);
      addNotification('info', 'Dados carregados. Edite e salve para adicionar ao pipeline.');
  };

  const matchedProperties = selectedClientForMatch ? properties.filter(p => {
      const maxBudget = selectedClientForMatch.budget * (1 + matchTolerance / 100);
      const minBudget = (selectedClientForMatch.minBudget || 0) * (1 - matchTolerance / 100);

      if (p.price > maxBudget) return false;
      if (p.price < minBudget) return false;

      if (filterType !== 'all' && p.type !== filterType) return false;
      if (p.bedrooms < filterBedrooms) return false;
      if (selectedClientForMatch.minArea && p.area < selectedClientForMatch.minArea) return false;
      if (filterLocation) {
          const loc = filterLocation.toLowerCase();
          const addr = p.address.toLowerCase();
          if (!addr.includes(loc) && matchTolerance < 30) return false;
      }
      return true;
  }) : [];

  const renderFormContent = (onSubmit: any, label: string) => {
      const currentClient = editingClientId ? clients.find(c => c.id === editingClientId) : null;
      const profile = formData.interestProfile;

      const setProfileField = (field: keyof DetailedInterestProfile, value: any) => {
          setFormData(prev => ({
              ...prev,
              interestProfile: { ...prev.interestProfile, [field]: value }
          }));
      };

      return (
      <div className="p-6">
          <form onSubmit={onSubmit} className="space-y-6">
                {/* Basic Info Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
                        <User size={16} /> Dados Pessoais
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
                        <Input label="Nome" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        <div className="relative">
                            <PhoneInput 
                                label="Telefone / Celular" 
                                required 
                                value={formData.phone} 
                                onChange={handlePhoneChange} 
                                className={foundClient ? 'border-indigo-300 ring-2 ring-indigo-100' : ''}
                            />
                            {foundClient && !editingClientId && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-white border border-indigo-200 rounded-lg p-2 shadow-lg flex items-center justify-between">
                                    <span className="text-xs text-indigo-700">Encontrado: <strong>{foundClient.name}</strong></span>
                                    <Button type="button" onClick={loadExistingClient} className="text-[10px] px-2 py-0.5 h-auto">Carregar</Button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Email" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
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
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Finalidade</label>
                            <select 
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={profile.usage}
                            onChange={e => setProfileField('usage', e.target.value)}
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
                        <Input label="Quartos" type="number" value={profile.minBedrooms} onChange={e => setProfileField('minBedrooms', Number(e.target.value))} />
                        <Input label="Suítes" type="number" value={profile.minSuites} onChange={e => setProfileField('minSuites', Number(e.target.value))} />
                        <Input label="Vagas" type="number" value={profile.minParking} onChange={e => setProfileField('minParking', Number(e.target.value))} />
                        <Input label="Área Útil (m²)" type="number" value={profile.minArea} onChange={e => setProfileField('minArea', Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Diferenciais Obrigatórios</label>
                        <div className="flex flex-wrap gap-2">
                            {systemSettings.propertyFeatures.map(f => (
                                <button 
                                key={f} 
                                type="button"
                                onClick={() => toggleProfileList('mustHaveFeatures', f)}
                                className={`px-2 py-1 text-xs border rounded-full ${profile.mustHaveFeatures.includes(f) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}
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
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-xs font-medium text-slate-500">Bairros de Interesse</label>
                            <div className="flex items-center gap-2">
                                <input placeholder="Busca CEP" className="w-24 px-2 py-1 text-xs border border-slate-200 rounded" value={cepSearchInput} onChange={(e) => setCepSearchInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleCepSearch(); } }} />
                                <button type="button" onClick={handleCepSearch} disabled={isCepLoading} className="text-slate-500 hover:text-primary-600">{isCepLoading ? <Loader2 size={14} className="animate-spin"/> : <Search size={14} />}</button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input type="text" list="location-suggestions" placeholder="Add bairro..." className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm" value={locationInput} onChange={e => setLocationInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddLocation(); }}} />
                            <datalist id="location-suggestions">{systemSettings.availableLocations.map((loc, idx) => (<option key={idx} value={loc} />))}</datalist>
                            <Button type="button" variant="secondary" className="px-3 py-1" onClick={handleAddLocation}><Plus size={14} /></Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {profile.neighborhoods.map((loc, idx) => (<span key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs border border-indigo-100">{loc}<button type="button" onClick={() => removeLocation(loc)} className="hover:text-red-500"><X size={12}/></button></span>))}
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
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={profile.hasFgts} onChange={e => setProfileField('hasFgts', e.target.checked)} />
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
                            value={profile.sunOrientation}
                            onChange={e => setProfileField('sunOrientation', e.target.value)}
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
                            value={profile.floorPreference}
                            onChange={e => setProfileField('floorPreference', e.target.value)}
                            >
                                <option value="indiferente">Indiferente</option>
                                <option value="baixo">Baixo</option>
                                <option value="alto">Alto (Vista)</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Observações Gerais</label>
                        <textarea 
                        className="w-full border rounded p-2 text-sm h-20" 
                        placeholder="Ex: Cliente tem um Golden Retriever, precisa de área verde próxima..."
                        value={profile.notes}
                        onChange={e => setProfileField('notes', e.target.value)}
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={() => { setAddLeadOpen(false); setEditLeadOpen(false); }}>Cancelar</Button>
                    <Button type="submit" className="gap-2"><Save size={18} /> {label}</Button>
                </div>
          </form>

          {/* Visits Section (Only for Editing) */}
          {editingClientId && currentClient && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calendar size={20}/> Agendamento de Visitas</h3>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                      {/* ... (Add Visit Form) ... */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="relative">
                              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Imóvel (Código/Nome)</label>
                              <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar imóvel..." 
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                                    value={newVisitPropertyCode}
                                    onChange={handlePropertySearchChange}
                                />
                              </div>
                              {matchingProperties.length > 0 && (
                                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
                                      {matchingProperties.map(p => (
                                          <div 
                                            key={p.id} 
                                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                                            onClick={() => handlePropertySelect(p)}
                                          >
                                              <span className="font-bold text-slate-700">{p.code}</span> - {p.title}
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                          <div>
                              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Data e Hora</label>
                              <input 
                                type="datetime-local" 
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                value={newVisitDate}
                                onChange={e => setNewVisitDate(e.target.value)}
                              />
                          </div>
                      </div>
                      <div className="mb-3">
                          <input 
                            type="text" 
                            placeholder="Notas sobre a visita..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            value={newVisitNotes}
                            onChange={e => setNewVisitNotes(e.target.value)}
                          />
                      </div>
                      <Button onClick={handleAddVisit} className="w-full h-9 text-sm">Agendar Visita</Button>
                  </div>

                  {/* List of Visits */}
                  <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700">Histórico de Visitas</h4>
                      {(!currentClient.visits || currentClient.visits.length === 0) && (
                          <p className="text-sm text-slate-400 italic">Nenhuma visita registrada.</p>
                      )}
                      {currentClient.visits?.map((visit) => {
                          const prop = properties.find(p => p.id === visit.propertyId);
                          return (
                              <div key={visit.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-slate-800">{new Date(visit.date).toLocaleDateString()} {new Date(visit.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                          <Badge color={visit.status === 'completed' ? 'green' : visit.status === 'cancelled' ? 'red' : 'blue'}>
                                              {visit.status === 'scheduled' ? 'Agendada' : visit.status}
                                          </Badge>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                          {prop && (
                                              <button 
                                                type="button"
                                                onClick={() => setViewProperty(prop)}
                                                className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium hover:bg-indigo-100 transition-colors"
                                              >
                                                  {prop.code}
                                              </button>
                                          )}
                                          <span className="text-xs text-slate-500 truncate max-w-[200px]">{prop?.title}</span>
                                      </div>
                                      {visit.notes && <p className="text-xs text-slate-400 mt-1">Nota: {visit.notes}</p>}
                                      {visit.status === 'completed' && visit.feedback && (
                                          <div className="mt-2 p-2 bg-green-50 text-green-800 text-xs rounded border border-green-100">
                                              <strong>Feedback:</strong> {visit.feedback}
                                              {visit.liked ? <span className="ml-2 font-bold text-green-700">(Gostou)</span> : <span className="ml-2 font-bold text-red-600">(Não gostou)</span>}
                                          </div>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-1 ml-2">
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); if (currentClient) initiateVisitCompletion(currentClient, visit); }}
                                            className="text-green-600 hover:text-green-700 bg-white hover:bg-green-50 p-1 rounded-full border border-primary-200 hover:border-green-200 transition-all"
                                            title="Concluir Visita"
                                        >
                                            <CheckCircle size={14} className="pointer-events-none" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); if (currentClient) initiateReschedule(currentClient, visit); }}
                                            className="text-blue-500 hover:text-blue-700 bg-white hover:bg-blue-50 p-1 rounded-full border border-primary-200 hover:border-blue-200 transition-all"
                                            title="Editar/Reagendar"
                                        >
                                            <Edit3 size={14} className="pointer-events-none" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); if (currentClient) handleRemoveVisit(currentClient.id, visit.id); }}
                                            className="text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 p-1 rounded-full border border-slate-200 hover:border-red-200 transition-all"
                                            title="Excluir Visita"
                                        >
                                            <Trash2 size={14} className="pointer-events-none" />
                                        </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          )}
      </div>
      )
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-9rem)]">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        {/* ... (Header content unchanged) ... */}
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Pipeline de Vendas</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
                <select 
                    value={currentPipelineId}
                    onChange={(e) => setCurrentPipelineId(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2 font-medium min-w-[200px]"
                >
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

                {isStaff && (
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 pr-2">
                        <div className="bg-slate-100 p-1.5 rounded text-slate-500">
                            <Users size={14} />
                        </div>
                        <select 
                            value={ownerFilter}
                            onChange={(e) => setOwnerFilter(e.target.value)}
                            className="bg-transparent border-none text-sm text-slate-600 focus:ring-0 cursor-pointer outline-none min-w-[180px]"
                        >
                            <option value="">Visão Global (Todos)</option>
                            <option value={currentUser?.id}>Meus Leads (Próprio CRM)</option>
                            <hr />
                            {users.filter(u => u.id !== currentUser?.id).map(u => (
                                <option key={u.id} value={u.id}>
                                    CRM de {u.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {isAdmin && (
                    <button 
                        onClick={() => setIsManagingPipelines(true)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded border border-transparent hover:border-primary-100"
                        title="Gerenciar Pipelines"
                    >
                        <Settings size={18} />
                    </button>
                )}
            </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
             <Button onClick={handleQuickAdd} className="flex-1 md:flex-none">
                 <Plus size={18} /> Novo Lead
             </Button>
             <Button 
                variant="secondary"
                onClick={handleInsights}
                className="flex-1 md:flex-none w-full md:w-auto"
            >
                <Sparkles size={16} /> Insights IA
             </Button>
        </div>
      </div>
      
      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory px-0.5">
        {currentPipeline?.stages.map((stage, index) => (
             <div className="snap-center" key={stage.id}>
                <KanbanColumn 
                    stage={stage}
                    clients={pipelineClients.filter(c => c.stage === stage.id)}
                    onUpdate={updateClient}
                    onDelete={handleDeleteClient}
                    onMatch={handleOpenMatch}
                    onLink={handleOpenLinkModal}
                    onQuickVisit={handleOpenQuickVisit}
                    onInsights={handleLeadInsights}
                    onEdit={handleOpenEdit}
                    isFirst={index === 0}
                    onQuickAdd={handleQuickAdd}
                    onViewProperty={setViewProperty}
                    onCompleteVisit={initiateVisitCompletion}
                    onRescheduleVisit={initiateReschedule}
                    onRemoveVisit={handleRemoveVisit}
                    onDropClient={handleDropClient}
                />
            </div>
        ))}
        
        {/* FIXED LOST COLUMN */}
        <div className="snap-center">
            <KanbanColumn 
                stage={{ id: 'lost_zone', name: 'Perdidos / Arquivar', color: 'border-red-400', order: 999 }}
                clients={[]} // Always empty display, purely functional
                onUpdate={updateClient}
                onDelete={handleDeleteClient}
                onMatch={handleOpenMatch}
                onLink={handleOpenLinkModal}
                onQuickVisit={handleOpenQuickVisit}
                onInsights={handleLeadInsights}
                onEdit={handleOpenEdit}
                isFirst={false}
                onQuickAdd={handleQuickAdd}
                onViewProperty={setViewProperty}
                onCompleteVisit={initiateVisitCompletion}
                onRescheduleVisit={initiateReschedule}
                onRemoveVisit={handleRemoveVisit}
                onDropClient={handleDropClient}
            />
        </div>

        {(!currentPipeline || currentPipeline.stages.length === 0) && (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                    <Filter size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Este pipeline não possui etapas configuradas.</p>
                </div>
            </div>
        )}
      </div>

      {/* --- Other Modals remain unchanged, just ensuring state persistence --- */}
      
      {/* LOST REASON MODAL */}
      {lostModalOpen && clientToMarkLost && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-red-100 flex justify-between items-center bg-red-50 rounded-t-2xl">
                      <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
                          <Archive size={20} className="text-red-600"/> Arquivar Lead
                      </h2>
                      <button onClick={() => setLostModalOpen(false)} className="text-red-600/70 hover:text-red-800"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
                          <p>O lead sairá do pipeline atual, mas todo o histórico será preservado na base de leads.</p>
                      </div>
                      <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Motivo da Perda (Obrigatório)</label>
                          <textarea 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 h-24"
                            placeholder="Ex: Comprou com concorrente, desistiu da compra, sem orçamento..."
                            value={lostReason}
                            onChange={e => setLostReason(e.target.value)}
                            autoFocus
                          />
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
                      <Button variant="outline" onClick={() => setLostModalOpen(false)} className="text-xs h-9">Cancelar</Button>
                      <Button onClick={confirmMarkAsLost} className="bg-red-600 hover:bg-red-700 text-white text-xs h-9">Confirmar Perda</Button>
                  </div>
              </div>
          </div>
      )}

      {/* Link Property Modal */}
      {linkPropertyModalOpen && selectedClientForLink && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
                  {/* ... (Keep content as is) ... */}
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50 rounded-t-2xl">
                      <div>
                          <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                              <Link size={20} /> Vincular Imóveis
                          </h2>
                          <p className="text-sm text-indigo-700">Lead: <strong>{selectedClientForLink.name}</strong></p>
                      </div>
                      <button onClick={() => setLinkPropertyModalOpen(false)} className="text-indigo-600/70 hover:text-indigo-800"><X size={24}/></button>
                  </div>
                  
                  <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar código ou título do imóvel..." 
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                                value={linkSearchCode}
                                onChange={handleLinkSearchChange}
                            />
                        </div>
                        {linkMatchingProperties.length > 0 && (
                            <div className="absolute left-4 right-4 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto mt-1">
                                {linkMatchingProperties.map(p => (
                                    <div 
                                        key={p.id} 
                                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm flex justify-between items-center"
                                        onClick={() => toggleLinkedProperty(p.id)}
                                    >
                                        <span><span className="font-bold">{p.code}</span> - {p.title}</span>
                                        {selectedClientForLink.interestedPropertyIds?.includes(p.id) ? 
                                            <span className="text-green-600 font-bold text-xs">Vinculado</span> : 
                                            <span className="text-slate-400 text-xs">Selecionar</span>
                                        }
                                    </div>
                                ))}
                            </div>
                        )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase">Imóveis Vinculados</h4>
                      {(selectedClientForLink.interestedPropertyIds || []).length === 0 ? (
                          <p className="text-sm text-slate-400 italic">Nenhum imóvel vinculado.</p>
                      ) : (
                          (selectedClientForLink.interestedPropertyIds || []).map(id => {
                              const prop = properties.find(p => p.id === id);
                              if (!prop) return null;
                              return (
                                  <div key={id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                                      <div>
                                          <div className="font-bold text-slate-800 text-sm">{prop.code}</div>
                                          <div className="text-xs text-slate-500 truncate max-w-[250px]">{prop.title}</div>
                                      </div>
                                      <button 
                                        type="button"
                                        onClick={() => toggleLinkedProperty(id)}
                                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full"
                                        title="Desvincular"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              );
                          })
                      )}
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 flex justify-end">
                      <Button onClick={() => setLinkPropertyModalOpen(false)}>Concluir</Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- Quick Visit Modal --- */}
      {quickVisitModalOpen && selectedClientForVisit && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50 rounded-t-2xl">
                      <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                          <CalendarPlus size={20} className="text-blue-600"/> Nova Visita
                      </h2>
                      <button onClick={() => setQuickVisitModalOpen(false)} className="text-blue-600/70 hover:text-blue-800"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600">Agendando para <strong>{selectedClientForVisit.name}</strong></p>
                      <div className="relative">
                          <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Imóvel</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar código..." 
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                                value={newVisitPropertyCode}
                                onChange={handlePropertySearchChange}
                            />
                          </div>
                          {matchingProperties.length > 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
                                  {matchingProperties.map(p => (
                                      <div 
                                        key={p.id} 
                                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                                        onClick={() => handlePropertySelect(p)}
                                      >
                                          <span className="font-bold text-slate-700">{p.code}</span> - {p.title}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                      <div>
                          <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Data e Hora</label>
                          <input 
                            type="datetime-local" 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            value={newVisitDate}
                            onChange={e => setNewVisitDate(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Notas</label>
                          <input 
                            type="text" 
                            placeholder="Observações..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            value={newVisitNotes}
                            onChange={e => setNewVisitNotes(e.target.value)}
                          />
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
                      <Button variant="outline" onClick={() => setQuickVisitModalOpen(false)} className="text-xs h-9">Cancelar</Button>
                      <Button onClick={submitQuickVisit} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9">Agendar</Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- Lead Commercial Insights Modal --- */}
      {leadInsightsModalOpen && insightTargetClient && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b border-amber-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-white rounded-t-2xl">
                      <div>
                          <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                              <Sparkles size={24} className="text-amber-500" fill="currentColor" /> 
                              Estratégia Comercial IA
                          </h2>
                          <p className="text-sm text-amber-700">Lead: <strong>{insightTargetClient.name}</strong></p>
                      </div>
                      <button onClick={() => setLeadInsightsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto">
                      {loadingLeadInsights ? (
                          <div className="flex flex-col items-center justify-center py-12 space-y-4">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                              <p className="text-slate-500 font-medium animate-pulse">A IA está analisando o perfil e encontrando o imóvel perfeito...</p>
                          </div>
                      ) : (
                          <div className="prose prose-sm prose-amber max-w-none text-slate-700 leading-relaxed">
                              <div dangerouslySetInnerHTML={{ __html: currentLeadInsights }} />
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
                      <span className="text-xs text-slate-400">Gerado por Gemini AI</span>
                      <Button onClick={() => setLeadInsightsModalOpen(false)}>Entendi, vou aplicar!</Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- Pipeline Management Modal (Admin Only) --- */}
      {isManagingPipelines && isAdmin && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                     <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                         <Settings size={20} /> Gerenciar Pipelines
                     </h2>
                     <button onClick={() => setIsManagingPipelines(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                 </div>
                 
                 <div className="p-6 overflow-y-auto flex-1 space-y-8">
                     {/* 1. Pipelines List */}
                     <section>
                         <h3 className="font-semibold text-slate-800 mb-3">Seus Pipelines</h3>
                         <div className="flex gap-2 mb-4">
                             <Input 
                                placeholder="Nome do novo pipeline..." 
                                value={newPipelineName} 
                                onChange={(e) => setNewPipelineName(e.target.value)}
                                className="flex-1"
                             />
                             <Button onClick={() => { if(newPipelineName) { addPipeline(newPipelineName); setNewPipelineName(''); }}}>Criar</Button>
                         </div>
                         <div className="space-y-2">
                             {pipelines.map(p => (
                                 <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border ${p.id === currentPipelineId ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-200'}`}>
                                     <div className="flex items-center gap-3">
                                         <span className="font-medium text-slate-700">{p.name}</span>
                                         {p.isDefault && <Badge color="blue">Padrão</Badge>}
                                     </div>
                                     <div className="flex gap-2">
                                         <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => setCurrentPipelineId(p.id)}>Editar Etapas</Button>
                                         {!p.isDefault && (
                                             <button onClick={() => deletePipeline(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16} /></button>
                                         )}
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </section>

                     {/* 2. Stages Editor for Selected Pipeline */}
                     {currentPipeline && (
                         <section className="border-t border-slate-100 pt-6">
                             <h3 className="font-semibold text-slate-800 mb-3">Etapas do Pipeline: <span className="text-primary-600">{currentPipeline.name}</span></h3>
                             <div className="flex gap-2 mb-4">
                                 <Input 
                                    placeholder="Nome da nova etapa..." 
                                    value={newStageName} 
                                    onChange={(e) => setNewStageName(e.target.value)}
                                    className="flex-1"
                                 />
                                 <Button onClick={() => { if(newStageName) { addPipelineStage(currentPipeline.id, newStageName); setNewStageName(''); }}}>Adicionar Etapa</Button>
                             </div>
                             
                             <div className="space-y-2">
                                 {currentPipeline.stages.map((stage, idx) => (
                                     <div key={stage.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                         <div className={`w-3 h-10 rounded ${stage.color.replace('border-', 'bg-')}`}></div>
                                         <div className="flex-1">
                                             <input 
                                                className="bg-transparent font-medium text-slate-700 w-full focus:outline-none focus:border-b focus:border-primary-500"
                                                value={stage.name}
                                                onChange={(e) => updatePipelineStage(currentPipeline.id, stage.id, { name: e.target.value })}
                                             />
                                         </div>
                                         <div className="flex items-center gap-1">
                                            {/* Order buttons could be added here */}
                                            <button onClick={() => deletePipelineStage(currentPipeline.id, stage.id)} className="text-red-400 hover:text-red-600 p-2"><X size={16} /></button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </section>
                     )}
                 </div>
             </div>
          </div>
      )}

      {/* --- Reschedule Visit Modal --- */}
      {reschedulingVisit && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50 rounded-t-2xl">
                      <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                          <Calendar size={20} className="text-blue-600"/> Reagendar
                      </h2>
                      <button onClick={() => setReschedulingVisit(null)} className="text-blue-600/70 hover:text-blue-800"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Nova Data e Hora</label>
                          <input 
                            type="datetime-local" 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                            value={rescheduleData.date}
                            onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Nota Atualizada</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Motivo da mudança..."
                            value={rescheduleData.notes}
                            onChange={e => setRescheduleData({...rescheduleData, notes: e.target.value})}
                          />
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
                      <Button variant="outline" onClick={() => setReschedulingVisit(null)} className="text-xs h-9">Cancelar</Button>
                      <Button onClick={submitReschedule} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9">Salvar Alteração</Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- Visit Completion Modal --- */}
      {completingVisit && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-green-50 rounded-t-2xl">
                      <h2 className="text-xl font-bold text-green-900 flex items-center gap-2">
                          <CheckCircle size={24} className="text-green-600"/> Concluir Visita
                      </h2>
                      <button onClick={() => setCompletingVisit(null)} className="text-green-600/70 hover:text-green-800"><X size={24}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600">Registre o feedback da visita com <strong>{completingVisit.client.name}</strong>.</p>
                      
                      <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">Resultado Geral</label>
                          <textarea 
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 h-20 text-sm focus:ring-2 focus:ring-green-500/20"
                              placeholder="Como foi a visita? O cliente demonstrou interesse?"
                              value={visitFeedback.feedback}
                              onChange={e => setVisitFeedback({...visitFeedback, feedback: e.target.value})}
                          ></textarea>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-700">Pontos Positivos</label>
                              <textarea 
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 h-20 text-sm focus:ring-2 focus:ring-green-500/20"
                                  placeholder="O que ele gostou?"
                                  value={visitFeedback.positive}
                                  onChange={e => setVisitFeedback({...visitFeedback, positive: e.target.value})}
                              ></textarea>
                          </div>
                          <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-700">Pontos Negativos</label>
                              <textarea 
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 h-20 text-sm focus:ring-2 focus:ring-green-500/20"
                                  placeholder="O que ele não gostou?"
                                  value={visitFeedback.negative}
                                  onChange={e => setVisitFeedback({...visitFeedback, negative: e.target.value})}
                              ></textarea>
                          </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <span className="text-sm font-medium text-slate-700">O cliente gostou do imóvel?</span>
                          <div className="flex gap-2">
                              <button 
                                type="button"
                                onClick={() => setVisitFeedback({...visitFeedback, liked: true})}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${visitFeedback.liked ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                              >
                                  <ThumbsUp size={14} className="pointer-events-none" /> Sim
                              </button>
                              <button 
                                type="button"
                                onClick={() => setVisitFeedback({...visitFeedback, liked: false})}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!visitFeedback.liked ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                              >
                                  <ThumbsDown size={14} className="pointer-events-none" /> Não
                              </button>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                      <Button variant="outline" onClick={() => confirmVisitCompletion(false)}>
                          Concluir e Manter
                      </Button>
                      <Button onClick={() => confirmVisitCompletion(true)} className="bg-green-600 hover:bg-green-700 text-white">
                          Concluir e Avançar Etapa
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* Re-use existing Modals (Insights, Add Lead, Match) */}
      {insightsOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-indigo-600" size={24} />
                        <h2 className="text-xl font-bold text-indigo-900">IA Pipeline Insights</h2>
                    </div>
                    <button onClick={() => setInsightsOpen(false)} className="text-indigo-400 hover:text-indigo-600"><X size={24} /></button>
                </div>
                <div className="p-6">
                    {loadingInsights ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                            <p className="text-slate-500 text-sm">Analisando pipeline atual...</p>
                        </div>
                    ) : (
                        <div className="prose prose-sm prose-indigo text-slate-700" dangerouslySetInnerHTML={{ __html: insights }} />
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end">
                    <Button onClick={() => setInsightsOpen(false)}>Fechar</Button>
                </div>
            </div>
        </div>
      )}

      {/* Add Lead Modal (Simplified for CRM Context) */}
      {addLeadOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800">Novo Lead</h2>
                    <button onClick={() => setAddLeadOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                  </div>
                  {renderFormContent(handleManualSubmit, editingClientId ? 'Salvar e Mover' : 'Salvar e Adicionar')}
              </div>
          </div>
      )}

      {/* Edit Lead Modal */}
      {editLeadOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50 rounded-t-2xl sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                        <Edit3 size={20} /> Editar Lead
                    </h2>
                    <button onClick={() => setEditLeadOpen(false)} className="text-indigo-400 hover:text-indigo-600"><X size={24}/></button>
                </div>
                 {renderFormContent(handleUpdateLead, 'Salvar Alterações')}
            </div>
        </div>
      )}

      {/* Match Modal */}
      {matchModalOpen && selectedClientForMatch && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-indigo-50 rounded-t-2xl">
                     <div>
                         <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                             <Sparkles size={24} className="text-indigo-500" /> Smart Match
                         </h2>
                         <p className="text-indigo-700 text-sm mt-1">Buscando para <strong>{selectedClientForMatch.name}</strong></p>
                     </div>
                     <button onClick={() => setMatchModalOpen(false)} className="text-indigo-400 hover:text-indigo-600"><X size={24} /></button>
                 </div>
                 {/* Filters and List... (Condensed for brevity, same logic as provided previously) */}
                 <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                     {matchedProperties.length === 0 ? (
                         <div className="text-center p-8 text-slate-400">Nenhum imóvel encontrado.</div>
                     ) : (
                         <div className="grid grid-cols-1 gap-4">
                             {matchedProperties.map(p => (
                                 <Card key={p.id} className="flex p-4 gap-4">
                                     <img src={p.images?.[0] || 'https://via.placeholder.com/200'} className="w-24 h-24 object-cover rounded-lg" alt="" />
                                     <div className="flex-1">
                                         <h3 className="font-bold">{p.title}</h3>
                                         <p className="text-sm text-slate-500">{new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(p.price)}</p>
                                         
                                         {analyzingPropertyId === p.id ? (
                                            <div className="mt-2 text-xs text-indigo-600 flex items-center gap-1 animate-pulse">
                                                <Loader2 size={12} className="animate-spin" /> Inteligência Artificial analisando...
                                            </div>
                                         ) : analysisResults[p.id] ? (
                                            <div className="mt-2 text-xs p-2 bg-indigo-50 rounded text-indigo-800 border border-indigo-100 animate-in fade-in zoom-in duration-200">
                                                <div className="flex items-center gap-1 font-bold mb-1 text-indigo-900">
                                                    <Sparkles size={10} /> {analysisResults[p.id].score}% de Compatibilidade
                                                </div>
                                                {analysisResults[p.id].reason}
                                            </div>
                                         ) : (
                                            <Button variant="outline" className="mt-2 text-xs w-full hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200" onClick={() => handleRunAiAnalysis(p)}>
                                                <Sparkles size={12} /> Analisar Compatibilidade
                                            </Button>
                                         )}
                                     </div>
                                 </Card>
                             ))}
                         </div>
                     )}
                 </div>
             </div>
         </div>
      )}

      {/* Property Detail Modal */}
      {viewProperty && (
          <PropertyDetailModal 
            property={viewProperty}
            onClose={() => setViewProperty(null)}
            // Only allow edit if user is staff or owner (reusing logic implicitly handled in modal but passing props just in case)
            isStaff={isStaff}
            isBroker={isBroker}
            currentUser={currentUser}
          />
      )}
    </div>
  );
};