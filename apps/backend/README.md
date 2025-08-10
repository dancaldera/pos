# Inventory POS System - Backend

This is the backend API for the Inventory and Point of Sale (POS) system, built with Express, TypeScript, Drizzle ORM, and PostgreSQL.

## Features

- User authentication and role-based authorization with JWT
- RESTful API for products, categories, customers, orders, and users
- PDF receipt generation
- File uploads with S3 compatibility
- Database migrations with Drizzle

## Tech Stack

- **Node.js + Express**: For the API server
- **TypeScript**: For type safety
- **PostgreSQL**: Database
- **Drizzle ORM**: For database access and migrations
- **JWT**: For authentication
- **PDFKit**: For PDF generation
- **Multer**: For file upload handling
- **AWS SDK**: For S3 storage integration

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL database

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables and modify as needed
cp .env.example .env

# Generate database migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

The `.env` file should contain:

```
# Server
PORT=8000
NODE_ENV=development
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/inventory_pos

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d

# S3 Storage (Optional)
S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=

# Email (Optional)
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```

## Database Schema

The database schema includes the following main tables:

- **users**: User accounts with roles (admin, manager, waitress)
- **categories**: Product categories
- **products**: Inventory items with stock management
- **customers**: Customer information
- **orders**: Sales transactions
- **order_items**: Line items for each order
- **payments**: Payment records for orders
- **inventory_transactions**: Stock movement records
- **settings**: Application settings

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get a user by ID (admin)
- `POST /api/users` - Create a user (admin)
- `PUT /api/users/:id` - Update a user (admin)
- `DELETE /api/users/:id` - Delete a user (admin)

### Products
- `GET /api/products` - Get all products (filtered)
- `GET /api/products/:id` - Get a product by ID
- `POST /api/products` - Create a product (admin/manager)
- `PUT /api/products/:id` - Update a product (admin/manager)
- `DELETE /api/products/:id` - Delete a product (admin)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get a category by ID
- `POST /api/categories` - Create a category (admin/manager)
- `PUT /api/categories/:id` - Update a category (admin/manager)
- `DELETE /api/categories/:id` - Delete a category (admin)

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get a customer by ID
- `POST /api/customers` - Create a customer
- `PUT /api/customers/:id` - Update a customer (admin/manager)
- `DELETE /api/customers/:id` - Delete a customer (admin)

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get an order by ID
- `POST /api/orders` - Create an order
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/payment` - Add payment to order
- `GET /api/orders/:id/receipt` - Generate order receipt
- `PUT /api/orders/:id/cancel` - Cancel an order (admin/manager)

## Default Admin Account

A default admin account is created when you run the migrations:

- **Email**: admin@example.com
- **Password**: admin123

## Storage Options

The system supports two storage options for product images:

1. **Local Storage**: Files are stored in the `/uploads` directory
2. **S3 Compatible Storage**: Configure S3 settings in `.env` file
