import apiClient from './client'

// Product search params interface
export interface ProductSearchParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  sortBy?: string
  sortOrder?: string
  active?: boolean | string
  lowStock?: boolean | string
}

// Get all products with optional filtering
export const getProducts = async (params: ProductSearchParams = {}) => {
  const response = await apiClient.get('/products', { params })
  return response.data
}

// Get a single product
export const getProduct = async (id: string) => {
  const response = await apiClient.get(`/products/${id}`)
  return response.data
}

// Create a new product
export const createProduct = async (productData: FormData) => {
  const response = await apiClient.post('/products', productData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// Update a product
export const updateProduct = async (id: string, productData: FormData) => {
  const response = await apiClient.put(`/products/${id}`, productData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// Delete a product
export const deleteProduct = async (id: string) => {
  const response = await apiClient.delete(`/products/${id}`)
  return response.data
}
