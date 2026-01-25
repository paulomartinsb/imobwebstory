import React, { useState } from 'react';
import { Card } from '../components/ui/Elements';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Building, Users, Banknote, FileSignature, TrendingUp, Calendar, Clock, MapPin, User, ChevronRight, ChevronLeft, Filter } from 'lucide-react';
import { useStore } from '../store';

const MetricCard = ({ title, value, icon: Icon, trend, subtext }: any) => (
  <Card className="p-6 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp size={16} />
            <span>{trend} vs mês anterior</span>
          </div>
      )}
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
    </div>
    <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
      <Icon size={24} />
    </div>
  </Card>
);

export const DashboardPage: React.FC = () => {
  const { properties, clients, currentUser, users } = useStore();
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const isAdmin = currentUser?.role === 'admin';
  
  // --- Filtering Logic ---
  const activeBrokerId = isAdmin ? selectedBrokerId : currentUser?.id;

  const filteredProperties = activeBrokerId === 'all' 
    ? properties 
    : properties.filter(p => p.authorId === activeBrokerId);

  const filteredClients = activeBrokerId === 'all'
    ? clients
    : clients.filter(c => c.ownerId === activeBrokerId);

  // --- Metrics Calculation ---
  const pendingProperties = filteredProperties.filter(p => p.status === 'pending_approval').length;
  const activeProperties = filteredProperties.filter(p => p.status === 'published').length;
  const activeLeads = filteredClients.length; // Simply count all leads in pipeline for now
  
  // VGV: Sum of Price of Active/Published Properties (Inventory Value)
  const vgvTotal = filteredProperties
    .filter(p => p.status === 'published')
    .reduce((acc, curr) => acc + curr.price, 0);

  // --- Calendar & Visits Logic ---
  // Get ALL visits from filtered clients
  const allVisits = filteredClients.flatMap(client => {
      return (client.visits || [])
        .filter(v => v.status !== 'cancelled') // Exclude cancelled visits
        .map(visit => {
          const property = properties.find(p => p.id === visit.propertyId);
          
          // Better location extraction logic
          let locationDisplay = 'Local a definir';
          if (property) {
              // Try explicit fields first, fall back to parsing address
              if (property.neighborhood) {
                  locationDisplay = `${property.neighborhood}${property.city ? ' - ' + property.city : ''}`;
              } else if (property.address) {
                  // Fallback: Try to grab the part after " - " which usually contains neighborhood/city in our format
                  const parts = property.address.split(' - ');
                  locationDisplay = parts.length > 1 ? parts[1] : property.address; 
              }
          } else if (client.desiredLocation && client.desiredLocation.length > 0) {
              locationDisplay = client.desiredLocation[0];
          }

          return {
              id: visit.id,
              clientName: client.name,
              date: new Date(visit.date),
              propertyCode: property?.code || 'S/ Ref',
              location: locationDisplay
          };
      });
  }).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Week Logic (Precise Start/End)
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  // Filter visits for this week
  const visitsThisWeek = allVisits.filter(v => v.date >= startOfWeek && v.date <= endOfWeek);

  // Month Logic for Calendar
  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      return { days, firstDay };
  };

  const { days: daysInMonth, firstDay: startDayOffset } = getDaysInMonth(currentMonth);
  
  const renderCalendarDays = () => {
      const days = [];
      // Empty slots for start offset
      for(let i = 0; i < startDayOffset; i++) {
          days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/50 border border-slate-100"></div>);
      }
      
      // Actual Days
      for(let d = 1; d <= daysInMonth; d++) {
          const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
          const isToday = currentDate.toDateString() === new Date().toDateString();
          
          // Filter visits for this specific day
          const dayVisits = allVisits.filter(v => v.date.toDateString() === currentDate.toDateString());

          days.push(
              <div key={d} className={`h-24 border border-slate-100 p-2 relative group hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}>
                  <span className={`text-sm font-medium ${isToday ? 'text-primary-600 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-500'}`}>
                      {d}
                  </span>
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[50px] custom-scrollbar">
                      {dayVisits.map((v) => (
                          <div key={v.id} className="text-[10px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded truncate cursor-help" title={`${v.clientName} - ${v.propertyCode}`}>
                              {v.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {v.clientName}
                          </div>
                      ))}
                  </div>
              </div>
          );
      }
      return days;
  };

  const chartData = [
      { name: 'Total Leads', value: activeLeads },
      { name: 'Imóveis Ativos', value: activeProperties },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-slate-500">Visão geral do desempenho e atividades.</p>
          </div>
          
          {isAdmin && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm">
                  <Filter size={16} className="text-slate-400 ml-2" />
                  <select 
                      className="bg-transparent border-none text-sm text-slate-700 font-medium focus:ring-0 cursor-pointer outline-none min-w-[200px]"
                      value={selectedBrokerId}
                      onChange={(e) => setSelectedBrokerId(e.target.value)}
                  >
                      <option value="all">Visão Global (Todos)</option>
                      {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                  </select>
              </div>
          )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
            title="Aguardando Aprovação" 
            value={pendingProperties} 
            icon={FileSignature} 
            subtext="Imóveis pendentes de revisão"
        />
        <MetricCard 
            title="Imóveis Ativos" 
            value={activeProperties} 
            icon={Building} 
            subtext="Disponíveis na vitrine"
        />
        <MetricCard 
            title="VGV (Carteira)" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(vgvTotal)} 
            icon={Banknote} 
            subtext="Valor total de venda"
        />
        <MetricCard 
            title="Leads Ativos" 
            value={activeLeads} 
            icon={Users} 
            subtext="Potenciais clientes no pipeline"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Distribuição da Carteira</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Visits This Week */}
        <Card className="p-0 flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Clock size={18} className="text-primary-600"/> Visitas da Semana
                </h3>
                <span className="text-xs font-bold bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                    {visitsThisWeek.length}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {visitsThisWeek.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        Nenhuma visita agendada para esta semana.
                    </div>
                ) : (
                    visitsThisWeek.map((v) => (
                        <div key={v.id} className="flex gap-3 items-start p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-primary-200 transition-colors">
                            <div className="flex flex-col items-center justify-center bg-slate-100 rounded-lg p-2 min-w-[50px]">
                                <span className="text-xs font-bold text-slate-500 uppercase">{v.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                <span className="text-lg font-bold text-slate-800">{v.date.getDate()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate" title={v.clientName}>{v.clientName}</p>
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                    <Clock size={12} className="shrink-0" /> {v.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 truncate" title={v.location}>
                                    <MapPin size={12} className="shrink-0" /> 
                                    <span className="truncate">{v.location}</span>
                                </div>
                                <div className="text-[10px] text-primary-600 font-medium mt-1">
                                    Ref: {v.propertyCode}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
      </div>

      {/* Calendar Section */}
      <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar size={20} className="text-primary-600" /> Agenda de Visitas
              </h3>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft size={16}/></button>
                      <span className="text-sm font-semibold w-32 text-center select-none">
                          {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronRight size={16}/></button>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500 uppercase">
                      {day}
                  </div>
              ))}
              <div className="contents bg-white">
                  {renderCalendarDays()}
              </div>
          </div>
      </Card>
    </div>
  );
};