import React, { useState, useEffect, useRef } from 'react';
import { getSettings, updateSettings, SystemSettings } from '../api/settings';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'CNY', name: 'Chinese Yuan (¥)' },
  { code: 'MXN', name: 'Mexican Peso (Mex$)' },
];

const Settings: React.FC = () => {
  const { state: authState } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SystemSettings>({
    businessName: '',
    address: '',
    phone: '',
    email: '',
    taxRate: 0,
    currency: 'USD', // Default currency
    receiptFooter: '',
  });
  
  console.log('Initial form data currency:', formData.currency);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is admin
  const isAdmin = authState.user?.role === 'admin';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      console.log('Fetched settings:', response);
      
      if (response.success && response.data) {
        // Make sure currency has a default value if it's not in the response
        const formDataWithDefaults = {
          ...response.data,
          currency: response.data.currency || 'USD',
        };
        
        console.log('Setting form data with currency:', formDataWithDefaults.currency);
        setFormData(formDataWithDefaults);
        
        if (response.data.logoUrl) {
          setLogoPreview(response.data.logoUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Log currency changes specifically
    if (name === 'currency') {
      console.log('Currency changed to:', value);
    }
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : parseFloat(value),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // If it's the currency field, log the updated state
    if (name === 'currency') {
      console.log('Form data after currency change:', {
        ...formData,
        [name]: value,
      });
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setLogo(file);
      setRemoveLogo(false);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoPreview(null);
    setRemoveLogo(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.businessName.trim()) {
      errors.businessName = 'Business name is required';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (formData.taxRate < 0 || formData.taxRate > 100) {
      errors.taxRate = 'Tax rate must be between 0 and 100';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      setSuccessMessage(null);

      // Create FormData object for file upload
      const settingsFormData = new FormData();
      settingsFormData.append('businessName', formData.businessName);
      
      // Only append non-null values
      if (formData.address) settingsFormData.append('address', formData.address);
      if (formData.phone) settingsFormData.append('phone', formData.phone);
      if (formData.email) settingsFormData.append('email', formData.email);
      settingsFormData.append('taxRate', formData.taxRate.toString());
      
      // Ensure currency is properly set
      console.log('Currency selected:', formData.currency);
      settingsFormData.append('currency', formData.currency || 'USD');
      
      if (formData.receiptFooter) settingsFormData.append('receiptFooter', formData.receiptFooter);
      
      // Debug FormData contents
      console.log('FormData contents:');
      for (const pair of settingsFormData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }
      
      // Handle logo
      if (logo) {
        settingsFormData.append('logo', logo);
      } else if (removeLogo) {
        settingsFormData.append('removeLogo', 'true');
      }
      
      const response = await updateSettings(settingsFormData);
      console.log('Response from server:', response);
      
      if (response.success) {
        setSuccessMessage('Settings updated successfully!');
        // Update form data with any changes from the server
        console.log('Setting form data to:', response.data);
        setFormData(response.data);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSuccessMessage(null);
    } finally {
      setSaving(false);
      
      // Auto-hide success message after 3 seconds
      if (successMessage) {
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen -mt-16">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-3 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
      </div>

      {!isAdmin && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div>
              <p className="text-sm text-yellow-700">
                You are viewing settings in read-only mode. Only administrators can modify system settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div>
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Business Information</h3>
              
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.businessName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter business name"
                  disabled={!isAdmin}
                />
                {formErrors.businessName && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.businessName}</p>
                )}
              </div>
              
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter business address"
                  disabled={!isAdmin}
                />
              </div>
              
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter email address"
                    disabled={!isAdmin}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Financial & Receipt Settings</h3>
              
              {/* Tax Rate and Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.taxRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter tax rate"
                    step="0.01"
                    min="0"
                    max="100"
                    disabled={!isAdmin}
                  />
                  {formErrors.taxRate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.taxRate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={!isAdmin}
                  >
                    {CURRENCIES.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Receipt Footer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt Footer
                </label>
                <textarea
                  name="receiptFooter"
                  value={formData.receiptFooter || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter text to appear at the bottom of receipts"
                  disabled={!isAdmin}
                />
              </div>
              
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Logo
                </label>
                <div className="flex items-center">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Business Logo"
                        className="h-32 w-32 object-contain border rounded-md"
                      />
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-32 w-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                      <PhotoIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  {isAdmin && !logoPreview && (
                    <div className="ml-5">
                      <label
                        htmlFor="logo-upload"
                        className="cursor-pointer py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Upload Logo
                      </label>
                      <input
                        id="logo-upload"
                        ref={fileInputRef}
                        name="logo"
                        type="file"
                        className="sr-only"
                        onChange={handleLogoChange}
                        accept="image/*"
                      />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Recommended size: 200x200 pixels. Max file size: 2MB.
                </p>
              </div>
            </div>
          </div>
          
          {isAdmin && (
            <div className="pt-5 border-t flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={saving}
              >
                Save Settings
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Settings;