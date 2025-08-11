import express, { Router } from 'express'
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  upload,
} from '../controllers/products.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router: Router = express.Router()

// All routes in this file require authentication
router.use(authenticate)

// Public routes (still need authentication)
router.get('/', getProducts)
router.get('/:id', getProduct)

// Admin and manager routes
router.post('/', authorize('admin', 'manager'), upload.single('image'), createProduct)
router.put('/:id', authorize('admin', 'manager'), upload.single('image'), updateProduct)
router.delete('/:id', authorize('admin'), deleteProduct)

export default router
