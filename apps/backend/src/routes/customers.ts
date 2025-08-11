import express, { Router } from 'express'
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customers.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router: Router = express.Router()

// All routes in this file require authentication
router.use(authenticate)

// Public routes (still need authentication)
router.get('/', getCustomers)
router.get('/:id', getCustomer)
router.post('/', createCustomer)

// Admin and manager routes
router.put('/:id', authorize('admin', 'manager'), updateCustomer)
router.delete('/:id', authorize('admin'), deleteCustomer)

export default router
