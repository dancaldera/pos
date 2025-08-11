export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  createdAt: string
  updatedAt: string
  stats?: {
    totalOrders: number
    totalSpent: number
  }
  recentOrders?: any[]
}
