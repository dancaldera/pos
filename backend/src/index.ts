import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import categoriesRoutes from './routes/categories.js';
import productsRoutes from './routes/products.js';
import customersRoutes from './routes/customers.js';
import ordersRoutes from './routes/orders.js';
import settingsRoutes from './routes/settings.js';

// Create Express server
const app = express();

// Express configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/settings', settingsRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start the server
const PORT = config.app.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.app.env} mode`);
  logger.info(`API URL: ${config.app.url}`);
});

export default app;
