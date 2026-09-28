export interface SubteamUser {
  id: number;
  subteamId: number;
  userId: number;
  assignedAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    status?: number;
  };
}

export interface Subteam {
  id: number;
  teamId: number;
  name: string;
  description?: string | null;
  leaderId?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  leader?: {
    id: number;
    name: string;
    email: string;
  } | null;
  subteamUsers?: SubteamUser[];
}
