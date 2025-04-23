import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, OrderSearchParams } from '../api/orders';
import { Order } from '../types/orders';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import { EyeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '@/utils/format-currency';

const PendingOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { translate } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const params: OrderSearchParams = {
        status: 'pending',
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      };
      const response = await getOrders(params);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const viewDetails = (id: string) => {
    navigate(`/orders/${id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {translate.orders('pendingOrders')}
        </h1>
        <Button variant="outline" onClick={fetchPendingOrders}>
          <ArrowPathIcon className="h-5 w-5 mr-1" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">{translate.common('loading')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table
            headers={[
              translate.orders('orderNumber'),
              translate.common('date'),
              translate.orders('customer'),
              translate.common('total'),
              translate.common('notes'),
              translate.common('actions'),
            ]}
          >
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  {translate.common('noResults')}
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium cursor-pointer"
                      onClick={() => viewDetails(order.id)}>
                    #{order.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {order.customer ? order.customer.name : translate.orders('walkInCustomer')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {order.notes || ""}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => viewDetails(order.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </Table>
        </div>
      )}
    </div>
  );
};

export default PendingOrdersPage;