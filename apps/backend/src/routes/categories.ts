import express, { Router } from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categories.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router: Router = express.Router();

// All routes in this file require authentication
router.use(authenticate);

// Public routes (still need authentication)
router.get('/', getCategories);
router.get('/:id', getCategory);

// Admin and manager routes
router.post('/', authorize('admin', 'manager'), createCategory);
router.put('/:id', authorize('admin', 'manager'), updateCategory);
router.delete('/:id', authorize('admin'), deleteCategory);

export default router;
