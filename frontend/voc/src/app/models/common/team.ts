export interface Team {
  id: number;
  name: string;
  description?: string;
  leaderId?: number | null;
  leader?: {
    id: number;
    name: string;
    email: string;
  } | null;
  defaultWorkflowId?: number | null;
  defaultWorkflow?: {
    id: number;
    name: string;
    description?: string;
  } | null;
  metadata?: string | any | null;
  users?: any[];
}