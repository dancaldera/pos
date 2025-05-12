import { ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { invoke } from '@tauri-apps/api/core';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getOrder } from '../api/orders';
import { getSettings, SystemSettings } from '../api/settings';
import { useLanguage } from '../context/LanguageContext';
import { Order } from '../types/orders';
import { formatCurrency } from '../utils/format-currency';

const PrintReceipt: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { translate, language } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customTaxRate, setCustomTaxRate] = useState<number | ''>("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch order data
        const orderResponse = await getOrder(id);
        setOrder(orderResponse.data);
        
        // Fetch company settings
        const settingsResponse = await getSettings();
        setSettings(settingsResponse.data);
        
        // Initialize custom tax rate with system tax rate
        if (settingsResponse.data?.taxRate) {
          setCustomTaxRate(settingsResponse.data.taxRate);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error?.response?.data?.message || 'Failed to load receipt data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Handle printing to thermal POS printer via Tauri backend
  const handleThermalPrint = async () => {
    if (!order || !settings) return;
    
    setIsPrinting(true);
    setPrintStatus(null);
    
    try {
      // Format items as an array to match what the printer backend expects
      const formattedItems = order.items?.map(item => {
        return {
          name: item.productName + (item.variant ? ` (${item.variant})` : ''),
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.subtotal
        };
      }) || [];
      
      // Prepare receipt data for the thermal printer
      const receiptData = {
        title: settings?.businessName || 'Receipt', 
        address: settings?.address || '',
        phone: settings?.phone ? `Phone: ${settings.phone}` : '',
        items: formattedItems,
        subtotal: getCustomSubtotal(),
        tax: getCustomTaxAmount(),
        taxRate: customTaxRate !== '' ? customTaxRate : (settings?.taxRate || 0),
        total: getCustomTotal(),
        footer: settings?.receiptFooter || 'Thank you for your purchase!',
        date: new Date(order.createdAt).toLocaleDateString(),
        time: new Date(order.createdAt).toLocaleTimeString()
      };
      
      // Format the receipt data for the printer
      const jsonString = JSON.stringify(receiptData);
      
      // Check if running in Tauri app or web
      const isTauriApp = 'window' in globalThis && 'invoke' in window;
      
      if (isTauriApp) {
        try {
          // We're in the app - use Tauri invoke
          const response = await invoke('print_thermal_receipt', { receiptData: jsonString });
          console.log('Print command response:', response);
          setPrintStatus('Command sent successfully!');
          toast.success('Command sent successfully!');
        } catch (invokeError) {
          // Handle Tauri invoke error without crashing
          console.error('Tauri invoke error:', invokeError);
          setPrintStatus(`Error sending print command: ${invokeError}`);
          toast.warning(`Print command failed: ${invokeError}`);
          // Continue execution - don't throw to outer catch
          return; // Exit function here to prevent showing success message
        }
      } else {
        try {
          // We're in the web - use clipboard
          await navigator.clipboard.writeText(jsonString);
          setPrintStatus('Receipt data copied to clipboard');
          toast.success('Receipt data copied to clipboard');
        } catch (clipboardError) {
          // Handle clipboard error without crashing
          console.error('Clipboard error:', clipboardError);
          setPrintStatus(`Error copying to clipboard: ${clipboardError}`);
          toast.warning(`Clipboard operation failed: ${clipboardError}`);
          return; // Exit function here to prevent showing success message
        }
      }
    } catch (error) {
      console.error('Error sending print command:', error);
      setPrintStatus(`Error sending print command: ${error}`);
      toast.warning(`Error sending print command: ${error}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(language === 'en' ? 'en-US' : 'es-MX');
  };

  // Calculate total paid amount
  const totalPaid = order?.payments?.reduce(
    (sum, payment) => sum + payment.amount, 
    0
  ) || 0;
  
  // Calculate values with custom tax
  const subtotal = order?.subtotal || 0;
  const discount = order?.discount || 0;
  
  const getCustomTaxAmount = () => {
    if (customTaxRate === '') return order?.tax || 0;
    const taxRate = customTaxRate / 100;
    const taxAmount = subtotal * taxRate;

    return taxAmount;
  };
  
  const getCustomSubtotal = () => {
    const customTax = getCustomTaxAmount();
    return subtotal - customTax
  }

  const getCustomTotal = () => {
    const customTax = getCustomTaxAmount();
    return Number(getCustomSubtotal()) + Number(customTax);
  };
  
  // Calculate remaining balance
  const remainingBalance = order ? getCustomTotal() - totalPaid : 0;
  
  const handleTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setCustomTaxRate('');
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setCustomTaxRate(numValue);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-3 text-gray-600">{translate.orders('loadingOrderDetails')}</p>
        </div>
      </div>
    );
  }

  if (error || !order || !settings) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <div className="text-red-600 text-lg mb-4">
            {error || translate.orders('orderNotFound')}
          </div>
          <button 
            onClick={() => navigate(`/orders/${id}`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            {translate.common('backToOrders')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="print-wrapper">
      {/* Non-printable controls */}
      <div className="container mx-auto px-4 py-8 print:hidden">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate(`/orders/${id}`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            {translate.orders('backToOrderDetails')}
          </button>
        </div>

        {/* Tax rate customization controls */}
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <h3 className="font-medium text-gray-700 mb-3">{translate.common('tax')} {translate.settings('settings')}</h3>
          
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-1">
                {translate.settings('taxRate')}
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="number"
                  name="taxRate"
                  id="taxRate"
                  min="0"
                  step="0.01"
                  value={customTaxRate}
                  onChange={handleTaxRateChange}
                  className="block w-full rounded-md border-gray-300 pl-3 pr-8 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              {/*  */}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2 absolute right-4 top-4 print:hidden">
          <button
            onClick={() => navigate(`/orders/${id}`)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            {translate.common('back')}
          </button>
          <button
            onClick={handleThermalPrint}
            disabled={isPrinting}
            className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium ${isPrinting ? 'text-gray-400 bg-gray-100' : 'text-gray-700 bg-white hover:bg-gray-50'} focus:outline-none`}
          >
            <PrinterIcon className="h-4 w-4 mr-1" />
            {isPrinting ? translate.common('loading') : 'Thermal Print'}
          </button>
        </div>
        
        {/* Printer Status Message (if any) */}
        {printStatus && (
          <div className={`text-center p-2 my-2 text-sm rounded print:hidden ${printStatus.includes('Error') || printStatus.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {printStatus}
          </div>
        )}
      </div>
      
      {/* Printable Receipt */}
      <div id="receipt-to-print" className="receipt-container mx-auto bg-white py-4 px-6 border border-gray-200 shadow-sm rounded-sm">
        {/* Header */}
        <div className="text-center p-2 mb-3">
          {settings?.logoUrl && (
            <div className="flex justify-center mb-3">
              <img 
                src={settings.logoUrl.startsWith('http') ? settings.logoUrl : `/uploads/${settings.logoUrl}`}
                alt={settings.businessName}
                className="h-16 object-contain"
              />
            </div>
          )}
          <h1 className="font-bold text-xl mb-1">{settings?.businessName}</h1>
          {settings?.address && <p className="text-xs mb-1">{settings.address}</p>}
          {settings?.phone && <p className="text-xs mb-0.5">{translate.settings('businessPhone')}: {settings.phone}</p>}
          {settings?.email && <p className="text-xs">{translate.settings('businessEmail')}: {settings.email}</p>}
        </div>
        
        <div className="text-center my-3">
          <h2 className="font-bold">{translate.orders('receipt')}</h2>
        </div>
        
        {/* Order Info */}
        <div className="border-t border-b border-dashed py-3 mb-2">
          <div className="flex justify-between text-xs">
            <span>{translate.orders('orderNumber')}:</span>
            <span>{order?.orderNumber}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>{translate.orders('orderDate')}:</span>
            <span>{formatDate(order?.createdAt || '')}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>{translate.common('status')}:</span>
            <span>{order?.status}</span>
          </div>
          {order?.user && (
            <div className="flex justify-between text-xs">
              <span>{translate.users('staff')}:</span>
              <span>{order.user.name}</span>
            </div>
          )}
          
          {/* Customer info if available */}
          {order?.customer && (
            <div className="mt-2 text-xs">
              <div>{translate.customers('customer')}: {order.customer.name}</div>
              {order.customer.phone && <div>{order.customer.phone}</div>}
            </div>
          )}
        </div>
        
        {/* Order Items */}
        <div className="py-2 mb-2">
          <div className="flex justify-between font-bold text-xs border-b pb-1">
            <span className="w-1/2">{translate.orders('item')}</span>
            <span className="w-1/6 text-center">{translate.orders('qty')}</span>
            <span className="w-1/6 text-right">{translate.common('price')}</span>
            <span className="w-1/6 text-right">{translate.orders('amount')}</span>
          </div>
          
          {order?.items?.map((item, index) => (
            <div key={index} className="flex justify-between text-xs py-1 border-b border-dotted">
              <div className="w-1/2">
                <div>{item.productName}</div>
                {item.variant && <div className="text-xs">{item.variant}</div>}
              </div>
              <span className="w-1/6 text-center">{item.quantity}</span>
              <span className="w-1/6 text-right">{formatCurrency(item.unitPrice)}</span>
              <span className="w-1/6 text-right">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>
        
        {/* Totals */}
        <div className="py-2 mb-3">
          <div className="flex justify-between text-xs">
            <span>{translate.orders('subtotal')}:</span>
            <span>{formatCurrency(getCustomSubtotal())}</span>
          </div>
          {(discount > 0) && (
            <div className="flex justify-between text-xs">
              <span>{translate.orders('discount')}:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span>
              {translate.orders('tax')} ({customTaxRate !== '' ? customTaxRate : (settings?.taxRate || 0)}%):
            </span>
            <span>{formatCurrency(getCustomTaxAmount())}</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t border-b border-dashed py-1 my-1">
            <span>{translate.orders('total')}:</span>
            <span>{formatCurrency(getCustomTotal())}</span>
          </div>
        </div>
        
        {/* Payment Info */}
        <div className="py-2 text-xs mb-3">
          <div className="flex justify-between font-bold">
            <span>{translate.orders('paymentStatus')}:</span>
            <span>
              {totalPaid >= getCustomTotal() ? translate.orders('paid') : 
               totalPaid > 0 ? translate.orders('partial') : translate.orders('unpaid')}
            </span>
          </div>
          
          {order?.payments && order.payments.length > 0 && (
            <div className="mt-1">
              <div className="font-bold">{translate.orders('paymentDetails')}:</div>
              {order.payments.map((payment, index) => (
                <div key={index} className="flex justify-between">
                  <span>{payment.method.replace('_', ' ')} - {formatDate(payment.createdAt)}</span>
                  <span>{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </div>
          )}
          
          {remainingBalance > 0 && (
            <div className="flex justify-between font-bold mt-1">
              <span>{translate.orders('balance')}:</span>
              <span>{formatCurrency(remainingBalance)}</span>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {settings?.receiptFooter && (
          <div className="text-center py-2 border-t border-dashed text-xs mb-2">
            {settings.receiptFooter}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintReceipt;