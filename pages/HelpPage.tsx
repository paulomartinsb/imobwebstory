import React from 'react';
import { Card, Badge } from '../components/ui/Elements';
import { 
    HelpCircle, LayoutDashboard, Building2, Users, Megaphone, 
    Sparkles, Settings, Calendar, CheckCircle, Search, 
    MessageCircle, PlayCircle, BookOpen
} from 'lucide-react';

const HelpSection: React.FC<{ title: string; icon: any; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <Card className="p-6 border-l-4 border-l-primary-500 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                <Icon size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        </div>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
            {children}
        </div>
    </Card>
);

export const HelpPage: React.FC = () => {
    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-10">
            <div className="text-center md:text-left space-y-2">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 justify-center md:justify-start">
                    <BookOpen className="text-primary-600" />
                    Central de Ajuda WebImob
                </h1>
                <p className="text-slate-500 text-lg">
                    Guia completo para dominar o sistema e transformar sua gestão imobiliária.
                </p>
            </div>

            {/* Introduction / Value Prop */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="text-yellow-400" />
                    Como o WebImob facilita seu dia a dia?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                        <h3 className="font-bold text-lg mb-2 text-primary-200">Centralização Total</h3>
                        <p className="text-sm text-slate-300">Esqueça planilhas e agendas de papel. Seus imóveis, clientes, visitas e contratos estão todos conectados em um só lugar.</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                        <h3 className="font-bold text-lg mb-2 text-primary-200">Inteligência Artificial</h3>
                        <p className="text-sm text-slate-300">Use nossa IA para criar descrições de imóveis irresistíveis em segundos e para encontrar o imóvel ideal para seu cliente automaticamente.</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                        <h3 className="font-bold text-lg mb-2 text-primary-200">Controle Visual</h3>
                        <p className="text-sm text-slate-300">Saiba exatamente em que etapa cada negociação está com nosso funil de vendas (CRM) visual e intuitivo.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                
                {/* 1. Dashboard */}
                <HelpSection title="1. Dashboard (Visão Geral)" icon={LayoutDashboard}>
                    <p>
                        O <strong>Dashboard</strong> é sua tela inicial. Aqui você tem um resumo instantâneo da saúde do seu negócio.
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Métricas Rápidas:</strong> Veja quantos imóveis estão ativos, quantos leads novos entraram e o VGV (Valor Geral de Vendas) da sua carteira.</li>
                        <li><strong>Visitas da Semana:</strong> Uma lista cronológica das próximas visitas agendadas para você não perder nenhum compromisso.</li>
                        <li><strong>Agenda Mensal:</strong> Um calendário visual para planejar seu mês.</li>
                        <li><strong>Gráficos:</strong> Acompanhe a evolução da sua carteira e a origem dos seus leads.</li>
                    </ul>
                </HelpSection>

                {/* 2. Gestão de Imóveis */}
                <HelpSection title="2. Gestão de Imóveis" icon={Building2}>
                    <p>
                        Na aba <strong>Imóveis</strong>, você cadastra e gerencia seu inventário.
                    </p>
                    <div className="space-y-4 mt-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Search size={16}/> Cadastro Inteligente</h4>
                            <p>Ao clicar em "Adicionar Imóvel", preencha os dados básicos. Use o <strong>CEP</strong> para preencher o endereço automaticamente. O sistema permite upload de até 10 fotos.</p>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                            <h4 className="font-bold text-indigo-700 mb-2 flex items-center gap-2"><Sparkles size={16}/> Descrição com IA</h4>
                            <p>Não perca tempo escrevendo textos. Preencha as características (quartos, área, diferenciais) e clique em <strong>"Gerar com IA"</strong>. O sistema criará um texto atrativo e profissional para o anúncio.</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><CheckCircle size={16}/> Fluxo de Aprovação</h4>
                            <p>Se você é corretor, seu imóvel ficará como <Badge color="yellow">Pendente</Badge> até que um gerente ou administrador aprove a publicação. Isso garante a qualidade dos anúncios.</p>
                        </div>
                    </div>
                </HelpSection>

                {/* 3. Leads e Clientes */}
                <HelpSection title="3. Leads e Clientes" icon={Users}>
                    <p>
                        A aba <strong>Leads</strong> é o seu banco de dados de contatos.
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Cadastro Completo:</strong> Além de nome e telefone, registre o <em>Perfil de Interesse</em>. O que ele busca? Qual o orçamento? Quais bairros?</li>
                        <li><strong>Filtros:</strong> Encontre rapidamente clientes por nome, origem (Instagram, Portal, Site) ou data de cadastro.</li>
                        <li><strong>Ações Rápidas:</strong> Botões diretos para chamar no WhatsApp, enviar e-mail ou ligar.</li>
                    </ul>
                </HelpSection>

                {/* 4. CRM e Funil de Vendas */}
                <HelpSection title="4. CRM (Funil de Vendas)" icon={Megaphone}>
                    <p>
                        O coração do sistema. O <strong>CRM</strong> organiza seus atendimentos em colunas (etapas), como um quadro Kanban.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <h4 className="font-bold text-slate-700 mb-2">Como usar:</h4>
                            <ul className="list-decimal list-inside space-y-2 ml-2 text-sm">
                                <li><strong>Arrastar e Soltar:</strong> Mova o card do cliente de "Novo Lead" para "Visita" ou "Proposta" conforme a negociação avança.</li>
                                <li><strong>Agendar Visitas:</strong> Clique no ícone de calendário <Calendar size={14} className="inline"/> no card para marcar uma visita vinculada a um imóvel.</li>
                                <li><strong>Feedback:</strong> Após a visita, registre se o cliente gostou ou não. Isso ajuda a refinar o perfil.</li>
                            </ul>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <h4 className="font-bold text-purple-700 mb-2 flex items-center gap-2"><Sparkles size={16}/> O Poder do Match IA</h4>
                            <p className="text-sm">
                                No card do cliente, clique em <strong>"Match IA"</strong>. O sistema analisará o perfil do cliente e varrerá toda a sua carteira de imóveis para sugerir as 5 melhores opções compatíveis, com uma pontuação de 0 a 100%.
                            </p>
                        </div>
                    </div>
                </HelpSection>

                {/* 5. Perfil e Configurações */}
                <HelpSection title="5. Configurações e Perfil" icon={Settings}>
                    <p>
                        Mantenha seus dados atualizados.
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Meu Perfil:</strong> Atualize sua foto e telefone. Sua foto aparecerá para os administradores no dashboard de performance.</li>
                        <li><strong>Segurança:</strong> Altere sua senha periodicamente para manter sua conta segura.</li>
                        <li><strong>Notificações:</strong> Escolha se deseja receber alertas por e-mail sobre novos leads ou aprovações de imóveis.</li>
                    </ul>
                </HelpSection>

            </div>

            <div className="text-center pt-8 text-slate-400 text-sm">
                <p>Precisa de suporte técnico? Entre em contato com o administrador do sistema.</p>
                <p>WebImob v1.3.1</p>
            </div>
        </div>
    );
};