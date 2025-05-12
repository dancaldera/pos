import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LanguageProvider } from './context/LanguageContext';
import { useAuthStore } from './store/authStore';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';

// Auth Pages
import LoginPage from './pages/auth/Login';

// Main Pages
import CategoriesPage from './pages/Categories';
import CustomersPage from './pages/Customers';
import Dashboard from './pages/Dashboard';
import NewOrderPage from './pages/NewOrder';
import OrderDetailPage from './pages/OrderDetail';
import OrdersPage from './pages/Orders';
import PendingOrdersPage from './pages/PendingOrders';
import PrintReceipt from './pages/PrintReceipt';
import ProductsPage from './pages/Products';
import SettingsPage from './pages/Settings';
import UsersPage from './pages/Users';
import LoadingPage from './_components/LoadingPage';
const NotFoundPage = () => <div className="p-4">Page Not Found</div>;

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingPage />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Admin only route component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Staff only route (admin or manager)
const StaffRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  // Redirect to dashboard if logged in and trying to access auth pages
  useEffect(() => {
    if (isAuthenticated && ['/login', '/register'].includes(location.pathname)) {
      navigate('/');
    }
  }, [isAuthenticated, location.pathname, navigate]);

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
        <Route path="pending-orders" element={<PendingOrdersPage />} />
        <Route path="orders/new" element={<NewOrderPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="print-receipt/:id" element={<PrintReceipt />} />

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
  const initialize = useAuthStore(state => state.initialize);

  // Initialize auth state on app load
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <LanguageProvider>
      <AppRoutes />
      <Toaster position="top-right" richColors />
    </LanguageProvider>
  );
};

export default App;