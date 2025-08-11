import cors from 'cors'
import express, { type Express } from 'express'
import { config } from './config/index.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
// Import routes
import authRoutes from './routes/auth.js'
import categoriesRoutes from './routes/categories.js'
import customersRoutes from './routes/customers.js'
import dashboardRoutes from './routes/dashboard.js'
import ordersRoutes from './routes/orders.js'
import productsRoutes from './routes/products.js'
import settingsRoutes from './routes/settings.js'
import usersRoutes from './routes/users.js'
import { logger } from './utils/logger.js'

// Create Express server
const app: Express = express()

// Express configuration
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Health check route
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Error handlers
app.use(notFoundHandler)
app.use(errorHandler)

// Start the server
const PORT = config.app.port
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.app.env} mode`)
  logger.info(`API URL: ${config.app.url}`)
})

export default app
