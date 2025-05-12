import { formatCurrency } from "@/utils/format-currency";
import {
  ArrowPathIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OrderSearchParams, cancelOrder, getOrders } from "../api/orders";
import { useLanguage } from "../context/LanguageContext";
import { useAuthStore } from "../store/authStore";
import { Order, OrderStatus } from "../types/orders";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Dialog, DialogActions, DialogBody, DialogTitle } from "@/components/dialog";
import { Field, Label } from "@/components/fieldset";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { Select } from "@/components/select";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Text } from "@/components/text";
import { Textarea } from "@/components/textarea";

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
  const { user } = useAuthStore();
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
  const [searchParams, setSearchParams] = useState<OrderSearchParams>({
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
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
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
        page: parseInt(response.pagination.page),
        limit: parseInt(response.pagination.limit),
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
    setSearchParams((prevParams) => ({
      ...prevParams,
      page: newPage,
    }));
  };

  const handleNewOrder = () => {
    navigate("/orders/new");
  };
  // Navigate to pending orders page
  const handlePendingOrdersPage = () => {
    navigate("/pending-orders");
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

  const { translate } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Heading>{translate.orders("title")}</Heading>
        <div className="flex space-x-2">
          <Button onClick={handlePendingOrdersPage} outline>
            <ArrowPathIcon className="h-5 w-5 mr-1" />
            {translate.orders("pendingOrders")}
          </Button>
          <Button onClick={handleNewOrder}>
            <PlusIcon className="h-5 w-5 mr-1" />
            {translate.orders("newOrder")}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder={translate.common("search") + "..."}
              value={search}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field>
            <Label>
              {translate.common("status")}
            </Label>
            <Select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">
                {translate.common("all")} {translate.common("status")}
              </option>
              <option value="pending">{translate.orders("pending")}</option>
              <option value="completed">{translate.orders("completed")}</option>
              <option value="cancelled">{translate.orders("cancelled")}</option>
            </Select>
          </Field>
          <Field>
            <Label>
              {translate.orders("paymentStatus")}
            </Label>
            <Select
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
            >
              <option value="">
                {translate.common("all")} {translate.orders("paymentStatus")}
              </option>
              <option value="paid">{translate.orders("paid")}</option>
              <option value="partial">{translate.orders("partial")}</option>
              <option value="unpaid">{translate.orders("unpaid")}</option>
            </Select>
          </Field>
          <Field>
            <Label>
              {translate.reports("startDate")}
            </Label>
            <Input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </Field>
          <Field>
            <Label>
              {translate.reports("endDate")}
            </Label>
            <Input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </Field>
        </div>

        <div className="flex justify-end mt-4 space-x-2">
          <Button outline onClick={resetFilters}>
            {translate.common("cancel")}
          </Button>
          <Button onClick={applyFilters}>
            {translate.common("search")}
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">{translate.common("loading")}</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg shadow overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{translate.orders("orderNumber")}</TableHeader>
                  <TableHeader>{translate.common("date")}</TableHeader>
                  <TableHeader>{translate.orders("customer")}</TableHeader>
                  <TableHeader>{translate.common("total")}</TableHeader>
                  <TableHeader>{translate.common("status")}</TableHeader>
                  <TableHeader>{translate.common("payment")}</TableHeader>
                  <TableHeader>{translate.common("actions")}</TableHeader>
                </TableRow>
              </TableHead>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    {translate.common("noResults")}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div
                        className="font-bold text-blue-600 hover:text-blue-900 cursor-pointer"
                        onClick={() => viewOrderDetails(order.id)}
                      >
                        #{order.orderNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Text className="text-sm text-gray-900">
                        {formatDate(order.createdAt)}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Text>
                        {order.customer
                          ? order.customer.name
                          : translate.orders("walkInCustomer")}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Text className="font-medium">
                        {formatCurrency(order.total)}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Badge color={
                        order.status === "completed" ? "green" :
                        order.status === "cancelled" ? "red" : "yellow"
                      }>
                        {translate.orders(
                          order.status as "pending" | "completed" | "cancelled"
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color={
                        order.paymentStatus === "paid" ? "green" :
                        order.paymentStatus === "partial" ? "yellow" : "red"
                      }>
                        {translate.orders(
                          order.paymentStatus as "paid" | "partial" | "unpaid"
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2 justify-end">
                        <Button
                          outline
                          onClick={() => viewOrderDetails(order.id)}
                          title={translate.common("details")}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Button>

                        {canManageOrders && order.status !== "cancelled" && (
                          <>
                            <Button
                              outline
                              onClick={() => openStatusModal(order)}
                              title={translate.orders("updateStatus")}
                            >
                              <ArrowPathIcon className="h-5 w-5" />
                            </Button>

                            <Button
                              color="red"
                              onClick={() => openCancelModal(order)}
                              disabled={order.status === "completed"}
                              title={translate.orders("cancelOrder")}
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                {pagination.total > 0 ?
                  `${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} / ${pagination.total}` : "0"} {translate.orders("title").toLowerCase()}
              </div>
              <div className="flex space-x-2">
                <Button
                  outline
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  {translate.common("previous")}
                </Button>
                <div className="mx-2 flex items-center">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                </div>
                <Button
                  outline
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  {translate.common("next")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Update Status Modal */}
      <Dialog
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
      >
        <DialogTitle>
          {translate.orders("updateStatus")}
        </DialogTitle>
        <DialogBody>
          <div className="py-4">
            <Text className="mb-4">
              {translate.orders("updateStatus")}{" "}
              <span className="font-bold">#{selectedOrder?.orderNumber}</span>
            </Text>
            <Field>
              <Label>
                {translate.orders("orderStatus")}
              </Label>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              >
                <option value="pending">{translate.orders("pending")}</option>
                <option value="completed">{translate.orders("completed")}</option>
                <option value="cancelled">{translate.orders("cancelled")}</option>
              </Select>
            </Field>
          </div>
        </DialogBody>
        <DialogActions>
          <Button
            onClick={handleStatusChange}
            disabled={submitLoading}
            className="ml-3"
          >
            {translate.orders("updateStatus")}
          </Button>
          <Button
            outline
            onClick={() => setStatusModalOpen(false)}
            disabled={submitLoading}
          >
            {translate.common("cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Order Modal */}
      <Dialog
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
      >
        <DialogTitle>
          {translate.orders("cancelOrder")}
        </DialogTitle>
        <DialogBody>
          <div className="py-4">
            <Text className="text-gray-600 mb-4">
              {translate.orders("cancelConfirmation")}
              <span className="font-bold"> #{selectedOrder?.orderNumber}</span>
            </Text>
            <Field>
              <Label>
                {translate.orders("cancelReason")}
              </Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder={translate.orders("cancelReason")}
              />
            </Field>
          </div>
        </DialogBody>
        <DialogActions>
          <Button
            color="red"
            onClick={handleCancelOrder}
            disabled={submitLoading}
            className="ml-3"
          >
            {translate.orders("cancelOrder")}
          </Button>
          <Button
            outline
            onClick={() => setCancelModalOpen(false)}
            disabled={submitLoading}
          >
            {translate.common("back")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Orders;
