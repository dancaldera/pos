import apiClient from './client'

export interface DashboardStats {
  totalProducts: number
  activeProducts: number
  totalCategories: number
  totalCustomers: number
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  totalRevenue: number
  lowStockProducts: number
}

export interface RecentOrder {
  id: string
  orderNumber: number
  customerId: string | null
  userId: string
  status: string
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentStatus: string
  createdAt: string
  customer?: {
    name: string
  } | null
}

export interface SalesDataPoint {
  date: string
  sales: number
  count: number
}

export interface TopProduct {
  productId: string | null
  productName: string
  totalQuantity: number
  totalSales: number
}

export interface PaymentStat {
  method: string
  total: number
  count: number
}

// Get dashboard statistics
// Get dashboard statistics, optionally filtered by period
export const getDashboardStats = async (period?: 'today' | 'thisWeek' | 'thisYear') => {
  const response = await apiClient.get('/dashboard/stats', {
    params: period ? { period } : {},
  })
  return response.data
}

// Get recent orders
export const getRecentOrders = async (limit = 5) => {
  const response = await apiClient.get('/dashboard/recent-orders', {
    params: { limit },
  })
  return response.data
}

// Get sales data for charts
// Get sales data for charts with selectable period
export const getSalesData = async (period: 'today' | 'thisWeek' | 'thisYear' = 'thisWeek') => {
  const response = await apiClient.get('/dashboard/sales-data', {
    params: { period },
  })
  return response.data
}

// Get top selling products
export const getTopProducts = async (limit = 5) => {
  const response = await apiClient.get('/dashboard/top-products', {
    params: { limit },
  })
  return response.data
}

// Get payment method statistics
export const getPaymentStats = async () => {
  const response = await apiClient.get('/dashboard/payment-stats')
  return response.data
}
