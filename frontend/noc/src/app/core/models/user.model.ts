export interface User {
  id?: number;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user' | 'editor';
  enabled: boolean;
  modules: string[];
  password?: string; 
}