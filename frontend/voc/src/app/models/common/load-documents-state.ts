import { LoadDocument } from './load-document';

export interface LoadDocumentsState {
  documents: LoadDocument[];
  loading: boolean;
  error: string | null;
  search: string;
}