import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrders, getOrder, OrderSearchParams } from "../api/orders";
import { Order } from "../types/orders";
import Table from "../_components/ui/Table";
import Button from "../_components/ui/Button";
import {
  EyeIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import Modal from "../_components/ui/Modal";
import { useLanguage } from "../context/LanguageContext";
import { formatCurrency } from "@/utils/format-currency";

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
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {translate.orders("pendingOrders")}
          </h1>
          <Button variant="outline" onClick={fetchPendingOrders}>
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table
              headers={[
                translate.orders("orderNumber"),
                translate.common("date"),
                translate.orders("customer"),
                translate.common("total"),
                translate.common("notes"),
                translate.common("actions"),
              ]}
            >
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    {translate.common("noResults")}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium cursor-pointer"
                      onClick={() => viewDetails(order.id)}
                    >
                      #{order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {order.customer
                        ? order.customer.name
                        : translate.orders("walkInCustomer")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {order.notes || ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => openItemsModal(order.id)}
                          className="text-gray-600 hover:text-gray-800"
                          title={translate.orders("items")}
                        >
                          <ShoppingCartIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => viewDetails(order.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title={translate.common("view")}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </Table>
          </div>
        )}
      </div>
      {/* Items Modal */}
      <Modal
        isOpen={itemsModalOpen}
        onClose={closeItemsModal}
        title={translate.orders("items")}
      >
        {modalLoading ? (
          <div className="text-center p-4">{translate.common("loading")}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {orderItemsDetails.map((item) => (
              <div
                key={item.id}
                className="bg-white shadow rounded p-4 flex flex-col items-center"
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
                <p className="text-sm font-semibold text-center">
                  {item.productName}
                </p>
                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PendingOrdersPage;
