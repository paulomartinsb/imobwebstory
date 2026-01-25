import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Building2, CheckCircle, ArrowRight, Plus, X, Search, Loader2 } from 'lucide-react';
import { Input, Button, PhoneInput } from '../components/ui/Elements';
import { PropertyType } from '../types';
import { searchCep } from '../services/viaCep';

// This page is accessible without login
export const PublicLeadFormPage: React.FC = () => {
  const { brokerId } = useParams<{ brokerId: string }>();
  const { addClient, users, systemSettings } = useStore();
  const navigate = useNavigate();
  
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      budget: '',
      minBudget: '',
      interest: [] as PropertyType[],
      desiredLocation: [] as string[],
      minBedrooms: '',
      minBathrooms: '',
      minParking: '',
      minArea: '',
      desiredFeatures: [] as string[],
      notes: ''
  });
  const [locationInput, setLocationInput] = useState('');
  const [cepSearchInput, setCepSearchInput] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);

  const broker = users.find(u => u.id === brokerId);

  const toggleInterest = (type: PropertyType) => {
      setFormData(prev => {
          const current = prev.interest;
          if (current.includes(type)) return { ...prev, interest: current.filter(t => t !== type) };
          return { ...prev, interest: [...current, type] };
      });
  };

  const toggleFeature = (feature: string) => {
      setFormData(prev => {
          const current = prev.desiredFeatures || [];
          if (current.includes(feature)) {
              return { ...prev, desiredFeatures: current.filter(f => f !== feature) };
          } else {
              return { ...prev, desiredFeatures: [...current, feature] };
          }
      });
  };

  const handleAddLocation = () => {
      if(!locationInput.trim()) return;
      if(!formData.desiredLocation.includes(locationInput.trim())) {
          setFormData(prev => ({ ...prev, desiredLocation: [...prev.desiredLocation, locationInput.trim()] }));
      }
      setLocationInput('');
  };

  const handleCepSearch = async () => {
      if(cepSearchInput.length < 8) return;
      setIsCepLoading(true);
      const data = await searchCep(cepSearchInput);
      setIsCepLoading(false);
      
      if(data) {
          const locString = `${data.localidade} - ${data.bairro}`;
          setLocationInput(locString);
          setCepSearchInput('');
      } else {
          // You might want to show a toast here, but currently PublicLeadForm doesn't use the global store notification directly on this standalone page context easily without the ToastContainer being rendered in App layout. 
          // For simplicity, we just won't clear the input if fail.
          console.error("CEP Not Found");
      }
  }

  const removeLocation = (loc: string) => {
      setFormData(prev => ({ ...prev, desiredLocation: prev.desiredLocation.filter(l => l !== loc) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!brokerId) return;

      addClient({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          budget: Number(formData.budget),
          minBudget: formData.minBudget ? Number(formData.minBudget) : undefined,
          interest: formData.interest.length > 0 ? formData.interest : ['apartment'],
          stage: 'new',
          source: 'Website', // Static for public form
          desiredLocation: formData.desiredLocation,
          minBedrooms: formData.minBedrooms ? Number(formData.minBedrooms) : undefined,
          minBathrooms: formData.minBathrooms ? Number(formData.minBathrooms) : undefined,
          minParking: formData.minParking ? Number(formData.minParking) : undefined,
          minArea: formData.minArea ? Number(formData.minArea) : undefined,
          desiredFeatures: formData.desiredFeatures,
          notes: formData.notes
      }, brokerId);

      setSubmitted(true);
  };

  if (submitted) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle size={32} />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-800 mb-2">Cadastro Realizado!</h1>
                  <p className="text-slate-600 mb-6">
                      Obrigado pelo seu interesse. {broker ? `O corretor ${broker.name}` : 'Nossa equipe'} entrará em contato em breve.
                  </p>
                  <Button onClick={() => setSubmitted(false)} variant="outline">
                      Voltar ao início
                  </Button>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        {/* Brand Header */}
        <div className="mb-8 text-center">
             <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-500/30">
                <Building2 className="text-white" size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800">{systemSettings.companyName}</h1>
             {broker && (
                 <div className="mt-2 flex items-center justify-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100 w-fit mx-auto">
                     <img src={broker.avatar} className="w-6 h-6 rounded-full" alt="" />
                     <span className="text-sm text-slate-600">Corretor: <span className="font-medium text-slate-800">{broker.name}</span></span>
                 </div>
             )}
        </div>

        <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden">
            <div className="p-1 bg-gradient-to-r from-primary-400 to-primary-600"></div>
            <div className="p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-1">Encontre seu Imóvel Ideal</h2>
                <p className="text-slate-500 mb-8 text-sm">Preencha seus dados para receber uma consultoria personalizada.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <Input 
                            label="Nome Completo" 
                            required 
                            placeholder="Ex: João da Silva"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="E-mail" 
                                type="email" 
                                required 
                                placeholder="Ex: joao@email.com"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                            <PhoneInput 
                                label="Telefone / WhatsApp" 
                                required 
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 block">Tipos de Imóvel</label>
                        <div className="flex flex-wrap gap-2">
                            {systemSettings.propertyTypes.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => toggleInterest(type.value as PropertyType)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                        formData.interest.includes(type.value as PropertyType)
                                        ? 'bg-primary-600 text-white border-primary-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Orçamento Mínimo" 
                            type="number" 
                            placeholder="R$ 0"
                            value={formData.minBudget}
                            onChange={e => setFormData({...formData, minBudget: e.target.value})}
                        />
                        <Input 
                            label="Orçamento Máximo" 
                            type="number" 
                            required 
                            placeholder="R$ Max"
                            value={formData.budget}
                            onChange={e => setFormData({...formData, budget: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-3">
                       <div className="flex flex-col md:flex-row justify-between gap-2">
                           <label className="text-sm font-medium text-slate-700">Locais Desejados (Cidade - Bairro)</label>
                           <div className="flex items-center gap-2">
                               <input 
                                    placeholder="CEP" 
                                    className="w-24 px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                                    value={cepSearchInput}
                                    onChange={(e) => setCepSearchInput(e.target.value)}
                                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleCepSearch(); } }}
                               />
                               <button type="button" onClick={handleCepSearch} disabled={isCepLoading} className="text-slate-500 hover:text-primary-600 p-1.5 bg-slate-100 rounded-lg">
                                   {isCepLoading ? <Loader2 size={14} className="animate-spin"/> : <Search size={14} />}
                               </button>
                           </div>
                       </div>
                       <div className="flex gap-2">
                           <input 
                                type="text"
                                list="location-suggestions"
                                placeholder="Ex: São Paulo - Jardins"
                                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
                                value={locationInput}
                                onChange={e => setLocationInput(e.target.value)}
                                onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddLocation(); }}}
                           />
                           <datalist id="location-suggestions">
                               {systemSettings.availableLocations.map((loc, idx) => (
                                   <option key={idx} value={loc} />
                               ))}
                           </datalist>
                           <Button type="button" variant="secondary" onClick={handleAddLocation} className="px-4">
                               <Plus size={18} />
                           </Button>
                       </div>
                       <div className="flex flex-wrap gap-2 mt-1">
                           {formData.desiredLocation.map((loc, idx) => (
                               <span key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-50 text-indigo-700 text-sm border border-indigo-100 font-medium">
                                   {loc}
                                   <button type="button" onClick={() => removeLocation(loc)} className="hover:text-red-500"><X size={14}/></button>
                               </span>
                           ))}
                       </div>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Input label="Min Quartos" type="number" value={formData.minBedrooms} onChange={e => setFormData({...formData, minBedrooms: e.target.value})} />
                        <Input label="Min Banheiros" type="number" value={formData.minBathrooms} onChange={e => setFormData({...formData, minBathrooms: e.target.value})} />
                        <Input label="Min Vagas" type="number" value={formData.minParking} onChange={e => setFormData({...formData, minParking: e.target.value})} />
                        <Input label="Min Área (m²)" type="number" value={formData.minArea} onChange={e => setFormData({...formData, minArea: e.target.value})} />
                    </div>

                    {/* Amenities */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-sm font-medium text-slate-700 block mt-2">Comodidades / Diferenciais</label>
                        <div className="flex flex-wrap gap-2">
                                {systemSettings.propertyFeatures.map(feature => (
                                    <button
                                        key={feature}
                                        type="button"
                                        onClick={() => toggleFeature(feature)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                            formData.desiredFeatures.includes(feature)
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {feature}
                                    </button>
                                ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                         <label className="text-sm font-medium text-slate-700">Mensagem (Opcional)</label>
                         <textarea 
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm h-28 resize-none"
                            placeholder="Estou buscando um imóvel com varanda gourmet..."
                            value={formData.notes}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                         ></textarea>
                    </div>

                    <div className="pt-4">
                        <Button type="submit" className="w-full py-3.5 text-lg group shadow-lg shadow-primary-500/20">
                            Enviar Cadastro <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <p className="text-center text-xs text-slate-400 mt-4">
                            Seus dados estão protegidos. Não enviamos spam.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};