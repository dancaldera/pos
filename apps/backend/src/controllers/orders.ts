import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { orders, orderItems, products, customers, payments, inventoryTransactions, settings, users } from '../db/schema.js';
import { eq, desc, sql, and, or, like, gte, lte } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { generateReceipt } from '../services/receipt.js';
import { Order, OrderItem, OrderItem as OrderItemType, Settings } from '../types/models.js';

// Get all orders with filtering and pagination
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      paymentStatus,
      paymentMethod,
      customerId,
      userId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page: pageStr = '1',
      limit: limitStr = '20',
    } = req.query as any;
    
    // Parse pagination parameters
    const page = parseInt(pageStr as string, 10);
    const limit = parseInt(limitStr as string, 10);

    // Build the where clause
    let whereClause = sql`1 = 1`;

    if (status) {
      whereClause = sql`${whereClause} AND ${orders.status} = ${status}`;
    }

    if (paymentStatus) {
      whereClause = sql`${whereClause} AND ${orders.paymentStatus} = ${paymentStatus}`;
    }

    if (paymentMethod) {
      whereClause = sql`${whereClause} AND ${orders.paymentMethod} = ${paymentMethod}`;
    }

    if (customerId) {
      whereClause = sql`${whereClause} AND ${orders.customerId} = ${customerId}`;
    }

    if (userId) {
      whereClause = sql`${whereClause} AND ${orders.userId} = ${userId}`;
    }

    if (startDate) {
      // Parse date in UTC to avoid timezone issues
      const start = new Date(`${startDate}T00:00:00.000Z`);
      whereClause = sql`${whereClause} AND ${orders.createdAt} >= ${start}`;
    }

    if (endDate) {
      // Parse date in UTC to avoid timezone issues
      const end = new Date(`${endDate}T23:59:59.999Z`);
      whereClause = sql`${whereClause} AND ${orders.createdAt} <= ${end}`;
    }

    if (search) {
      whereClause = sql`${whereClause} AND (CAST(${orders.orderNumber} AS TEXT) LIKE ${'%' + search + '%'} OR ${orders.notes} LIKE ${'%' + search + '%'})`;
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build the order clause
    const orderClause = sortOrder.toLowerCase() === 'asc'
      ? sql`${orders[sortBy as keyof typeof orders]} asc`
      : sql`${orders[sortBy as keyof typeof orders]} desc`;

    // Get the total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(orders)
      .where(whereClause);

    const total = Number(countResult[0].count);

    // Get the orders with related data
    const ordersList = await db
      .select()
      .from(orders)
      .where(whereClause as any)
      .orderBy(orderClause as any)
      .limit(limit)
      .offset(offset);

    // Convert numeric values from strings to numbers
    const ordersWithNumericValues = ordersList.map(order => ({
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
    }));

    res.status(200).json({
      success: true,
      count: ordersList.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: ordersWithNumericValues,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single order with all details
export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get the order from the database
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      throw new NotFoundError(`Order with ID ${id} not found`);
    }

    // Convert string numeric values to numbers for type compatibility
    const orderWithNumericValues = {
      ...order,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      total: order.total,
    } as Order;

    // Get customer if exists
    let customer = null;
    if (order.customerId) {
      [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, order.customerId))
        .limit(1);
    }

    // Get the order items along with product image URLs
    const items = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        productName: orderItems.productName,
        variant: orderItems.variant,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        subtotal: orderItems.subtotal,
        notes: orderItems.notes,
        createdAt: orderItems.createdAt,
        updatedAt: orderItems.updatedAt,
        imageUrl: products.imageUrl,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    // Convert string numeric values to numbers for type compatibility
    const itemsWithNumericValues = items.map(item => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })) as OrderItemType[];

    // Get the payments
    const orderPayments = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        amount: payments.amount,
        method: payments.method,
        reference: payments.reference,
        notes: payments.notes,
        userId: payments.userId,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.orderId, id));

    // Convert payment amounts from strings to numbers
    const paymentsWithNumericValues = orderPayments.map(payment => ({
      ...payment,
      amount: Number(payment.amount),
    }));

    // Get user (staff) who created the order
    let user = null;
    if (order.userId) {
      [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1);
    }

    // Return the order with all details
    res.status(200).json({
      success: true,
      data: {
        ...orderWithNumericValues,
        customer,
        user,
        items: itemsWithNumericValues,
        payments: paymentsWithNumericValues,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new order
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      customerId,
      status = 'pending',
      items,
      notes,
      paymentStatus = 'unpaid',
      paymentMethod,
      payment,
      discount = 0,
      discountType,
      discountValue,
    } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Order must have at least one item');
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Check if the customer exists if provided
      if (customerId) {
        const customer = await tx.query.customers.findFirst({
          where: eq(customers.id, customerId),
        });

        if (!customer) {
          throw new BadRequestError(`Customer with ID ${customerId} not found`);
        }
      }

      // Get the business settings for tax calculation
      // const settingsResult = await tx.query.settings.findFirst();
      // const taxRate = settingsResult ? Number(settingsResult.taxRate) : 0;

      // Validate and process each item
      let subtotal = 0;
      const processedItems = [];

      for (const item of items) {
        // Validate item
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          throw new BadRequestError('Each item must have a productId and positive quantity');
        }

        // Get the product
        const product = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
        });

        if (!product) {
          throw new BadRequestError(`Product with ID ${item.productId} not found`);
        }

        if (!product.active) {
          throw new BadRequestError(`Product ${product.name} is not active`);
        }

        // Check stock
        if (product.stock < item.quantity) {
          throw new BadRequestError(`Insufficient stock for ${product.name} (requested: ${item.quantity}, available: ${product.stock})`);
        }

        // Calculate item subtotal
        const unitPrice = Number(product.price);
        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        processedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
          subtotal: itemSubtotal,
          notes: item.notes,
          variant: item.variant,
        });
      }

      // Validate and process discount
      const discountAmount = Number(discount);
      if (discountAmount < 0) {
        throw new BadRequestError('Discount cannot be negative');
      }
      
      // Ensure discount doesn't exceed subtotal
      const validDiscount = Math.min(discountAmount, subtotal);
      
      // Store discount metadata if provided
      const discountMeta = discountType && discountValue 
        ? { type: discountType, value: discountValue }
        : null;

      // Calculate tax and total
      // const tax = (subtotal - validDiscount) * (taxRate / 100);
      const total = subtotal - validDiscount; // + tax

      // Create the order
      const [newOrder] = await tx.insert(orders).values({
        userId: req.user!.id,
        status,
        subtotal: subtotal.toString(),
        tax: '0', // tax.toString(),
        discount: validDiscount.toString(),
        total: total.toString(),
        notes,
        paymentStatus,
        paymentMethod,
      }).returning();

      // Create order items and update inventory
      for (const item of processedItems) {
        // Create order item
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          subtotal: item.subtotal.toString(),
          notes: item.notes,
        });

        // Update product stock
        await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));

        // Create inventory transaction
        await tx.insert(inventoryTransactions).values({
          productId: item.productId,
          quantity: -item.quantity, // Negative for sales
          type: 'sale',
          reference: `order:${newOrder.id}`,
          notes: `Sale in order #${newOrder.orderNumber}`,
          userId: req.user!.id,
        });
      }

      // Process payment if provided
      if (payment && payment.amount > 0) {
        if (!paymentMethod) {
          throw new BadRequestError('Payment method is required when processing a payment');
        }

        // Create payment record
        await tx.insert(payments).values({
          orderId: newOrder.id,
          amount: payment.amount.toString(),
          method: paymentMethod,
          reference: payment.reference,
          notes: payment.notes,
          userId: req.user!.id,
        });

        // Get existing payments
        const existingPayments = await tx.query.payments.findMany({
          where: eq(payments.orderId, newOrder.id),
        });

        // Calculate total paid so far
        const totalPaidSoFar = existingPayments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0
        );

        // Calculate new total paid
        const newTotalPaid = totalPaidSoFar + payment.amount;

        // Calculate total amount
        const totalAmount = Number(total);

        // Update order payment status based on payment amount
        const newPaymentStatus = newTotalPaid >= totalAmount ? 'paid' : newTotalPaid > 0 ? 'partial' : 'unpaid';

        await tx
          .update(orders)
          .set({ paymentStatus: newPaymentStatus })
          .where(eq(orders.id, newOrder.id));

        // Update the newOrder object
        newOrder.paymentStatus = newPaymentStatus;
      }

      return res.status(201).json({
        success: true,
        data: {
          ...newOrder,
        },
      });
    });
  } catch (error) {
    console.error('Error creating order:', error);
    next(error);
  }
};

