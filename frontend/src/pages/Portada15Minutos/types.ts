export interface Portada15MinutosState {
    selectedFile: File | null;
    previewUrl: string | null;
    uploading: boolean;
    error: string | null;
    success: boolean;
    message: string | null;
}

export interface UsePortada15MinutosReturn {
    state: Portada15MinutosState;
    handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleUpload: () => Promise<void>;
    handleClear: () => void;
}

export interface AzureConfig {
    sasToken: string;
    containerName: string;
    storageAccountName: string;
}
