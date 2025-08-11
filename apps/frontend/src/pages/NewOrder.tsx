import {
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { formatCurrency } from '@/utils/format-currency'
import { getCustomers } from '../api/customers'
import { createOrder } from '../api/orders'
import { getProducts } from '../api/products'
// Modal import removed as we're using Dialog components instead
import { useLanguage } from '../context/LanguageContext'
import type { Customer } from '../types/customers'
import type { OrderItemInput, OrderStatus, PaymentMethod, PaymentStatus } from '../types/orders'
import type { Product } from '../types/products'

interface CartItem extends OrderItemInput {
  productName: string
  price: number
  subtotal: number
  variant?: string
  hasVariants?: boolean
  availableVariants?: string[]
}

const NewOrder: React.FC = () => {
  const navigate = useNavigate()
  const { translate } = useLanguage()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [productSearch, setProductSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [confirmSaveModalOpen, setConfirmSaveModalOpen] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [orderNotes, setOrderNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate order totals
  const subtotal = cartItems.reduce((sum, item) => {
    // Ensure subtotal is always a number
    const itemSubtotal =
      typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : Number(item.subtotal)
    return sum + (Number.isNaN(itemSubtotal) ? 0 : itemSubtotal)
  }, 0)

  const taxRate = 0 // This should come from settings
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(0)

  // Calculate discount amount based on type
  const discountAmount =
    discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue

  // Ensure discount doesn't exceed subtotal
  const validDiscountAmount = Math.min(discountAmount, subtotal)

  const tax = (subtotal - validDiscountAmount) * (taxRate / 100)
  const total = subtotal - validDiscountAmount + tax

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchProductsAndCustomers is stable
  useEffect(() => {
    // Fetch products and customers on mount
    fetchProductsAndCustomers()
  }, [])

  // Filter products based on search
  useEffect(() => {
    if (!productSearch.trim()) {
      setFilteredProducts(products)
      return
    }

    const searchLower = productSearch.toLowerCase()
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.barcode?.toLowerCase().includes(searchLower)
    )
    setFilteredProducts(filtered)
  }, [productSearch, products])

  const fetchProductsAndCustomers = async () => {
    try {
      setLoading(true)
      const [productsResponse, customersResponse] = await Promise.all([
        getProducts({ active: true, limit: 999999 }),
        getCustomers(),
      ])

      setProducts(productsResponse.data)
      setFilteredProducts(productsResponse.data)
      setCustomers(customersResponse.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductSearch(e.target.value)
  }

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearch(e.target.value)
  }

  const filteredCustomers = customerSearch
    ? customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
          customer.phone?.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers

  const addToCart = (product: Product, selectedVariant?: string) => {
    // Ensure price is a number
    const productPrice =
      typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price)

    // For products with variants, handle differently
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      // If a specific variant is selected or there's only one variant, add it directly
      if (selectedVariant || product.variants.length === 1) {
        const variant = selectedVariant || product.variants[0]

        // Check if this specific product+variant is already in cart
        const existingItemIndex = cartItems.findIndex(
          (item) => item.productId === product.id && item.variant === variant
        )

        if (existingItemIndex >= 0) {
          // Update quantity if this variant is already in cart
          const newCartItems = [...cartItems]
          newCartItems[existingItemIndex].quantity += 1
          newCartItems[existingItemIndex].subtotal =
            newCartItems[existingItemIndex].quantity * newCartItems[existingItemIndex].price
          setCartItems(newCartItems)
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
              notes: '',
            },
          ])
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
            notes: '',
            hasVariants: true,
            availableVariants: product.variants,
          },
        ])
      }
    } else {
      // Standard product without variants - original behavior
      // Check if product is already in cart
      const existingItemIndex = cartItems.findIndex(
        (item) => item.productId === product.id && !item.variant
      )

      if (existingItemIndex >= 0) {
        // Update quantity if already in cart
        const newCartItems = [...cartItems]
        newCartItems[existingItemIndex].quantity += 1
        newCartItems[existingItemIndex].subtotal =
          newCartItems[existingItemIndex].quantity * newCartItems[existingItemIndex].price
        setCartItems(newCartItems)
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
          },
        ])
      }
    }
  }

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return

    // Check if product has enough stock
    const product = products.find((p) => p.id === cartItems[index].productId)
    if (product && product.stock < newQuantity) {
      alert(
        translate
          .products('stockLimitMessage')
          .replace('{stock}', product.stock.toString())
          .replace('{product}', product.name)
      )
      return
    }

    const newCartItems = [...cartItems]
    newCartItems[index].quantity = newQuantity

    // Ensure price is a number before calculating subtotal
    const itemPrice =
      typeof newCartItems[index].price === 'string'
        ? parseFloat(newCartItems[index].price)
        : Number(newCartItems[index].price)

    newCartItems[index].subtotal = itemPrice * newQuantity

    setCartItems(newCartItems)
  }

  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index))
  }

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerModalOpen(false)
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
  }

  const openPaymentModal = () => {
    if (cartItems.length === 0) {
      alert(translate.orders('emptyCartAlert'))
      return
    }

    // Make sure total is a valid number
    const amountToSet = Number.isNaN(total) ? 0 : total

    setPaymentAmount(amountToSet)
    setPaymentModalOpen(true)
  }

  const selectVariant = (itemIndex: number, variant: string) => {
    const newCartItems = [...cartItems]
    const item = newCartItems[itemIndex]

    // Update the item with the selected variant
    newCartItems[itemIndex] = {
      ...item,
      variant,
      hasVariants: false, // No longer needs variant selection
    }

    setCartItems(newCartItems)
    setVariantModalOpen(false)
    setSelectedItemIndex(null)
  }

  const openVariantModal = (index: number) => {
    setSelectedItemIndex(index)
    setVariantModalOpen(true)
  }

  const handleSubmitOrder = async (skipPayment: boolean = false) => {
    // Check if any items need variant selection
    const itemsNeedingVariants = cartItems.filter((item) => item.hasVariants)
    if (itemsNeedingVariants.length > 0) {
      alert(translate.products('selectVariantsAlert'))
      return
    }

    if (cartItems.length === 0) {
      alert(translate.orders('emptyCartAlert'))
      return
    }

    try {
      setIsSubmitting(true)

      // Make sure we're using numerical values for all items
      const processedCartItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        variant: item.variant || undefined,
        notes: item.notes || undefined,
      }))

      // Create order data with proper types
      const orderData = {
        customerId: selectedCustomer?.id || undefined,
        status: 'pending' as OrderStatus,
        items: processedCartItems,
        notes: orderNotes || undefined,
        discount: validDiscountAmount,
        discountType: discountType,
        discountValue: discountValue,
      }

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
        })
      } else {
        // For unpaid orders, explicitly set paymentStatus
        Object.assign(orderData, {
          paymentStatus: 'unpaid' as PaymentStatus,
        })
      }

      const response = await createOrder(orderData)

      if (response.success) {
        toast.success(translate.orders('orderSuccessAlert'))
        navigate(`/orders/${response.data.id}`)
      }
    } catch (error: any) {
      console.error('Error creating order:', error)
      let errorMessage = translate.orders('orderFailedAlert')

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
      setPaymentModalOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">{translate.common('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Heading>{translate.orders('newOrder')}</Heading>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Product Selection */}
        <div className="md:col-span-2 rounded-lg shadow p-6 flex flex-col h-[calc(100vh-180px)]">
          <Heading>{translate.products('title')}</Heading>

          {/* Product Search */}
          <div className="relative mb-4">
            <Input
              type="text"
              placeholder={translate.products('searchPlaceholder')}
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
                {translate.products('noProductsFound')}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  className={`border rounded-lg p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex flex-col justify-between h-full text-left ${
                    product.stock <= 0 ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  onClick={() => product.stock > 0 && addToCart(product)}
                  disabled={product.stock <= 0}
                >
                  <div className="mb-2 flex justify-center h-32">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-auto object-contain rounded"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full bg-zinc-100 dark:bg-zinc-700 rounded">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1}
                          stroke="currentColor"
                          className="w-12 h-12 text-gray-300"
                        >
                          <title>Product image placeholder</title>
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
                    <Text>{product.name}</Text>
                    {product.sku && <Text>SKU: {product.sku}</Text>}
                    {product.hasVariants && product.variants && product.variants.length > 0 && (
                      <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {product.variants.length} {translate.products('variantsAvailable')}
                      </Text>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(product.price)}
                    </span>
                    <span
                      className={`text-xs ${
                        product.stock <= 0
                          ? 'text-red-600'
                          : product.stock <= (product.lowStockAlert || 5)
                            ? 'text-orange-600'
                            : 'text-green-600'
                      }`}
                    >
                      {product.stock <= 0
                        ? translate.products('outOfStock')
                        : `${product.stock} ${translate.products('inStock')}`}
                    </span>
                  </div>
                  {product.stock > 0 && !product.hasVariants && (
                    <Button
                      outline
                      className="mt-2 w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        addToCart(product)
                      }}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      {translate.orders('addToOrder')}
                    </Button>
                  )}
                  {product.stock > 0 &&
                    product.hasVariants &&
                    product.variants &&
                    product.variants.length > 0 && (
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {product.variants.map((variant, idx) => (
                          <Button
                            key={`${product.id}-variant-${idx}-${variant}`}
                            outline
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(product, variant)
                            }}
                            className={
                              idx === 0 && (product.variants?.length || 0) === 1 ? 'col-span-2' : ''
                            }
                          >
                            {variant}
                          </Button>
                        ))}
                      </div>
                    )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="rounded-lg shadow p-6 h-[calc(100vh-180px)] overflow-y-auto">
          <Heading level={2}>{translate.orders('orderSummary')}</Heading>

          {/* Customer Selection */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Text>{translate.customers('customer')}</Text>
              <Button onClick={() => setCustomerModalOpen(true)}>
                {selectedCustomer ? translate.common('change') : translate.common('select')}{' '}
                {translate.customers('customer')}
              </Button>
            </div>

            {selectedCustomer ? (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <Text>{selectedCustomer.name}</Text>
                  {selectedCustomer.email && <Text>{selectedCustomer.email}</Text>}
                  {selectedCustomer.phone && <Text>{selectedCustomer.phone}</Text>}
                </div>
                <Button onClick={clearCustomer}>
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                {translate.customers('walkIn')}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Text>{translate.orders('items')}</Text>
              <Text>
                {cartItems.length}{' '}
                {cartItems.length !== 1
                  ? translate.orders('itemsPlural')
                  : translate.orders('itemSingular')}
              </Text>
            </div>

            {cartItems.length === 0 ? (
              <div className="p-3 bg-gray-50 rounded-lg flex items-center">
                <ShoppingCartIcon className="h-5 w-5 mr-2 text-gray-400" />
                {translate.orders('noItems')}
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {cartItems.map((item, index) => (
                  <div
                    key={`cart-${item.productId}-${item.variant || 'default'}-${index}`}
                    className="p-3 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <Text>{item.productName}</Text>
                      {item.variant && (
                        <Text>
                          {translate.products('variant')}: {item.variant}
                        </Text>
                      )}
                      {item.hasVariants && (
                        <Button onClick={() => openVariantModal(index)}>
                          {translate.products('selectVariant')}
                        </Button>
                      )}
                      <Text>
                        {formatCurrency(item.price)} {translate.orders('each')}
                      </Text>
                    </div>
                    <div className="flex items-center">
                      <Button
                        onClick={() => updateItemQuantity(index, item.quantity - 1)}
                        disabled={item.hasVariants}
                      >
                        <MinusIcon className="h-4 w-4" />
                      </Button>
                      <Text className="mx-2 w-8 text-center">{item.quantity}</Text>
                      <Button
                        onClick={() => updateItemQuantity(index, item.quantity + 1)}
                        disabled={item.hasVariants}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => removeFromCart(index)} color="red">
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Notes */}
          <div className="mb-4">
            <Text>{translate.orders('orderNotes')}</Text>
            <Textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
              placeholder={translate.orders('notesPlaceholder')}
            />
          </div>

          {/* Order Total */}
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between mb-1">
              <Text>{translate.orders('subtotal')}</Text>
              <Text>{formatCurrency(subtotal)}</Text>
            </div>

            {/* Discount Section */}
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <div className="flex items-center">
                  <Text>{translate.orders('discount')}</Text>
                  <Select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">{translate.orders('fixed')}</option>
                  </Select>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : subtotal}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
              </div>
              {validDiscountAmount > 0 && (
                <div className="flex justify-between">
                  <Text>{translate.orders('discountAmount')}</Text>
                  <Text>-{formatCurrency(validDiscountAmount)}</Text>
                </div>
              )}
            </div>

            <div className="flex justify-between mb-1">
              <Text>
                {translate.orders('tax')} ({taxRate}%)
              </Text>
              <Text>{formatCurrency(tax)}</Text>
            </div>
            <div className="flex justify-between mt-2">
              <Text>{translate.orders('total')}</Text>
              <Text>{formatCurrency(total)}</Text>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-3">
            <Button onClick={openPaymentModal} disabled={cartItems.length === 0 || isSubmitting}>
              {translate.orders('checkoutPayment')}
            </Button>
            <Button
              outline
              onClick={() => setConfirmSaveModalOpen(true)}
              disabled={cartItems.length === 0 || isSubmitting}
            >
              {translate.orders('saveAsUnpaid')}
            </Button>
            <Button outline onClick={() => navigate('/orders')}>
              {translate.common('cancel')}
            </Button>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      <Dialog open={customerModalOpen} onClose={() => setCustomerModalOpen(false)}>
        <DialogTitle>{translate.customers('selectCustomer')}</DialogTitle>
        <DialogBody>
          <div className="py-4">
            <div className="relative mb-4">
              <Input
                placeholder={translate.customers('searchPlaceholder')}
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
                  {translate.customers('noCustomersFound')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCustomers.map((customer) => (
                    <button
                      type="button"
                      key={customer.id}
                      className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition text-left w-full"
                      onClick={() => selectCustomer(customer)}
                    >
                      <Text className="font-medium">{customer.name}</Text>
                      {customer.email && (
                        <Text className="text-sm text-gray-500">{customer.email}</Text>
                      )}
                      {customer.phone && (
                        <Text className="text-sm text-gray-500">{customer.phone}</Text>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogBody>
      </Dialog>

      {/* Variant Selection Modal */}
      <Dialog open={variantModalOpen} onClose={() => setVariantModalOpen(false)}>
        <DialogTitle>{translate.products('selectVariant')}</DialogTitle>
        <DialogBody>
          <div className="py-4">
            {selectedItemIndex !== null && cartItems[selectedItemIndex] && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">
                  {cartItems[selectedItemIndex].productName}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {cartItems[selectedItemIndex].availableVariants?.map((variant, _idx) => (
                    <Button
                      key={`variant-${selectedItemIndex}-${variant}`}
                      outline
                      onClick={() => selectVariant(selectedItemIndex, variant)}
                    >
                      {variant}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogBody>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)}>
        <DialogTitle>{translate.orders('payment')}</DialogTitle>
        <DialogBody>
          <div className="py-4">
            <div className="mb-6 p-4 rounded-lg">
              <div className="flex justify-between mb-1">
                <Text>Subtotal</Text>
                <Text>{formatCurrency(subtotal)}</Text>
              </div>
              <div className="flex justify-between mb-1">
                <Text>Tax ({taxRate}%)</Text>
                <Text>{formatCurrency(tax)}</Text>
              </div>
              <div className="flex justify-between mt-2 text-lg font-bold">
                <Text>Total</Text>
                <Text>{formatCurrency(total)}</Text>
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
                  min="0"
                  max={total}
                />
                {paymentAmount !== total && (
                  <Text className="mt-1 text-sm text-yellow-600">
                    {paymentAmount < total
                      ? translate.orders('partialPayment')
                      : translate.orders('overpayment')}
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
          <Button onClick={() => handleSubmitOrder(false)} disabled={isSubmitting}>
            {translate.orders('completeOrder')}
          </Button>
          <Button outline onClick={() => setPaymentModalOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Save As Unpaid Modal */}
      <Dialog open={confirmSaveModalOpen} onClose={() => setConfirmSaveModalOpen(false)}>
        <DialogTitle>{translate.orders('saveAsUnpaid')}</DialogTitle>
        <DialogBody>
          <div className="py-4">
            <Text>{translate.orders('saveAsUnpaidConfirm')}</Text>
          </div>
        </DialogBody>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmSaveModalOpen(false)
              handleSubmitOrder(true)
            }}
            disabled={isSubmitting}
          >
            {translate.common('confirm')}
          </Button>
          <Button
            color="red"
            onClick={() => setConfirmSaveModalOpen(false)}
            disabled={isSubmitting}
          >
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default NewOrder
