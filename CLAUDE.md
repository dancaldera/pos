# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack Point of Sale (POS) and inventory management system built with:
- **Frontend**: React + TypeScript with Tauri desktop app wrapper
- **Backend**: Express + TypeScript with PostgreSQL database
- **Database**: PostgreSQL with Drizzle ORM
- **Architecture**: Separate frontend and backend services

## Development Commands

### Backend (Express API)
Navigate to `backend/` directory:
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:generate` - Generate database migrations with Drizzle Kit
- `npm run db:migrate` - Apply database migrations

### Frontend (React + Tauri)
Navigate to `frontend/` directory:
- `npm run dev` - Start Vite development server (web version)
- `npm run build` - Build for production (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build
- `npx tauri dev` - Start Tauri desktop app in development mode
- `npx tauri build` - Build desktop application for distribution

## Code Architecture

### Backend Structure
- **Database Schema**: Single `schema.ts` file in `src/db/` with Drizzle ORM definitions
- **Controllers**: Business logic organized by feature (auth, products, orders, etc.)
- **Routes**: Express routes that map to controllers
- **Middleware**: Authentication and error handling
- **Services**: External integrations (receipt generation, file storage)

### Frontend Structure
- **State Management**: Zustand for global state (auth store)
- **API Layer**: Axios client with automatic token injection
- **Components**: Reusable UI components using Headless UI
- **Routing**: React Router for navigation
- **Styling**: TailwindCSS with custom configuration
- **Desktop App**: Tauri wrapper for native desktop functionality

### Key Data Models
The system manages:
- **Users**: Role-based access (admin, manager, waitress)
- **Products**: With variants, stock tracking, and categories
- **Orders**: With items, payments, and status tracking
- **Customers**: Customer information and order history
- **Inventory**: Transaction tracking for stock movements

### Authentication Flow
- JWT-based authentication
- Token stored in localStorage
- Automatic token injection via Axios interceptor
- Role-based access control throughout the application

## Configuration Files

### Database
- `backend/drizzle.config.ts` - Drizzle ORM configuration
- Database migrations in `backend/drizzle/`

### Frontend Build
- `frontend/vite.config.ts` - Vite configuration with proxy to backend
- `frontend/src-tauri/tauri.conf.json` - Tauri desktop app configuration
- `frontend/prettier.config.mjs` - Code formatting with import organization

### Environment Variables
Both frontend and backend require `.env` files (copy from `.env.example`):
- Backend: Database connection, JWT secrets, storage configuration
- Frontend: API URL configuration

## Development Workflow

1. **Database Setup**: Run migrations before starting development
2. **Development**: Start backend first, then frontend (backend runs on port 8000, frontend on port 3000)
3. **Desktop App**: Use `npx tauri dev` for native desktop development
4. **Code Style**: Prettier configured with automatic import organization and Tailwind class sorting

## API Architecture
- RESTful API design
- Consistent error handling middleware
- Automatic request logging
- File upload support for product images
- JWT authentication on protected routes

## Key Libraries
- **Frontend**: React Router, Axios, Zustand, Headless UI, TailwindCSS, Chart.js
- **Backend**: Express, Drizzle ORM, JWT, bcrypt, multer, PDFKit
- **Desktop**: Tauri for cross-platform native app functionality