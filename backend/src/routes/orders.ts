import express from 'express';
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  addPayment,
  getReceipt,
  cancelOrder,
} from '../controllers/orders.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes in this file require authentication
router.use(authenticate);

// Public routes (any authenticated user)
router.get('/', getOrders);
router.get('/:id', getOrder);
router.post('/', createOrder);
router.post('/:id/payment', addPayment);
router.get('/:id/receipt', getReceipt);

// Routes that require admin or manager access for status update
router.put('/:id/status', authorize('admin', 'manager', 'waitress'), updateOrderStatus);
router.put('/:id/cancel', authorize('admin', 'manager'), cancelOrder);

export default router;
