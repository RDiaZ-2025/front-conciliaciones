export interface CoverHistoryItem {
    id: number;
    uploaderLog: string;
    timestamp: string;
    url: string;
}

export interface PortadaState {
    selectedFile: File | null;
    previewUrl: string | null;
    uploading: boolean;
    history: CoverHistoryItem[];
}
