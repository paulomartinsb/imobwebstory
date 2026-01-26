import React, { useState, useMemo } from 'react';
import { Card, Button, Input } from '../components/ui/Elements';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Building, Users, Banknote, FileSignature, TrendingUp, Calendar, Clock, MapPin, User, ChevronRight, ChevronLeft, Filter, AlertTriangle, CheckCircle, Search, Activity } from 'lucide-react';
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
  const { properties, clients, currentUser, users, systemSettings } = useStore();
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Helper to get Local ISO Date (YYYY-MM-DD) avoiding UTC shifts
  const toLocalISO = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().split('T')[0];
  }

  // Performance Filters
  const [perfStartDate, setPerfStartDate] = useState(() => {
      const date = new Date();
      date.setDate(date.getDate() - 30); // Default: Last 30 days
      return toLocalISO(date);
  });
  const [perfEndDate, setPerfEndDate] = useState(() => {
      return toLocalISO(new Date()); // Today
  });

  const isAdmin = currentUser?.role === 'admin';
  
  // --- Filtering Logic for Main Dashboard ---
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

  // --- Team Performance Logic (Admin Only) ---
  const teamPerformanceData = useMemo(() => {
      if (!isAdmin) return [];

      // FIX: Explicitly parse YYYY-MM-DD to avoid UTC conversion issues in some browsers/locales
      // We want 00:00:00 Local Time for Start and 23:59:59 Local Time for End
      const [startYear, startMonth, startDay] = perfStartDate.split('-').map(Number);
      // Note: Month is 0-indexed in Date constructor
      const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

      const [endYear, endMonth, endDay] = perfEndDate.split('-').map(Number);
      const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

      // Get Settings (or defaults if missing)
      const config = systemSettings.teamPerformance || {
          minProperties: 1,
          minLeads: 5,
          minVisits: 2,
          activeLabel: 'Ativo',
          warningLabel: 'Baixa Atividade',
          inactiveLabel: 'Sem Produção - Cobrar'
      };

      return users
          .filter(u => u.role === 'broker' || u.role === 'captator')
          .map(user => {
              // 1. Properties Logic
              const userAllProperties = properties.filter(p => p.authorId === user.id);
              
              // Metric: Props Pending (Total Backlog - ignores date filter to show current status)
              const propsPending = userAllProperties.filter(p => p.status === 'pending_approval').length;

              // Metric: Props Approved (Productivity in period)
              // Checks if 'approvedAt' falls in period. Fallback to 'createdAt' if approvedAt is missing.
              const propsApproved = userAllProperties.filter(p => {
                  if (p.status !== 'published') return false;
                  
                  // Use approval date if exists, otherwise creation date
                  const dateToCheckStr = p.approvedAt || p.createdAt;
                  if (!dateToCheckStr) return false;

                  const dateToCheck = new Date(dateToCheckStr);
                  return dateToCheck >= start && dateToCheck <= end;
              }).length;

              // Filter for Period Metrics (Created in period for general activity status)
              const propsCreatedInPeriod = userAllProperties.filter(p => {
                  const pDate = new Date(p.createdAt || 0);
                  return pDate >= start && pDate <= end;
              }).length;

              // 2. Leads Created (Captured in Period)
              const leadsCount = clients.filter(c => {
                  const cDate = new Date(c.createdAt);
                  return c.ownerId === user.id && cDate >= start && cDate <= end;
              }).length;

              // 3. Visits Performed (Completed in Period)
              const visitsCount = clients
                  .filter(c => c.ownerId === user.id)
                  .flatMap(c => c.visits)
                  .filter(v => {
                      const vDate = new Date(v.date);
                      return v.status === 'completed' && vDate >= start && vDate <= end;
                  }).length;

              // 4. Status Determination using Config
              let status: 'active' | 'inactive' | 'warning' = 'active';
              let message = config.activeLabel;

              // We use "propsCreated" or "propsApproved" as sign of property activity
              const activityProperties = Math.max(propsCreatedInPeriod, propsApproved);

              if (user.role === 'broker') {
                  const metProps = activityProperties >= config.minProperties;
                  const metLeads = leadsCount >= config.minLeads;
                  const metVisits = visitsCount >= config.minVisits;

                  if (activityProperties === 0 && leadsCount === 0 && visitsCount === 0) {
                      status = 'inactive';
                      message = config.inactiveLabel;
                  } else if (!metProps && !metLeads && !metVisits) {
                      status = 'warning';
                      message = config.warningLabel;
                  } else {
                      status = 'active';
                      message = config.activeLabel;
                  }
              } else if (user.role === 'captator') {
                  if (activityProperties < config.minProperties) {
                      if (activityProperties === 0) {
                          status = 'inactive';
                          message = config.inactiveLabel;
                      } else {
                          status = 'warning';
                          message = config.warningLabel;
                      }
                  }
              }

              return {
                  id: user.id,
                  name: user.name,
                  role: user.role,
                  avatar: user.avatar,
                  propsPending, // Display Metric: Total Pending (Backlog)
                  propsApproved, // Display Metric: Approved in Period
                  leadsCount,    // Display Metric: Leads in Period
                  visitsCount,   // Display Metric: Visits in Period
                  status,
                  message
              };
          });
  }, [users, properties, clients, perfStartDate, perfEndDate, isAdmin, systemSettings.teamPerformance]);

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

      {/* ADMIN ONLY: Team Performance Monitor */}
      {isAdmin && (
          <Card className="overflow-hidden border-slate-200">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <Activity size={20} className="text-primary-600" />
                          Acompanhamento de Equipe
                      </h3>
                      <p className="text-sm text-slate-500">Monitoramento de produtividade de corretores e captadores.</p>
                  </div>
                  
                  {/* Date Range Filter */}
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 uppercase">De:</span>
                          <input 
                              type="date" 
                              className="text-xs border-none bg-transparent p-0 focus:ring-0 text-slate-700"
                              value={perfStartDate}
                              onChange={e => setPerfStartDate(e.target.value)}
                          />
                      </div>
                      <div className="w-px h-4 bg-slate-200"></div>
                      <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 uppercase">Até:</span>
                          <input 
                              type="date" 
                              className="text-xs border-none bg-transparent p-0 focus:ring-0 text-slate-700"
                              value={perfEndDate}
                              onChange={e => setPerfEndDate(e.target.value)}
                          />
                      </div>
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-white border-b border-slate-100 text-slate-500 font-semibold uppercase text-xs">
                          <tr>
                              <th className="px-6 py-4">Membro</th>
                              <th className="px-6 py-4 text-center" title="Total na fila, independente da data">Aguardando Aprovação</th>
                              <th className="px-6 py-4 text-center" title="Aprovados dentro do período selecionado">Imóveis Aprovados</th>
                              <th className="px-6 py-4 text-center" title="Criados dentro do período selecionado">Leads Captados</th>
                              <th className="px-6 py-4 text-center" title="Concluídas dentro do período selecionado">Visitas Realizadas</th>
                              <th className="px-6 py-4 text-right">Status (Período)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {teamPerformanceData.map((stat) => (
                              <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                          <img src={stat.avatar} alt="" className="w-8 h-8 rounded-full bg-slate-200" />
                                          <div>
                                              <p className="font-bold text-slate-700">{stat.name}</p>
                                              <p className="text-xs text-slate-400 capitalize">{stat.role === 'captator' ? 'Captador' : 'Corretor'}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      {stat.propsPending === 0 ? (
                                          <span className="text-slate-300">-</span>
                                      ) : (
                                          <span className="font-bold text-amber-600 flex items-center justify-center gap-1">
                                              <FileSignature size={12} /> {stat.propsPending}
                                          </span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      {stat.propsApproved === 0 ? (
                                          <span className="text-slate-300">-</span>
                                      ) : (
                                          <span className="font-bold text-emerald-600 flex items-center justify-center gap-1">
                                              <CheckCircle size={12} /> {stat.propsApproved}
                                          </span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      {stat.role === 'captator' ? (
                                          <span className="text-slate-300 text-xs">N/A</span>
                                      ) : stat.leadsCount === 0 ? (
                                          <span className="text-slate-300">-</span>
                                      ) : (
                                          <span className="font-bold text-slate-700">{stat.leadsCount}</span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      {stat.role === 'captator' ? (
                                          <span className="text-slate-300 text-xs">N/A</span>
                                      ) : stat.visitsCount === 0 ? (
                                          <span className="text-slate-300">-</span>
                                      ) : (
                                          <span className="font-bold text-slate-700">{stat.visitsCount}</span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                          stat.status === 'inactive' 
                                              ? 'bg-red-50 text-red-700 border-red-200' 
                                              : stat.status === 'warning'
                                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                  : 'bg-green-50 text-green-700 border-green-200'
                                      }`}>
                                          {stat.status === 'inactive' && <AlertTriangle size={12} />}
                                          {stat.status === 'active' && <CheckCircle size={12} />}
                                          {stat.message}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                          {teamPerformanceData.length === 0 && (
                              <tr>
                                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                                      Nenhum corretor ou captador encontrado na equipe.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </Card>
      )}

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