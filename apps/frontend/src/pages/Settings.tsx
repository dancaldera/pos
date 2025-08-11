import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import type { Language } from '@/i18n'
import { getSettings, type SystemSettings, updateSettings } from '../api/settings'
import { useLanguage } from '../context/LanguageContext'
import { useAuthStore } from '../store/authStore'

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'CNY', name: 'Chinese Yuan (¥)' },
  { code: 'MXN', name: 'Mexican Peso (Mex$)' },
]

const Settings: React.FC = () => {
  const { user } = useAuthStore()
  const { translate, language, setLanguage } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<SystemSettings>({
    businessName: '',
    address: '',
    phone: '',
    email: '',
    taxRate: 0,
    currency: 'USD', // Default currency
    receiptFooter: '',
  })

  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user is admin
  const isAdmin = user?.role === 'admin'

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchSettings is stable
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await getSettings()

      if (response.success && response.data) {
        // Make sure currency has a default value if it's not in the response
        const formDataWithDefaults = {
          ...response.data,
          currency: response.data.currency || 'USD',
        }

        setFormData(formDataWithDefaults)

        if (response.data.logoUrl) {
          setLogoPreview(response.data.logoUrl)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement

    // Log currency changes specifically
    if (name === 'currency') {
      // Log the selected currency
    }

    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : parseFloat(value),
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }

    // If it's the currency field, log the updated state
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file) {
      setLogo(file)
      setRemoveLogo(false)
      const previewUrl = URL.createObjectURL(file)
      setLogoPreview(previewUrl)
    }
  }

  const handleRemoveLogo = () => {
    setLogo(null)
    setLogoPreview(null)
    setRemoveLogo(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.businessName.trim()) {
      errors.businessName = translate.common('required')
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = translate.common('error')
    }

    if (formData.taxRate < 0 || formData.taxRate > 100) {
      errors.taxRate = translate.common('error')
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setSaving(true)
      setSuccessMessage(null)

      // Create FormData object for file upload
      const settingsFormData = new FormData()
      settingsFormData.append('businessName', formData.businessName)

      // Only append non-null values
      if (formData.address) settingsFormData.append('address', formData.address)
      if (formData.phone) settingsFormData.append('phone', formData.phone)
      if (formData.email) settingsFormData.append('email', formData.email)
      settingsFormData.append('taxRate', formData.taxRate.toString())

      // Ensure currency is properly set
      settingsFormData.append('currency', formData.currency || 'USD')

      if (formData.receiptFooter) settingsFormData.append('receiptFooter', formData.receiptFooter)

      // Handle logo
      if (logo) {
        settingsFormData.append('logo', logo)
      } else if (removeLogo) {
        settingsFormData.append('removeLogo', 'true')
      }

      const response = await updateSettings(settingsFormData)

      if (response.success) {
        setSuccessMessage(translate.settings('savedSuccessfully'))
        // Update form data with any changes from the server
        setFormData(response.data)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setSuccessMessage(null)
    } finally {
      setSaving(false)

      // Auto-hide success message after 3 seconds
      if (successMessage) {
        setTimeout(() => {
          setSuccessMessage(null)
        }, 3000)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen -mt-16">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-3 text-gray-600">{translate.common('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Heading>{translate.settings('title')}</Heading>
      </div>

      {!isAdmin && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div>
              <Text>
                {translate.common('warning')}: {translate.common('readOnly')}
              </Text>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div>
              <Text>{successMessage}</Text>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg shadow overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <Heading level={3}>{translate.settings('businessName')}</Heading>

              {/* Business Name */}
              <div>
                <Text>{translate.settings('businessName')} *</Text>
                <Input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder={translate.settings('businessName')}
                  disabled={!isAdmin}
                />
                {formErrors.businessName && (
                  <Text className="mt-1 text-sm text-red-600">{formErrors.businessName}</Text>
                )}
              </div>

              {/* Address */}
              <div>
                <Text>{translate.settings('businessAddress')}</Text>
                <Textarea
                  name="address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder={translate.settings('businessAddress')}
                  disabled={!isAdmin}
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Text>{translate.settings('businessPhone')}</Text>
                  <Input
                    type="text"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    placeholder={translate.settings('businessPhone')}
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Text>{translate.settings('businessEmail')}</Text>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    placeholder={translate.settings('businessEmail')}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                {translate.settings('general')}
              </h3>

              {/* Language Settings */}
              <div>
                <Text>{translate.settings('language')}</Text>
                <div className="max-w-xs">
                  <Select
                    id="language"
                    name="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </Select>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                {translate.settings('receiptSettings')}
              </h3>

              {/* Tax Rate and Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Text>{translate.settings('taxRate')}</Text>
                  <Input
                    type="number"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleInputChange}
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
                  <Text>{translate.settings('currency')}</Text>
                  <Select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    disabled={!isAdmin}
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Receipt Footer */}
              <div>
                <Text>{translate.settings('receiptFooter')}</Text>
                <Textarea
                  name="receiptFooter"
                  value={formData.receiptFooter || ''}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder={translate.settings('receiptFooter')}
                  disabled={!isAdmin}
                />
              </div>

              {/* Logo Upload */}
              <div>
                <Text>{translate.settings('logoImage')}</Text>
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
                      <Text>{translate.settings('uploadLogo')}</Text>
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
                <Text>{translate.common('recommendation')}: 200x200 px, 2MB max.</Text>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="pt-5 border-t flex justify-end">
              <Button type="submit" disabled={saving}>
                {translate.settings('saveSettings')}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default Settings
