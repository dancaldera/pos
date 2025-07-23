# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack Point of Sale (POS) and Inventory Management System built with:
- **Frontend**: React + TypeScript + Vite + TailwindCSS (port 3000)
- **Backend**: Express + TypeScript + PostgreSQL + Drizzle ORM (port 8000)
- **Desktop**: Tauri integration for desktop app deployment

The system manages products, categories, customers, orders, users, and provides dashboard analytics with role-based access control (admin, manager, waitress).

## Development Commands

### Backend (`/backend`)
```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm run start        # Start production server
npm run db:generate  # Generate Drizzle migration files
npm run db:migrate   # Run database migrations
```

### Frontend (`/frontend`) 
```bash
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Build for production (runs TypeScript check + Vite build)
npm run preview      # Preview production build
```

### Database Setup
1. Ensure PostgreSQL is running
2. Configure environment variables in `backend/.env`
3. Run `npm run db:generate` to create migration files
4. Run `npm run db:migrate` to apply migrations

## Architecture

### Backend Structure
- **Controllers** (`src/controllers/`): Request handlers for each domain (auth, products, orders, etc.)
- **Routes** (`src/routes/`): Express route definitions that map to controllers
- **Database** (`src/db/`): Drizzle ORM schema and migration utilities
- **Services** (`src/services/`): Business logic (receipt generation, file storage)
- **Middleware** (`src/middleware/`): Authentication and error handling
- **Types** (`src/types/`): TypeScript type definitions

### Frontend Structure
- **API Layer** (`src/api/`): Axios-based API client with automatic token injection
- **Components** (`src/components/`): Reusable UI components using Headless UI + Tailwind
- **Pages** (`src/pages/`): Route-specific page components
- **Store** (`src/store/`): Zustand state management (auth store)
- **Context** (`src/context/`): React contexts (language/i18n)
- **Layouts** (`src/layouts/`): Page layout components

### Database Schema (Drizzle ORM)
Key tables: `users`, `categories`, `products`, `customers`, `orders`, `order_items`
- Uses custom ID generation with nanoid (21 chars)
- Enums for roles, order status, payment methods
- Product variants stored as JSON
- Proper foreign key relationships

### Authentication
- JWT-based authentication
- Token stored in localStorage
- Automatic token injection via Axios interceptors
- Role-based access control throughout the app
- Protected routes with redirect logic

### Key Features
- **Multi-language support** (English/Spanish) via context
- **Receipt generation** using PDFKit and jsPDF
- **Image upload** with S3-compatible storage
- **Dashboard analytics** with Chart.js integration
- **Print functionality** for receipts
- **Responsive design** with TailwindCSS

## Development Notes

- Backend runs on port 8000, frontend on port 3000 with proxy setup
- Default admin account: admin@example.com / admin123
- Uses environment variables for database and API configuration
- Custom ID generation using nanoid instead of auto-increment
- Zustand for state management instead of Redux
- Headless UI components with custom styling