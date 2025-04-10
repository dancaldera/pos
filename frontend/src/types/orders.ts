import { Customer } from './customers';
import { Product } from './products';
import { User } from './auth';

export type OrderStatus = 'pending' | 'completed' | 'cancelled';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'transfer';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  userId: string;
  createdAt: string;
  user?: User;
}

export interface Order {
  id: string;
  orderNumber: number;
  customerId: string | null;
  userId: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string | null;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  user?: User;
  items?: OrderItem[];
  payments?: Payment[];
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface PaymentInput {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface OrderCreateData {
  customerId?: string;
  status?: OrderStatus;
  items: OrderItemInput[];
  notes?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  payment?: PaymentInput;
}
