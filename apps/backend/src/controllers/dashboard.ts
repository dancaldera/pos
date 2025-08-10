import { and, count, asc, desc, eq, gte, lt, inArray, sql, SQLWrapper } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { db } from '../db/index.js';
import {
  categories,
  customers,
  orderItems,
  orders,
  payments,
  products
} from '../db/schema.js';

// Get dashboard statistics
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get total products count
    const productsResult = await db
      .select({ count: count() })
      .from(products);
    
    // Get active products count
    const activeProductsResult = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.active, true));

    // Get total categories count
    const categoriesResult = await db
      .select({ count: count() })
      .from(categories);

    // Get total customers count
    const customersResult = await db
      .select({ count: count() })
      .from(customers);

    // Handle optional period filter for order-related stats
    const period = (req.query.period as string) || null;
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (period) {
      const now = new Date();
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'thisWeek':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear() + 1, 0, 1);
          break;
        default:
          // No date filter
          startDate = undefined;
          endDate = undefined;
      }
    }
    // Build date filters for queries
    const dateFilters: SQLWrapper[] = []; // Explicitly type as SQLWrapper[]
    if (startDate) dateFilters.push(gte(orders.createdAt, startDate));
    if (endDate) dateFilters.push(lt(orders.createdAt, endDate));
    // Get total orders count
    const ordersResult = await db
      .select({ count: count() })
      .from(orders)
      .where(dateFilters.length ? and(...dateFilters) : undefined);

    // Get completed orders count
    const completedOrdersResult = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          ...dateFilters
        )
      );

    // Get pending orders count
    const pendingOrdersResult = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'pending'),
          ...dateFilters
        )
      );

    // Get total revenue (from completed orders)
    const revenueResult = await db
      .select({ total: sql<string>`sum(${orders.total})` })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          ...dateFilters
        )
      );

    // Get low stock products count
    const lowStockResult = await db
      .select({ count: count() })
      .from(products)
      .where(
        and(
          eq(products.active, true),
          sql`${products.stock} <= ${products.lowStockAlert} AND ${products.lowStockAlert} IS NOT NULL`
        )
      );

    // Prepare response
    const stats = {
      totalProducts: Number(productsResult[0].count),
      activeProducts: Number(activeProductsResult[0].count),
      totalCategories: Number(categoriesResult[0].count),
      totalCustomers: Number(customersResult[0].count),
      totalOrders: Number(ordersResult[0].count),
      completedOrders: Number(completedOrdersResult[0].count),
      pendingOrders: Number(pendingOrdersResult[0].count),
      totalRevenue: Number(revenueResult[0].total) || 0,
      lowStockProducts: Number(lowStockResult[0].count),
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// Get recent orders for dashboard
export const getRecentOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 5;

    // Get recent orders
    const recentOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        total: orders.total,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    // Get customer info for orders that have customers
    const customerIds = recentOrders
      .map(order => order.customerId)
      .filter((id): id is string => id !== null);

    // Get customers from the database
    const customersData = customerIds.length > 0
      ? await db
          .select()
          .from(customers)
          .where(inArray(customers.id, customerIds))
      : [];

    // Map customers to orders
    const ordersWithCustomers = recentOrders.map(order => ({
      ...order,
      customer: order.customerId 
        ? customersData.find((c) => c.id === order.customerId) || null
        : null
    }));

    res.status(200).json({
      success: true,
      data: ordersWithCustomers,
    });
  } catch (error) {
    console.error('Error in getRecentOrders:', error);
    next(error);
  }
};

