CREATE TYPE "role" AS ENUM ('admin', 'manager', 'waitress');
CREATE TYPE "order_status" AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE "payment_status" AS ENUM ('paid', 'unpaid', 'partial');
CREATE TYPE "payment_method" AS ENUM ('cash', 'credit_card', 'debit_card', 'transfer');

CREATE TABLE IF NOT EXISTS "users" (
    "id" varchar(21) PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "email" varchar(100) NOT NULL UNIQUE,
    "password" varchar(255) NOT NULL,
    "role" "role" DEFAULT 'waitress' NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
    "id" varchar(21) PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL UNIQUE,
    "description" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "products" (
    "id" varchar(21) PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "description" text,
    "price" numeric(10, 2) NOT NULL,
    "cost" numeric(10, 2),
    "sku" varchar(50) UNIQUE,
    "barcode" varchar(50) UNIQUE,
    "category_id" varchar(21),
    "image_url" text,
    "stock" integer DEFAULT 0 NOT NULL,
    "low_stock_alert" integer,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
    "id" varchar(21) PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "email" varchar(100) UNIQUE,
    "phone" varchar(20),
    "address" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
    "id" varchar(21) PRIMARY KEY NOT NULL,
    "order_number" serial NOT NULL UNIQUE,
    "customer_id" varchar(21),
    "user_id" varchar(21) NOT NULL,
    "status" "order_status" DEFAULT 'pending' NOT NULL,
    "subtotal" numeric(10, 2) NOT NULL,
    "tax" numeric(10, 2) NOT NULL,
    "discount" numeric(10, 2) DEFAULT 0 NOT NULL,
    "total" numeric(10, 2) NOT NULL,
    "notes" text,
    "payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
    "payment_method" "payment_method",
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
    "id" varchar(21) PRIMARY KEY NOT NULL,
    "order_id" varchar(21) NOT NULL,
    "product_id" varchar(21),
    "product_name" varchar(100) NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10, 2) NOT NULL,
    "subtotal" numeric(10, 2) NOT NULL,
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "inventory_transactions" (
    "id" varchar(21) PRIMARY KEY NOT NULL,
    "product_id" varchar(21) NOT NULL,
    "quantity" integer NOT NULL,
    "type" varchar(20) NOT NULL,
    "reference" varchar(100),
    "notes" text,
    "user_id" varchar(21) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" varchar(21) PRIMARY KEY NOT NULL,
    "order_id" varchar(21) NOT NULL,
    "amount" numeric(10, 2) NOT NULL,
    "method" "payment_method" NOT NULL,
    "reference" varchar(100),
    "notes" text,
    "user_id" varchar(21) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "settings" (
    "id" serial PRIMARY KEY,
    "business_name" varchar(100) NOT NULL,
    "address" text,
    "phone" varchar(20),
    "email" varchar(100),
    "tax_rate" numeric(5, 2) DEFAULT 0 NOT NULL,
    "currency" varchar(3) DEFAULT 'USD' NOT NULL,
    "logo_url" text,
    "receipt_footer" text,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL;

-- Insert default admin user (password: admin123)
INSERT INTO "users" ("id", "name", "email", "password", "role") 
VALUES ('admin_default_user', 'Admin User', 'admin@example.com', '$2b$10$ZKfkiZLjJBq8FuvfScRIwejvRRZPDzZEcbL5E6PBSWr5nwgKOGW.K', 'admin');

-- Insert default settings
INSERT INTO "settings" ("business_name", "tax_rate", "currency") 
VALUES ('My Business', 10.00, 'USD');
