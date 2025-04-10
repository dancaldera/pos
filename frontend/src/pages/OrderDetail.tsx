import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getOrder, 
  updateOrderStatus, 
  addPayment, 
  cancelOrder,
  addItemsToOrder
} from '../api/orders';
import { Order, OrderStatus, PaymentMethod, OrderItemInput } from '../types/orders';
import { getProducts } from '../api/products';
import { Product } from '../types/products';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  MinusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// Status and payment colors
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const paymentStatusColors = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-orange-100 text-orange-800',
  unpaid: 'bg-red-100 text-red-800',
};

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');
  const [cancelReason, setCancelReason] = useState('');
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showLineItemDetails, setShowLineItemDetails] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // Add items modal state
  const [addItemsModalOpen, setAddItemsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, OrderItemInput>>(new Map());

  // Check if user is admin or manager
  const isAdmin = authState.user?.role === 'admin';
  const isManager = authState.user?.role === 'manager';
  const canManageOrders = isAdmin || isManager;

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await getOrder(id);
      setOrder(response.data);
      
      // Initialize payment amount with remaining balance
      if (response.data) {
        const totalPaid = response.data.payments?.reduce(
          (sum: number, p: any) => sum + Number(p.amount), 0
        ) || 0;
        setPaymentAmount(response.data.total - totalPaid);
      }
    } catch (error: any) {
      console.error('Error fetching order:', error);
      setError(error?.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!order) return;
    
    try {
      setSubmitLoading(true);
      await updateOrderStatus(order.id, newStatus);
      setStatusModalOpen(false);
      
      // Refresh order data
      fetchOrder();
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    
    try {
      setSubmitLoading(true);
      await cancelOrder(order.id, cancelReason);
      setCancelModalOpen(false);
      
      // Refresh order data
      fetchOrder();
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!order) return;
    
    try {
      setSubmitLoading(true);
      
      await addPayment(order.id, {
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined
      });
      
      setPaymentModalOpen(false);
      
      // Refresh order data
      fetchOrder();
    } catch (error: any) {
      console.error('Error adding payment:', error);
      alert(error?.response?.data?.message || 'Failed to process payment');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  const openAddItemsModal = async () => {
    setAddItemsModalOpen(true);
    setSelectedItems(new Map());
    setProductSearch('');
    
    try {
      setLoadingProducts(true);
      const response = await getProducts({ active: true });
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };
  
  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductSearch(e.target.value);
    
    // Filter products based on search
    if (!e.target.value.trim()) {
      setFilteredProducts(products);
      return;
    }
    
    const searchLower = e.target.value.toLowerCase();
    const filtered = products.filter(
      product => 
        product.name.toLowerCase().includes(searchLower) ||
        (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchLower))
    );
    setFilteredProducts(filtered);
  };
  
  const toggleSelectProduct = (product: Product, variant?: string) => {
    const currentItems = new Map(selectedItems);
    const itemKey = variant ? `${product.id}-${variant}` : product.id;
    
    if (currentItems.has(itemKey)) {
      // Remove if already selected
      currentItems.delete(itemKey);
    } else {
      // Add with quantity 1
      currentItems.set(itemKey, {
        productId: product.id,
        quantity: 1,
        variant: variant,
      });
    }
    
    setSelectedItems(currentItems);
  };
  
  const updateSelectedItemQuantity = (itemKey: string, quantity: number) => {
    if (quantity < 1) return;
    
    const currentItems = new Map(selectedItems);
    const item = currentItems.get(itemKey);
    
    if (item) {
      const product = products.find(p => p.id === item.productId);
      
      // Check stock
      if (product && product.stock < quantity) {
        alert(`Sorry, only ${product.stock} units available for ${product.name}`);
        return;
      }
      
      // Update quantity
      currentItems.set(itemKey, {
        ...item,
        quantity
      });
      
      setSelectedItems(currentItems);
    }
  };
  
  const handleSubmitAddItems = async () => {
    if (!order || selectedItems.size === 0) return;
    
    try {
      setSubmitLoading(true);
      
      // Convert Map to array
      const itemsToAdd = Array.from(selectedItems.values());
      
      await addItemsToOrder(order.id, itemsToAdd);
      setAddItemsModalOpen(false);
      
      // Refresh order data
      fetchOrder();
    } catch (error: any) {
      console.error('Error adding items:', error);
      alert(error?.response?.data?.message || 'Failed to add items to order');
    } finally {
      setSubmitLoading(false);
    }
  };

  // const handleGetReceipt = async () => {
  //   if (!order) return;
    
  //   try {
  //     const response = await getReceipt(order.id);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <div className="text-red-600 text-lg mb-4">
            {error || 'Order not found'}
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/orders')}
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  // Calculate total paid amount
  const totalPaid = order.payments?.reduce(
    (sum, payment) => sum + payment.amount, 
    0
  ) || 0;
  
  // Calculate remaining balance
  const remainingBalance = order.total - totalPaid;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/orders')}
              className="mr-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              Order #{order.orderNumber}
            </h1>
          </div>
          <p className="text-gray-500 mt-1">
            Created on {formatDate(order.createdAt)}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          {/* {order.status !== 'cancelled' && (
            <Button
              variant="outline"
              onClick={handleGetReceipt}
            >
              <DocumentTextIcon className="h-5 w-5 mr-1" />
              Receipt
            </Button>
          )} */}
          
          {canManageOrders && order.status !== 'cancelled' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStatusModalOpen(true)}
              >
                <ArrowPathIcon className="h-5 w-5 mr-1" />
                Update Status
              </Button>
              
              {order.status !== 'completed' && (
                <Button
                  variant="outline"
                  onClick={openAddItemsModal}
                >
                  <PlusIcon className="h-5 w-5 mr-1" />
                  Add Items
                </Button>
              )}
              
              {order.paymentStatus !== 'paid' && (
                <Button
                  variant="outline"
                  onClick={() => setPaymentModalOpen(true)}
                >
                  <CurrencyDollarIcon className="h-5 w-5 mr-1" />
                  Add Payment
                </Button>
              )}
              
              {order.status !== 'completed' && (
                <Button
                  variant="danger"
                  onClick={() => setCancelModalOpen(true)}
                >
                  <XMarkIcon className="h-5 w-5 mr-1" />
                  Cancel Order
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Info Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Order Information</h2>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="mt-1">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status]}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500">Payment</div>
              <div className="flex justify-between items-center mt-1">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${paymentStatusColors[order.paymentStatus]}`}>
                  {order.paymentStatus === 'paid' ? 'Paid' : 
                   order.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                </span>
                
                {order.paymentMethod && (
                  <span className="text-sm text-gray-600">
                    Via {order.paymentMethod.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500">Customer</div>
              <div className="mt-1">
                {order.customer ? (
                  <div>
                    <div className="font-medium">{order.customer.name}</div>
                    {order.customer.email && (
                      <div className="text-xs text-gray-500">{order.customer.email}</div>
                    )}
                    {order.customer.phone && (
                      <div className="text-xs text-gray-500">{order.customer.phone}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">Walk-in Customer</div>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500">Staff</div>
              <div className="mt-1">
                <div className="font-medium">{order.user?.name}</div>
                <div className="text-xs text-gray-500">{order.user?.role}</div>
              </div>
            </div>
            
            {order.notes && (
              <div>
                <div className="text-sm text-gray-500">Notes</div>
                <div className="mt-1 text-sm bg-gray-50 p-2 rounded">
                  {order.notes}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Order Items Panel */}
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Order Items</h2>
            <button
              onClick={() => setShowLineItemDetails(!showLineItemDetails)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              {showLineItemDetails ? 'Hide' : 'Show'} Details
              {showLineItemDetails ? (
                <ChevronUpIcon className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 ml-1" />
              )}
            </button>
          </div>
          
          <div className="border rounded-lg divide-y mb-6">
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <div key={index} className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      {item.variant && (
                        <div className="text-xs text-blue-600 font-medium">
                          Variant: {item.variant}
                        </div>
                      )}
                      {showLineItemDetails && (
                        <div className="text-xs text-gray-500">
                          {item.productId ? `Product ID: ${item.productId}` : 'Custom item'}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.subtotal)}</div>
                      <div className="text-sm text-gray-500">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </div>
                    </div>
                  </div>
                  {showLineItemDetails && item.notes && (
                    <div className="mt-2 text-sm text-gray-500">
                      Note: {item.notes}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No items found in this order.
              </div>
            )}
          </div>
          
          {/* Order Totals */}
          <div className="border-t pt-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-sm font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Tax</span>
              <span className="text-sm font-medium">{formatCurrency(order.tax)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Discount</span>
                <span className="text-sm font-medium text-red-600">
                  -{formatCurrency(order.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between mt-2 border-t pt-2">
              <span className="text-base font-medium">Total</span>
              <span className="text-base font-bold">{formatCurrency(order.total)}</span>
            </div>
            
            {/* Payment Information */}
            <div className="mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Payment Information</span>
                <button
                  onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  {showPaymentDetails ? 'Hide' : 'Show'} Details
                  {showPaymentDetails ? (
                    <ChevronUpIcon className="h-3 w-3 ml-1" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3 ml-1" />
                  )}
                </button>
              </div>
              
              <div className="flex justify-between mt-2">
                <span className="text-sm text-gray-600">Amount Paid</span>
                <span className="text-sm font-medium">{formatCurrency(totalPaid)}</span>
              </div>
              
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-600">Balance</span>
                <span className={`text-sm font-medium ${remainingBalance > 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(remainingBalance)}
                </span>
              </div>
              
              {/* Payment Details */}
              {showPaymentDetails && order.payments && order.payments.length > 0 && (
                <div className="mt-3 border rounded-lg divide-y text-sm">
                  {order.payments.map((payment, index) => (
                    <div key={index} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            {payment.method.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(payment.createdAt)}
                          </div>
                        </div>
                        <div className="font-medium">
                          {formatCurrency(payment.amount)}
                        </div>
                      </div>
                      {payment.reference && (
                        <div className="mt-1 text-xs text-gray-500">
                          Ref: {payment.reference}
                        </div>
                      )}
                      {payment.notes && (
                        <div className="mt-1 text-xs text-gray-500">
                          Note: {payment.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
            Update the status for order <span className="font-bold">#{order.orderNumber}</span>
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
            Are you sure you want to cancel order <span className="font-bold">#{order.orderNumber}</span>?
            <br />
            <br />
            Cancelling will return items to inventory if the order is not already completed.
            This action cannot be undone.
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

      {/* Add Items Modal */}
      <Modal
        isOpen={addItemsModalOpen}
        onClose={() => setAddItemsModalOpen(false)}
        title="Add Items to Order"
        size="lg"
        footer={
          <>
            <Button
              variant="primary"
              onClick={handleSubmitAddItems}
              isLoading={submitLoading}
              className="ml-3"
              disabled={selectedItems.size === 0}
            >
              Add {selectedItems.size} {selectedItems.size === 1 ? 'Item' : 'Items'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAddItemsModalOpen(false)}
              disabled={submitLoading}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="py-4 max-h-[70vh] overflow-hidden flex flex-col">
          {/* Search */}
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="Search products by name, SKU, or barcode..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={productSearch}
              onChange={handleProductSearchChange}
            />
            <div className="absolute right-3 top-2.5 text-gray-400">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </div>
          </div>
          
          {/* Selected Items Summary */}
          {selectedItems.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-800 mb-2">Selected Items ({selectedItems.size})</div>
              <div className="max-h-32 overflow-y-auto">
                {Array.from(selectedItems.entries()).map(([key, item]) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={key} className="flex justify-between items-center mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{product?.name}</div>
                        {item.variant && <div className="text-xs text-blue-600">{item.variant}</div>}
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={() => updateSelectedItemQuantity(key, item.quantity - 1)}
                          className="p-1 rounded-full hover:bg-blue-100"
                        >
                          <MinusIcon className="h-4 w-4 text-blue-600" />
                        </button>
                        <span className="mx-2 w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateSelectedItemQuantity(key, item.quantity + 1)}
                          className="p-1 rounded-full hover:bg-blue-100"
                        >
                          <PlusIcon className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => toggleSelectProduct(product!, item.variant)}
                          className="ml-2 p-1 rounded-full hover:bg-blue-100"
                        >
                          <XMarkIcon className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Products List */}
          <div className="overflow-y-auto flex-1">
            {loadingProducts ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No products found. Try a different search term.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProducts.map(product => (
                  <div 
                    key={product.id}
                    className={`border rounded-lg p-3 ${
                      product.stock <= 0 ? 'opacity-50 pointer-events-none' : ''
                    } ${selectedItems.has(product.id) ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="mb-1">
                      <div className="font-medium">{product.name}</div>
                      {product.sku && <div className="text-xs text-gray-500">SKU: {product.sku}</div>}
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-blue-600">{formatCurrency(product.price)}</span>
                      <span className={`text-xs ${
                        product.stock <= 0 ? 'text-red-600' : 
                        product.stock <= (product.lowStockAlert || 5) ? 'text-orange-600' : 
                        'text-green-600'
                      }`}>
                        {product.stock <= 0 ? 'Out of stock' : `${product.stock} in stock`}
                      </span>
                    </div>
                    
                    {/* Handle variants */}
                    {product.hasVariants && product.variants && product.variants.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {product.variants.map((variant, idx) => {
                          const variantKey = `${product.id}-${variant}`;
                          const isSelected = selectedItems.has(variantKey);
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => toggleSelectProduct(product, variant)}
                              className={`px-2 py-1 text-xs rounded ${
                                isSelected 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {variant}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleSelectProduct(product)}
                        className={`w-full mt-2 px-3 py-1.5 text-sm rounded ${
                          selectedItems.has(product.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {selectedItems.has(product.id) ? 'Selected' : 'Add to Order'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Add Payment"
        footer={
          <>
            <Button
              variant="primary"
              onClick={handleAddPayment}
              isLoading={submitLoading}
              className="ml-3"
              disabled={paymentAmount <= 0 || paymentAmount > remainingBalance}
            >
              Process Payment
            </Button>
            <Button
              variant="outline"
              onClick={() => setPaymentModalOpen(false)}
              disabled={submitLoading}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="py-4">
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Order Total</span>
              <span className="text-sm font-medium">{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Already Paid</span>
              <span className="text-sm font-medium">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between mt-2 text-lg font-bold">
              <span>Remaining Balance</span>
              <span>{formatCurrency(remainingBalance)}</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="transfer">Bank Transfer</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Paid
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                step="0.01"
                min="0.01"
                max={remainingBalance}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {paymentAmount > remainingBalance && (
                <p className="mt-1 text-sm text-red-600">
                  Amount cannot exceed remaining balance.
                </p>
              )}
              {paymentAmount < remainingBalance && paymentAmount > 0 && (
                <p className="mt-1 text-sm text-yellow-600">
                  This will be recorded as a partial payment.
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Receipt number, card transaction ID, etc."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Notes
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional payment information"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrderDetail;