# Inventory POS System - Frontend

This is the frontend part of the Inventory and Point of Sale (POS) system, built with React, TypeScript, Vite, and TailwindCSS.

## Features

- User authentication and role-based access control
- Dashboard with key metrics
- Product management
- Category management
- Customer management
- Order processing with receipts
- User management
- Settings management

## Tech Stack

- **React**: UI library
- **TypeScript**: For type safety
- **Vite**: For fast development and building
- **React Router**: For routing
- **TailwindCSS**: For styling
- **Formik + Yup**: For form handling and validation
- **Axios**: For API requests
- **Heroicons**: For icons
- **jsPDF**: For PDF receipt generation

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create .env file and adjust as needed
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with the following variables:

```
VITE_API_URL=http://localhost:8000/api
```

### Building for Production

```bash
npm run build
```

## Project Structure

```
src/
  api/          # API client and service functions
  assets/       # Static assets
  components/   # Reusable components
    ui/         # Generic UI components
  context/      # React context providers
  hooks/        # Custom React hooks
  layouts/      # Page layouts
  pages/        # Page components
  types/        # TypeScript type definitions
  utils/        # Utility functions
  App.tsx       # Main App component with routes
  main.tsx      # Application entry point
  index.css     # Global styles
```

## Authentication

The application uses JWT-based authentication with role-based access control. There are three roles:

- **Admin**: Full access to all features
- **Manager**: Can manage products, categories, and view analytics
- **Waitress**: Can create and manage orders

## Demo Account

For testing, you can use the following demo account:

- **Email**: admin@example.com
- **Password**: admin123
