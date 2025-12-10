export interface LoadDocumentsOCbyUserViewProps {
  darkMode: boolean;
}

export interface Document {
  Id?: number;
  IdUser?: number;
  IdFolder?: string;
  UserName?: string;
  UserEmail?: string;
  FileName?: string;
  NombreArchivo?: string;
  Fecha?: string;
  Status?: string;
}

export interface LoadDocumentsState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  search: string;
}

export interface UseLoadDocumentsReturn {
  state: LoadDocumentsState;
  handleChangePage: (event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setSearch: (search: string) => void;
  handleDownload: (idFolder: string) => Promise<void>;
  filteredDocs: Document[];
}

export interface AzureDownloadConfig {
  sasToken: string;
  containerName: string;
  storageAccountName: string;
}