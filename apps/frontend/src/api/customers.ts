import apiClient from './client';
import { Customer } from '../types/customers';

// Customer search params interface
export interface CustomerSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

// Get all customers with optional filtering
export const getCustomers = async (params: CustomerSearchParams = {}) => {
  const response = await apiClient.get('/customers', { params });
  return response.data;
};

// Get a single customer
export const getCustomer = async (id: string) => {
  const response = await apiClient.get(`/customers/${id}`);
  return response.data;
};

// Create a new customer
export const createCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
  const response = await apiClient.post('/customers', customerData);
  return response.data;
};

// Update a customer
export const updateCustomer = async (id: string, customerData: Partial<Customer>) => {
  const response = await apiClient.put(`/customers/${id}`, customerData);
  return response.data;
};

// Delete a customer
export const deleteCustomer = async (id: string) => {
  const response = await apiClient.delete(`/customers/${id}`);
  return response.data;
};