// Update an order's status
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate input
    if (!status) {
      throw new BadRequestError('Status is required');
    }

    // Get the order from the database
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      throw new NotFoundError(`Order with ID ${id} not found`);
    }

    // Update the order status
    const [updatedOrder] = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Convert string numeric values to numbers for type compatibility
    const updatedOrderWithNumericValues = {
      ...updatedOrder,
      subtotal: updatedOrder.subtotal,
      tax: updatedOrder.tax,
      discount: updatedOrder.discount,
      total: updatedOrder.total,
    } as Order;

    // Return the updated order
    res.status(200).json({
      success: true,
      data: updatedOrderWithNumericValues,
    });
  } catch (error) {
    next(error);
  }
};

// Add a payment to an order
export const addPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, method, reference, notes } = req.body;

    // Validate input
    if (!amount || amount <= 0 || !method) {
      throw new BadRequestError('Amount and payment method are required');
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Get the order from the database
      const order = await tx.query.orders.findFirst({
        where: eq(orders.id, id),
      });

      if (!order) {
        throw new NotFoundError(`Order with ID ${id} not found`);
      }

      // Check if the order is cancelled
      if (order.status === 'cancelled') {
        throw new BadRequestError('Cannot add payment to a cancelled order');
      }

      // Get existing payments
      const existingPayments = await tx.query.payments.findMany({
        where: eq(payments.orderId, id),
      });

      // Calculate total paid so far
      const totalPaidSoFar = existingPayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );

      // Calculate new total paid
      const newTotalPaid = totalPaidSoFar + amount;

      // Calculate total amount
      const totalAmount = Number(order.total);

      // Check if payment exceeds remaining balance
      if (newTotalPaid > totalAmount) {
        throw new BadRequestError(
          `Payment amount exceeds remaining balance. Order total: ${totalAmount}, already paid: ${totalPaidSoFar}, remaining: ${
            totalAmount - totalPaidSoFar
          }`
        );
      }

      // Create payment record
      const [newPayment] = await tx
        .insert(payments)
        .values({
          orderId: id,
          amount: amount.toString(),
          method,
          reference,
          notes,
          userId: req.user!.id,
        })
        .returning();

      // Determine payment status based on amount paid
      const paymentStatus = newTotalPaid >= totalAmount ? 'paid' : newTotalPaid > 0 ? 'partial' : 'unpaid';
      
      // If payment is now complete (paid in full), automatically mark order as completed
      const newOrderStatus = paymentStatus === 'paid' ? 'completed' : order.status;
      
      // Update order payment status and status
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          paymentStatus,
          status: newOrderStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      // Convert string numeric values to numbers for type compatibility
      const updatedOrderWithNumericValues = {
        ...updatedOrder,
        subtotal: updatedOrder.subtotal,
        tax: updatedOrder.tax,
        discount: updatedOrder.discount,
        total: updatedOrder.total,
      } as Order;

      return res.status(200).json({
        success: true,
        data: {
          order: updatedOrderWithNumericValues,
          totalPaid: newTotalPaid,
        },
      });
    });
  } catch (error) {
    next(error);
  }
};

