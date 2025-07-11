import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { Select } from "@/components/select";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Text } from "@/components/text";
import { formatCurrency } from "@/utils/format-currency";
import {
  EyeIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrders, OrderSearchParams } from "../api/orders";
import { useLanguage } from "../context/LanguageContext";
import { Order } from "../types/orders";

type DateFilter = 'all' | 'today' | 'week' | string; // string for specific dates

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { translate } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0,
  });
  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});

  // Fetch orders when filters or pagination change
  useEffect(() => {
    fetchOrders();
  }, [dateFilter, selectedDate, statusFilter, search, pagination.page]);

  // Fetch daily counts for the last 7 days on component mount
  useEffect(() => {
    fetchDailyCounts();
  }, [statusFilter]); // Re-fetch when status filter changes

  const getDateRange = (filter: DateFilter, specificDate?: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // If it's a specific date (YYYY-MM-DD format)
    if (specificDate && specificDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return { startDate: specificDate, endDate: specificDate };
    }
    
    switch (filter) {
      case 'today':
        return { startDate: todayStr, endDate: todayStr };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        return { startDate: weekAgoStr, endDate: todayStr };
      case 'all':
      default:
        return {};
    }
  };

  // Get last 7 days for the week view
  const getLastSevenDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push(date);
    }
    
    return days;
  };

  // Fetch daily counts for quick overview
  const fetchDailyCounts = async () => {
    try {
      const counts: Record<string, number> = {};
      const days = getLastSevenDays();
      
      // Fetch counts for each day in parallel
      const promises = days.map(async (date) => {
        const dateStr = date.toISOString().split('T')[0];
        try {
          const response = await getOrders({
            startDate: dateStr,
            endDate: dateStr,
            status: statusFilter || undefined,
            limit: 1, // We only need the count
          });
          counts[dateStr] = response.total;
        } catch (error) {
          console.error(`Error fetching count for ${dateStr}:`, error);
          counts[dateStr] = 0;
        }
      });
      
      await Promise.all(promises);
      setDailyCounts(counts);
    } catch (error) {
      console.error("Error fetching daily counts:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange(dateFilter, selectedDate);
      const params: OrderSearchParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        ...dateRange,
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      
      const response = await getOrders(params);
      setOrders(response.data);
      setPagination(prev => ({
        ...prev,
        totalPages: response.pagination.totalPages,
        total: response.total,
      }));
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchOrders();
  };

  const handleNewOrder = () => {
    navigate("/orders/new");
  };

  const viewOrderDetails = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    setSelectedDate(''); // Clear specific date when using general filters
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSpecificDateChange = (date: string) => {
    setSelectedDate(date);
    setDateFilter('specific'); // Set to specific mode
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDayButton = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) {
      return 'Today';
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Heading>Orders</Heading>
        <Button onClick={handleNewOrder}>
          <PlusIcon className="h-5 w-5 mr-1" />
          New Order
        </Button>
      </div>

      {/* Date Filter Section */}
      <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 mb-6">
        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            onClick={() => handleDateFilterChange('today')}
            color={dateFilter === 'today' ? 'blue' : 'zinc'}
            className="text-sm px-4 py-2"
          >
            Today
          </Button>
          <Button
            onClick={() => handleDateFilterChange('week')}
            color={dateFilter === 'week' ? 'blue' : 'zinc'}
            className="text-sm px-4 py-2"
          >
            Last 7 Days
          </Button>
          <Button
            onClick={() => handleDateFilterChange('all')}
            color={dateFilter === 'all' ? 'blue' : 'zinc'}
            className="text-sm px-4 py-2"
          >
            All Orders
          </Button>
        </div>

        {/* Daily Navigation - Last 7 Days */}
        <div className="border-t border-zinc-200 dark:border-zinc-600 pt-6">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
            Quick Day Selection
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {getLastSevenDays().map((date) => {
              const dateStr = date.toISOString().split('T')[0];
              const label = formatDayButton(date);
              const isSelected = selectedDate === dateStr || (dateFilter === 'today' && dateStr === new Date().toISOString().split('T')[0]);
              const orderCount = dailyCounts[dateStr] || 0;
              
              return (
                <button
                  key={dateStr}
                  onClick={() => handleSpecificDateChange(dateStr)}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-200 text-center relative hover:scale-105
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md' 
                      : 'border-zinc-200 dark:border-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }
                  `}
                >
                  <div className="font-medium text-sm">{label}</div>
                  {orderCount > 0 && (
                    <div className={`
                      absolute -top-2 -right-2 min-w-[22px] h-6 flex items-center justify-center text-xs font-bold rounded-full border-2 border-white dark:border-zinc-800
                      ${isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-green-500 text-white'
                      }
                    `}>
                      {orderCount}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="border-t border-zinc-200 dark:border-zinc-600 pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by order number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="w-48">
              <Select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <Button onClick={handleSearch} className="px-6">
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-3 text-zinc-600 dark:text-zinc-300">Loading...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Order #</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Customer</TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Payment</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div
                      className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer transition-colors"
                      onClick={() => viewOrderDetails(order.id)}
                    >
                      #{order.orderNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Text className="text-sm text-zinc-900 dark:text-zinc-100">
                      {formatDate(order.createdAt)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text className="text-zinc-900 dark:text-zinc-100">
                      {order.customer ? order.customer.name : "Walk-in Customer"}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(order.total)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge color={
                      order.status === "completed" ? "green" :
                      order.status === "cancelled" ? "red" : "yellow"
                    }>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color={
                      order.paymentStatus === "paid" ? "green" :
                      order.paymentStatus === "partial" ? "yellow" : "red"
                    }>
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      outline
                      onClick={() => viewOrderDetails(order.id)}
                      title="View Details"
                      className="p-2"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </Table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-8 px-2">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
          </div>
          <div className="flex items-center space-x-3">
            <Button
              outline
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="text-sm px-4 py-2"
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-2">
              {/* Show first page */}
              {pagination.page > 3 && (
                <>
                  <Button
                    outline
                    onClick={() => handlePageChange(1)}
                    className="text-sm w-10 h-10"
                  >
                    1
                  </Button>
                  {pagination.page > 4 && <span className="text-zinc-500 px-2">...</span>}
                </>
              )}
              
              {/* Show pages around current page */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, pagination.page - 2) + i;
                if (pageNum <= pagination.totalPages && pageNum >= Math.max(1, pagination.page - 2) && pageNum <= Math.min(pagination.totalPages, pagination.page + 2)) {
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      color={pageNum === pagination.page ? 'blue' : 'zinc'}
                      className="text-sm w-10 h-10"
                    >
                      {pageNum}
                    </Button>
                  );
                }
                return null;
              })}
              
              {/* Show last page */}
              {pagination.page < pagination.totalPages - 2 && (
                <>
                  {pagination.page < pagination.totalPages - 3 && <span className="text-zinc-500 px-2">...</span>}
                  <Button
                    outline
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className="text-sm w-10 h-10"
                  >
                    {pagination.totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              outline
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="text-sm px-4 py-2"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
