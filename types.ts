export type PropertyType = string;
export type PropertyStatus = 'draft' | 'pending_approval' | 'published' | 'sold' | 'reserved' | 'inactive';
export type UserRole = 'admin' | 'finance' | 'employee' | 'broker' | 'captator';
export type LeadSource = string;

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string; // Telefone do usuário
  password?: string;
  role: UserRole;
  avatar: string;
  blocked?: boolean;
  deletedAt?: string;
}

export interface PropertyTypeOption {
    value: string;
    label: string;
}

export interface LeadAgingConfig {
    freshLimit: number;
    warmLimit: number;
    freshColor: string;
    warmColor: string;
    coldColor: string;
}

export interface TeamPerformanceConfig {
    minProperties: number;
    minLeads: number;
    minVisits: number;
    activeLabel: string;
    warningLabel: string;
    inactiveLabel: string;
}

export interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
    fromName: string;
    enabled: boolean;
}

export interface EmailTemplatesConfig {
    propertyApproved: string;
    propertyRejected: string;
    leadAssigned: string;
}

export interface SystemSettings {
  allowNewRegistrations: boolean;
  requirePropertyApproval: boolean;
  maintenanceMode: boolean;
  companyName: string;
  propertyTypes: PropertyTypeOption[];
  propertyFeatures: string[];
  leadSources: string[];
  availableLocations: string[];
  propertyDescriptionPrompt: string;
  
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;

  matchAiPrompt: string;
  crmGlobalInsightsPrompt: string;
  crmCardInsightsPrompt: string;

  leadAging: LeadAgingConfig;
  teamPerformance: TeamPerformanceConfig;
  
  smtpConfig?: SmtpConfig; // Configuração SMTP
  emailTemplates?: EmailTemplatesConfig; // Templates de Email Editáveis
}

export interface Property {
  id: string;
  authorId: string;
  approvedBy?: string;
  rejectionReason?: string;
  
  submittedAt?: string;
  approvedAt?: string;

  code: string;
  title: string;
  type: PropertyType;
  description: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  
  address: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  ownerName?: string; // Nome do proprietário
  ownerPhone?: string; // Telefone do proprietário

  features: string[];
  status: PropertyStatus;
  images: string[];
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  deletedAt?: string;
}

export interface PipelineStageConfig {
    id: string;
    name: string;
    color: string;
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
    date: string;
    propertyId: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
    feedback?: string;
    positivePoints?: string;
    negativePoints?: string;
    liked?: boolean;
}

export interface DetailedInterestProfile {
    propertyTypes: string[];
    condition: 'pronto' | 'planta' | 'construcao' | 'indiferente';
    usage: 'moradia' | 'investimento';
    cities: string[];
    neighborhoods: string[];
    proximityTo: string[];
    minBedrooms: number;
    minSuites: number;
    minParking: number;
    minArea: number;
    mustHaveFeatures: string[];
    maxPrice: number;
    paymentMethod: 'vista' | 'financiamento' | 'permuta' | 'indiferente';
    hasFgts: boolean;
    sunOrientation?: 'norte' | 'sul' | 'leste' | 'oeste' | 'indiferente';
    floorPreference?: 'baixo' | 'alto' | 'indiferente';
    notes: string;
}

export interface Client {
  id: string;
  ownerId: string;
  pipelineId?: string;
  name: string;
  email: string;
  phone: string;
  alternativePhones?: string[];
  company?: string;
  jobTitle?: string;
  clientType?: string;
  budget: number;
  minBudget?: number;
  interest: PropertyType[];
  desiredLocation: string[]; 
  minBedrooms?: number;
  minBathrooms?: number; 
  minParking?: number;   
  minArea?: number;
  desiredFeatures?: string[]; 
  interestProfile?: DetailedInterestProfile;
  interestedPropertyIds: string[];
  stage: string;
  source: LeadSource;
  notes?: string;
  visits: Visit[];
  nextVisit?: string;
  familyMembers?: { id: string; name: string; relationship: string }[];
  documents?: { name: string; url: string; date: string }[];
  followers?: string[];
  lastContact: string;
  createdAt: string;
  lostReason?: string;
  deletedAt?: string;
}

export interface DashboardMetrics {
  totalProperties: number;
  activeLeads: number;
  salesVolume: number;
}

export interface LogEntry {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: 'create' | 'update' | 'delete' | 'restore' | 'approval';
    entity: 'client' | 'property' | 'settings' | 'pipeline';
    entityId: string;
    entityName: string;
    details: string;
    previousData?: any;
    newData?: any;
}