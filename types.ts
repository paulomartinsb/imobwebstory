
export type PropertyType = string; // Changed from union to string to allow dynamic types
export type PropertyStatus = 'draft' | 'pending_approval' | 'published' | 'sold' | 'reserved' | 'inactive';
export type UserRole = 'admin' | 'finance' | 'employee' | 'broker';
export type LeadSource = string; // Changed from union to string to allow dynamic sources

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export interface PropertyTypeOption {
    value: string;
    label: string;
}

export interface SystemSettings {
  allowNewRegistrations: boolean;
  requirePropertyApproval: boolean; // Se false, corretores publicam direto
  maintenanceMode: boolean;
  companyName: string;
  propertyTypes: PropertyTypeOption[]; // Lista dinâmica de tipos de imóveis
  propertyFeatures: string[]; // Lista dinâmica de diferenciais
  leadSources: string[]; // Lista dinâmica de origens de leads
  availableLocations: string[]; // Lista dinâmica de bairros/cidades sugeridos
  propertyDescriptionPrompt: string; // Prompt editável para geração de descrição
}

export interface Property {
  id: string;
  authorId: string; // Quem cadastrou
  approvedBy?: string; // Quem aprovou (se aplicável)
  rejectionReason?: string; // Motivo da reprovação (se aplicável)
  code: string;
  title: string;
  type: PropertyType;
  description: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  
  // Address Fields
  address: string; // Formatted full address for display/legacy compatibility
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  features: string[];
  status: PropertyStatus;
  images: string[]; // Changed from 'image: string' to support gallery (max 10)
}

// Dynamic Pipeline Types
export interface PipelineStageConfig {
    id: string;
    name: string;
    color: string; // Tailwind border color class e.g., 'border-blue-400'
    order: number;
}

export interface Pipeline {
    id: string;
    name: string;
    isDefault: boolean;
    stages: PipelineStageConfig[];
}

export interface Visit {
    id: string;
    date: string; // ISO String
    propertyId: string; // Link to Property
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
    // Feedback Fields
    feedback?: string; // Resultado geral
    positivePoints?: string;
    negativePoints?: string;
    liked?: boolean; // Se gostou ou não
}

// Detailed Profile for AI Matching
export interface DetailedInterestProfile {
    propertyTypes: string[];
    condition: 'pronto' | 'planta' | 'construcao' | 'indiferente';
    usage: 'moradia' | 'investimento';
    
    // Location
    cities: string[];
    neighborhoods: string[];
    proximityTo: string[]; // e.g., 'metro', 'escola', 'parque'

    // Features
    minBedrooms: number;
    minSuites: number;
    minParking: number;
    minArea: number;
    mustHaveFeatures: string[]; // Diferenciais obrigatórios
    
    // Financial
    maxPrice: number;
    paymentMethod: 'vista' | 'financiamento' | 'permuta' | 'indiferente';
    hasFgts: boolean;
    
    // Lifestyle / Soft Requirements
    sunOrientation?: 'norte' | 'sul' | 'leste' | 'oeste' | 'indiferente';
    floorPreference?: 'baixo' | 'alto' | 'indiferente';
    notes: string; // Free text for AI
}

export interface Client {
  id: string;
  ownerId: string; // Corretor responsável
  pipelineId?: string; // Se null/undefined, está apenas no Banco de Leads
  name: string;
  email: string;
  phone: string;
  alternativePhones?: string[]; // New: Multiple phones
  
  // New Professional Fields
  company?: string;
  jobTitle?: string;
  clientType?: string; // e.g., 'buyer', 'seller', 'investor'

  budget: number; // Orçamento Máximo
  minBudget?: number; // Orçamento Mínimo (Novo)
  interest: PropertyType[];
  
  // Legacy Matching Fields (kept for backward compat, but InterestProfile is preferred)
  desiredLocation: string[]; 
  minBedrooms?: number;
  minBathrooms?: number; 
  minParking?: number;   
  minArea?: number;
  desiredFeatures?: string[]; 
  
  // New: Structured Profile
  interestProfile?: DetailedInterestProfile;

  interestedPropertyIds: string[]; // New: Manually linked property IDs

  stage: string; // Agora é uma string dinâmica baseada no ID da etapa do pipeline
  source: LeadSource;
  notes?: string;
  
  visits: Visit[]; // New: List of visits linked to properties
  nextVisit?: string; // Computed: The earliest upcoming scheduled visit

  // New Profile Sections
  familyMembers?: { id: string; name: string; relationship: string }[];
  documents?: { name: string; url: string; date: string }[];
  followers?: string[]; // IDs of users watching this lead

  lastContact: string;
  createdAt: string;
  
  // Lost Logic
  lostReason?: string; // Motivo da perda
}

export interface DashboardMetrics {
  totalProperties: number;
  activeLeads: number;
  salesVolume: number;
}

// --- Audit Log System ---
export interface LogEntry {
    id: string;
    timestamp: string;
    userId: string; // Quem fez a ação
    userName: string;
    action: 'create' | 'update' | 'delete' | 'restore' | 'approval';
    entity: 'client' | 'property' | 'settings' | 'pipeline';
    entityId: string; // ID do objeto alterado (ou 'system' para settings)
    entityName: string; // Nome legível (ex: Nome do cliente)
    details: string; // Descrição curta
    previousData?: any; // Snapshot antes da mudança
    newData?: any; // Snapshot depois da mudança
}