// Generate a receipt for an order
// Update an order's discount
export const updateDiscount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { discount, discountType, discountValue } = req.body;

    // Validate input
    if (discount === undefined || discount < 0) {
      throw new BadRequestError('Valid discount amount is required');
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Get the order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      if (!order) {
        throw new NotFoundError(`Order with ID ${id} not found`);
      }

      // Ensure order is not cancelled
      if (order.status === 'cancelled') {
        throw new BadRequestError('Cannot update discount on a cancelled order');
      }

      // Get the business settings for tax calculation
      // const settingsResult = await tx.query.settings.findFirst();
      // const taxRate = settingsResult ? Number(settingsResult.taxRate) : 0;

      // Validate discount amount
      const subtotal = Number(order.subtotal);
      const discountAmount = Number(discount);
      
      // Ensure discount doesn't exceed subtotal
      const validDiscount = Math.min(discountAmount, subtotal);

      // Recalculate tax and total with new discount
      // const tax = (subtotal - validDiscount) * (taxRate / 100);
      const total = subtotal - validDiscount // + tax

      // Update the order
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          discount: validDiscount.toString(),
          tax: '0', // tax.toString(),
          total: total.toString(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      // Update payment status if total changes
      const existingPayments = await tx.query.payments.findMany({
        where: eq(payments.orderId, id),
      });

      // Calculate total paid
      const totalPaid = existingPayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );

      // Determine new payment status
      let paymentStatus = order.paymentStatus;
      if (totalPaid >= total) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      } else {
        paymentStatus = 'unpaid';
      }

      // Update payment status if it changed
      if (paymentStatus !== order.paymentStatus) {
        await tx
          .update(orders)
          .set({ paymentStatus })
          .where(eq(orders.id, id));
      }

      // Convert string numeric values to numbers for the response
      const updatedOrderWithNumericValues = {
        ...updatedOrder,
        subtotal: Number(updatedOrder.subtotal),
        tax: Number(updatedOrder.tax),
        discount: Number(updatedOrder.discount),
        total: Number(updatedOrder.total),
      };

      return res.status(200).json({
        success: true,
        data: updatedOrderWithNumericValues,
      });
    });
  } catch (error) {
    next(error);
  }
};

