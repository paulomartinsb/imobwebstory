import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { Button, Input } from '../components/ui/Elements';

export const LoginPage: React.FC = () => {
    const { login, systemSettings } = useStore();
    const navigate = useNavigate();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate network delay for realism
        setTimeout(() => {
            const success = login(email, password);
            if (success) {
                navigate('/');
            } else {
                setError('E-mail ou senha inválidos. Tente novamente.');
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-50">
            {/* Left Side - Image & Brand */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden">
                <img 
                    src="https://images.unsplash.com/photo-1600607686527-6fb886090705?ixlib=rb-4.0.3&auto=format&fit=crop&w=2400&q=80" 
                    alt="Luxury Home" 
                    className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
                />
                <div className="relative z-10 p-12 flex flex-col justify-between h-full text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500/20 backdrop-blur border border-primary-500/50 rounded-xl flex items-center justify-center">
                             <Building2 className="text-primary-400" size={24} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">{systemSettings.companyName}</h1>
                    </div>
                    <div>
                        <h2 className="text-4xl font-bold mb-4 leading-tight">O futuro da gestão imobiliária está aqui.</h2>
                        <p className="text-slate-300 text-lg max-w-md">
                            Tudo que você precisa para gestão de sua imobiliária está aqui.
                        </p>
                    </div>
                    <div className="text-sm text-slate-500">
                        © {new Date().getFullYear()} {systemSettings.companyName}. Todos os direitos reservados.
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                                <Building2 className="text-white" size={28} />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800">Acesse sua conta</h2>
                        <p className="text-slate-500 mt-2">Bem-vindo de volta! Insira suas credenciais.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-3 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    type="email" 
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-800"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-slate-700">Senha</label>
                                <a href="#" className="text-xs font-medium text-primary-600 hover:text-primary-700">Esqueceu a senha?</a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    type="password" 
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-800"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full py-3 text-base" isLoading={isLoading}>
                            Entrar no Sistema <ArrowRight size={18} />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}