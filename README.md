# Inventory and Point of Sale System

A complete solution for inventory management and point of sale operations, built with React, Express, and PostgreSQL in a monorepo structure.

## Project Overview

This project is a full-stack application that helps businesses manage their inventory, process sales, track customers, and monitor performance. It features role-based access control, with different capabilities for admin users, managers, and waitstaff.

## Repository Structure

This is a monorepo managed with pnpm workspaces:

```
inventory-system/
├── apps/
│   ├── frontend/          # React + TypeScript frontend application
│   └── backend/           # Express + TypeScript backend API
├── packages/
│   └── shared/            # Shared types and utilities
├── tools/
│   └── scripts/           # Development and build scripts
├── package.json           # Root workspace configuration
├── pnpm-workspace.yaml    # Workspace definition
└── tsconfig.json          # Shared TypeScript configuration
```

## Monorepo Benefits

- **Unified Dependencies**: Shared dependencies are hoisted to reduce duplication
- **TypeScript Project References**: Efficient builds and better IDE support
- **Cross-Workspace Imports**: Frontend and backend can import from shared packages
- **Coordinated Development**: Run all services with a single command
- **Consistent Tooling**: Shared configurations and development scripts

## Features

- **User Authentication & Authorization**: JWT-based authentication with role-based access control
- **Dashboard**: Overview of key metrics and performance indicators
- **Inventory Management**: Track products, categories, and stock levels
- **Point of Sale**: Process orders quickly and efficiently 
- **Customer Management**: Store and retrieve customer information
- **Receipt Generation**: Generate and print PDF receipts
- **Reporting**: View sales history and analytics
- **User Management**: Administer user accounts and roles
- **Image Upload**: Store product images locally or in S3-compatible storage

## Tech Stack

### Frontend
- React + TypeScript
- Vite (build tool)
- React Router DOM v7
- TailwindCSS v4
- Headless UI (component library)
- Axios (HTTP client)
- Heroicons (icons)
- jsPDF (client-side PDFs)
- Chart.js + react-chartjs-2 (analytics)
- Zustand (state management)
- Yup (validation)
- Tauri (desktop app framework)
- Framer Motion (animations)
- react-to-print (printing)

### Backend
- Node.js + Express + TypeScript
- PostgreSQL
- Drizzle ORM
- JWT Authentication
- PDFKit (receipt generation)
- AWS SDK (S3-compatible storage)
- bcryptjs (password hashing)
- nanoid (ID generation)
- tsx (TypeScript execution)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm (v8 or higher)
- PostgreSQL

### Setup

1. Clone the repository
```bash
git clone <repository-url>
cd inventory-system
```

2. Install dependencies for all workspaces
```bash
pnpm install
```

3. Configure environment variables
```bash
# Backend configuration
cp apps/backend/.env.example apps/backend/.env
# Frontend configuration  
cp apps/frontend/.env.example apps/frontend/.env
```

4. Set up the database
```bash
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
```

5. Start development servers
```bash
# Start both frontend and backend concurrently
pnpm dev

# Or start individually
pnpm frontend:dev  # Frontend only
pnpm backend:dev   # Backend only
```

6. Access the application at http://localhost:3000

### Available Scripts

#### Root Level Commands
- `pnpm dev` - Start both frontend and backend development servers concurrently
- `pnpm build` - Build all workspaces in correct dependency order
- `pnpm clean` - Clean build artifacts from all workspaces
- `pnpm validate` - Run validation checks across all workspaces

#### Workspace-Specific Commands
- `pnpm frontend:dev` - Start only the frontend development server
- `pnpm backend:dev` - Start only the backend development server
- `pnpm frontend:build` - Build only the frontend
- `pnpm backend:build` - Build only the backend

#### Advanced Workspace Targeting
- `pnpm --filter frontend [script]` - Run any script in the frontend workspace
- `pnpm --filter backend [script]` - Run any script in the backend workspace
- `pnpm --filter shared [script]` - Run any script in the shared package
- `pnpm -r [script]` - Run script in all workspaces recursively

#### Tauri Desktop App Commands
- `pnpm tauri:dev` - Start desktop app in development mode
- `pnpm tauri:build` - Build desktop app for production

## Demo Account

For testing purposes, a default admin account is created when you run the migrations:

- **Email**: admin@example.com
- **Password**: admin123

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Screenshots

*Screenshots would be added here*