export const getReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get the order from the database with all related data
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      throw new NotFoundError(`Order with ID ${id} not found`);
    }

    // Get customer if exists
    let customer = null;
    if (order.customerId) {
      [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, order.customerId))
        .limit(1);
    }

    const orderWithCustomer = {
      ...order,
      customer,
    } as Order;

    // Get the order items and convert numeric strings to numbers
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    const itemsWithNumericValues = items.map(item => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })) as OrderItem[];

    // Get the business settings and convert numeric strings to numbers
    const [businessSettings] = await db
      .select()
      .from(settings)
      .limit(1);

    if (!businessSettings) {
      throw new BadRequestError('Business settings not found');
    }

    const businessSettingsWithNumericValues = {
      ...businessSettings,
      taxRate: Number(businessSettings.taxRate),
    } as Settings;

    // Generate the receipt
    const receiptPath = await generateReceipt(
      orderWithCustomer,
      itemsWithNumericValues,
      businessSettingsWithNumericValues
    );

    // Return the receipt path
    res.status(200).json({
      success: true,
      data: {
        receiptUrl: receiptPath,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Cancel an order
export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Get the order from the database
      const order = await tx.query.orders.findFirst({
        where: eq(orders.id, id),
      });

      if (!order) {
        throw new NotFoundError(`Order with ID ${id} not found`);
      }

      // Don't allow cancelling already cancelled orders
      if (order.status === 'cancelled') {
        throw new BadRequestError('Order is already cancelled');
      }

      // Get the order items
      const items = await tx.query.orderItems.findMany({
        where: eq(orderItems.orderId, id),
      });

      // Update inventory for each item
      for (const item of items) {
        // Only restore stock if the order was not already completed
        if (order.status !== 'completed') {
          // Update product stock
          await tx
            .update(products)
            .set({
              stock: sql`${products.stock} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.productId as string));

          // Create inventory transaction
          await tx.insert(inventoryTransactions).values({
            productId: item.productId as string,
            quantity: item.quantity, // Positive for returns to inventory
            type: 'return',
            reference: `order:${order.id}`,
            notes: `Return from cancelled order #${order.orderNumber}`,
            userId: req.user!.id,
          });
        }
      }

      // Update the order status
      const notesUpdate = reason
        ? `${order.notes ? order.notes + '\n' : ''}Cancelled: ${reason}`
        : order.notes;

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: 'cancelled',
          notes: notesUpdate,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      return res.status(200).json({
        success: true,
        data: updatedOrder,
      });
    });
  } catch (error) {
    next(error);
  }
};

