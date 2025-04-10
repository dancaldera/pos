import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/Login';

// Main Pages
import Dashboard from './pages/Dashboard';
import ProductsPage from './pages/Products';
import CategoriesPage from './pages/Categories';
import CustomersPage from './pages/Customers';
import UsersPage from './pages/Users';
import SettingsPage from './pages/Settings';
import OrdersPage from './pages/Orders';
import NewOrderPage from './pages/NewOrder';
import OrderDetailPage from './pages/OrderDetail';
const NotFoundPage = () => <div className="p-4">Page Not Found</div>;

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { state } = useAuth();
  const location = useLocation();

  if (state.isLoading) {
    return <div>Loading...</div>;
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Admin only route component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { state } = useAuth();
  const location = useLocation();

  if (state.isLoading) {
    return <div>Loading...</div>;
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (state.user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Staff only route (admin or manager)
const StaffRoute = ({ children }: { children: React.ReactNode }) => {
  const { state } = useAuth();
  const location = useLocation();

  if (state.isLoading) {
    return <div>Loading...</div>;
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (state.user?.role !== 'admin' && state.user?.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAuth();

  // Redirect to dashboard if logged in and trying to access auth pages
  useEffect(() => {
    if (state.isAuthenticated && ['/login', '/register'].includes(location.pathname)) {
      navigate('/');
    }
  }, [state.isAuthenticated, location.pathname, navigate]);

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<NewOrderPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        
        {/* Staff Only Routes */}
        <Route path="products" element={
          <StaffRoute><ProductsPage /></StaffRoute>
        } />
        <Route path="categories" element={
          <StaffRoute><CategoriesPage /></StaffRoute>
        } />
        <Route path="customers" element={<CustomersPage />} />
        
        {/* Admin Only Routes */}
        <Route path="users" element={
          <AdminRoute><UsersPage /></AdminRoute>
        } />
        <Route path="settings" element={
          <AdminRoute><SettingsPage /></AdminRoute>
        } />
      </Route>

      {/* 404 Page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;