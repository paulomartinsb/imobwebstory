import React from 'react';
import { Card, Button, Input } from '../components/ui/Elements';
import { User, Bell, Shield, Smartphone, Users } from 'lucide-react';
import { useStore } from '../store';

export const SettingsPage: React.FC = () => {
  const { addNotification, currentUser, setCurrentUser, users } = useStore();

  const handleSave = () => {
      addNotification('success', 'Configurações salvas com sucesso!');
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
            <p className="text-slate-500">Gerencie seu perfil e preferências do sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 col-span-1 h-fit">
                <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-slate-200 mb-4 overflow-hidden border-4 border-white shadow">
                        <img src={currentUser?.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{currentUser?.name}</h3>
                    <p className="text-sm text-slate-500 mb-4 capitalize">{currentUser?.role}</p>
                    <Button variant="outline" className="w-full text-sm">Alterar Foto</Button>
                </div>
                <div className="mt-6 space-y-2">
                    <button className="flex items-center gap-3 w-full p-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg">
                        <User size={18} /> Perfil
                    </button>
                    <button className="flex items-center gap-3 w-full p-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                        <Bell size={18} /> Notificações
                    </button>
                    <button className="flex items-center gap-3 w-full p-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                        <Shield size={18} /> Segurança
                    </button>
                </div>
            </Card>

            <div className="col-span-1 md:col-span-2 space-y-6">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Informações Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nome Completo" defaultValue={currentUser?.name} />
                        <Input label="E-mail" defaultValue={currentUser?.email} />
                        <Input label="Telefone" defaultValue="(11) 99999-9999" />
                        <Input label="Função" defaultValue={currentUser?.role} disabled className="bg-slate-50 capitalize" />
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Preferências</h3>
                    <div className="space-y-4">
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
                </Card>
                
                <div className="flex justify-end gap-3">
                    <Button variant="outline">Cancelar</Button>
                    <Button onClick={handleSave}>Salvar Alterações</Button>
                </div>
            </div>
        </div>
    </div>
  );
};