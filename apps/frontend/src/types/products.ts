export interface Category {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  productCount?: number // Count of products in this category
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  cost: number | null
  sku: string | null
  barcode: string | null
  categoryId: string | null
  imageUrl: string | null
  stock: number
  lowStockAlert: number | null
  active: boolean
  hasVariants: boolean
  variants: string[] | null
  createdAt: string
  updatedAt: string
  category?: Category
}

export interface ProductFormData {
  name: string
  description: string
  price: number
  cost?: number
  sku?: string
  barcode?: string
  categoryId?: string
  stock: number
  lowStockAlert?: number
  active: boolean
  hasVariants: boolean
  variants?: string[]
  image?: File | null
  removeImage?: boolean
}
