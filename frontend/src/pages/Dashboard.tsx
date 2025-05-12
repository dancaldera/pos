import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Card from '../_components/ui/Card';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../context/LanguageContext';
import {
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  SquaresPlusIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
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
import { formatCurrency } from '@/utils/format-currency';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Select } from '@/components/select';
import { Badge } from '@/components/badge';

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
  const { user } = useAuthStore();
  // Redirect waitress role away from dashboard
  if (user?.role === 'waitress') {
    return <Navigate to="/orders" replace />;
  }
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [salesPeriod, setSalesPeriod] = useState<'today' | 'thisWeek' | 'thisYear'>('today');
  const [monthlyGrowth, setMonthlyGrowth] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refetch all dashboard data when period changes
  useEffect(() => {
    fetchDashboardData();
  }, [salesPeriod]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all dashboard data in parallel
      const [statsRes, recentOrdersRes, topProductsRes, paymentStatsRes, salesDataRes] = await Promise.all([
        getDashboardStats(salesPeriod),
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
      // Calculate growth based on fetched sales data
      calculateGrowth(salesDataRes.data);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
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
      // Parse date differently based on period
      // Backend sends formats like: 
      // - "YYYY-MM-DD" for daily data
      // - "YYYY-MM-DDThh" for hourly data
      // - "YYYY-MM" for monthly data
      
      if (salesPeriod === 'today') {
        // For hourly data (format: YYYY-MM-DDThh)
        const hourPart = point.date.split('T')[1];
        return hourPart ? `${hourPart}:00` : point.date;
      } else if (salesPeriod === 'thisWeek') {
        // For daily data (format: YYYY-MM-DD)
        try {
          const date = new Date(point.date);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          }
          return point.date;
        } catch (error) {
          console.error('Error parsing date:', point.date, error);
          return point.date;
        }
      } else if (salesPeriod === 'thisYear') {
        // For monthly data (format: YYYY-MM)
        try {
          const [_, month] = point.date.split('-');
          const monthIndex = parseInt(month, 10) - 1;
          const monthName = new Date(0, monthIndex).toLocaleString([], { month: 'short' });
          return monthName;
        } catch (error) {
          console.error('Error parsing month:', point.date, error);
          return point.date;
        }
      }
      
      // Fallback
      return point.date;
    });
    
    return {
      labels,
      datasets: [
        {
          label: translate.dashboard('totalSales'),
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
          label: translate.dashboard('totalSales'),
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
      labels: paymentStats.map(stat => stat.method),
      datasets: [
        {
          label: translate.orders('paymentMethod'),
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
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'cancelled':
        return 'red';
      default:
        return 'zinc';
    }
  };

  const { translate } = useLanguage();

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Heading level={3}>{translate.dashboard('title')}</Heading>
          <Text>{translate.dashboard('welcome')}, {user?.name}</Text>
        </div>
        <div className="mt-4 md:mt-0">
          <Button
            href="/orders/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
          >
            <ShoppingCartIcon className="w-5 h-5 mr-2" />
            {translate.orders('newOrder')}
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {/* Products */}
        <Link to="/products">
          <Card className={`border-l-4 border-indigo-500`}>
            <div className="flex justify-between items-center">
              <div>
                <Heading level={4}>{translate.products('title')}</Heading>
                <Heading level={2}>{isLoading ? '...' : stats?.totalProducts || 0}</Heading>
                <Text>{isLoading ? '' : `${stats?.activeProducts || 0} ${translate.common('active').toLowerCase()}`}</Text>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <SquaresPlusIcon className="w-6 h-6 text-indigo-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Categories */}
        <Link to="/categories">
          <Card className={`border-l-4 border-purple-500`}>
            <div className="flex justify-between items-center">
              <div>
                <Heading level={4}>{translate.categories('title')}</Heading>
                <Heading level={2}>{isLoading ? '...' : stats?.totalCategories || 0}</Heading>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <ArchiveBoxIcon className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Customers */}
        <Link to="/customers">
          <Card className={`border-l-4 border-blue-500`}>
            <div className="flex justify-between items-center">
              <div>
                <Heading level={4}>{translate.customers('title')}</Heading>
                <Heading level={2}>{isLoading ? '...' : stats?.totalCustomers || 0}</Heading>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <UserGroupIcon className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Orders */}
        <Link to="/orders">
          <Card className={`border-l-4 border-green-500`}>
            <div className="flex justify-between items-center">
              <div>
                <Heading level={4}>{translate.orders('title')}</Heading>
                <Heading level={2}>{isLoading ? '...' : stats?.totalOrders || 0}</Heading>
                <Text>{isLoading ? '' : `${stats?.completedOrders || 0} ${translate.orders('completed').toLowerCase()}`}
                </Text>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <ShoppingCartIcon className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Revenue */}
        <Card className={`border-l-4 border-yellow-500`}>
          <div className="flex justify-between items-center">
            <div>
              <Heading level={4}>{translate.dashboard('totalSales')}</Heading>
              <Heading level={2}>{isLoading ? '...' : formatCurrency(stats?.totalRevenue || 0)}</Heading>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <CurrencyDollarIcon className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </Card>

        {/* Growth */}
        <Card className={`border-l-4 border-emerald-500`}>
          <div className="flex justify-between items-center">
            <div>
              <Heading level={4}>{(() => {
                  switch (salesPeriod) {
                    case 'today':
                      return translate.dashboard('dailySales');
                    case 'thisWeek':
                      return translate.dashboard('weeklySales');
                    case 'thisYear':
                      return translate.dashboard('monthlySales');
                    default:
                      return '';
                  }
                })()}
              </Heading>
              <Heading level={2}>{isLoading || monthlyGrowth === null ? '...' : 
                 `${monthlyGrowth.toFixed(1)}%`}</Heading>
              <div className="flex items-center text-xs mt-1">
                <Select
                  value={salesPeriod}
                  onChange={(e) => setSalesPeriod(e.target.value as any)}
                  className="text-xs"
                >
                  <option value="today">{translate.dashboard('today')}</option>
                  <option value="thisWeek">{translate.dashboard('thisWeek')}</option>
                  <option value="thisYear">{translate.dashboard('thisYear')}</option>
                </Select>
              </div>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </Card>

        {/* Pending Orders */}
        <Link to="/orders?status=pending">
          <Card className={`border-l-4 border-orange-500`}>
            <div className="flex justify-between items-center">
              <div>
                <Heading level={4}>{translate.orders('pendingOrders')}</Heading>
                <Heading level={2}>{isLoading ? '...' : stats?.pendingOrders || 0}</Heading>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <ClockIcon className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Low Stock */}
        <Link to="/products?lowStock=true">
          <Card className={`border-l-4 border-red-500`}>
            <div className="flex justify-between items-center">
              <div>
                <Heading level={4}>{translate.products('lowStock')}</Heading>
                <Heading level={2}>{isLoading ? '...' : stats?.lowStockProducts || 0}</Heading>
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
        <Card title={(() => {
          switch (salesPeriod) {
            case 'today':
              return translate.dashboard('dailySales');
            case 'thisWeek':
              return translate.dashboard('weeklySales');
            case 'thisYear':
              return translate.dashboard('monthlySales');
            default:
              return '';
          }
        })()}>
          <div className="h-80">
            {isLoading || salesData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Text>
                  {isLoading ? translate.common('loading') : translate.reports('noData')}
                </Text>
              </div>
            ) : (
              <Line options={chartOptions} data={prepareSalesChartData()} />
            )}
          </div>
        </Card>

        {/* Recent Orders */}
        <Card title={translate.dashboard('recentOrders')}>
          <div className="h-80 overflow-y-auto">
            {isLoading || recentOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Text>
                  {isLoading ? translate.common('loading') : translate.common('noResults')}
                </Text>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {translate.orders('orderNumber')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {translate.orders('customer')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {translate.common('total')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {translate.common('status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-zinc-700">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700">
                      <td className="px-4 py-3 whitespace-nowrap dark:text-zinc-100">
                        <Link to={`/orders/${order.id}`} className="text-blue-600 hover:text-blue-900">
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap dark:text-zinc-100">
                        {order.customer?.name || translate.orders('walkInCustomer')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap dark:text-zinc-100">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap dark:text-zinc-100">
                        <Badge color={getStatusColor(order.status)}>
                          {translate.orders(order.status as 'pending' | 'completed' | 'cancelled')}
                        </Badge>
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
        <Card title={translate.dashboard('topProducts')}>
          <div className="h-80">
            {isLoading || topProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Text>
                  {isLoading ? translate.common('loading') : translate.reports('noData')}
                </Text>
              </div>
            ) : (
              <Bar options={barChartOptions} data={prepareTopProductsChartData()} />
            )}
          </div>
        </Card>

        {/* Payment Methods Chart */}
        <Card title={translate.orders('paymentMethod')}>
          <div className="h-80">
            {isLoading || paymentStats.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Text>
                  {isLoading ? translate.common('loading') : translate.reports('noData')}
                </Text>
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