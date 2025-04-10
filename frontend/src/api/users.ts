import apiClient from './client';
import { User } from '../types/auth';

// Get all users
export const getUsers = async () => {
  const response = await apiClient.get('/users');
  return response.data;
};

// Get a single user
export const getUser = async (id: string) => {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
};

// Create a new user
export const createUser = async (userData: any) => {
  const response = await apiClient.post('/users', userData);
  return response.data;
};

// Update a user
export const updateUser = async (id: string, userData: Partial<User>) => {
  const response = await apiClient.put(`/users/${id}`, userData);
  return response.data;
};

// Delete a user
export const deleteUser = async (id: string) => {
  const response = await apiClient.delete(`/users/${id}`);
  return response.data;
};
