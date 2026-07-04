import { CoverHistoryItem } from './cover-history-item';

export interface PortadaState {
    selectedFile: File | null;
    previewUrl: string | null;
    uploading: boolean;
    history: CoverHistoryItem[];
}