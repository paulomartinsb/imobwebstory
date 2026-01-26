import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Client, Pipeline, Visit, Property } from '../types';
import { Card, Button, Input, Badge } from '../components/ui/Elements';
import { 
    Calendar, CheckCircle, Clock, MoreHorizontal, Phone, Mail, 
    ArrowRight, Archive, X, ThumbsUp, ThumbsDown, Plus, Filter,
    Sparkles, AlertCircle, Search, User
} from 'lucide-react';
import { generateLeadCommercialInsights, generatePipelineInsights } from '../services/geminiService';

export const CRMPage: React.FC = () => {
  const { clients, pipelines, properties, addVisit, updateVisit, moveClientToPipeline, markLeadAsLost, addNotification, systemSettings } = useStore();
  
  // States
  const [selectedPipelineId, setSelectedPipelineId] = useState(pipelines[0]?.id || '');
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);

  // Quick Visit Modal State
  const [quickVisitModalOpen, setQuickVisitModalOpen] = useState(false);
  const [selectedClientForVisit, setSelectedClientForVisit] = useState<Client | null>(null);
  const [newVisitDate, setNewVisitDate] = useState('');
  const [newVisitPropertyCode, setNewVisitPropertyCode] = useState('');
  const [newVisitNotes, setNewVisitNotes] = useState('');

  // Complete Visit Modal State
  const [completingVisit, setCompletingVisit] = useState<{ client: Client, visit: Visit } | null>(null);
  const [visitFeedback, setVisitFeedback] = useState({ feedback: '', positive: '', negative: '', liked: true });

  // Lost Lead Modal State
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [clientToMarkLost, setClientToMarkLost] = useState<Client | null>(null);
  const [lostReason, setLostReason] = useState('');

  // AI Insights State
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [globalInsights, setGlobalInsights] = useState<string | null>(null);
  const [cardInsights, setCardInsights] = useState<Record<string, string>>({});
  const [loadingCardInsight, setLoadingCardInsight] = useState<string | null>(null);

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || pipelines[0];

  // Helper to filter clients by pipeline
  const pipelineClients = useMemo(() => {
      if (!selectedPipeline) return [];
      return clients.filter(c => c.pipelineId === selectedPipeline.id && !c.lostReason);
  }, [clients, selectedPipeline]);

  // Drag & Drop Handlers (HTML5)
  const handleDragStart = (e: React.DragEvent, clientId: string) => {
      setDraggedClientId(clientId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
      e.preventDefault();
      if (draggedClientId && selectedPipeline) {
          moveClientToPipeline(draggedClientId, selectedPipeline.id, stageId);
      }
      setDraggedClientId(null);
  };

  // Actions
  const handleScheduleVisit = () => {
      if(!selectedClientForVisit || !newVisitDate || !newVisitPropertyCode) {
          addNotification('error', 'Preencha a data e o imóvel.');
          return;
      }
      const property = properties.find(p => p.code === newVisitPropertyCode);
      if(!property) {
          addNotification('error', 'Imóvel não encontrado.');
          return;
      }
      addVisit(selectedClientForVisit.id, {
          date: newVisitDate,
          propertyId: property.id,
          status: 'scheduled',
          notes: newVisitNotes
      });
      setQuickVisitModalOpen(false);
      setSelectedClientForVisit(null);
      setNewVisitDate('');
      setNewVisitPropertyCode('');
      setNewVisitNotes('');
  }

  const handleConfirmCompleteVisit = () => {
      if(!completingVisit) return;
      const { client, visit } = completingVisit;

      updateVisit(client.id, visit.id, {
          status: 'completed',
          feedback: visitFeedback.feedback,
          positivePoints: visitFeedback.positive,
          negativePoints: visitFeedback.negative,
          liked: visitFeedback.liked
      });

      addNotification('success', 'Visita concluída e feedback registrado!');
      setCompletingVisit(null);
      setVisitFeedback({ feedback: '', positive: '', negative: '', liked: true });
  }

  const confirmMarkAsLost = () => {
      if (!clientToMarkLost || !lostReason) {
          addNotification('error', 'Informe o motivo.');
          return;
      }
      markLeadAsLost(clientToMarkLost.id, lostReason);
      setLostModalOpen(false);
      setClientToMarkLost(null);
      setLostReason('');
  }

  const handleGenerateGlobalInsights = async () => {
      setIsGeneratingInsights(true);
      const text = await generatePipelineInsights(pipelineClients, systemSettings.crmGlobalInsightsPrompt);
      setGlobalInsights(text);
      setIsGeneratingInsights(false);
  }

  const handleGenerateCardInsight = async (client: Client) => {
      setLoadingCardInsight(client.id);
      const text = await generateLeadCommercialInsights(client, properties, systemSettings.crmCardInsightsPrompt);
      setCardInsights(prev => ({ ...prev, [client.id]: text }));
      setLoadingCardInsight(null);
  }

  // Render Kanban Board
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">CRM de Vendas</h1>
                <p className="text-slate-500">Gestão visual do funil de vendas.</p>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" onClick={handleGenerateGlobalInsights} disabled={isGeneratingInsights} className="gap-2">
                    <Sparkles size={16} className={isGeneratingInsights ? 'animate-pulse text-purple-600' : 'text-purple-600'} />
                    {isGeneratingInsights ? 'Analisando...' : 'IA Insights'}
                </Button>
                <select 
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-primary-500/20"
                    value={selectedPipelineId}
                    onChange={(e) => setSelectedPipelineId(e.target.value)}
                >
                    {pipelines.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Global Insights Panel */}
        {globalInsights && (
            <div className="mb-6 bg-purple-50 border border-purple-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-start">
                     <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2 mb-2">
                         <Sparkles size={16} /> Insights Estratégicos (IA)
                     </h3>
                     <button onClick={() => setGlobalInsights(null)} className="text-purple-400 hover:text-purple-600"><X size={16}/></button>
                </div>
                <div className="text-sm text-purple-900/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: globalInsights }} />
            </div>
        )}

        {/* Kanban Board */}
        {selectedPipeline && (
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex h-full gap-4 min-w-[1000px]">
                    {selectedPipeline.stages.sort((a,b) => a.order - b.order).map(stage => {
                        const stageClients = pipelineClients.filter(c => c.stage === stage.id);
                        const totalValue = stageClients.reduce((acc, c) => acc + c.budget, 0);

                        return (
                            <div 
                                key={stage.id} 
                                className="flex-1 min-w-[280px] max-w-[350px] flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                {/* Stage Header */}
                                <div className={`p-3 border-b-2 ${stage.color ? stage.color.replace('border-', 'border-b-') : 'border-b-slate-300'} bg-white rounded-t-xl`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="font-bold text-slate-700">{stage.name}</h3>
                                        <span className="text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{stageClients.length}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 font-medium">
                                        Vol: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalValue)}
                                    </div>
                                </div>

                                {/* Cards Container */}
                                <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                                    {stageClients.map(client => {
                                        const pendingVisits = client.visits.filter(v => v.status === 'scheduled').length;
                                        const lastContactDate = new Date(client.lastContact);
                                        const daysSinceContact = Math.floor((new Date().getTime() - lastContactDate.getTime()) / (1000 * 3600 * 24));
                                        
                                        // Aging Color Logic
                                        let agingColor = systemSettings.leadAging.freshColor; // Default Green
                                        if (daysSinceContact > systemSettings.leadAging.warmLimit) agingColor = systemSettings.leadAging.coldColor;
                                        else if (daysSinceContact > systemSettings.leadAging.freshLimit) agingColor = systemSettings.leadAging.warmColor;

                                        const agingClass = {
                                            'green': 'bg-green-500',
                                            'yellow': 'bg-yellow-500',
                                            'red': 'bg-red-500',
                                            'blue': 'bg-blue-500',
                                            'purple': 'bg-purple-500',
                                            'gray': 'bg-slate-500',
                                            'orange': 'bg-orange-500'
                                        }[agingColor] || 'bg-slate-500';

                                        return (
                                            <div 
                                                key={client.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, client.id)}
                                                className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group relative"
                                            >
                                                {/* Card Insight Overlay (If generated) */}
                                                {cardInsights[client.id] && (
                                                    <div className="mb-3 p-2 bg-purple-50 rounded border border-purple-100 text-xs text-purple-800">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold flex items-center gap-1"><Sparkles size={10}/> Dica IA</span>
                                                            <button onClick={() => setCardInsights(prev => { const n = {...prev}; delete n[client.id]; return n; })}><X size={10}/></button>
                                                        </div>
                                                        <div dangerouslySetInnerHTML={{ __html: cardInsights[client.id] }} />
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{client.name}</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{client.phone}</p>
                                                    </div>
                                                    <div className={`w-2 h-2 rounded-full ${agingClass}`} title={`${daysSinceContact} dias sem contato`}></div>
                                                </div>

                                                <div className="flex items-center gap-2 mb-3">
                                                    <Badge color="gray">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(client.budget)}</Badge>
                                                    {pendingVisits > 0 && <Badge color="blue">{pendingVisits} Visita(s)</Badge>}
                                                </div>

                                                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                                    <div className="flex gap-1">
                                                        <button 
                                                            onClick={() => { setSelectedClientForVisit(client); setQuickVisitModalOpen(true); }}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Agendar Visita"
                                                        >
                                                            <Calendar size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleGenerateCardInsight(client)}
                                                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                            title="Gerar Estratégia IA"
                                                            disabled={loadingCardInsight === client.id}
                                                        >
                                                            {loadingCardInsight === client.id ? <Clock size={14} className="animate-spin"/> : <Sparkles size={14} />}
                                                        </button>
                                                        <button 
                                                            onClick={() => { setClientToMarkLost(client); setLostModalOpen(true); }}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                            title="Marcar como Perdido"
                                                        >
                                                            <Archive size={14} />
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Show Pending Visits Completion Button */}
                                                    {client.visits.some(v => v.status === 'scheduled' && new Date(v.date) <= new Date()) && (
                                                         <button 
                                                            onClick={() => {
                                                                const visit = client.visits.find(v => v.status === 'scheduled' && new Date(v.date) <= new Date());
                                                                if(visit) setCompletingVisit({ client, visit });
                                                            }}
                                                            className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded hover:bg-green-100 flex items-center gap-1 animate-pulse"
                                                         >
                                                             <CheckCircle size={10} /> Concluir Visita
                                                         </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* SCHEDULE VISIT MODAL */}
        {quickVisitModalOpen && selectedClientForVisit && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Calendar size={20} className="text-primary-600"/> Agendar Visita
                        </h3>
                        <button onClick={() => setQuickVisitModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                    </div>
                    <div className="space-y-4">
                        <Input 
                            label="Data e Hora" 
                            type="datetime-local" 
                            value={newVisitDate} 
                            onChange={e => setNewVisitDate(e.target.value)} 
                        />
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Código do Imóvel</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
                                    placeholder="Ex: IMOB-123"
                                    value={newVisitPropertyCode}
                                    onChange={e => setNewVisitPropertyCode(e.target.value)}
                                />
                            </div>
                        </div>
                        <Input 
                            label="Notas (Opcional)" 
                            placeholder="Ex: Levar chaves..."
                            value={newVisitNotes}
                            onChange={e => setNewVisitNotes(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setQuickVisitModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleScheduleVisit}>Agendar</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* LOST LEAD MODAL (Confirmation) */}
        {lostModalOpen && clientToMarkLost && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                            <Archive size={20} /> Marcar como Perdido
                        </h3>
                        <button onClick={() => setLostModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Você está movendo este lead para o arquivo morto. Por favor, informe o motivo da perda para melhorar nossas estatísticas.
                        </p>
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Motivo da Perda</label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                value={lostReason}
                                onChange={(e) => setLostReason(e.target.value)}
                            >
                                <option value="">-- Selecione --</option>
                                <option value="Preço alto">Preço alto</option>
                                <option value="Localização ruim">Localização indesejada</option>
                                <option value="Comprou com concorrente">Comprou com concorrente</option>
                                <option value="Desistiu da compra">Desistiu da compra</option>
                                <option value="Sem contato">Sem resposta/contato</option>
                                <option value="Reprovado financiamento">Reprovado no financiamento</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setLostModalOpen(false)}>Cancelar</Button>
                            <Button variant="danger" onClick={confirmMarkAsLost}>Confirmar Perda</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* COMPLETE VISIT MODAL */}
        {completingVisit && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <CheckCircle size={20} className="text-green-600"/> Concluir Visita
                        </h3>
                        <button onClick={() => setCompletingVisit(null)}><X size={20} className="text-slate-400"/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Registre o feedback do cliente <span className="font-semibold text-slate-700">{completingVisit.client.name}</span> sobre a visita realizada.
                        </p>

                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-sm font-medium text-slate-700">O cliente gostou do imóvel?</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setVisitFeedback({...visitFeedback, liked: true})}
                                    className={`p-2 rounded-lg transition-colors ${visitFeedback.liked ? 'bg-green-100 text-green-700 ring-1 ring-green-600' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                                >
                                    <ThumbsUp size={20} />
                                </button>
                                <button 
                                    onClick={() => setVisitFeedback({...visitFeedback, liked: false})}
                                    className={`p-2 rounded-lg transition-colors ${!visitFeedback.liked ? 'bg-red-100 text-red-700 ring-1 ring-red-600' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                                >
                                    <ThumbsDown size={20} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Feedback Geral</label>
                            <textarea 
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-20"
                                placeholder="O que o cliente achou?"
                                value={visitFeedback.feedback}
                                onChange={e => setVisitFeedback({...visitFeedback, feedback: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Input 
                                label="Pontos Positivos" 
                                placeholder="Ex: Vista, Sala"
                                value={visitFeedback.positive}
                                onChange={e => setVisitFeedback({...visitFeedback, positive: e.target.value})}
                            />
                            <Input 
                                label="Pontos Negativos" 
                                placeholder="Ex: Preço, Ruído"
                                value={visitFeedback.negative}
                                onChange={e => setVisitFeedback({...visitFeedback, negative: e.target.value})}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setCompletingVisit(null)}>Cancelar</Button>
                            <Button onClick={handleConfirmCompleteVisit}>Salvar Feedback</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};