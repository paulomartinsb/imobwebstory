import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { Card, Button, Input, Badge, PhoneInput } from '../components/ui/Elements';
import { Plus, Search, MapPin, Bed, Bath, Ruler, Sparkles, X, Check, Eye, Filter, RotateCcw, Edit3, MessageSquareWarning, ThumbsDown, AlertCircle, Loader2, SortAsc, Building2, Lightbulb, Car, ChevronDown, ChevronUp, Image as ImageIcon, Trash2, GripHorizontal, History, User, Mic, MicOff, StopCircle } from 'lucide-react';
import { generatePropertyDescription, parsePropertyVoiceCommand } from '../services/geminiService';
import { searchCep } from '../services/viaCep';
import { Property, PropertyType, PropertyStatus } from '../types';
import { PropertyDetailModal } from '../components/PropertyDetailModal';

type FilterTab = 'all' | 'active' | 'published' | 'unpublished' | 'incomplete' | 'reserved' | 'inactive' | 'pending';

export const PropertiesPage: React.FC = () => {
  const { properties, addProperty, updateProperty, updatePropertyStatus, rejectProperty, removeProperty, addNotification, currentUser, approveProperty, users, systemSettings } = useStore();
  
  // --- States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  
  // Feedback/Status Modal
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [targetStatus, setTargetStatus] = useState<PropertyStatus | null>(null);
  const [propertyToModify, setPropertyToModify] = useState<string | null>(null);

  // New Filtering States
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedBroker, setSelectedBroker] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  
  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterBedrooms, setFilterBedrooms] = useState('');
  const [filterBathrooms, setFilterBathrooms] = useState('');
  const [filterMinArea, setFilterMinArea] = useState('');

  // Drag and Drop State
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Voice Assistant State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Permissions Check
  const isBroker = currentUser?.role === 'broker' || currentUser?.role === 'captator';
  const isStaff = ['admin', 'finance', 'employee'].includes(currentUser?.role || '');
  const isAdmin = currentUser?.role === 'admin';

  // Form State for New/Edit Property
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Property>>({
    type: 'apartamento',
    features: [],
    title: '',
    address: '', 
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    area: 0,
    price: 0,
    bedrooms: 0,
    bathrooms: 0,
    description: '',
    images: [], // Changed to array
    ownerName: '',
    ownerPhone: ''
  });
  
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Derived state: Always fresh from store
  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || null;
  const editingProperty = editingId ? properties.find(p => p.id === editingId) : null;

  // Available Cities for Filter (Unique List)
  const availableCities = useMemo(() => {
      const cities = new Set(properties.map(p => p.city).filter(Boolean));
      return Array.from(cities).sort();
  }, [properties]);

  // --- Voice Logic ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
              }
          };

          mediaRecorder.onstop = handleAudioStop;
          mediaRecorder.start();
          setIsRecording(true);
      } catch (err) {
          console.error("Error accessing microphone:", err);
          addNotification('error', 'Erro ao acessar microfone. Verifique as permissões.');
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); // Stop stream
          setIsRecording(false);
          setIsProcessingAudio(true);
      }
  };

  const handleAudioStop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      
      reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
              const result = await parsePropertyVoiceCommand(base64Audio, formData);
              
              if (result.fields) {
                  setFormData(prev => ({ ...prev, ...result.fields }));
              }

              if (result.question) {
                  // Speak the question
                  const utterance = new SpeechSynthesisUtterance(result.question);
                  utterance.lang = 'pt-BR';
                  window.speechSynthesis.speak(utterance);
                  addNotification('info', `IA: ${result.question}`);
              } else {
                  addNotification('success', 'Dados preenchidos por voz.');
              }

          } catch (e) {
              addNotification('error', 'Erro ao processar áudio.');
          } finally {
              setIsProcessingAudio(false);
          }
      };
      
      reader.readAsDataURL(audioBlob);
  };

  // --- Filter Logic ---

  // 1. Base Filtering (Visibility Rules)
  const baseProperties = useMemo(() => {
      if (!currentUser) return [];

      return properties.filter(p => {
          // Rule 1: Published/Approved properties are visible to ALL users
          if (p.status === 'published') return true;

          // Rule 2: Draft, Pending, Sold, etc. are visible ONLY to Admins/Staff and the Author
          if (isStaff) return true; // Admins, Finance, Employee see everything
          if (p.authorId === currentUser.id) return true; // Author sees their own

          return false; // Hidden otherwise
      });
  }, [properties, isStaff, currentUser]);

  // 2. Count Calculation (Before Search/Tab filters)
  const counts = useMemo(() => {
      return {
          all: baseProperties.length,
          active: baseProperties.filter(p => p.status === 'published').length,
          published: baseProperties.filter(p => p.status === 'published').length,
          unpublished: baseProperties.filter(p => ['draft', 'pending_approval', 'inactive'].includes(p.status)).length,
          incomplete: baseProperties.filter(p => p.status === 'draft').length,
          reserved: baseProperties.filter(p => p.status === 'reserved').length,
          inactive: baseProperties.filter(p => p.status === 'inactive').length,
          pending: baseProperties.filter(p => p.status === 'pending_approval').length,
      }
  }, [baseProperties]);

  // 3. Apply Tabs & Search & Advanced Filters
  const filteredProperties = useMemo(() => {
      let result = baseProperties;

      // Tab Filter
      switch (activeTab) {
          case 'active':
          case 'published':
              result = result.filter(p => p.status === 'published');
              break;
          case 'unpublished':
              result = result.filter(p => ['draft', 'pending_approval', 'inactive'].includes(p.status));
              break;
          case 'incomplete':
              result = result.filter(p => p.status === 'draft');
              break;
          case 'reserved':
              result = result.filter(p => p.status === 'reserved');
              break;
          case 'inactive':
              result = result.filter(p => p.status === 'inactive');
              break;
          case 'pending':
              result = result.filter(p => p.status === 'pending_approval');
              break;
          case 'all':
          default:
              // No filter
              break;
      }

      // Search Filter (Code, Address, or Owner Name)
      if (searchText) {
          const lowerSearch = searchText.toLowerCase();
          result = result.filter(p => {
              const author = users.find(u => u.id === p.authorId);
              const authorName = author?.name.toLowerCase() || '';
              return (
                  p.code.toLowerCase().includes(lowerSearch) ||
                  p.address.toLowerCase().includes(lowerSearch) ||
                  p.title.toLowerCase().includes(lowerSearch) ||
                  authorName.includes(lowerSearch)
              );
          });
      }

      // Broker Filter
      if (selectedBroker) {
          result = result.filter(p => p.authorId === selectedBroker);
      }

      // Advanced Filters
      if (filterType) {
          result = result.filter(p => p.type === filterType);
      }
      if (filterCity) {
          result = result.filter(p => p.city === filterCity);
      }
      if (filterMinPrice) {
          result = result.filter(p => p.price >= Number(filterMinPrice));
      }
      if (filterMaxPrice) {
          result = result.filter(p => p.price <= Number(filterMaxPrice));
      }
      if (filterBedrooms) {
          result = result.filter(p => p.bedrooms >= Number(filterBedrooms));
      }
      if (filterBathrooms) {
          result = result.filter(p => p.bathrooms >= Number(filterBathrooms));
      }
      if (filterMinArea) {
          result = result.filter(p => p.area >= Number(filterMinArea));
      }

      // Sorting
      result = [...result].sort((a, b) => {
          if (sortOption === 'newest') return Number(b.id) - Number(a.id); // Mock ID sort
          if (sortOption === 'oldest') return Number(a.id) - Number(b.id);
          if (sortOption === 'price_asc') return a.price - b.price;
          if (sortOption === 'price_desc') return b.price - a.price;
          return 0;
      });

      return result;
  }, [baseProperties, activeTab, searchText, selectedBroker, sortOption, users, filterType, filterCity, filterMinPrice, filterMaxPrice, filterBedrooms, filterBathrooms, filterMinArea]);

  // --- Handlers ---

  const clearAdvancedFilters = () => {
      setFilterType('');
      setFilterCity('');
      setFilterMinPrice('');
      setFilterMaxPrice('');
      setFilterBedrooms('');
      setFilterBathrooms('');
      setFilterMinArea('');
  };

  const handleSelectAll = () => {
      if (selectedIds.size === filteredProperties.length && filteredProperties.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredProperties.map(p => p.id)));
      }
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  // ... (Existing CRUD handlers) ...
  const handleCepBlur = async () => {
      const cep = formData.zipCode?.replace(/\D/g, '') || '';
      if (cep.length === 8) {
          setIsLoadingCep(true);
          const data = await searchCep(cep);
          setIsLoadingCep(false);
          if (data) {
              setFormData(prev => ({
                  ...prev,
                  street: data.logradouro,
                  neighborhood: data.bairro,
                  city: data.localidade,
                  state: data.uf,
                  address: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
              }));
              addNotification('success', 'Endereço encontrado! Preencha o número.');
          } else {
              addNotification('error', 'CEP não encontrado.');
          }
      }
  };

  const handleGenerateDescription = async () => {
    const fullAddress = formData.street 
        ? `${formData.street}, ${formData.number ? ', ' + formData.number : ''} - ${formData.neighborhood}, ${formData.city} - ${formData.state}`
        : formData.address || 'Endereço não informado';

    if (!formData.title || !formData.price || !formData.type) {
        addNotification('error', "Preencha Título, Tipo e Preço antes de gerar a descrição.");
        return;
    }
    setIsGenerating(true);
    const desc = await generatePropertyDescription({
        title: formData.title,
        type: formData.type || 'Imóvel',
        price: formData.price || 0,
        area: formData.area || 0,
        bedrooms: formData.bedrooms || 0,
        bathrooms: formData.bathrooms || 0,
        address: fullAddress,
        features: formData.features || [],
        promptTemplate: systemSettings.propertyDescriptionPrompt
    });
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  // Image Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const files = Array.from(e.target.files) as File[];
          const currentCount = formData.images?.length || 0;
          
          if (currentCount + files.length > 10) {
              addNotification('error', 'Limite de 10 fotos por imóvel.');
              return;
          }

          files.forEach(file => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  setFormData(prev => ({
                      ...prev,
                      images: [...(prev.images || []), reader.result as string]
                  }));
              };
              reader.readAsDataURL(file);
          });
      }
  };

  const handleRemoveImage = (index: number) => {
      setFormData(prev => ({
          ...prev,
          images: (prev.images || []).filter((_, i) => i !== index)
      }));
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (index: number) => {
      setDraggedImageIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault(); // Necessary to allow dropping
      // Optional: Logic to show visual indicator of drop target
  };

  const handleDrop = (targetIndex: number) => {
      if (draggedImageIndex === null || draggedImageIndex === targetIndex) {
          setDraggedImageIndex(null);
          return;
      }

      const updatedImages = [...(formData.images || [])];
      const itemToMove = updatedImages[draggedImageIndex];

      // Remove from old position
      updatedImages.splice(draggedImageIndex, 1);
      // Insert at new position
      updatedImages.splice(targetIndex, 0, itemToMove);

      setFormData(prev => ({ ...prev, images: updatedImages }));
      setDraggedImageIndex(null);
  };

  const toggleFeature = (feature: string) => {
      setFormData(prev => {
          const current = prev.features || [];
          if (current.includes(feature)) {
              return { ...prev, features: current.filter(f => f !== feature) };
          } else {
              return { ...prev, features: [...current, feature] };
          }
      });
  };

  const handleOpenEdit = (property: Property) => {
      setEditingId(property.id);
      setFormData({
          title: property.title,
          type: property.type,
          price: property.price,
          area: property.area,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          description: property.description,
          features: property.features,
          status: property.status,
          address: property.address,
          zipCode: property.zipCode || '',
          street: property.street || property.address.split(',')[0] || '',
          number: property.number || '',
          complement: property.complement || '',
          neighborhood: property.neighborhood || '',
          city: property.city || '',
          state: property.state || '',
          images: property.images || [],
          ownerName: property.ownerName || '',
          ownerPhone: property.ownerPhone || ''
      });
      setIsModalOpen(true);
      setSelectedPropertyId(null);
  }

  const handleDeleteProperty = (id: string) => {
      if (window.confirm('Tem certeza? Essa ação não pode ser desfeita.')) {
          removeProperty(id);
      }
  }

  const initiateStatusChange = (status: PropertyStatus) => {
      if (!selectedProperty) return;
      if (status === 'draft' || status === 'pending_approval') {
          setPropertyToModify(selectedProperty.id);
          setTargetStatus(status);
          setFeedbackReason('');
          setIsFeedbackModalOpen(true);
      } else if (status === 'published') {
          approveProperty(selectedProperty.id);
      } else {
          updatePropertyStatus(selectedProperty.id, status);
      }
  }

  const confirmFeedbackAction = () => {
      if(!propertyToModify || !targetStatus) return;
      if(!feedbackReason.trim()) {
          addNotification('error', 'Por favor, informe o motivo.');
          return;
      }
      if (targetStatus === 'draft') {
          rejectProperty(propertyToModify, feedbackReason);
      } else {
          updatePropertyStatus(propertyToModify, targetStatus, feedbackReason);
      }
      setIsFeedbackModalOpen(false);
      setPropertyToModify(null);
      setTargetStatus(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.title || !formData.price || !formData.street) {
        addNotification('error', 'Preencha os campos obrigatórios.');
        return;
    }
    const numPart = formData.number ? `, ${formData.number}` : '';
    const compPart = formData.complement ? ` - ${formData.complement}` : '';
    const fullAddress = `${formData.street}${numPart}${compPart} - ${formData.neighborhood}, ${formData.city} - ${formData.state}`;

    // Ensure at least one image or placeholder (Static placeholder now)
    let finalImages = formData.images || [];
    if(finalImages.length === 0) {
        finalImages = ['https://via.placeholder.com/800x600?text=Sem+Imagem'];
    }

    const submissionData = { ...formData, address: fullAddress, images: finalImages };

    if (editingId) {
        const updates: any = { ...submissionData };
        if (isBroker) {
            updates.status = 'pending_approval';
            updates.approvedBy = undefined;
            updates.rejectionReason = undefined;
            addNotification('info', 'Alterações enviadas para aprovação.');
        }
        updateProperty(editingId, updates);
    } else {
        const propertyPayload = {
            code: `IMOB-${Math.floor(Math.random() * 1000)}`,
            ...submissionData as any
        };
        addProperty(propertyPayload);
    }
    
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ type: 'apartamento', features: [], title: '', address: '', zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', area: 0, price: 0, bedrooms: 0, bathrooms: 0, description: '', images: [], ownerName: '', ownerPhone: '' });
  };

  const openNewPropertyModal = () => {
      setEditingId(null);
      setFormData({ type: 'apartamento', features: [], title: '', address: '', zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', area: 0, price: 0, bedrooms: 0, bathrooms: 0, description: '', images: [], ownerName: '', ownerPhone: '' });
      setIsModalOpen(true);
  }

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'published': return <Badge color="green">Publicado</Badge>;
          case 'pending_approval': return <Badge color="yellow">Pendente</Badge>;
          case 'draft': return <Badge color="gray">Incompleto</Badge>;
          case 'sold': return <Badge color="red">Vendido</Badge>;
          case 'reserved': return <Badge color="blue">Reservado</Badge>;
          case 'inactive': return <Badge color="gray">Inativo</Badge>;
          default: return <Badge color="gray">{status}</Badge>;
      }
  }

  const getSystemTypeLabel = (val: string) => systemSettings.propertyTypes.find(t => t.value === val)?.label || val;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800">Imóveis</h1>
            <Button onClick={openNewPropertyModal}>
                <Plus size={20} /> Adicionar Imóvel
            </Button>
        </div>

        {/* Search & Main Controls */}
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Pesquisa por código, endereço ou proprietário" 
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm shadow-sm"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
            </div>
            
            {/* Broker Filter (Staff Only) */}
            {isStaff && (
                <div className="w-full md:w-48">
                    <select 
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary-500/20"
                        value={selectedBroker}
                        onChange={(e) => setSelectedBroker(e.target.value)}
                    >
                        <option value="">Todos os corretores</option>
                        {users.filter(u => u.role === 'broker').map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="w-full md:w-48">
                <div className="relative">
                    <SortAsc className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <select 
                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary-500/20 appearance-none"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                    >
                        <option value="newest">Mais recentes</option>
                        <option value="oldest">Mais antigos</option>
                        <option value="price_desc">Maior preço</option>
                        <option value="price_asc">Menor preço</option>
                    </select>
                </div>
            </div>

            <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 transition-colors ${showAdvancedFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                title="Filtros Avançados"
            >
                <Filter size={20} />
                <span className="hidden md:inline font-medium text-sm">Filtros</span>
                {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
        </div>

        {/* ... (Filters panel and tabs omitted for brevity, same as previous) ... */}
        {showAdvancedFilters && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-in slide-in-from-top-2 duration-200">
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Tipo</label>
                    <select 
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="">Todos</option>
                        {systemSettings.propertyTypes.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
                
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Cidade</label>
                    <select 
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm"
                        value={filterCity}
                        onChange={(e) => setFilterCity(e.target.value)}
                    >
                        <option value="">Todas</option>
                        {availableCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                </div>

                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Preço Mín.</label>
                    <input 
                        type="number" 
                        placeholder="R$ 0" 
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm"
                        value={filterMinPrice}
                        onChange={(e) => setFilterMinPrice(e.target.value)}
                    />
                </div>

                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Preço Máx.</label>
                    <input 
                        type="number" 
                        placeholder="R$ Max" 
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm"
                        value={filterMaxPrice}
                        onChange={(e) => setFilterMaxPrice(e.target.value)}
                    />
                </div>

                <div className="col-span-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Min. Quartos</label>
                    <input 
                        type="number" 
                        placeholder="0+" 
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm"
                        value={filterBedrooms}
                        onChange={(e) => setFilterBedrooms(e.target.value)}
                    />
                </div>

                <div className="col-span-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Min. Área</label>
                    <input 
                        type="number" 
                        placeholder="m²" 
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm"
                        value={filterMinArea}
                        onChange={(e) => setFilterMinArea(e.target.value)}
                    />
                </div>

                <div className="col-span-2 md:col-span-4 lg:col-span-6 flex justify-end">
                    <button 
                        onClick={clearAdvancedFilters}
                        className="text-sm text-slate-500 hover:text-slate-700 underline px-3"
                    >
                        Limpar Filtros
                    </button>
                </div>
            </div>
        )}

        {/* Filter Tabs */}
        <div className="border-b border-slate-200 overflow-x-auto">
            <div className="flex gap-6 min-w-max">
                {[
                    { key: 'all', label: 'Todos', count: counts.all },
                    { key: 'active', label: 'Ativos', count: counts.active },
                    { key: 'published', label: 'Anunciados no site', count: counts.published },
                    { key: 'unpublished', label: 'Não anunciados no site', count: counts.unpublished },
                    { key: 'incomplete', label: 'Incompletos', count: counts.incomplete },
                    { key: 'reserved', label: 'Reservados', count: counts.reserved },
                    { key: 'inactive', label: 'Inativos', count: counts.inactive },
                    { key: 'pending', label: 'Pendentes', count: counts.pending },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as FilterTab)}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                            activeTab === tab.key 
                            ? 'border-primary-600 text-primary-700' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {tab.label} 
                        <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Select All Bar & Content */}
      {filteredProperties.length > 0 ? (
          <>
            <div className="flex items-center gap-3 py-2 px-1">
                <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    checked={selectedIds.size === filteredProperties.length && filteredProperties.length > 0}
                    onChange={handleSelectAll}
                />
                <span className="text-sm text-slate-600 font-medium">Selecionar todos</span>
                {selectedIds.size > 0 && (
                    <span className="text-xs text-primary-600 font-semibold bg-primary-50 px-2 py-1 rounded">
                        {selectedIds.size} selecionados
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map(property => {
                    const isSelected = selectedIds.has(property.id);
                    const author = users.find(u => u.id === property.authorId);
                    
                    // Logic to lock Edit for brokers if property is published or pending
                    const isLocked = isBroker && ['published', 'pending_approval'].includes(property.status);
                    
                    return (
                        <div key={property.id} className={`group relative bg-white rounded-xl border transition-all duration-200 overflow-hidden hover:shadow-lg ${isSelected ? 'border-primary-500 ring-1 ring-primary-500' : 'border-slate-200'}`}>
                            {/* Selection Checkbox Overlay */}
                            <div className="absolute top-3 left-3 z-10">
                                <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => toggleSelection(property.id)}
                                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 shadow-sm cursor-pointer"
                                />
                            </div>

                            <div className="relative h-48 cursor-pointer" onClick={() => setSelectedPropertyId(property.id)}>
                                <img src={property.images[0] || 'https://via.placeholder.com/800x600?text=Sem+Imagem'} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute top-3 right-3">
                                    {getStatusBadge(property.status)}
                                </div>
                                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                    <span className="font-mono">{property.code}</span>
                                    <span className="w-px h-3 bg-white/30 mx-1"></span>
                                    <span className="capitalize">{getSystemTypeLabel(property.type)}</span>
                                    {property.images.length > 1 && (
                                        <>
                                            <span className="w-px h-3 bg-white/30 mx-1"></span>
                                            <span className="flex items-center gap-0.5"><ImageIcon size={10} /> {property.images.length}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 space-y-3 cursor-pointer" onClick={() => setSelectedPropertyId(property.id)}>
                                <div>
                                    <h3 className="font-semibold text-lg text-slate-800 line-clamp-1">{property.title}</h3>
                                    <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                                        <MapPin size={14} />
                                        <span className="line-clamp-1">{property.address}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-2 border-y border-slate-100 text-slate-600 text-xs">
                                    <div className="flex items-center gap-1"><Bed size={14}/> {property.bedrooms}</div>
                                    <div className="flex items-center gap-1"><Bath size={14}/> {property.bathrooms}</div>
                                    <div className="flex items-center gap-1"><Ruler size={14}/> {property.area}m²</div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <div>
                                        <span className="text-lg font-bold text-primary-600 block">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                                        </span>
                                        {isStaff && author && (
                                            <span className="text-xs text-slate-400">Por: {author.name.split(' ')[0]}</span>
                                        )}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {(!isLocked || isStaff) && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleOpenEdit(property); }}
                                                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                        )}
                                        {isAdmin && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteProperty(property.id); }}
                                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
          </>
      ) : (
          /* Empty State as requested */
          <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <Building2 size={48} className="text-slate-300" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Nenhum imóvel encontrado.</h2>
              <p className="text-slate-500 mb-6 max-w-md">Não encontramos imóveis com os filtros selecionados. Tente ajustar a busca.</p>
              <Button variant="outline" onClick={clearAdvancedFilters}>Limpar Filtros</Button>
          </div>
      )}

      {/* Property Detail Modal */}
      {selectedProperty && (
          <PropertyDetailModal 
            property={selectedProperty}
            onClose={() => setSelectedPropertyId(null)}
            onEdit={handleOpenEdit}
            isStaff={isStaff}
            isBroker={isBroker}
            currentUser={currentUser}
            author={users.find(u => u.id === selectedProperty.authorId)}
            approver={users.find(u => u.id === selectedProperty.approvedBy)}
            onApprove={approveProperty}
            onReject={(id) => { setPropertyToModify(id); setTargetStatus('draft'); setFeedbackReason(''); setIsFeedbackModalOpen(true); }}
            onStatusChange={initiateStatusChange}
          />
      )}

      {/* ... (FeedbackModal omitted for brevity, same as existing) ... */}
      {isFeedbackModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                  <div className={`p-6 border-b rounded-t-2xl flex justify-between items-center ${targetStatus === 'draft' ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'}`}>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                          {targetStatus === 'draft' ? <ThumbsDown size={20} /> : <AlertCircle size={20} />} 
                          {targetStatus === 'draft' ? 'Reprovar / Devolver' : 'Alterar Status'}
                      </h2>
                      <button onClick={() => setIsFeedbackModalOpen(false)}><X size={24} /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-slate-600 text-sm">Insira o motivo ou observação para esta ação.</p>
                      <textarea 
                          className="w-full px-4 py-2 rounded-lg border h-32 text-sm"
                          placeholder="Motivo..."
                          value={feedbackReason}
                          onChange={e => setFeedbackReason(e.target.value)}
                          autoFocus
                      />
                  </div>
                  <div className="p-6 border-t flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsFeedbackModalOpen(false)}>Cancelar</Button>
                      <Button variant={targetStatus === 'draft' ? 'danger' : 'primary'} onClick={confirmFeedbackAction}>Confirmar</Button>
                  </div>
              </div>
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Imóvel' : 'Cadastrar Novo Imóvel'}</h2>
                    
                    <div className="flex items-center gap-2">
                        {/* Voice Assistant Toggle */}
                        <div className="flex items-center gap-2 mr-4 bg-slate-50 border border-slate-200 rounded-full px-1.5 py-1.5">
                            {isRecording ? (
                                <button 
                                    onClick={stopRecording} 
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors animate-pulse"
                                >
                                    <StopCircle size={16} /> Parar e Processar
                                </button>
                            ) : isProcessingAudio ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full">
                                    <Loader2 size={16} className="animate-spin" /> Pensando...
                                </div>
                            ) : (
                                <button 
                                    onClick={startRecording}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all text-xs font-medium border border-transparent hover:border-primary-100"
                                    title="Preencher por Voz"
                                >
                                    <Mic size={16} /> Assistente de Voz
                                </button>
                            )}
                        </div>

                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    {/* NEW WARNING FOR BROKERS EDITING */}
                    {isBroker && editingId && (
                        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm border border-yellow-200 flex items-center gap-3">
                            <AlertCircle size={20} className="shrink-0" />
                            <div>
                                <strong>Atenção:</strong> Ao salvar as alterações, este imóvel sairá do modo rascunho e será enviado novamente para a fila de aprovação da gerência.
                            </div>
                        </div>
                    )}

                    {/* ... (Reuse form fields from previous version) ... */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Título" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="col-span-2" />
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Tipo</label>
                            <select className="w-full px-4 py-2 rounded-lg border border-slate-200" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PropertyType})}>
                                {systemSettings.propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <Input label="Preço (R$)" type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                        
                        <div className="col-span-2 space-y-4 pt-2 border-t border-slate-100">
                            <h3 className="font-semibold text-slate-700 text-sm">Localização</h3>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-1">
                                    <Input label="CEP" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} onBlur={handleCepBlur} />
                                    {isLoadingCep && <span className="text-xs text-slate-500">Buscando...</span>}
                                </div>
                                <div className="col-span-3"><Input label="Rua" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} required /></div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <Input label="Número" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="col-span-1" />
                                <Input label="Bairro" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} required className="col-span-2" />
                                <Input label="Cidade" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required className="col-span-1" />
                            </div>
                        </div>

                        {/* Owner Details Section */}
                        <div className="col-span-2 space-y-3 pt-2 border-t border-slate-100">
                            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                                <User size={16} /> Dados do Proprietário (Confidencial)
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Nome do Proprietário" 
                                    value={formData.ownerName} 
                                    onChange={e => setFormData({...formData, ownerName: e.target.value})} 
                                    placeholder="Ex: Sr. João"
                                />
                                <PhoneInput 
                                    label="Telefone / WhatsApp" 
                                    value={formData.ownerPhone} 
                                    onChange={e => setFormData({...formData, ownerPhone: e.target.value})} 
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 col-span-2 grid grid-cols-3 gap-3">
                            <Input label="Área (m²)" type="number" value={formData.area} onChange={e => setFormData({...formData, area: Number(e.target.value)})} />
                            <Input label="Quartos" type="number" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: Number(e.target.value)})} />
                            <Input label="Banheiros" type="number" value={formData.bathrooms} onChange={e => setFormData({...formData, bathrooms: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div className="col-span-2 space-y-3 pt-2 border-t border-slate-100">
                        <label className="text-sm font-medium text-slate-700 flex justify-between">
                            Galeria de Fotos (Máx: 10)
                            <span className="text-xs text-slate-400">{formData.images?.length || 0}/10 - Arraste para reordenar</span>
                        </label>
                        
                        <div className="flex gap-2">
                            <label className={`flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 gap-2 cursor-pointer hover:bg-slate-50 hover:border-primary-400 hover:text-primary-600 transition-colors ${(formData.images?.length || 0) >= 10 ? 'opacity-50 pointer-events-none' : ''}`}>
                                <ImageIcon size={20} />
                                Upload Fotos (Local)
                                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={(formData.images?.length || 0) >= 10} />
                            </label>
                        </div>

                        {formData.images && formData.images.length > 0 && (
                            <div className="grid grid-cols-5 gap-3 mt-2">
                                {formData.images.map((img, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`relative group aspect-square rounded-lg overflow-hidden border transition-all cursor-move ${
                                            draggedImageIndex === idx 
                                                ? 'opacity-50 border-primary-500 scale-95 ring-2 ring-primary-500' 
                                                : 'border-slate-200 bg-slate-100 hover:border-primary-300'
                                        }`}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={(e) => handleDragOver(e, idx)}
                                        onDrop={() => handleDrop(idx)}
                                    >
                                        <img src={img} className="w-full h-full object-cover pointer-events-none" alt={`Preview ${idx}`} />
                                        {idx === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded z-10">Capa</span>}
                                        
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                            <GripHorizontal className="text-white/80" />
                                        </div>

                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-20 cursor-pointer"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium text-slate-700">Diferenciais</label>
                        <div className="flex flex-wrap gap-2">
                            {systemSettings.propertyFeatures.map(f => (
                                <button key={f} type="button" onClick={() => toggleFeature(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${formData.features?.includes(f) ? 'bg-primary-600 text-white' : 'bg-white'}`}>{f}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-sm font-medium text-slate-700">Descrição</label>
                            <button type="button" onClick={handleGenerateDescription} disabled={isGenerating} className="text-xs text-primary-600 flex items-center gap-1"><Sparkles size={12}/> Gerar com IA</button>
                        </div>
                        <textarea className="w-full px-4 py-3 rounded-lg border h-32 text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    {/* Metadata History Section (Only when editing) */}
                    {editingProperty && (
                        <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-lg">
                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3">
                                <History size={14} /> Histórico do Registro
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="block text-slate-400">Criado em:</span>
                                    <span className="font-medium text-slate-700">
                                        {new Date(editingProperty.createdAt || '').toLocaleString()}
                                    </span>
                                    <span className="text-slate-500 ml-1">
                                        por {users.find(u => u.id === editingProperty.authorId)?.name || 'Desconhecido'}
                                    </span>
                                </div>

                                {editingProperty.submittedAt && (
                                    <div>
                                        <span className="block text-slate-400">Enviado para Aprovação:</span>
                                        <span className="font-medium text-yellow-700">
                                            {new Date(editingProperty.submittedAt).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                
                                {editingProperty.updatedAt && (
                                    <div>
                                        <span className="block text-slate-400">Última Edição:</span>
                                        <span className="font-medium text-slate-700">
                                            {new Date(editingProperty.updatedAt).toLocaleString()}
                                        </span>
                                        <span className="text-slate-500 ml-1">
                                            por {users.find(u => u.id === editingProperty.updatedBy)?.name || 'Desconhecido'}
                                        </span>
                                    </div>
                                )}

                                {editingProperty.approvedAt && (
                                    <div className="col-span-2 border-t border-slate-200 pt-2 mt-2">
                                        <span className="block text-slate-400">Aprovado em:</span>
                                        <span className="font-medium text-green-700">
                                            {new Date(editingProperty.approvedAt).toLocaleString()}
                                        </span>
                                        <span className="text-slate-500 ml-1">
                                            por {users.find(u => u.id === editingProperty.approvedBy)?.name || 'Sistema'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit">{editingId ? 'Salvar' : 'Cadastrar'}</Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};