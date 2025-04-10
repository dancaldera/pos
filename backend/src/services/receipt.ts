import PDFDocument from 'pdfkit';
import { Order, OrderItem, Settings } from '../types/models.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

// Service to generate PDF receipts for orders
export const generateReceipt = async (
  order: Order,
  orderItems: OrderItem[],
  settings: Settings
): Promise<string> => {
  try {
    // Create a PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Set the output file path
    const filePath = path.join(uploadsDir, `receipt-${order.orderNumber}.pdf`);
    const writeStream = fs.createWriteStream(filePath);
    
    // Pipe the PDF to the file
    doc.pipe(writeStream);
    
    // Add business information
    doc.fontSize(20).text(settings.businessName, { align: 'center' });
    doc.fontSize(10).text(settings.address || '', { align: 'center' });
    if (settings.phone) doc.text(`Phone: ${settings.phone}`, { align: 'center' });
    if (settings.email) doc.text(`Email: ${settings.email}`, { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(16).text('RECEIPT', { align: 'center' });
    doc.moveDown();
    
    // Add order information
    doc.fontSize(12).text(`Order #: ${order.orderNumber}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Payment Status: ${order.paymentStatus}`);
    if (order.paymentMethod) doc.text(`Payment Method: ${order.paymentMethod}`);
    
    doc.moveDown();
    
    // Add customer information if available
    if (order.customer) {
      doc.fontSize(12).text('Customer:');
      doc.fontSize(10).text(`Name: ${order.customer.name}`);
      if (order.customer.email) doc.text(`Email: ${order.customer.email}`);
      if (order.customer.phone) doc.text(`Phone: ${order.customer.phone}`);
    }
    
    doc.moveDown();
    
    // Add items table
    const tableTop = doc.y;
    const itemX = 50;
    const quantityX = 300;
    const priceX = 370;
    const amountX = 450;
    
    // Add table headers
    doc.fontSize(10).text('Item', itemX, tableTop);
    doc.text('Qty', quantityX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Amount', amountX, tableTop);
    
    doc.moveDown();
    
    // Add table content
    let tableY = doc.y;
    
    orderItems.forEach((item) => {
      doc.fontSize(10).text(item.productName, itemX, tableY);
      doc.text(item.quantity.toString(), quantityX, tableY);
      doc.text(`${settings.currency} ${item.unitPrice.toFixed(2)}`, priceX, tableY);
      doc.text(`${settings.currency} ${item.subtotal.toFixed(2)}`, amountX, tableY);
      tableY = doc.y + 15;
    });
    
    // Add table footer
    doc.moveDown();
    
    // Add totals
    const totalsX = 350;
    let totalsY = tableY + 10;
    
    doc.fontSize(10).text('Subtotal:', totalsX, totalsY);
    doc.text(`${settings.currency} ${order.subtotal.toFixed(2)}`, amountX, totalsY);
    totalsY += 15;
    
    doc.text('Tax:', totalsX, totalsY);
    doc.text(`${settings.currency} ${order.tax.toFixed(2)}`, amountX, totalsY);
    totalsY += 15;
    
    if (order.discount > 0) {
      doc.text('Discount:', totalsX, totalsY);
      doc.text(`${settings.currency} ${order.discount.toFixed(2)}`, amountX, totalsY);
      totalsY += 15;
    }
    
    doc.fontSize(12).text('Total:', totalsX, totalsY);
    doc.text(`${settings.currency} ${order.total.toFixed(2)}`, amountX, totalsY);
    
    // Add footer message
    doc.moveDown();
    doc.moveDown();
    doc.fontSize(10).text(settings.receiptFooter || 'Thank you for your business!', { align: 'center' });
    
    // Finalize the PDF
    doc.end();
    
    // Return a promise that resolves when the file is written
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        // Return the file path
        resolve(`/uploads/receipts/receipt-${order.orderNumber}.pdf`);
      });
      
      writeStream.on('error', reject);
    });
  } catch (error) {
    logger.error('Error generating receipt', error);
    throw new Error('Failed to generate receipt');
  }
};