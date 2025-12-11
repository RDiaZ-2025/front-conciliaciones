export interface LoadDocument {
  id: number;
  iduser: number;
  idfolder: string; // GUID
  Fecha: string; // Date string
  status: string;
  filename: string;
  user_name?: string;
  user_email?: string;
}

export interface LoadDocumentsState {
  documents: LoadDocument[];
  loading: boolean;
  error: string | null;
  search: string;
}
