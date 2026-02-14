export interface LoadDocument {
  Id: number;
  IdUser: number;
  IdFolder: string; // GUID
  Fecha: string; // Date string
  Status: string;
  FileName: string;
  UserEmail?: string;
  UserName?: string; // Kept as optional just in case, though backend doesn't seem to return it
}

export interface LoadDocumentsState {
  documents: LoadDocument[];
  loading: boolean;
  error: string | null;
  search: string;
}
