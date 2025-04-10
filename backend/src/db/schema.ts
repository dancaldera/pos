import { pgTable, serial, varchar, text, integer, timestamp, boolean, pgEnum, uuid, numeric, foreignKey, json } from 'drizzle-orm/pg-core';
import { createId } from '../utils/id.js';

// Enums
export const roleEnum = pgEnum('role', ['admin', 'manager', 'waitress']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'completed', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['paid', 'unpaid', 'partial']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'credit_card', 'debit_card', 'transfer']);

// Users table
export const users = pgTable('users', {
  id: varchar('id', { length: 21 }).primaryKey().notNull().$defaultFn(() => createId()),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('waitress'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Categories table
export const categories = pgTable('categories', {
  id: varchar('id', { length: 21 }).primaryKey().notNull().$defaultFn(() => createId()),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Products table
export const products = pgTable('products', {
  id: varchar('id', { length: 21 }).primaryKey().notNull().$defaultFn(() => createId()),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  cost: numeric('cost', { precision: 10, scale: 2 }),
  sku: varchar('sku', { length: 50 }).unique(),
  barcode: varchar('barcode', { length: 50 }).unique(),
  categoryId: varchar('category_id', { length: 21 }).references(() => categories.id, { onDelete: 'set null' }),
  imageUrl: text('image_url'),
  stock: integer('stock').notNull().default(0),
  lowStockAlert: integer('low_stock_alert'),
  active: boolean('active').notNull().default(true),
  hasVariants: boolean('has_variants').notNull().default(false),
  variants: json('variants').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Customers table
export const customers = pgTable('customers', {
  id: varchar('id', { length: 21 }).primaryKey().notNull().$defaultFn(() => createId()),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).unique(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Orders table
export const orders = pgTable('orders', {
  id: varchar('id', { length: 21 }).primaryKey().notNull().$defaultFn(() => createId()),
  orderNumber: serial('order_number').notNull().unique(),
  customerId: varchar('customer_id', { length: 21 }).references(() => customers.id, { onDelete: 'set null' }),
  userId: varchar('user_id', { length: 21 }).references(() => users.id, { onDelete: 'set null' }).notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: numeric('tax', { precision: 10, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 10, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('unpaid'),
  paymentMethod: paymentMethodEnum('payment_method'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Order Items table
export const orderItems = pgTable('order_items', {
  id: varchar('id', { length: 21 }).primaryKey().notNull().$defaultFn(() => createId()),
  orderId: varchar('order_id', { length: 21 }).references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: varchar('product_id', { length: 21 }).references(() => products.id, { onDelete: 'set null' }),
  productName: varchar('product_name', { length: 100 }).notNull(),
  variant: varchar('variant', { length: 50 }),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Inventory Transactions table
export const inventoryTransactions = pgTable('inventory_transactions', {
  id: varchar('id', { length: 21 }).primaryKey().notNull().$defaultFn(() => createId()),
  productId: varchar('product_id', { length: 21 }).references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // purchase, sale, adjustment, etc.
  reference: varchar('reference', { length: 100 }), // order ID, purchase ID, etc.
  notes: text('notes'),
  userId: varchar('user_id', { length: 21 }).references(() => users.id, { onDelete: 'set null' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Payments table
export const payments = pgTable('payments', {
  id: varchar('id', { length: 21 }).primaryKey().notNull().$defaultFn(() => createId()),
  orderId: varchar('order_id', { length: 21 }).references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull(),
  reference: varchar('reference', { length: 100 }),
  notes: text('notes'),
  userId: varchar('user_id', { length: 21 }).references(() => users.id, { onDelete: 'set null' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Settings table
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  businessName: varchar('business_name', { length: 100 }).notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  logoUrl: text('logo_url'),
  receiptFooter: text('receipt_footer'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});