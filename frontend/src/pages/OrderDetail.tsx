import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getOrder, 
  updateOrderStatus, 
  addPayment, 
  cancelOrder,
  addItemsToOrder,
  updateOrderDiscount
} from '../api/orders';
import { Order, OrderStatus, PaymentMethod, OrderItemInput } from '../types/orders';
import { getProducts } from '../api/products';
import { Product } from '../types/products';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog';
import { useLanguage } from '../context/LanguageContext';
import { useAuthStore } from '../store/authStore';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  MinusIcon,
  MagnifyingGlassIcon,
  ReceiptRefundIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@/utils/format-currency';
import { Button } from '@/components/button';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Select } from '@/components/select';
import { Textarea } from '@/components/textarea';
import { Input } from '@/components/input';
import { Badge } from '@/components/badge';

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { translate, language } = useLanguage();
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
  
  // Discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);

  // Check if user is admin or manager
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isWaitress = user?.role === 'waitress';
  const canManageOrders = isAdmin || isManager || isWaitress;

  useEffect(() => {
    fetchOrder();
  }, [id]);
  
  useEffect(() => {
    // Initialize discount values from order when loaded
    if (order) {
      // Set discount type based on current order discount
      // This is a simple heuristic - if discount is a round percentage of subtotal, assume percentage
      const discountPercentage = (order.discount / order.subtotal) * 100;
      const isLikelyPercentage = Math.abs(Math.round(discountPercentage) - discountPercentage) < 0.01;
      
      if (isLikelyPercentage && discountPercentage > 0) {
        setDiscountType('percentage');
        setDiscountValue(Math.round(discountPercentage));
      } else {
        setDiscountType('fixed');
        setDiscountValue(order.discount);
      }
    }
  }, [order]);

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
      alert(error?.response?.data?.message || translate.orders('paymentFailed'));
    } finally {
      setSubmitLoading(false);
    }
  };
  
  const calculateDiscountAmount = () => {
    if (!order) return 0;
    
    const amount = discountType === 'percentage' 
      ? (order.subtotal * (discountValue / 100))
      : discountValue;
      
    // Ensure discount doesn't exceed subtotal
    return Math.min(amount, order.subtotal);
  };
  
  const handleUpdateDiscount = async () => {
    if (!order) return;
    
    try {
      setSubmitLoading(true);
      
      // Calculate discount amount
      const discountAmount = calculateDiscountAmount();
      
      // Call API to update order discount
      await updateOrderDiscount(order.id, {
        discount: discountAmount,
        discountType,
        discountValue,
      });
      
      setDiscountModalOpen(false);
      
      // Refresh order data
      fetchOrder();
    } catch (error: any) {
      console.error('Error updating discount:', error);
      alert(error?.response?.data?.message || translate.orders('discountUpdateFailed'));
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
        alert(translate.products('stockLimitMessage').replace('{stock}', product.stock.toString()).replace('{product}', product.name));
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
      alert(error?.response?.data?.message || translate.orders('addItemsFailed'));
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
    return new Date(dateString).toLocaleString(language === 'en' ? 'en-US' : 'es-MX');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">{translate.orders('loadingOrderDetails')}</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <div className="text-red-600 text-lg mb-4">
            {error || translate.orders('orderNotFound')}
          </div>
          <Button
            outline
            onClick={() => navigate('/orders')}
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            {translate.common('backToOrders')}
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
            <Button 
              outline
              onClick={() => navigate('/orders')}
              className='mr-2'
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <Heading level={2}>
              {translate.orders('orderNumber')} {order.orderNumber}
            </Heading>
          </div>
          <Text>
            {translate.orders('createdOn')} {formatDate(order.createdAt)}
          </Text>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          {canManageOrders && order.status !== 'cancelled' && (
            <>
              <Button
                outline
                onClick={() => navigate(`/print-receipt/${order.id}`)}
              >
                <ReceiptRefundIcon className="h-5 w-5 mr-1" />
                {translate.orders("receipt")}
              </Button>
            
              <Button
                outline
                onClick={() => setStatusModalOpen(true)}
              >
                <ArrowPathIcon className="h-5 w-5 mr-1" />
                {translate.orders('updateStatus')}
              </Button>
              
              {order.status !== 'completed' && (
                <Button
                  outline
                  onClick={openAddItemsModal}
                >
                  <PlusIcon className="h-5 w-5 mr-1" />
                  {translate.orders('addItems')}
                </Button>
              )}
              
              {order.paymentStatus !== 'paid' && (
                <Button
                  outline
                  onClick={() => setPaymentModalOpen(true)}
                >
                  <CurrencyDollarIcon className="h-5 w-5 mr-1" />
                  {translate.orders('addPayment')}
                </Button>
              )}
              
              {order.status !== 'completed' && (
                <Button
                  color='red'
                  onClick={() => setCancelModalOpen(true)}
                >
                  <XMarkIcon className="h-5 w-5 mr-1" />
                  {translate.orders('cancelOrder')}
                </Button>
              )}

              {order.discount > 0 && (
                <Button
                  outline
                  onClick={() => setDiscountModalOpen(true)}
                >
                  <CurrencyDollarIcon className="h-5 w-5 mr-1" />
                  {translate.orders('updateDiscount')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Info Panel */}
        <div className="rounded-lg shadow p-6">
          <Heading level={2}>{translate.orders('orderInformation')}</Heading>
          
          <div className="space-y-4">
            <div>
              <Text>{translate.common('status')}</Text>
              <div className="mt-1">
                <Badge color={order.status === 'completed' ? 'green' : order.status === 'cancelled' ? 'red' : 'yellow'}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
            </div>
            
            <div>
              <Text>{translate.orders('payment')}</Text>
              <div className="flex justify-between items-center mt-1">
                <Badge color={order.paymentStatus === 'paid' ? 'green' : order.paymentStatus === 'partial' ? 'yellow' : 'red'}>
                  {order.paymentStatus === 'paid' ? translate.orders('paid') : 
                   order.paymentStatus === 'partial' ? translate.orders('partial') : translate.orders('unpaid')}
                </Badge>
                
                {order.paymentMethod && (
                  <Text className="text-sm text-gray-600">
                    {translate.orders('via')} {order.paymentMethod}
                  </Text>
                )}
              </div>
            </div>
            
            <div>
              <Text>{translate.customers('customer')}</Text>
              <div className="mt-1">
                {order.customer ? (
                  <div>
                    <Text>{order.customer.name}</Text>
                    {order.customer.email && (
                      <Text>{order.customer.email}</Text>
                    )}
                    {order.customer.phone && (
                      <Text>{order.customer.phone}</Text>
                    )}
                  </div>
                ) : (
                  <Text>{translate.customers('walkIn')}</Text>
                )}
              </div>
            </div>
            
            <div>
              <Text>{translate.users('staff')}</Text>
              <div className="mt-1">
                <Text>{order.user?.name}</Text>
                <Text>{order.user?.role}</Text>
              </div>
            </div>
            
            {order.notes && (
              <div>
                <Text>{translate.orders('notes')}</Text>
                <div className="mt-1 text-sm bg-gray-50 p-2 rounded">
                  {order.notes}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Order Items Panel */}
        <div className="rounded-lg shadow p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <Heading level={2}>{translate.orders('orderItems')}</Heading>
            <Button
              outline
              onClick={() => setShowLineItemDetails(!showLineItemDetails)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              {showLineItemDetails ? translate.common('hide') : translate.common('show')} {translate.common('details')}
              {showLineItemDetails ? (
                <ChevronUpIcon className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 ml-1" />
              )}
            </Button>
          </div>
          
          <div className="border rounded-lg divide-y mb-6">
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <div key={index} className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <Text>{item.productName}</Text>
                      {item.variant && (
                        <Text>{translate.products('variant')}: {item.variant}</Text>
                      )}
                      {showLineItemDetails && (
                        <Text>
                          {item.productId ? `${translate.products('productId')}: ${item.productId}` : translate.products('customItem')}
                        </Text>
                      )}
                    </div>
                    <div>
                      <Text>{formatCurrency(item.subtotal)}</Text>
                      <Text>{item.quantity} x {formatCurrency(item.unitPrice)}</Text>
                    </div>
                  </div>
                  {showLineItemDetails && item.notes && (
                    <Text>
                      {translate.common('note')}: {item.notes}
                    </Text>
                  )}
                </div>
              ))
            ) : (
              <Text>
                {translate.orders('noItemsFound')}
              </Text>
            )}
          </div>
          
          {/* Order Totals */}
          <div className="border-t pt-4">
            <div>
              <Text>{translate.orders('subtotal')}</Text>
              <Text>{formatCurrency(order.subtotal)}</Text>
            </div>
            {order.discount > 0 && (
              <div>
                <Text>{translate.orders('discount')}</Text>
                <Text>-{formatCurrency(order.discount)}</Text>
              </div>
            )}
            <div>
              <Text>{translate.orders('total')}</Text>
              <Text>{formatCurrency(order.total)}</Text>
            </div>
            
            {/* Payment Information */}
            <div className="mt-4">
              <div className="flex justify-between items-center">
                <Text>{translate.orders('paymentInformation')}</Text>
                <Button
                  onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                  outline
                >
                  {showPaymentDetails ? translate.common('hide') : translate.common('show')} {translate.common('details')}
                  {showPaymentDetails ? (
                    <ChevronUpIcon className="h-3 w-3 ml-1" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </div>
              
              <div className="flex justify-between mt-2">
                <Text>{translate.orders('amountPaid')}</Text>
                <Text>{formatCurrency(totalPaid)}</Text>
              </div>
              
              <div className="flex justify-between mt-1">
                <Text>{translate.orders('balance')}</Text>
                <Text className={`text-sm font-medium ${remainingBalance > 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(remainingBalance)}
                </Text>
              </div>
              
              {/* Payment Details */}
              {showPaymentDetails && order.payments && order.payments.length > 0 && (
                <div className="mt-3 rounded-lg text-sm">
                  {order.payments.map((payment, index) => (
                    <div key={index} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <Text>
                            {payment.method.replace('_', ' ')}
                          </Text>
                          <Text>
                            {formatDate(payment.createdAt)}
                          </Text>
                        </div>
                        <Text>
                          {formatCurrency(payment.amount)}
                        </Text>
                      </div>
                      {payment.reference && (
                        <Text>
                          Ref: {payment.reference}
                        </Text>
                      )}
                      {payment.notes && (
                        <Text>
                          Note: {payment.notes}
                        </Text>
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
      <Dialog
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
      >
        <DialogTitle>
          {translate.orders('updateOrderStatus')}
        </DialogTitle>
        <DialogBody>
          <div className="py-4">
          <Text>
            {translate.orders('updateStatusMessage').replace('{orderNumber}', order.orderNumber.toString())}
          </Text>
          <div>
            <Text>
              {translate.orders('newStatus')}
            </Text>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
            >
              <option value="pending">{translate.orders('statusPending')}</option>
              <option value="completed">{translate.orders('statusCompleted')}</option>
              <option value="cancelled">{translate.orders('statusCancelled')}</option>
            </Select>
          </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button
            onClick={handleStatusChange}
            disabled={submitLoading}
            className="ml-3"
          >
            {translate.orders('updateStatus')}
          </Button>
          <Button
            outline
            onClick={() => setStatusModalOpen(false)}
            disabled={submitLoading}
          >
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Order Modal */}
      <Dialog
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
      >
        <DialogTitle>
          {translate.orders('cancelOrder')}
        </DialogTitle>
        <DialogBody>
          <div className="py-4">
          <Text>
            {translate.orders('cancelConfirmation').replace('{orderNumber}', order.orderNumber.toString())}
            <br />
            <br />
            {translate.orders('cancelWarning')}
          </Text>
          <div>
            <Text>
              {translate.orders('cancelReason')}
            </Text>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder={translate.orders('cancelReasonPlaceholder')}
            />
          </div>
        </div>
        </DialogBody>
        <DialogActions>
          <Button
            color="red"
            onClick={handleCancelOrder}
            disabled={submitLoading}
            className="ml-3"
          >
            {translate.orders('cancelOrder')}
          </Button>
          <Button
            outline
            onClick={() => setCancelModalOpen(false)}
            disabled={submitLoading}
          >
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Items Modal */}
      <Dialog
        open={addItemsModalOpen}
        onClose={() => setAddItemsModalOpen(false)}
      >
        <DialogTitle>
          {translate.orders('addItemsToOrder')}
        </DialogTitle>
        <DialogBody>
          <div className="py-4 max-h-[70vh] overflow-hidden flex flex-col">
          {/* Search */}
          <div className="mb-4 relative">
            <Input
              placeholder={translate.products('searchPlaceholder')}
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
              <div className="font-medium text-blue-800 mb-2">{translate.orders('selectedItems')} ({selectedItems.size})</div>
              <div className="max-h-32 overflow-y-auto">
                {Array.from(selectedItems.entries()).map(([key, item]) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={key} className="flex justify-between items-center mb-2">
                      <div className="flex-1">
                        <Text className="text-sm font-medium">{product?.name}</Text>
                        {item.variant && <Text className="text-xs text-blue-600">{item.variant}</Text>}
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
              <div className="text-center py-10">
                {translate.products('noProductsFound')}
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
                      <Text className="font-medium">{product.name}</Text>
                      {product.sku && <Text className="text-xs">SKU: {product.sku}</Text>}
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <Text className="font-bold">{formatCurrency(product.price)}</Text>
                      <Text className={`text-xs ${
                        product.stock <= 0 ? 'text-red-600' : 
                        product.stock <= (product.lowStockAlert || 5) ? 'text-orange-600' : 
                        'text-green-600'
                      }`}>
                        {product.stock <= 0 ? translate.products('outOfStock') : `${product.stock} ${translate.products('inStock')}`}
                      </Text>
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
                        {selectedItems.has(product.id) ? translate.products('selected') : translate.orders('addToOrder')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </DialogBody>
        <DialogActions>
          <Button
            onClick={handleSubmitAddItems}
            disabled={selectedItems.size === 0}
          >
            {translate.orders('addItems')} {selectedItems.size} {selectedItems.size === 1 ? translate.orders('itemSingular') : translate.orders('itemsPlural')}
          </Button>
          <Button
            outline
            onClick={() => setAddItemsModalOpen(false)}
            disabled={submitLoading}
          >
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Discount Modal */}
      <Dialog
        open={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
      >
        <DialogTitle>
          {translate.orders('updateDiscount')}
        </DialogTitle>
        <DialogBody>
          <div className="py-4">
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">{translate.orders('subtotal')}</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <label className="text-gray-600 mr-2">{translate.orders('discountType')}</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="border rounded px-2 py-1"
                >
                  <option value="percentage">{translate.orders('percentage')}</option>
                  <option value="fixed">{translate.orders('fixedAmount')}</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="text-gray-600 mr-2">{translate.orders('discountValue')}</label>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : order.subtotal}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="border rounded px-2 py-1 w-24 text-right"
                />
                {discountType === 'percentage' && <span className="ml-1">%</span>}
              </div>
            </div>
            {calculateDiscountAmount() > 0 && (
              <div className="bg-gray-100 p-3 rounded">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">{translate.orders('discountAmount')}</span>
                  <span className="font-medium text-red-600">-{formatCurrency(calculateDiscountAmount())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{translate.orders('newTotal')}</span>
                  <span className="font-bold">{formatCurrency(order.subtotal - calculateDiscountAmount())}</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Applying a discount will reduce the order subtotal.
          </p>
        </div>
        </DialogBody>
        <DialogActions>
          <Button
            onClick={handleUpdateDiscount}
            disabled={submitLoading}
            className="ml-3"
          >
            {translate.orders('applyDiscount')}
          </Button>
          <Button
            outline
            onClick={() => setDiscountModalOpen(false)}
            disabled={submitLoading}
          >
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Payment Modal */}
      <Dialog
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
      >
        <DialogTitle>
          {translate.orders('addPayment')}
        </DialogTitle>
        <DialogBody>
          <div className="py-4">
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-1">
              <Text>{translate.orders('orderTotal')}</Text>
              <Text>{formatCurrency(order.total)}</Text>
            </div>
            <div className="flex justify-between mb-1">
              <Text>{translate.orders('alreadyPaid')}</Text>
              <Text>{formatCurrency(totalPaid)}</Text>
            </div>
            <div className="flex justify-between mt-2 text-lg font-bold">
              <Text>{translate.orders('remainingBalance')}</Text>
              <Text>{formatCurrency(remainingBalance)}</Text>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Text>{translate.orders('paymentMethod')}</Text>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="cash">{translate.orders('cash')}</option>
                <option value="credit_card">{translate.orders('creditCard')}</option>
                <option value="debit_card">{translate.orders('debitCard')}</option>
                <option value="transfer">{translate.orders('bankTransfer')}</option>
              </Select>
            </div>
            
            <div>
              <Text>{translate.orders('amountPaid')}</Text>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                step="0.01"
                min="0.01"
                max={remainingBalance}
              />
              {paymentAmount > remainingBalance && (
                <Text>
                  {translate.orders('amountExceedsBalance')}
                </Text>
              )}
              {paymentAmount < remainingBalance && paymentAmount > 0 && (
                <Text>
                  {translate.orders('partialPaymentNote')}
                </Text>
              )}
            </div>
            
            <div>
              <Text>{translate.orders('reference')}</Text>
              <Input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={translate.orders('referencePlaceholder')}
              />
            </div>
            
            <div>
              <Text>{translate.orders('paymentNotes')}</Text>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                placeholder={translate.orders('paymentNotesPlaceholder')}
              />
            </div>
          </div>
        </div>
        </DialogBody>
        <DialogActions>
          <Button
            onClick={handleAddPayment}
            disabled={paymentAmount <= 0 || paymentAmount > remainingBalance}
          >
            {translate.orders('processPayment')}
          </Button>
          <Button
            outline
            onClick={() => setPaymentModalOpen(false)}
            disabled={submitLoading}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default OrderDetail;