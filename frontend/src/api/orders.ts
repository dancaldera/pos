import apiClient from './client';
import { OrderCreateData } from '../types/orders';

// Get all orders with optional filtering
export const getOrders = async (params = {}) => {
  const response = await apiClient.get('/orders', { params });
  return response.data;
};

// Get a single order
export const getOrder = async (id: string) => {
  const response = await apiClient.get(`/orders/${id}`);
  return response.data;
};

// Create a new order
export const createOrder = async (orderData: OrderCreateData) => {
  const response = await apiClient.post('/orders', orderData);
  return response.data;
};

// Update an order's status
export const updateOrderStatus = async (id: string, status: string) => {
  const response = await apiClient.put(`/orders/${id}/status`, { status });
  return response.data;
};

// Add a payment to an order
export const addPayment = async (id: string, paymentData: any) => {
  const response = await apiClient.post(`/orders/${id}/payment`, paymentData);
  return response.data;
};

// Get a receipt for an order
export const getReceipt = async (id: string) => {
  const response = await apiClient.get(`/orders/${id}/receipt`);
  return response.data;
};

// Cancel an order
export const cancelOrder = async (id: string, reason: string) => {
  const response = await apiClient.put(`/orders/${id}/cancel`, { reason });
  return response.data;
};
