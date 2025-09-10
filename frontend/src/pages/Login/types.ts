export interface LoginProps {
  onLogin: () => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginState {
  email: string;
  password: string;
  showPassword: boolean;
  error: string;
  loading: boolean;
}

export interface UseLoginReturn {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  error: string;
  setError: (error: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}