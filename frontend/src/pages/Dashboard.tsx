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
  ArchiveBoxIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { 
  getDashboardStats, 
  getRecentOrders, 
  getSalesData, 
  getTopProducts, 
  getPaymentStats,
  DashboardStats,
  RecentOrder,
  SalesDataPoint,
  TopProduct,
  PaymentStat
} from '../api/dashboard';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard: React.FC = () => {
  const { state } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [salesPeriod, setSalesPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [monthlyGrowth, setMonthlyGrowth] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, [salesPeriod]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all dashboard data in parallel
      const [statsRes, recentOrdersRes, topProductsRes, paymentStatsRes, salesDataRes] = await Promise.all([
        getDashboardStats(),
        getRecentOrders(5), 
        getTopProducts(5),
        getPaymentStats(),
        getSalesData(salesPeriod)
      ]);
      
      // Update state with fetched data
      setStats(statsRes.data);
      setRecentOrders(recentOrdersRes.data);
      setTopProducts(topProductsRes.data);
      setPaymentStats(paymentStatsRes.data);
      setSalesData(salesDataRes.data);
      
      // Fetch sales data for growth calculation
      await fetchSalesData();
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalesData = async () => {
    try {
      const response = await getSalesData(salesPeriod);
      setSalesData(response.data);
      
      // Calculate growth if we have data
      if (response.data.length > 1) {
        calculateGrowth(response.data);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  const calculateGrowth = (data: SalesDataPoint[]) => {
    // Need at least 2 data points to calculate growth
    if (data.length < 2) {
      setMonthlyGrowth(0);
      return;
    }
    
    // For the simplest calculation, compare last point to first point
    const latestSales = data[data.length - 1].sales;
    const earliestSales = data[0].sales;
    
    // Avoid division by zero
    if (earliestSales === 0) {
      setMonthlyGrowth(latestSales > 0 ? 100 : 0);
      return;
    }
    
    const growthRate = ((latestSales - earliestSales) / earliestSales) * 100;
    setMonthlyGrowth(growthRate);
  };

  const prepareSalesChartData = () => {
    const labels = salesData.map(point => {
      const date = new Date(point.date);
      
      if (salesPeriod === 'weekly') {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
      }
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Sales',
          data: salesData.map(point => point.sales),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          tension: 0.3,
        },
      ]
    };
  };

  const prepareTopProductsChartData = () => {
    return {
      labels: topProducts.map(product => product.productName),
      datasets: [
        {
          label: 'Sales',
          data: topProducts.map(product => product.totalSales),
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
          ],
          borderWidth: 1,
        }
      ]
    };
  };

  const preparePaymentStatsChartData = () => {
    return {
      labels: paymentStats.map(stat => {
        const method = stat.method.replace('_', ' ');
        return method.charAt(0).toUpperCase() + method.slice(1);
      }),
      datasets: [
        {
          label: 'Payment Methods',
          data: paymentStats.map(stat => stat.total),
          backgroundColor: [
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
          ],
          borderWidth: 1,
        }
      ]
    };
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      }
    },
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      }
    },
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
  };

  const cardClass = "transition-all duration-200 transform hover:scale-105";
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
                  {isLoading ? '...' : stats?.totalProducts || 0}
                </p>
                <p className="text-xs text-gray-500">
                  {isLoading ? '' : `${stats?.activeProducts || 0} active`}
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
                  {isLoading ? '...' : stats?.totalCategories || 0}
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
                  {isLoading ? '...' : stats?.totalCustomers || 0}
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
                  {isLoading ? '...' : stats?.totalOrders || 0}
                </p>
                <p className="text-xs text-gray-500">
                  {isLoading ? '' : `${stats?.completedOrders || 0} completed`}
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
                {isLoading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <CurrencyDollarIcon className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </Card>

        {/* Growth */}
        <Card className={`${cardClass} border-l-4 border-emerald-500`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {salesPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Growth
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading || monthlyGrowth === null ? '...' : 
                 `${monthlyGrowth.toFixed(1)}%`}
              </p>
              <div className="flex items-center text-xs mt-1">
                <select 
                  value={salesPeriod}
                  onChange={(e) => setSalesPeriod(e.target.value as any)}
                  className="text-xs border rounded p-1"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
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
                  {isLoading ? '...' : stats?.pendingOrders || 0}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <ClockIcon className="w-6 h-6 text-orange-500" />
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
                  {isLoading ? '...' : stats?.lowStockProducts || 0}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Chart */}
        <Card title={`${salesPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Sales`}>
          <div className="h-80">
            {isLoading || salesData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 italic">
                  {isLoading ? 'Loading sales data...' : 'No sales data available'}
                </p>
              </div>
            ) : (
              <Line options={chartOptions} data={prepareSalesChartData()} />
            )}
          </div>
        </Card>

        {/* Recent Orders */}
        <Card title="Recent Orders">
          <div className="h-80 overflow-y-auto">
            {isLoading || recentOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 italic">
                  {isLoading ? 'Loading recent orders...' : 'No recent orders'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link to={`/orders/${order.id}`} className="text-blue-600 hover:text-blue-900">
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.customer?.name || 'Walk-in Customer'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Chart */}
        <Card title="Top Selling Products">
          <div className="h-80">
            {isLoading || topProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 italic">
                  {isLoading ? 'Loading top products...' : 'No product data available'}
                </p>
              </div>
            ) : (
              <Bar options={barChartOptions} data={prepareTopProductsChartData()} />
            )}
          </div>
        </Card>

        {/* Payment Methods Chart */}
        <Card title="Payment Methods">
          <div className="h-80">
            {isLoading || paymentStats.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 italic">
                  {isLoading ? 'Loading payment data...' : 'No payment data available'}
                </p>
              </div>
            ) : (
              <Doughnut options={doughnutOptions} data={preparePaymentStatsChartData()} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;