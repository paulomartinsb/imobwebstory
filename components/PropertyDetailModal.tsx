import React, { useState } from 'react';
import { Property, User } from '../types';
import { X, MapPin, Bed, Bath, Ruler, Check, ShieldCheck, AlertCircle, ThumbsDown, MessageSquareWarning, Edit3, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Button, Badge } from './ui/Elements';

interface PropertyDetailModalProps {
    property: Property;
    onClose: () => void;
    onEdit?: (property: Property) => void;
    
    // Optional props for Staff actions
    isStaff?: boolean;
    isBroker?: boolean;
    currentUser?: User | null;
    author?: User;
    approver?: User;
    
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onStatusChange?: (status: any) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({ 
    property, 
    onClose, 
    onEdit, 
    isStaff, 
    isBroker, 
    currentUser,
    author,
    approver,
    onApprove,
    onReject,
    onStatusChange
}) => {
    
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = property.images && property.images.length > 0 ? property.images : ['https://via.placeholder.com/800x600?text=Sem+Imagem'];

    const handleNextImage = () => {
        setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const handlePrevImage = () => {
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const getStatusBadge = (status: string) => {
      switch(status) {
          case 'published': return <Badge color="green">Publicado</Badge>;
          case 'pending_approval': return <Badge color="yellow">Aguardando Aprovação</Badge>;
          case 'draft': return <Badge color="gray">Rascunho</Badge>;
          case 'sold': return <Badge color="red">Vendido</Badge>;
          default: return <Badge color="gray">{status}</Badge>;
      }
    };

    // Helper to get Property Label (assuming simple mapping or generic)
    const getPropertyLabel = (type: string) => type.replace('_', ' ').toUpperCase();

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="relative h-72 md:h-96 bg-slate-900 group">
                    <img 
                        src={images[currentImageIndex]} 
                        alt={`${property.title} - Foto ${currentImageIndex + 1}`} 
                        className="w-full h-full object-contain md:object-cover transition-opacity duration-300" 
                    />
                    
                    {/* Navigation Arrows (Only if multiple images) */}
                    {images.length > 1 && (
                        <>
                            <button 
                                onClick={handlePrevImage}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button 
                                onClick={handleNextImage}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <ChevronRight size={24} />
                            </button>
                            
                            {/* Counter Badge */}
                            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                                <ImageIcon size={12} /> {currentImageIndex + 1} / {images.length}
                            </div>
                        </>
                    )}

                    <button 
                        onClick={onClose}
                        type="button"
                        className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors z-10"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute top-4 left-4 flex gap-2">
                        {getStatusBadge(property.status)}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/90 text-slate-800 backdrop-blur-sm capitalize">
                            {getPropertyLabel(property.type)}
                        </span>
                    </div>
                </div>

                {/* Thumbnails Strip */}
                {images.length > 1 && (
                    <div className="flex gap-2 p-2 overflow-x-auto bg-slate-50 border-b border-slate-100">
                        {images.map((img, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`relative w-16 h-12 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${currentImageIndex === idx ? 'border-primary-500 ring-1 ring-primary-500' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <img src={img} className="w-full h-full object-cover" alt="" />
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="p-6 md:p-8">
                     {/* Approval Alert inside Modal */}
                    {isStaff && property.status === 'pending_approval' && onApprove && onReject && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3 text-yellow-800">
                                <AlertCircle size={24} />
                                <div>
                                    <p className="font-bold">Aprovação Pendente</p>
                                    <p className="text-sm">Este imóvel precisa de revisão antes de ser publicado.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="danger" type="button" onClick={() => onReject(property.id)}>
                                    <ThumbsDown size={16} /> Reprovar
                                </Button>
                                <Button type="button" onClick={() => onApprove(property.id)}>
                                    <Check size={16} /> Aprovar Agora
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Rejection Notice for Broker */}
                    {property.status === 'draft' && property.rejectionReason && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <h4 className="flex items-center gap-2 font-bold text-red-800 mb-2">
                                <MessageSquareWarning size={20} />
                                Devolvido para Correção
                            </h4>
                            <p className="text-red-700 text-sm mb-3">
                                Motivo: <strong>"{property.rejectionReason}"</strong>
                            </p>
                            {onEdit && (isStaff || (isBroker && property.authorId === currentUser?.id)) && (
                                <Button type="button" onClick={() => onEdit(property)} className="text-xs h-8">
                                    <Edit3 size={14} /> Corrigir Agora
                                </Button>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-slate-800">{property.title}</h2>
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono">Ref: {property.code}</span>
                                {onEdit && (isStaff || (isBroker && property.authorId === currentUser?.id)) && (
                                    <button type="button" onClick={() => onEdit(property)} className="text-indigo-600 hover:text-indigo-800 ml-2">
                                        <Edit3 size={18} />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                                <MapPin size={18} />
                                <span>{property.address}</span>
                            </div>
                        </div>
                        <div className="mt-4 md:mt-0 text-left md:text-right">
                             <div className="text-sm text-slate-500">Valor de Venda</div>
                             <div className="text-3xl font-bold text-primary-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 py-6 border-y border-slate-100 mb-6">
                        <div className="text-center p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center justify-center gap-2 text-slate-400 mb-1"><Bed size={20}/> Quartos</div>
                            <div className="text-xl font-bold text-slate-800">{property.bedrooms}</div>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center justify-center gap-2 text-slate-400 mb-1"><Bath size={20}/> Banheiros</div>
                            <div className="text-xl font-bold text-slate-800">{property.bathrooms}</div>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center justify-center gap-2 text-slate-400 mb-1"><Ruler size={20}/> Área Útil</div>
                            <div className="text-xl font-bold text-slate-800">{property.area}m²</div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">Sobre o Imóvel</h3>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-line">{property.description}</p>
                        </div>

                        {property.features.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-3">Diferenciais</h3>
                                <div className="flex flex-wrap gap-2">
                                    {property.features.map((feature, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-medium">
                                            <Check size={14} /> {feature}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* STAFF ADMINISTRATIVE PANEL */}
                        {isStaff && onStatusChange && (
                            <div className="mt-8">
                                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <ShieldCheck size={18} className="text-slate-500" />
                                    Painel Administrativo
                                </h4>
                                
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                    {/* Author & Approver Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div className="flex items-center gap-3">
                                            {author ? (
                                                <>
                                                    <img src={author.avatar} className="w-10 h-10 rounded-full border border-slate-200" alt="" />
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase font-semibold">Corretor Responsável</p>
                                                        <p className="text-sm font-bold text-slate-800">{author.name}</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-sm text-slate-400">Autor desconhecido</div>
                                            )}
                                        </div>
                                        
                                        {property.approvedBy && (
                                            <div className="flex items-center gap-3">
                                                {approver ? (
                                                     <>
                                                        <img src={approver.avatar} className="w-10 h-10 rounded-full border border-slate-200" alt="" />
                                                        <div>
                                                            <p className="text-xs text-slate-500 uppercase font-semibold">Aprovado Por</p>
                                                            <p className="text-sm font-bold text-slate-800">{approver.name}</p>
                                                        </div>
                                                     </>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Management */}
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 mb-3">Alterar Status do Imóvel</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button 
                                                onClick={() => onStatusChange('published')}
                                                disabled={property.status === 'published'}
                                                type="button"
                                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex-1 text-center ${property.status === 'published' ? 'bg-green-100 text-green-700 border-green-200 cursor-default opacity-50' : 'bg-white hover:bg-green-50 text-slate-600 border-slate-200'}`}
                                            >
                                                Publicado
                                            </button>
                                            <button 
                                                onClick={() => onStatusChange('pending_approval')}
                                                disabled={property.status === 'pending_approval'}
                                                type="button"
                                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex-1 text-center ${property.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 cursor-default opacity-50' : 'bg-white hover:bg-yellow-50 text-slate-600 border-slate-200'}`}
                                            >
                                                Aguardando
                                            </button>
                                            <button 
                                                onClick={() => onStatusChange('sold')}
                                                disabled={property.status === 'sold'}
                                                type="button"
                                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex-1 text-center ${property.status === 'sold' ? 'bg-red-100 text-red-700 border-red-200 cursor-default opacity-50' : 'bg-white hover:bg-red-50 text-slate-600 border-slate-200'}`}
                                            >
                                                Vendido
                                            </button>
                                            <button 
                                                onClick={() => onStatusChange('draft')}
                                                disabled={property.status === 'draft'}
                                                type="button"
                                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex-1 text-center ${property.status === 'draft' ? 'bg-slate-200 text-slate-700 border-slate-300 cursor-default opacity-50' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'}`}
                                            >
                                                Rascunho
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                         <Button onClick={onClose} variant="outline" type="button">Fechar</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};