import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { UseLoginReturn, LoginProps } from './types';

export const useLogin = (onLogin: LoginProps['onLogin']): UseLoginReturn => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Por favor, ingresa correo y contraseña.");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const result = await login(email, password);
      onLogin();
    } catch (error: any) {
      if (error.message && (error.message.toLowerCase().includes("deshabilitado") || error.message.toLowerCase().includes("sin permisos") || error.message.toLowerCase().includes("no tiene permisos") || error.message.toLowerCase().includes("disabled") || error.message.toLowerCase().includes("not allowed"))) {
        setError("Usuario deshabilitado o sin permisos. Por favor, contacte al administrador.");
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    setError,
    loading,
    setLoading,
    handleSubmit
  };
};