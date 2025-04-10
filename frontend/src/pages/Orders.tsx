import {
  ArrowPathIcon,
  CurrencyDollarIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cancelOrder, getOrders } from "../api/orders";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";
import { useAuth } from "../context/AuthContext";
import { Order, OrderStatus } from "../types/orders";

// Order status colors and badges
const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentStatusColors = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-orange-100 text-orange-800",
  unpaid: "bg-red-100 text-red-800",
};

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("pending");
  const [cancelReason, setCancelReason] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    paymentStatus: "",
    startDate: "",
    endDate: "",
  });
  const [searchParams, setSearchParams] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "",
    paymentStatus: "",
    startDate: "",
    endDate: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0,
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Check if user is admin or manager
  const isAdmin = authState.user?.role === "admin";
  const isManager = authState.user?.role === "manager";
  const canManageOrders = isAdmin || isManager;

  // Fetch orders on mount and when search params change
  useEffect(() => {
    fetchOrders();
  }, [searchParams]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await getOrders(searchParams);
      setOrders(response.data);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        totalPages: response.pagination.totalPages,
        total: response.total,
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSearch = () => {
    setSearchParams({
      ...searchParams,
      search,
      page: 1, // Reset to first page when searching
    });
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const applyFilters = () => {
    setSearchParams({
      ...searchParams,
      ...filters,
      page: 1, // Reset to first page when filtering
    });
  };

  const resetFilters = () => {
    setFilters({
      status: "",
      paymentStatus: "",
      startDate: "",
      endDate: "",
    });
    setSearchParams({
      ...searchParams,
      status: "",
      paymentStatus: "",
      startDate: "",
      endDate: "",
      search: "",
      page: 1,
    });
    setSearch("");
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setSearchParams({
      ...searchParams,
      page: newPage,
    });
  };

  const handleNewOrder = () => {
    navigate("/orders/new");
  };

  const viewOrderDetails = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const openStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusModalOpen(true);
  };

  const openCancelModal = (order: Order) => {
    setSelectedOrder(order);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const handleStatusChange = async () => {
    if (!selectedOrder) return;

    try {
      setSubmitLoading(true);
      setStatusModalOpen(false);

      // Update the order in the list
      const updatedOrders = orders.map((order) =>
        order.id === selectedOrder.id ? { ...order, status: newStatus } : order
      );
      setOrders(updatedOrders);
    } catch (error) {
      console.error("Error updating order status:", error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    try {
      setSubmitLoading(true);
      await cancelOrder(selectedOrder.id, cancelReason);
      setCancelModalOpen(false);

      // Update the order in the list
      const updatedOrders = orders.map((order) =>
        order.id === selectedOrder.id
          ? { ...order, status: "cancelled" }
          : order
      );
      setOrders(updatedOrders as Order[]);
    } catch (error) {
      console.error("Error cancelling order:", error);
    } finally {
      setSubmitLoading(false);
    }
  };

  // const handleGetReceipt = async (orderId: string) => {
  //   try {
  //     const response = await getReceipt(orderId);
  //     if (response.success && response.data.receiptUrl) {
  //       window.open(`/uploads/${response.data.receiptUrl}`, '_blank');
  //     }
  //   } catch (error) {
  //     console.error('Error generating receipt:', error);
  //   }
  // };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        <Button variant="primary" onClick={handleNewOrder}>
          <PlusIcon className="h-5 w-5 mr-1" />
          New Order
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by order number or notes..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={search}
                onChange={handleSearchChange}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                onClick={handleSearch}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4 space-x-2">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Reset Filters
          </Button>
          <Button variant="primary" size="sm" onClick={applyFilters}>
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">Loading orders...</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table
              headers={[
                "Order #",
                "Date",
                "Customer",
                "Items",
                "Total",
                "Status",
                "Payment",
                "Actions",
              ]}
            >
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No orders found. Create a new order to get started.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="font-bold text-blue-600 hover:text-blue-900 cursor-pointer"
                        onClick={() => viewOrderDetails(order.id)}
                      >
                        #{order.orderNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.customer
                          ? order.customer.name
                          : "Walk-in Customer"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {/* Estimate items count based on total and average price */}
                        ~{Math.ceil(order.total / 20)} items
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.total)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusColors[order.status]
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          paymentStatusColors[order.paymentStatus]
                        }`}
                      >
                        {order.paymentStatus === "paid"
                          ? "Paid"
                          : order.paymentStatus === "partial"
                          ? "Partial"
                          : "Unpaid"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => viewOrderDetails(order.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>

                        {/* {order.status !== 'cancelled' && (
                          <button
                            onClick={() => handleGetReceipt(order.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Download Receipt"
                          >
                            <DocumentTextIcon className="h-5 w-5" />
                          </button>
                        )} */}

                        {canManageOrders && order.status !== "cancelled" && (
                          <>
                            <button
                              onClick={() => openStatusModal(order)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Change Status"
                            >
                              <ArrowPathIcon className="h-5 w-5" />
                            </button>

                            {order.paymentStatus !== "paid" && (
                              <button
                                onClick={() =>
                                  navigate(`/orders/${order.id}/payment`)
                                }
                                className="text-purple-600 hover:text-purple-900"
                                title="Add Payment"
                              >
                                <CurrencyDollarIcon className="h-5 w-5" />
                              </button>
                            )}

                            <button
                              onClick={() => openCancelModal(order)}
                              className="text-red-600 hover:text-red-900"
                              disabled={order.status === "completed"}
                              title={
                                order.status === "completed"
                                  ? "Can't cancel completed orders"
                                  : "Cancel Order"
                              }
                            >
                              <XMarkIcon
                                className={`h-5 w-5 ${
                                  order.status === "completed"
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} orders
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Update Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Order Status"
        footer={
          <>
            <Button
              variant="primary"
              onClick={handleStatusChange}
              isLoading={submitLoading}
              className="ml-3"
            >
              Update Status
            </Button>
            <Button
              variant="outline"
              onClick={() => setStatusModalOpen(false)}
              disabled={submitLoading}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="py-4">
          <p className="mb-4">
            Update the status for order{" "}
            <span className="font-bold">#{selectedOrder?.orderNumber}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Order"
        footer={
          <>
            <Button
              variant="danger"
              onClick={handleCancelOrder}
              isLoading={submitLoading}
              className="ml-3"
            >
              Cancel Order
            </Button>
            <Button
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              disabled={submitLoading}
            >
              Go Back
            </Button>
          </>
        }
      >
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Are you sure you want to cancel order{" "}
            <span className="font-bold">#{selectedOrder?.orderNumber}</span>?
            <br />
            <br />
            Cancelling will return items to inventory if the order is not
            already completed. This action cannot be undone.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Cancellation
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter reason for cancellation"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Orders;