// Add items to an existing order
export const addItemsToOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Request must include at least one item');
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Get the order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      if (!order) {
        throw new NotFoundError(`Order with ID ${id} not found`);
      }

      // Can't add items to cancelled orders
      if (order.status === 'cancelled') {
        throw new BadRequestError('Cannot add items to a cancelled order');
      }

      // Get the business settings for tax calculation
      const settingsResult = await tx.query.settings.findFirst();
      const taxRate = settingsResult ? Number(settingsResult.taxRate) : 0;

      // Process new items
      let additionalSubtotal = 0;
      const newItems = [];

      for (const item of items) {
        // Validate item
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          throw new BadRequestError('Each item must have a productId and positive quantity');
        }

        // Get the product
        const product = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
        });

        if (!product) {
          throw new BadRequestError(`Product with ID ${item.productId} not found`);
        }

        if (!product.active) {
          throw new BadRequestError(`Product ${product.name} is not active`);
        }

        // Check stock
        if (product.stock < item.quantity) {
          throw new BadRequestError(`Insufficient stock for ${product.name} (requested: ${item.quantity}, available: ${product.stock})`);
        }

        // Calculate item subtotal
        const unitPrice = Number(product.price);
        const itemSubtotal = unitPrice * item.quantity;
        additionalSubtotal += itemSubtotal;

        // Create new order item
        const [newItem] = await tx.insert(orderItems).values({
          orderId: id,
          productId: product.id,
          productName: product.name,
          variant: item.variant || null,
          quantity: item.quantity,
          unitPrice: unitPrice.toString(),
          subtotal: itemSubtotal.toString(),
          notes: item.notes || null,
        }).returning();

        newItems.push(newItem);

        // Update product stock
        await tx
          .update(products)
          .set({
            stock: product.stock - item.quantity,
            updatedAt: new Date(),
          })
          .where(eq(products.id, product.id));

        // Create inventory transaction
        await tx.insert(inventoryTransactions).values({
          productId: product.id,
          quantity: -item.quantity,
          type: 'sale',
          reference: `Order ${order.orderNumber}`,
          userId: req.user!.id,
        });
      }

      // Update order totals
      const oldSubtotal = Number(order.subtotal);
      const newSubtotal = oldSubtotal + additionalSubtotal;
      const newTax = newSubtotal * (taxRate / 100);
      const newTotal = newSubtotal + newTax - Number(order.discount);

      // Update the order
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          subtotal: newSubtotal.toString(),
          tax: newTax.toString(),
          total: newTotal.toString(),
          updatedAt: new Date(),
          // If order was paid, now it's partial
          paymentStatus: order.paymentStatus === 'paid' ? 'partial' : order.paymentStatus,
        })
        .where(eq(orders.id, id))
        .returning();

      // Get all order items
      const allItems = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

      // Convert numeric values for response
      const updatedOrderWithNumericValues = {
        ...updatedOrder,
        subtotal: Number(updatedOrder.subtotal),
        tax: Number(updatedOrder.tax),
        discount: Number(updatedOrder.discount),
        total: Number(updatedOrder.total),
      };

      // Return the updated order with new items
      res.status(200).json({
        success: true,
        data: {
          order: updatedOrderWithNumericValues,
          items: allItems.map(item => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            subtotal: Number(item.subtotal),
          })),
          newItems: newItems.map(item => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            subtotal: Number(item.subtotal),
          })),
        },
      });
    });
  } catch (error) {
    next(error);
  }
};
