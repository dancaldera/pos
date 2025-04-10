# Inventory and Point of Sale System

A complete solution for inventory management and point of sale operations, built with React, Express, and PostgreSQL.

## Project Overview

This project is a full-stack application that helps businesses manage their inventory, process sales, track customers, and monitor performance. It features role-based access control, with different capabilities for admin users, managers, and waitstaff.

## Repository Structure

The project is divided into two main parts:

- **`/inventory/frontend`**: React + TypeScript frontend application
- **`/inventory/backend`**: Express + TypeScript backend API

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
- Vite
- React Router
- TailwindCSS
- Formik + Yup
- Axios
- Heroicons
- jsPDF

### Backend
- Node.js + Express + TypeScript
- PostgreSQL
- Drizzle ORM
- JWT Authentication
- PDFKit
- AWS SDK

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL

### Setup

1. Clone the repository
```bash
git clone <repository-url>
cd inventory
```

2. Start the backend
```bash
cd backend
npm install
cp .env.example .env  # Configure your environment variables
npm run db:generate
npm run db:migrate
npm run dev
```

3. Start the frontend
```bash
cd frontend
npm install
cp .env.example .env  # Configure your environment variables
npm run dev
```

4. Access the application at http://localhost:3000

## Demo Account

For testing purposes, a default admin account is created when you run the migrations:

- **Email**: admin@example.com
- **Password**: admin123

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Screenshots

*Screenshots would be added here*