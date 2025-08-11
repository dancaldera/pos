import express, { type Router } from 'express'
import { createUser, deleteUser, getUser, getUsers, updateUser } from '../controllers/users.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router: Router = express.Router()

// All routes in this file require authentication
router.use(authenticate)

// Routes that require admin access
router.get('/', authorize('admin', 'manager'), getUsers)
router.post('/', authorize('admin'), createUser)

// Routes that require admin access or self access
router.get('/:id', authorize('admin', 'manager'), getUser)
router.put('/:id', authorize('admin'), updateUser)
router.delete('/:id', authorize('admin'), deleteUser)

export default router
