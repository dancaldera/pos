import apiClient from './client';
import { User, LoginCredentials, RegisterData } from '../types/auth';

// Login the user
export const login = async (credentials: LoginCredentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
};

// Register a new user
export const register = async (userData: RegisterData) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

// Get the current authenticated user
export const getCurrentUser = async (): Promise<{ success: boolean; data: { user: User } }> => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

// Log out the user (client-side only)
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
