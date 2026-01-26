import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input, PhoneInput } from '../components/ui/Elements';
import { User, Bell, Shield, Smartphone, Users, Lock, Key, Camera } from 'lucide-react';
import { useStore } from '../store';

export const SettingsPage: React.FC = () => {
  const { addNotification, currentUser, updateUser } = useStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for profile to prevent auto-save
  const [profileForm, setProfileForm] = useState({
      name: '',
      email: '',
      phone: ''
  });

  // Initialize form when currentUser loads or changes (e.g. login)
  // We use currentUser?.id dependency to avoid resetting form while typing if background sync happens
  useEffect(() => {
      if (currentUser) {
          setProfileForm({
              name: currentUser.name || '',
              email: currentUser.email || '',
              phone: currentUser.phone || ''
          });
      }
  }, [currentUser?.id]); 

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = () => {
      if (currentUser) {
          if (!profileForm.name.trim() || !profileForm.email.trim()) {
              addNotification('error', 'Nome e Email são obrigatórios.');
              return;
          }
          
          // Call updateUser which handles Supabase sync via store logic
          updateUser(currentUser.id, {
              name: profileForm.name,
              email: profileForm.email,
              phone: profileForm.phone
          });
          // Notification is handled by the store action
      }
  }

  const handleSavePreferences = () => {
      addNotification('success', 'Preferências salvas com sucesso!');
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && currentUser) {
          // Limit file size to 2MB to prevent performance issues
          if (file.size > 2 * 1024 * 1024) {
              addNotification('error', 'A imagem é muito grande. Máximo de 2MB.');
              return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  updateUser(currentUser.id, { avatar: reader.result });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handlePasswordChange = () => {
      if (!currentUser) return;

      const actualPassword = currentUser.password || '123456';

      if (currentPassword !== actualPassword) {
          addNotification('error', 'A senha atual está incorreta.');
          return;
      }

      if (newPassword.length < 6) {
          addNotification('error', 'A nova senha deve ter pelo menos 6 caracteres.');
          return;
      }

      if (newPassword !== confirmPassword) {
          addNotification('error', 'A nova senha e a confirmação não coincidem.');
          return;
      }

      updateUser(currentUser.id, { password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
            <p className="text-slate-500">Gerencie seu perfil e preferências do sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sidebar Menu */}
            <Card className="p-6 col-span-1 h-fit">
                <div className="flex flex-col items-center text-center">
                    <div 
                        className="relative w-24 h-24 rounded-full bg-slate-200 mb-4 overflow-hidden border-4 border-white shadow group cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                        title="Clique para alterar foto"
                    >
                        <img 
                            src={currentUser?.avatar} 
                            alt="Avatar" 
                            className="w-full h-full object-cover transition-opacity group-hover:opacity-75" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                            <Camera className="text-white drop-shadow-md" size={24} />
                        </div>
                    </div>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                    />

                    <h3 className="text-lg font-bold text-slate-800">{currentUser?.name}</h3>
                    <p className="text-sm text-slate-500 mb-4 capitalize">{currentUser?.role}</p>
                    
                    <Button 
                        variant="outline" 
                        className="w-full text-sm"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Alterar Foto
                    </Button>
                </div>
                <div className="mt-6 space-y-2">
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-3 w-full p-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'profile' ? 'text-primary-600 bg-primary-50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <User size={18} /> Perfil
                    </button>
                    <button 
                        onClick={() => setActiveTab('notifications')}
                        className={`flex items-center gap-3 w-full p-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'notifications' ? 'text-primary-600 bg-primary-50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Bell size={18} /> Notificações
                    </button>
                    <button 
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-3 w-full p-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security' ? 'text-primary-600 bg-primary-50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Shield size={18} /> Segurança
                    </button>
                </div>
            </Card>

            {/* Main Content Area */}
            <div className="col-span-1 md:col-span-2 space-y-6">
                
                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <Card className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Informações Pessoais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <Input 
                                label="Nome Completo" 
                                value={profileForm.name} 
                                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} 
                            />
                            <Input 
                                label="E-mail" 
                                value={profileForm.email} 
                                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} 
                            />
                            <PhoneInput
                                label="Telefone"
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                placeholder="(00) 00000-0000"
                            />
                            <Input label="Função" defaultValue={currentUser?.role} disabled className="bg-slate-50 capitalize" />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setProfileForm({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '' })}>Cancelar</Button>
                            <Button onClick={handleSaveProfile}>Salvar Alterações</Button>
                        </div>
                    </Card>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                    <Card className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Preferências</h3>
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                        <Bell size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-700">Notificações por Email</p>
                                        <p className="text-xs text-slate-500">Receba atualizações de leads e contratos</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 text-green-600 rounded">
                                        <Smartphone size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-700">Notificações Push</p>
                                        <p className="text-xs text-slate-500">Alertas em tempo real no navegador</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline">Cancelar</Button>
                            <Button onClick={handleSavePreferences}>Salvar Preferências</Button>
                        </div>
                    </Card>
                )}

                {/* SECURITY TAB */}
                {activeTab === 'security' && (
                    <Card className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <Lock size={20} className="text-slate-500"/> Segurança e Login
                        </h3>
                        
                        <div className="space-y-4 mb-6 max-w-md">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Senha Atual</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input 
                                        type="password" 
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm" 
                                        placeholder="••••••"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Nova Senha</label>
                                <input 
                                    type="password" 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" 
                                    placeholder="••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Confirmar Nova Senha</label>
                                <input 
                                    type="password" 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" 
                                    placeholder="••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button variant="outline">Cancelar</Button>
                            <Button onClick={handlePasswordChange}>Atualizar Senha</Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
};