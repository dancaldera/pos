import React, { useState, useEffect } from "react";
import { createOrder } from "../api/orders";
import { getProducts } from "../api/products";
import { getCustomers } from "../api/customers";
import { useNavigate } from "react-router-dom";
import { Product } from "../types/products";
import { Customer } from "../types/customers";
import {
  OrderItemInput,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../types/orders";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useLanguage } from "../context/LanguageContext";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  UserIcon,
  ShoppingCartIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { formatCurrency } from "@/utils/format-currency";

interface CartItem extends OrderItemInput {
  productName: string;
  price: number;
  subtotal: number;
  variant?: string;
  hasVariants?: boolean;
  availableVariants?: string[];
}

const NewOrder: React.FC = () => {
  const navigate = useNavigate();
  const { translate } = useLanguage();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(
    null
  );
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate order totals
  const subtotal = cartItems.reduce((sum, item) => {
    // Ensure subtotal is always a number
    const itemSubtotal =
      typeof item.subtotal === "string"
        ? parseFloat(item.subtotal)
        : Number(item.subtotal);
    return sum + (isNaN(itemSubtotal) ? 0 : itemSubtotal);
  }, 0);

  const taxRate = 0; // This should come from settings
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "percentage"
  );
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Calculate discount amount based on type
  const discountAmount =
    discountType === "percentage"
      ? subtotal * (discountValue / 100)
      : discountValue;

  // Ensure discount doesn't exceed subtotal
  const validDiscountAmount = Math.min(discountAmount, subtotal);

  const tax = (subtotal - validDiscountAmount) * (taxRate / 100);
  const total = subtotal - validDiscountAmount + tax;

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
      (product) =>
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
        getProducts({ active: true, limit: 999999 }),
        getCustomers(),
      ]);

      setProducts(productsResponse.data);
      setFilteredProducts(productsResponse.data);
      setCustomers(customersResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setProductSearch(e.target.value);
  };

  const handleCustomerSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCustomerSearch(e.target.value);
  };

  const filteredCustomers = customerSearch
    ? customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          (customer.email &&
            customer.email
              .toLowerCase()
              .includes(customerSearch.toLowerCase())) ||
          (customer.phone &&
            customer.phone.toLowerCase().includes(customerSearch.toLowerCase()))
      )
    : customers;

  const addToCart = (product: Product, selectedVariant?: string) => {
    // Ensure price is a number
    const productPrice =
      typeof product.price === "string"
        ? parseFloat(product.price)
        : Number(product.price);

    // For products with variants, handle differently
    if (
      product.hasVariants &&
      product.variants &&
      product.variants.length > 0
    ) {
      // If a specific variant is selected or there's only one variant, add it directly
      if (selectedVariant || product.variants.length === 1) {
        const variant = selectedVariant || product.variants[0];

        // Check if this specific product+variant is already in cart
        const existingItemIndex = cartItems.findIndex(
          (item) => item.productId === product.id && item.variant === variant
        );

        if (existingItemIndex >= 0) {
          // Update quantity if this variant is already in cart
          const newCartItems = [...cartItems];
          newCartItems[existingItemIndex].quantity += 1;
          newCartItems[existingItemIndex].subtotal =
            newCartItems[existingItemIndex].quantity *
            newCartItems[existingItemIndex].price;
          setCartItems(newCartItems);
        } else {
          // Add new variant item to cart
          setCartItems([
            ...cartItems,
            {
              productId: product.id,
              productName: product.name,
              variant,
              quantity: 1,
              price: productPrice,
              subtotal: productPrice,
              notes: "",
            },
          ]);
        }
      } else {
        // If no variant is selected and there are multiple, show modal or selection UI
        // For products with variants but no selection, open variant selection
        // This could be implemented as a modal or dropdown
        setCartItems([
          ...cartItems,
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            price: productPrice,
            subtotal: productPrice,
            notes: "",
            hasVariants: true,
            availableVariants: product.variants,
          },
        ]);
      }
    } else {
      // Standard product without variants - original behavior
      // Check if product is already in cart
      const existingItemIndex = cartItems.findIndex(
        (item) => item.productId === product.id && !item.variant
      );

      if (existingItemIndex >= 0) {
        // Update quantity if already in cart
        const newCartItems = [...cartItems];
        newCartItems[existingItemIndex].quantity += 1;
        newCartItems[existingItemIndex].subtotal =
          newCartItems[existingItemIndex].quantity *
          newCartItems[existingItemIndex].price;
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
            notes: "",
          },
        ]);
      }
    }
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    // Check if product has enough stock
    const product = products.find((p) => p.id === cartItems[index].productId);
    if (product && product.stock < newQuantity) {
      alert(
        translate
          .products("stockLimitMessage")
          .replace("{stock}", product.stock.toString())
          .replace("{product}", product.name)
      );
      return;
    }

    const newCartItems = [...cartItems];
    newCartItems[index].quantity = newQuantity;

    // Ensure price is a number before calculating subtotal
    const itemPrice =
      typeof newCartItems[index].price === "string"
        ? parseFloat(newCartItems[index].price)
        : Number(newCartItems[index].price);

    newCartItems[index].subtotal = itemPrice * newQuantity;

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
      alert(translate.orders("emptyCartAlert"));
      return;
    }

    // Make sure total is a valid number
    const amountToSet = isNaN(total) ? 0 : total;

    setPaymentAmount(amountToSet);
    setPaymentModalOpen(true);
  };

  const selectVariant = (itemIndex: number, variant: string) => {
    const newCartItems = [...cartItems];
    const item = newCartItems[itemIndex];

    // Update the item with the selected variant
    newCartItems[itemIndex] = {
      ...item,
      variant,
      hasVariants: false, // No longer needs variant selection
    };

    setCartItems(newCartItems);
    setVariantModalOpen(false);
    setSelectedItemIndex(null);
  };

  const openVariantModal = (index: number) => {
    setSelectedItemIndex(index);
    setVariantModalOpen(true);
  };

  const handleSubmitOrder = async (skipPayment: boolean = false) => {
    // Check if any items need variant selection
    const itemsNeedingVariants = cartItems.filter((item) => item.hasVariants);
    if (itemsNeedingVariants.length > 0) {
      alert(translate.products("selectVariantsAlert"));
      return;
    }

    if (cartItems.length === 0) {
      alert(translate.orders("emptyCartAlert"));
      return;
    }

    try {
      setIsSubmitting(true);

      // Make sure we're using numerical values for all items
      const processedCartItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        variant: item.variant || undefined,
        notes: item.notes || undefined,
      }));

      // Create order data with proper types
      const orderData = {
        customerId: selectedCustomer?.id || undefined,
        status: "pending" as OrderStatus,
        items: processedCartItems,
        notes: orderNotes || undefined,
        discount: validDiscountAmount,
        discountType: discountType,
        discountValue: discountValue,
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
          paymentStatus: "unpaid" as PaymentStatus,
        });
      }

      const response = await createOrder(orderData);

      if (response.success) {
        alert(translate.orders("orderSuccessAlert"));
        navigate(`/orders/${response.data.id}`);
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      let errorMessage = translate.orders("orderFailedAlert");

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
      setPaymentModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">{translate.common("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {translate.orders("newOrder")}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Product Selection */}
        <div className="md:col-span-2 bg-white rounded-lg shadow p-6 flex flex-col h-[calc(100vh-180px)]">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {translate.products("title")}
          </h2>

          {/* Product Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder={translate.products("searchPlaceholder")}
              className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={productSearch}
              onChange={handleProductSearchChange}
            />
            <div className="absolute right-3 top-2.5 text-gray-400">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 overflow-y-auto flex-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500">
                {translate.products("noProductsFound")}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition flex flex-col justify-between h-full ${
                    product.stock <= 0 ? "opacity-50 pointer-events-none" : ""
                  }`}
                  onClick={() => product.stock > 0 && addToCart(product)}
                >
                  <div className="mb-2 flex justify-center h-32">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-auto object-contain rounded"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full bg-gray-100 rounded">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1}
                          stroke="currentColor"
                          className="w-12 h-12 text-gray-300"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{product.name}</div>
                    {product.sku && (
                      <div className="text-xs text-gray-500">
                        SKU: {product.sku}
                      </div>
                    )}
                    {product.hasVariants &&
                      product.variants &&
                      product.variants.length > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          {product.variants.length}{" "}
                          {translate.products("variantsAvailable")}
                        </div>
                      )}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-blue-600">
                      {formatCurrency(product.price)}
                    </span>
                    <span
                      className={`text-xs ${
                        product.stock <= 0
                          ? "text-red-600"
                          : product.stock <= (product.lowStockAlert || 5)
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {product.stock <= 0
                        ? translate.products("outOfStock")
                        : `${product.stock} ${translate.products("inStock")}`}
                    </span>
                  </div>
                  {product.stock > 0 && !product.hasVariants && (
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
                      {translate.orders("addToOrder")}
                    </Button>
                  )}
                  {product.stock > 0 &&
                    product.hasVariants &&
                    product.variants &&
                    product.variants.length > 0 && (
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {product.variants.map((variant, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product, variant);
                            }}
                            className={
                              idx === 0 && product.variants!.length === 1
                                ? "col-span-2"
                                : ""
                            }
                          >
                            {variant}
                          </Button>
                        ))}
                      </div>
                    )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="bg-white rounded-lg shadow p-6 h-[calc(100vh-180px)] overflow-y-auto">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {translate.orders("orderSummary")}
          </h2>

          {/* Customer Selection */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {translate.customers("customer")}
              </label>
              <button
                onClick={() => setCustomerModalOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedCustomer
                  ? translate.common("change")
                  : translate.common("select")}{" "}
                {translate.customers("customer")}
              </button>
            </div>

            {selectedCustomer ? (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{selectedCustomer.name}</div>
                  {selectedCustomer.email && (
                    <div className="text-xs text-gray-500">
                      {selectedCustomer.email}
                    </div>
                  )}
                  {selectedCustomer.phone && (
                    <div className="text-xs text-gray-500">
                      {selectedCustomer.phone}
                    </div>
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
                {translate.customers("walkIn")}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {translate.orders("items")}
              </label>
              <span className="text-sm text-gray-500">
                {cartItems.length}{" "}
                {cartItems.length !== 1
                  ? translate.orders("itemsPlural")
                  : translate.orders("itemSingular")}
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg flex items-center">
                <ShoppingCartIcon className="h-5 w-5 mr-2 text-gray-400" />
                {translate.orders("noItems")}
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {cartItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      {item.variant && (
                        <div className="text-xs text-blue-600 font-medium mt-0.5">
                          {translate.products("variant")}: {item.variant}
                        </div>
                      )}
                      {item.hasVariants && (
                        <button
                          onClick={() => openVariantModal(index)}
                          className="text-xs text-blue-600 underline font-medium mt-0.5"
                        >
                          {translate.products("selectVariant")}
                        </button>
                      )}
                      <div className="text-sm text-gray-500 mt-0.5">
                        {formatCurrency(item.price)} {translate.orders("each")}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() =>
                          updateItemQuantity(index, item.quantity - 1)
                        }
                        className="p-1 rounded-full hover:bg-gray-100"
                        disabled={item.hasVariants}
                      >
                        <MinusIcon className="h-4 w-4 text-gray-500" />
                      </button>
                      <span className="mx-2 w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateItemQuantity(index, item.quantity + 1)
                        }
                        className="p-1 rounded-full hover:bg-gray-100"
                        disabled={item.hasVariants}
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
              {translate.orders("orderNotes")}
            </label>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={translate.orders("notesPlaceholder")}
            />
          </div>

          {/* Order Total */}
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">
                {translate.orders("subtotal")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* Discount Section */}
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">
                    {translate.orders("discount")}
                  </span>
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as "percentage" | "fixed")
                    }
                    className="text-xs border rounded px-1 py-0.5"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">{translate.orders("fixed")}</option>
                  </select>
                </div>
                <input
                  type="number"
                  min="0"
                  max={discountType === "percentage" ? 100 : subtotal}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-16 text-right text-sm border rounded px-2 py-0.5"
                />
              </div>
              {validDiscountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    {translate.orders("discountAmount")}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    -{formatCurrency(validDiscountAmount)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">
                {translate.orders("tax")} ({taxRate}%)
              </span>
              <span className="text-sm font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-base font-medium">
                {translate.orders("total")}
              </span>
              <span className="text-base font-bold">
                {formatCurrency(total)}
              </span>
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
              {translate.orders("checkoutPayment")}
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                const confirm = window.confirm(
                  translate.orders("saveAsUnpaidConfirm")
                );
                if (confirm) {
                  handleSubmitOrder(true);
                }
              }}
              disabled={cartItems.length === 0 || isSubmitting}
            >
              {translate.orders("saveAsUnpaid")}
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate("/orders")}
            >
              {translate.common("cancel")}
            </Button>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      <Modal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title={translate.customers("selectCustomer")}
        size="lg"
      >
        <div className="py-4">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder={translate.customers("searchPlaceholder")}
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
                {translate.customers("noCustomersFound")}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => selectCustomer(customer)}
                  >
                    <div className="font-medium">{customer.name}</div>
                    {customer.email && (
                      <div className="text-sm text-gray-500">
                        {customer.email}
                      </div>
                    )}
                    {customer.phone && (
                      <div className="text-sm text-gray-500">
                        {customer.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Variant Selection Modal */}
      <Modal
        isOpen={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        title={translate.products("selectVariant")}
        size="sm"
      >
        <div className="py-4">
          {selectedItemIndex !== null && cartItems[selectedItemIndex] && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                {cartItems[selectedItemIndex].productName}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {cartItems[selectedItemIndex].availableVariants?.map(
                  (variant, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      fullWidth
                      onClick={() => selectVariant(selectedItemIndex, variant)}
                    >
                      {variant}
                    </Button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={translate.orders("payment")}
        footer={
          <>
            <Button
              variant="primary"
              onClick={() => handleSubmitOrder(false)}
              isLoading={isSubmitting}
              className="ml-3"
            >
              {translate.orders("completeOrder")}
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
              <span className="text-sm font-medium">
                {formatCurrency(subtotal)}
              </span>
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
                {translate.orders("paymentMethod")}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cash">{translate.orders("cash")}</option>
                <option value="credit_card">
                  {translate.orders("creditCard")}
                </option>
                <option value="debit_card">
                  {translate.orders("debitCard")}
                </option>
                <option value="transfer">
                  {translate.orders("bankTransfer")}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translate.orders("amountPaid")}
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
                  {paymentAmount < total
                    ? translate.orders("partialPayment")
                    : translate.orders("overpayment")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translate.orders("reference")}
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={translate.orders("referencePlaceholder")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translate.orders("paymentNotes")}
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={translate.orders("paymentNotesPlaceholder")}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NewOrder;
