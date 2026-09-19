export interface User {
  id?: number;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user' | 'editor' | 'health_checker';
  enabled: boolean;
  modules: string[];
  password?: string; 
}