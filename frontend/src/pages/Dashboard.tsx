import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingCartIcon, 
  ArrowTrendingUpIcon, 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon,
  SquaresPlusIcon,
  UserGroupIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
}

const Dashboard: React.FC = () => {
  const { state } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCategories: 0,
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real application, this would be an API call
    // For this demo, we'll simulate loading with mock data
    const timer = setTimeout(() => {
      setStats({
        totalProducts: 124,
        totalCategories: 8,
        totalCustomers: 95,
        totalOrders: 230,
        totalRevenue: 15680.50,
        pendingOrders: 12,
        lowStockProducts: 5,
      });
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const cardClass = "transition-all duration-200 transform hover:scale-105";

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {state.user?.name}</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link 
            to="/orders/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
          >
            <ShoppingCartIcon className="w-5 h-5 mr-2" />
            New Order
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {/* Products */}
        <Link to="/products">
          <Card className={`${cardClass} border-l-4 border-indigo-500`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">Products</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.totalProducts}
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <SquaresPlusIcon className="w-6 h-6 text-indigo-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Categories */}
        <Link to="/categories">
          <Card className={`${cardClass} border-l-4 border-purple-500`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.totalCategories}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <ArchiveBoxIcon className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Customers */}
        <Link to="/customers">
          <Card className={`${cardClass} border-l-4 border-blue-500`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.totalCustomers}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <UserGroupIcon className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Orders */}
        <Link to="/orders">
          <Card className={`${cardClass} border-l-4 border-green-500`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.totalOrders}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <ShoppingCartIcon className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Revenue */}
        <Card className={`${cardClass} border-l-4 border-yellow-500`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : `$${stats.totalRevenue.toFixed(2)}`}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <CurrencyDollarIcon className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </Card>

        {/* Growth (This would be calculated from real data) */}
        <Card className={`${cardClass} border-l-4 border-emerald-500`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Growth</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : '12.5%'}
              </p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </Card>

        {/* Pending Orders */}
        <Link to="/orders?status=pending">
          <Card className={`${cardClass} border-l-4 border-orange-500`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.pendingOrders}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <ShoppingCartIcon className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Low Stock */}
        <Link to="/products?lowStock=true">
          <Card className={`${cardClass} border-l-4 border-red-500`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.lowStockProducts}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent activity / charts could go here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Orders">
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500 italic">
              Recent orders would be displayed here
            </p>
          </div>
        </Card>

        <Card title="Revenue Chart">
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500 italic">
              Revenue chart would be displayed here
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;