// Get sales data for chart
export const getSalesData = async (req: Request, res: Response, next: NextFunction) => {
  try {
        // Handle different periods for sales data
        const period = (req.query.period as string) || 'thisWeek';
        let intervalValue: 'hour' | 'day' | 'month';
        let startDate: Date;
        let endDate: Date | null = null;

        const now = new Date();
        // Determine period settings
        switch (period) {
          case 'today':
            // Today's data grouped by hour
            intervalValue = 'hour';
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'yesterday':
            // Yesterday's data grouped by hour
            intervalValue = 'hour';
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            startDate = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
            endDate = todayStart;
            break;
          case 'thisWeek':
            // This week's data grouped by day (starting Sunday)
            intervalValue = 'day';
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            break;
          case 'thisYear':
            // This year's data grouped by month
            intervalValue = 'month';
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            // Fallback to last 7 days grouped by day
            intervalValue = 'day';
            startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
            break;
        }

        // Build filters for SQL query
        const formattedStartDate = startDate.toISOString();
        const formattedEndDate = endDate ? endDate.toISOString() : null;
    
    type OrderRow = {
      [key: string]: unknown;
      date: string;
      amount: string;
    };

    const result = await db.execute(sql`
      SELECT
        created_at::text as date,
        total::text as amount
      FROM orders
      WHERE created_at >= ${formattedStartDate}::timestamp
      ${formattedEndDate ? sql`AND created_at < ${formattedEndDate}::timestamp` : sql``}
        AND status = 'completed'
      ORDER BY created_at ASC
    `);

    // Process the data in JavaScript instead of SQL
    const orders = (result.rows as OrderRow[]).map(row => ({
      date: new Date(row.date),
      amount: Number(row.amount)
    }));

    // Group data by the specified interval
    const groupedData: Record<string, { sales: number, count: number }> = {};
    
    // Generate date keys for each interval
    const dateKeys: string[] = [];
    const endTime = endDate || now;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endTime) {
      let key: string;
      
      if (intervalValue === 'hour') {
        key = `${currentDate.toISOString().split('T')[0]}T${String(currentDate.getHours()).padStart(2, '0')}`;
        currentDate = new Date(currentDate.getTime() + 60 * 60 * 1000); // Add 1 hour
      } else if (intervalValue === 'day') {
        key = currentDate.toISOString().split('T')[0];
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
      } else if (intervalValue === 'month') {
        key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1); // Add 1 month
      } else {
        key = currentDate.toISOString().split('T')[0];
        currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Add 1 week
      }
      
      dateKeys.push(key);
      groupedData[key] = { sales: 0, count: 0 };
    }
    
    // Group orders into the corresponding intervals
    orders.forEach(order => {
      let key: string;
      
      if (intervalValue === 'hour') {
        key = `${order.date.toISOString().split('T')[0]}T${String(order.date.getHours()).padStart(2, '0')}`;
      } else if (intervalValue === 'day') {
        key = order.date.toISOString().split('T')[0];
      } else if (intervalValue === 'month') {
        key = `${order.date.getFullYear()}-${String(order.date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // For weekly, we'll use the day and calculate which week it belongs to
        const daysSinceStart = Math.floor((order.date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const weekIndex = Math.floor(daysSinceStart / 7);
        if (weekIndex >= 0 && weekIndex < dateKeys.length) {
          key = dateKeys[weekIndex];
        } else {
          return; // Skip if outside range
        }
      }
      
      if (groupedData[key]) {
        groupedData[key].sales += order.amount;
        groupedData[key].count += 1;
      }
    });
    
    // Convert to array format needed by the frontend
    const formattedData = dateKeys.map(key => ({
      date: key,
      sales: groupedData[key].sales,
      count: groupedData[key].count
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('Error in getSalesData:', error);
    next(error);
  }
};

// Get top selling products
export const getTopProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 5;
    
    // Get top selling products based on order items
    const topProducts = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        totalQuantity: sql<string>`sum(${orderItems.quantity})`,
        totalSales: sql<string>`sum(${orderItems.subtotal})`,
      })
      .from(orderItems)
      .leftJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.status, 'completed'))
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(limit);

    // Format the result
    const formattedProducts = topProducts.map(product => ({
      ...product,
      totalQuantity: Number(product.totalQuantity),
      totalSales: Number(product.totalSales),
    }));

    res.status(200).json({
      success: true,
      data: formattedProducts,
    });
  } catch (error) {
    next(error);
  }
};

// Get payment method statistics
export const getPaymentStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get stats grouped by payment method
    const paymentStats = await db
      .select({
        method: payments.method,
        total: sql<string>`sum(${payments.amount})`,
        count: count(),
      })
      .from(payments)
      .groupBy(payments.method)
      .orderBy(desc(sql`sum(${payments.amount})`));

    // Format the result
    const formattedStats = paymentStats.map(stat => ({
      method: stat.method,
      total: Number(stat.total),
      count: Number(stat.count),
    }));

    res.status(200).json({
      success: true,
      data: formattedStats,
    });
  } catch (error) {
    next(error);
  }
};