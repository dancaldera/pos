import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrders, getOrder, OrderSearchParams } from "../api/orders";
import { Order } from "../types/orders";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Button } from "@/components/button";
import { Text } from "@/components/text";
import {
  EyeIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { useLanguage } from "../context/LanguageContext";
import { formatCurrency } from "@/utils/format-currency";
import { Heading } from "@/components/heading";

const PendingOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { translate } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // Modal state for viewing order items
  const [itemsModalOpen, setItemsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [orderItemsDetails, setOrderItemsDetails] = useState<any[]>([]);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const params: OrderSearchParams = {
        status: "pending",
        page: 1,
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "asc",
      };
      const response = await getOrders(params);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching pending orders:", error);
    } finally {
      setLoading(false);
    }
  };
  // Open modal to show order items with images
  const openItemsModal = async (orderId: string) => {
    setItemsModalOpen(true);
    setModalLoading(true);
    try {
      const res = await getOrder(orderId);
      // res.data is the order details
      const items = res.data.items || [];
      setOrderItemsDetails(items);
    } catch (error) {
      console.error("Error loading order items:", error);
      setOrderItemsDetails([]);
    } finally {
      setModalLoading(false);
    }
  };
  const closeItemsModal = () => {
    setItemsModalOpen(false);
    setOrderItemsDetails([]);
  };

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const viewDetails = (id: string) => {
    navigate(`/orders/${id}`);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Heading level={1}>
            {translate.orders("pendingOrders")}
          </Heading>
          <Button outline onClick={fetchPendingOrders}>
            <ArrowPathIcon className="h-5 w-5 mr-1" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <p className="mt-2 text-gray-600">{translate.common("loading")}</p>
          </div>
        ) : (
          <div className="rounded-lg shadow overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{translate.orders("orderNumber")}</TableHeader>
                  <TableHeader>{translate.common("date")}</TableHeader>
                  <TableHeader>{translate.orders("customer")}</TableHeader>
                  <TableHeader>{translate.common("total")}</TableHeader>
                  <TableHeader>{translate.common("notes")}</TableHeader>
                  <TableHeader>{translate.common("actions")}</TableHeader>
                </TableRow>
              </TableHead>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {translate.common("noResults")}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="text-blue-600 font-medium cursor-pointer" onClick={() => viewDetails(order.id)}>
                        #{order.orderNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Text>{new Date(order.createdAt).toLocaleString()}</Text>
                    </TableCell>
                    <TableCell>
                      <Text>
                        {order.customer
                          ? order.customer.name
                          : translate.orders("walkInCustomer")}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Text className="font-semibold">{formatCurrency(order.total)}</Text>
                    </TableCell>
                    <TableCell>
                      <Text>{order.notes || ""}</Text>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2 justify-end">
                        <Button
                          outline
                          onClick={() => openItemsModal(order.id)}
                          title={translate.orders("items")}
                        >
                          <ShoppingCartIcon className="h-5 w-5" />
                        </Button>
                        <Button
                          color="blue"
                          onClick={() => viewDetails(order.id)}
                          title={translate.common("view")}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </Table>
          </div>
        )}
      </div>
      {/* Items Modal */}
      <Dialog
        open={itemsModalOpen}
        onClose={closeItemsModal}
      >
        <DialogTitle>
          {translate.orders("items")}
        </DialogTitle>
        <DialogBody>
          {modalLoading ? (
            <div className="text-center p-4">{translate.common("loading")}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {orderItemsDetails.map((item) => (
                <div
                  key={item.id}
                  className="shadow rounded p-4 flex flex-col items-center"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-24 w-24 object-cover mb-2"
                    />
                  ) : (
                    <div className="h-24 w-24 bg-gray-200 mb-2"></div>
                  )}
                  <Text className="text-sm font-semibold text-center">
                    {item.productName}
                  </Text>
                  <Text className="text-xs text-gray-500">Qty: {item.quantity}</Text>
                </div>
              ))}
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <Button
            outline
            onClick={closeItemsModal}
          >
            {translate.common("close")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PendingOrdersPage;
