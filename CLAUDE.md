# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack Point of Sale (POS) and Inventory Management System built as a **pnpm monorepo** with:
- **Frontend**: React + TypeScript + Vite + TailwindCSS (port 3000) in `apps/frontend/`
- **Backend**: Express + TypeScript + PostgreSQL + Drizzle ORM (port 8000) in `apps/backend/`
- **Desktop**: Tauri integration for desktop app deployment
- **Shared**: Common types and utilities in `packages/shared/`

The system manages products, categories, customers, orders, users, and provides dashboard analytics with role-based access control (admin, manager, waitress).

## Monorepo Structure

This project uses **pnpm workspaces** for monorepo management:

```
inventory-system/
├── apps/
│   ├── frontend/          # React frontend app
│   └── backend/           # Express backend API  
├── packages/
│   └── shared/            # Shared types and utilities
├── tools/
│   └── scripts/           # Development and build scripts
├── package.json           # Root workspace configuration
├── pnpm-workspace.yaml    # Workspace definition
└── tsconfig.json          # Shared TypeScript configuration
```

## Development Commands

### Root Level (Recommended)
```bash
pnpm dev                 # Start both frontend and backend concurrently
pnpm build               # Build all workspaces in dependency order
pnpm clean               # Clean build artifacts from all workspaces
pnpm validate            # Run validation checks across all workspaces
```

### Workspace-Specific Commands
```bash
pnpm frontend:dev        # Start only frontend dev server
pnpm backend:dev         # Start only backend dev server
pnpm frontend:build      # Build only frontend
pnpm backend:build       # Build only backend
pnpm start:backend       # Start backend production server
pnpm tauri:dev           # Start Tauri desktop app development
pnpm tauri:build         # Build Tauri desktop app
```

### Direct Workspace Targeting
```bash
pnpm --filter backend [script]   # Run script in backend workspace
pnpm --filter frontend [script]  # Run script in frontend workspace
pnpm -r [script]                 # Run script in all workspaces
```

### Database Setup
1. Ensure PostgreSQL is running
2. Configure environment variables in `apps/backend/.env`
3. Run `pnpm --filter backend db:generate` to create migration files
4. Run `pnpm --filter backend db:migrate` to apply migrations

## Architecture

### Backend Structure (`apps/backend/src/`)
- **Controllers** (`controllers/`): Request handlers for each domain (auth, products, orders, etc.)
- **Routes** (`routes/`): Express route definitions that map to controllers
- **Database** (`db/`): Drizzle ORM schema and migration utilities
- **Services** (`services/`): Business logic (receipt generation, storage)
- **Middleware** (`middleware/`): Authentication and error handling
- **Types** (`types/`): TypeScript type definitions
- **Config** (`config/`): Configuration management
- **Utils** (`utils/`): Utility functions (ID generation, logging, errors)

### Frontend Structure (`apps/frontend/src/`)
- **API Layer** (`api/`): Axios-based API client with automatic token injection
- **Components** (`components/`): Reusable UI components using Headless UI + TailwindCSS
- **Pages** (`pages/`): Route-specific page components
- **Store** (`store/`): Zustand state management (auth store)
- **Context** (`context/`): React contexts (language/i18n)
- **Layouts** (`layouts/`): Page layout components
- **Types** (`types/`): TypeScript type definitions
- **Utils** (`utils/`): Utility functions (currency formatting)
- **i18n** (`i18n/`): Internationalization files (English/Spanish)

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
- **Multi-language support** (English/Spanish) via React context
- **Receipt generation** using PDFKit (backend) and jsPDF (frontend)
- **Image upload** with S3-compatible storage (AWS SDK)
- **Dashboard analytics** with Chart.js integration
- **Print functionality** for receipts using react-to-print
- **Responsive design** with TailwindCSS v4
- **Desktop app** support via Tauri
- **Monorepo architecture** with pnpm workspaces
- **Shared packages** for code reuse between frontend/backend

## Development Notes

- **Monorepo**: Uses pnpm workspaces for efficient dependency management
- **Package Manager**: pnpm (required, specified in engines)
- **Node Version**: >=18.0.0 (specified in engines)
- **Ports**: Backend on 8000, Frontend on 3000 with proxy setup
- **Default Admin**: admin@example.com / admin123
- **Database**: PostgreSQL with Drizzle ORM migrations
- **ID Generation**: Custom nanoid (21 chars) instead of auto-increment
- **State Management**: Zustand for React state management
- **UI Components**: Headless UI with TailwindCSS styling
- **Build Tools**: TypeScript, Vite, tsx for development
- **Development Scripts**: Coordinated via root package.json and tools/scripts/