export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadDate: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
}

export interface ProductionRequest {
  id: string;
  name: string;
  requestDate: string;
  department: string;
  contactPerson: string;
  assignedTeam: string;
  assignedUserId?: number;
  deliveryDate?: string;
  observations?: string;
  stage: string;
  files?: UploadedFile[];
}

export const WORKFLOW_STAGES = [
  { id: 'request', label: 'Solicitud' },
  { id: 'quotation', label: 'Cotización' },
  { id: 'material_adjustment', label: 'Ajuste de Material' },
  { id: 'pre_production', label: 'Pre-producción' },
  { id: 'in_production', label: 'En producción' },
  { id: 'in_editing', label: 'En edición' },
  { id: 'delivered_approval', label: 'Entregado para aprobación' },
  { id: 'client_approved', label: 'Aprobado por cliente' },
  { id: 'completed', label: 'Completado y entregado' }
];

export const MOCK_PRODUCTION_REQUESTS: ProductionRequest[] = [
  {
    id: '1',
    name: 'Campaña Publicitaria Q3',
    requestDate: '2023-07-15T10:30:00Z',
    department: 'Marketing',
    contactPerson: 'Ana Martínez',
    assignedTeam: 'Equipo Creativo A',
    deliveryDate: '2023-08-30',
    observations: 'Necesitamos enfocarnos en el nuevo producto estrella',
    stage: 'in_production'
  },
  {
    id: '2',
    name: 'Video Corporativo Anual',
    requestDate: '2023-06-20T14:15:00Z',
    department: 'Comunicación',
    contactPerson: 'Carlos Rodríguez',
    assignedTeam: 'Equipo Audiovisual',
    deliveryDate: '2023-09-15',
    observations: 'Debe incluir testimonios de los directivos',
    stage: 'pre_production'
  },
  {
    id: '3',
    name: 'Spot Televisivo Navidad',
    requestDate: '2023-08-05T09:45:00Z',
    department: 'Ventas',
    contactPerson: 'Laura Sánchez',
    assignedTeam: 'Equipo Creativo B',
    deliveryDate: '2023-11-20',
    observations: 'Formato de 30 segundos para prime time',
    stage: 'quotation'
  },
  {
    id: '4',
    name: 'Contenido Redes Sociales',
    requestDate: '2023-07-28T11:20:00Z',
    department: 'Marketing Digital',
    contactPerson: 'Miguel Torres',
    assignedTeam: 'Equipo Social Media',
    deliveryDate: '2023-08-15',
    stage: 'completed'
  },
  {
    id: '5',
    name: 'Documental Proceso Productivo',
    requestDate: '2023-08-10T16:30:00Z',
    department: 'Operaciones',
    contactPerson: 'Patricia Gómez',
    assignedTeam: 'Equipo Documental',
    deliveryDate: '2023-10-30',
    observations: 'Necesitamos acceso a todas las plantas de producción',
    stage: 'request'
  }
];
