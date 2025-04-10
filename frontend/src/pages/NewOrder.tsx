import React, { useState, useEffect } from 'react';
import { createOrder } from '../api/orders';
import { getProducts } from '../api/products';
import { getCustomers } from '../api/customers';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types/products';
import { Customer } from '../types/customers';
import { OrderItemInput, OrderStatus, PaymentMethod, PaymentStatus } from '../types/orders';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import {
  MagnifyingGlassIcon, 
  PlusIcon, 
  MinusIcon, 
  TrashIcon,
  UserIcon,
  ShoppingCartIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface CartItem extends OrderItemInput {
  productName: string;
  price: number;
  subtotal: number;
}

const NewOrder: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Calculate order totals
  const subtotal = cartItems.reduce((sum, item) => {
    // Ensure subtotal is always a number
    const itemSubtotal = typeof item.subtotal === 'string' 
      ? parseFloat(item.subtotal) 
      : Number(item.subtotal);
    return sum + (isNaN(itemSubtotal) ? 0 : itemSubtotal);
  }, 0);
  
  const taxRate = 0; // This should come from settings
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  
  // Debug
  console.log('Cart items:', cartItems);
  console.log('Calculated subtotal:', subtotal);
  console.log('Calculated total:', total);

  useEffect(() => {
    // Fetch products and customers on mount
    fetchProductsAndCustomers();
  }, []);

  // Filter products based on search
  useEffect(() => {
    if (!productSearch.trim()) {
      setFilteredProducts(products);
      return;
    }

    const searchLower = productSearch.toLowerCase();
    const filtered = products.filter(
      product => 
        product.name.toLowerCase().includes(searchLower) ||
        (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchLower))
    );
    setFilteredProducts(filtered);
  }, [productSearch, products]);

  const fetchProductsAndCustomers = async () => {
    try {
      setLoading(true);
      const [productsResponse, customersResponse] = await Promise.all([
        getProducts({ active: true }),
        getCustomers(),
      ]);
      
      setProducts(productsResponse.data);
      setFilteredProducts(productsResponse.data);
      setCustomers(customersResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductSearch(e.target.value);
  };

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearch(e.target.value);
  };

  const filteredCustomers = customerSearch 
    ? customers.filter(customer => 
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
        (customer.phone && customer.phone.toLowerCase().includes(customerSearch.toLowerCase()))
      )
    : customers;

  const addToCart = (product: Product) => {
    // Check if product is already in cart
    const existingItemIndex = cartItems.findIndex(item => item.productId === product.id);
    
    // Ensure price is a number
    const productPrice = typeof product.price === 'string' 
      ? parseFloat(product.price) 
      : Number(product.price);
      
    console.log('Adding product with price:', productPrice, 'Type:', typeof productPrice);
    
    if (existingItemIndex >= 0) {
      // Update quantity if already in cart
      const newCartItems = [...cartItems];
      newCartItems[existingItemIndex].quantity += 1;
      newCartItems[existingItemIndex].subtotal = 
        newCartItems[existingItemIndex].quantity * newCartItems[existingItemIndex].price;
      setCartItems(newCartItems);
    } else {
      // Add new item to cart
      setCartItems([
        ...cartItems,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: productPrice,
          subtotal: productPrice,
          notes: '',
        }
      ]);
    }
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    // Check if product has enough stock
    const product = products.find(p => p.id === cartItems[index].productId);
    if (product && product.stock < newQuantity) {
      alert(`Sorry, only ${product.stock} units available for ${product.name}`);
      return;
    }

    const newCartItems = [...cartItems];
    newCartItems[index].quantity = newQuantity;
    
    // Ensure price is a number before calculating subtotal
    const itemPrice = typeof newCartItems[index].price === 'string'
      ? parseFloat(newCartItems[index].price)
      : Number(newCartItems[index].price);
      
    newCartItems[index].subtotal = itemPrice * newQuantity;
    
    console.log('Updated item quantity:', newQuantity);
    console.log('Item price:', itemPrice);
    console.log('Calculated subtotal:', newCartItems[index].subtotal);
    
    setCartItems(newCartItems);
  };

  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerModalOpen(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
  };

  const openPaymentModal = () => {
    if (cartItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    
    // Make sure total is a valid number
    const amountToSet = isNaN(total) ? 0 : total;
    console.log('Setting payment amount:', amountToSet);
    
    setPaymentAmount(amountToSet);
    setPaymentModalOpen(true);
  };

  const handleSubmitOrder = async (skipPayment: boolean = false) => {
    if (cartItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Make sure we're using numerical values for all items
      const processedCartItems = cartItems.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        notes: item.notes || undefined,
      }));
      
      console.log('Submitting order with items:', processedCartItems);
      
      // Create order data with proper types
      const orderData = {
        customerId: selectedCustomer?.id || undefined,
        status: 'pending' as OrderStatus,
        items: processedCartItems,
        notes: orderNotes || undefined,
      };
      
      // Add payment-related fields only if we're not skipping payment
      if (!skipPayment) {
        Object.assign(orderData, {
          paymentMethod: paymentMethod,
          payment: {
            amount: Number(paymentAmount),
            method: paymentMethod,
            reference: paymentReference || undefined,
            notes: paymentNotes || undefined,
          },
        });
      } else {
        // For unpaid orders, explicitly set paymentStatus
        Object.assign(orderData, {
          paymentStatus: 'unpaid' as PaymentStatus
        });
      }
      
      console.log('Submitting order with data:', orderData);
      
      const response = await createOrder(orderData);
      
      if (response.success) {
        alert('Order created successfully!');
        navigate(`/orders/${response.data.id}`);
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      let errorMessage = 'Failed to create order. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
      setPaymentModalOpen(false);
    }
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
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">New Order</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Product Selection */}
        <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Products</h2>
          
          {/* Product Search */}
          <div className="relative mb-4">
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
          
          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 max-h-96 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500">
                No products found. Try a different search term.
              </div>
            ) : (
              filteredProducts.map(product => (
                <div 
                  key={product.id}
                  className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition flex flex-col justify-between ${
                    product.stock <= 0 ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  onClick={() => product.stock > 0 && addToCart(product)}
                >
                  <div>
                    <div className="font-medium">{product.name}</div>
                    {product.sku && <div className="text-xs text-gray-500">SKU: {product.sku}</div>}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-blue-600">{formatCurrency(product.price)}</span>
                    <span className={`text-xs ${
                      product.stock <= 0 ? 'text-red-600' : 
                      product.stock <= (product.lowStockAlert || 5) ? 'text-orange-600' : 
                      'text-green-600'
                    }`}>
                      {product.stock <= 0 ? 'Out of stock' : `${product.stock} in stock`}
                    </span>
                  </div>
                  {product.stock > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add to Order
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
          
          {/* Customer Selection */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Customer
              </label>
              <button
                onClick={() => setCustomerModalOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedCustomer ? 'Change' : 'Select'} Customer
              </button>
            </div>
            
            {selectedCustomer ? (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{selectedCustomer.name}</div>
                  {selectedCustomer.email && (
                    <div className="text-xs text-gray-500">{selectedCustomer.email}</div>
                  )}
                  {selectedCustomer.phone && (
                    <div className="text-xs text-gray-500">{selectedCustomer.phone}</div>
                  )}
                </div>
                <button
                  onClick={clearCustomer}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                Walk-in Customer
              </div>
            )}
          </div>
          
          {/* Cart Items */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Items
              </label>
              <span className="text-sm text-gray-500">
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {cartItems.length === 0 ? (
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg flex items-center">
                <ShoppingCartIcon className="h-5 w-5 mr-2 text-gray-400" />
                No items added yet
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {cartItems.map((item, index) => (
                  <div key={index} className="p-3 flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(item.price)} each
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => updateItemQuantity(index, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <MinusIcon className="h-4 w-4 text-gray-500" />
                      </button>
                      <span className="mx-2 w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(index, item.quantity + 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <PlusIcon className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="ml-2 p-1 rounded-full hover:bg-gray-100"
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Order Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Notes
            </label>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes to this order"
            />
          </div>
          
          {/* Order Total */}
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-sm font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Tax ({taxRate}%)</span>
              <span className="text-sm font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-base font-medium">Total</span>
              <span className="text-base font-bold">{formatCurrency(total)}</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col space-y-3">
            <Button
              variant="primary"
              fullWidth
              onClick={openPaymentModal}
              disabled={cartItems.length === 0 || isSubmitting}
            >
              Checkout & Payment
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => handleSubmitOrder(true)}
              disabled={cartItems.length === 0 || isSubmitting}
            >
              Save as Unpaid
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate('/orders')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      <Modal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title="Select Customer"
        size="lg"
      >
        <div className="py-4">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={customerSearch}
              onChange={handleCustomerSearchChange}
            />
            <div className="absolute right-3 top-2.5 text-gray-400">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No customers found. Try a different search term.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => selectCustomer(customer)}
                  >
                    <div className="font-medium">{customer.name}</div>
                    {customer.email && (
                      <div className="text-sm text-gray-500">{customer.email}</div>
                    )}
                    {customer.phone && (
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Payment"
        footer={
          <>
            <Button
              variant="primary"
              onClick={() => handleSubmitOrder(false)}
              isLoading={isSubmitting}
              className="ml-3"
            >
              Complete Order
            </Button>
            <Button
              variant="outline"
              onClick={() => setPaymentModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="py-4">
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-sm font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Tax ({taxRate}%)</span>
              <span className="text-sm font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between mt-2 text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
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
                min="0"
                max={total}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {paymentAmount !== total && (
                <p className="mt-1 text-sm text-yellow-600">
                  {paymentAmount < total ? 'Partial payment' : 'Overpayment'}
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

export default NewOrder;