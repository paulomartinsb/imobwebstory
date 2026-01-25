import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, FileText, Settings, LogOut, Menu, X, ShieldCheck, UserPlus, Send } from 'lucide-react';
import { ToastContainer } from './Toast';
import { useStore } from '../../store';

const SidebarItem = ({ to, icon: Icon, label, onClick }: any) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`
    }
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </NavLink>
);

export const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { addNotification, currentUser, logout } = useStore();
  const location = useLocation();

  // Fecha a sidebar ao mudar de rota (útil para mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair do sistema?')) {
        logout();
        // Redirection to /login happens automatically via RequireAuth guard in App.tsx
        // when currentUser becomes null.
    }
  };

  const getRoleLabel = (role?: string) => {
      switch(role) {
          case 'admin': return 'Administrador';
          case 'finance': return 'Financeiro';
          case 'employee': return 'Funcionário';
          case 'broker': return 'Corretor';
          case 'captator': return 'Indicador';
          default: return 'Usuário';
      }
  }

  const getRoleColor = (role?: string) => {
      switch(role) {
          case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'finance': return 'bg-green-100 text-green-700 border-green-200';
          case 'employee': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'broker': return 'bg-amber-100 text-amber-700 border-amber-200';
          case 'captator': return 'bg-orange-100 text-orange-700 border-orange-200';
          default: return 'bg-slate-100 text-slate-700';
      }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <ToastContainer />

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Responsive */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col shadow-xl transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
              <Building2 className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">GoldImob<span className="text-primary-400">.ai</span></h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {currentUser?.role === 'captator' ? (
              // Specific Menu for Referral Profile
              <>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-2">Área do Parceiro</div>
                  <SidebarItem to="/referrals" icon={Send} label="Indicar Imóveis" />
                  <SidebarItem to="/settings" icon={Settings} label="Meu Perfil" />
              </>
          ) : (
              // Default Menu for Other Roles
              <>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-2">Principal</div>
                  <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                  <SidebarItem to="/leads" icon={UserPlus} label="Base de Leads" />
                  <SidebarItem to="/properties" icon={Building2} label="Imóveis" />
                  <SidebarItem to="/crm" icon={Users} label="CRM & Pipeline" />
                  
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Sistema</div>
                  
                  {/* Admin Link - Only visible to Admins */}
                  {currentUser?.role === 'admin' && (
                     <SidebarItem to="/admin" icon={ShieldCheck} label="Administração" />
                  )}
                  
                  <SidebarItem to="/settings" icon={Settings} label="Configurações" />
              </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
            <div className="mb-4 px-4 py-3 bg-slate-800 rounded-lg flex items-center gap-3">
                <img src={currentUser?.avatar} alt="User" className="w-8 h-8 rounded-full border border-slate-600" />
                <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                    <p className="text-xs text-slate-400 capitalize truncate">{getRoleLabel(currentUser?.role)}</p>
                </div>
            </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative w-full">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
            <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden"
                >
                  <Menu size={24} />
                </button>
                <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                    <h2 className="text-lg font-semibold text-slate-700 truncate max-w-[200px] md:max-w-none">
                        Olá, {currentUser?.name.split(' ')[0]}
                    </h2>
                    <span className={`text-xs px-2 py-0.5 rounded border w-fit ${getRoleColor(currentUser?.role)}`}>
                        {getRoleLabel(currentUser?.role)}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="hidden md:inline text-sm text-slate-500">v1.3.1 (Security Update)</span>
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                    <img src={currentUser?.avatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
            </div>
        </header>
        
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};