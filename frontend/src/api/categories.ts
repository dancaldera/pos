import apiClient from './client';
import { Category } from '../types/products';

// Get all categories
export const getCategories = async (params = {}) => {
  const response = await apiClient.get('/categories', { params });
  return response.data;
};

// Get a single category with its products
export const getCategory = async (id: string) => {
  const response = await apiClient.get(`/categories/${id}`);
  return response.data;
};

// Create a new category
export const createCategory = async (categoryData: Pick<Category, 'name' | 'description'>) => {
  const response = await apiClient.post('/categories', categoryData);
  return response.data;
};

// Update a category
export const updateCategory = async (id: string, categoryData: Partial<Category>) => {
  const response = await apiClient.put(`/categories/${id}`, categoryData);
  return response.data;
};

// Delete a category
export const deleteCategory = async (id: string) => {
  const response = await apiClient.delete(`/categories/${id}`);
  return response.data;
};
