import React, { useState, useEffect, useRef } from 'react';
import { getSettings, updateSettings, SystemSettings } from '../api/settings';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PageLanguageSelector from '../components/PageLanguageSelector';
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
  const { translate } = useLanguage();
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
      
      if (response.success && response.data) {
        // Make sure currency has a default value if it's not in the response
        const formDataWithDefaults = {
          ...response.data,
          currency: response.data.currency || 'USD',
        };
        
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
      // Log the selected currency
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
      errors.businessName = translate.common('required');
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = translate.common('error');
    }
    
    if (formData.taxRate < 0 || formData.taxRate > 100) {
      errors.taxRate = translate.common('error');
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
      settingsFormData.append('currency', formData.currency || 'USD');
      
      if (formData.receiptFooter) settingsFormData.append('receiptFooter', formData.receiptFooter);
      
      // Handle logo
      if (logo) {
        settingsFormData.append('logo', logo);
      } else if (removeLogo) {
        settingsFormData.append('removeLogo', 'true');
      }
      
      const response = await updateSettings(settingsFormData);
      
      if (response.success) {
        setSuccessMessage(translate.settings('savedSuccessfully'));
        // Update form data with any changes from the server
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
          <p className="mt-3 text-gray-600">{translate.common('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{translate.settings('title')}</h1>
      </div>

      {!isAdmin && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div>
              <p className="text-sm text-yellow-700">
                {translate.common('warning')}: {translate.common('readOnly')}
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
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{translate.settings('businessName')}</h3>
              
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translate.settings('businessName')} *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.businessName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={translate.settings('businessName')}
                  disabled={!isAdmin}
                />
                {formErrors.businessName && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.businessName}</p>
                )}
              </div>
              
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translate.settings('businessAddress')}
                </label>
                <textarea
                  name="address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={translate.settings('businessAddress')}
                  disabled={!isAdmin}
                />
              </div>
              
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {translate.settings('businessPhone')}
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={translate.settings('businessPhone')}
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {translate.settings('businessEmail')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={translate.settings('businessEmail')}
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
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{translate.settings('general')}</h3>
              
              {/* Language Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translate.settings('language')}
                </label>
                <div className="max-w-xs">
                  <PageLanguageSelector />
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{translate.settings('receiptSettings')}</h3>
              
              {/* Tax Rate and Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {translate.settings('taxRate')}
                  </label>
                  <input
                    type="number"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.taxRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={translate.settings('taxRate')}
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
                    {translate.settings('currency')}
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
                  {translate.settings('receiptFooter')}
                </label>
                <textarea
                  name="receiptFooter"
                  value={formData.receiptFooter || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={translate.settings('receiptFooter')}
                  disabled={!isAdmin}
                />
              </div>
              
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translate.settings('logoImage')}
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
                        {translate.settings('uploadLogo')}
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
                  {translate.common('recommendation')}: 200x200 px, 2MB max.
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
                {translate.settings('saveSettings')}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Settings;