import express, { Router } from 'express'
import {
  getDashboardStats,
  getRecentOrders,
  getSalesData,
  getTopProducts,
  getPaymentStats,
} from '../controllers/dashboard.js'
import { authenticate } from '../middleware/auth.js'

const router: Router = express.Router()

// All routes in this file require authentication
router.use(authenticate)

// Dashboard routes
router.get('/stats', getDashboardStats)
router.get('/recent-orders', getRecentOrders)
router.get('/sales-data', getSalesData)
router.get('/top-products', getTopProducts)
router.get('/payment-stats', getPaymentStats)

export default router
