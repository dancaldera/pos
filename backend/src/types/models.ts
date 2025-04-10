// Type definitions for database models

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'waitress';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  stock: number;
  lowStockAlert: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional joined fields
  category?: Category;
};

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Order = {
  id: string;
  orderNumber: number;
  customerId: string | null;
  userId: string;
  status: 'pending' | 'completed' | 'cancelled';
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  notes: string | null;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'transfer' | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional joined fields
  customer?: Customer;
  user?: User;
  items?: OrderItem[];
  payments?: Payment[];
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional joined fields
  product?: Product;
};

export type InventoryTransaction = {
  id: string;
  productId: string;
  quantity: number;
  type: string;
  reference: string | null;
  notes: string | null;
  userId: string;
  createdAt: Date;
  
  // Optional joined fields
  product?: Product;
  user?: User;
};

export type Payment = {
  id: string;
  orderId: string;
  amount: number;
  method: 'cash' | 'credit_card' | 'debit_card' | 'transfer';
  reference: string | null;
  notes: string | null;
  userId: string;
  createdAt: Date;
  
  // Optional joined fields
  order?: Order;
  user?: User;
};

export type Settings = {
  id: number;
  businessName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxRate: number;
  currency: string;
  logoUrl: string | null;
  receiptFooter: string | null;
  updatedAt: Date;
};