import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { Text } from '@/components/text'
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog'
import { Field, Fieldset, Label } from '@/components/fieldset'
import { Divider } from '@/components/divider'
import {
  EnvelopeIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import React, { useEffect, useState } from 'react'
import {
  createCustomer,
  CustomerSearchParams,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from '../api/customers'
import { useLanguage } from '../context/LanguageContext'
import { Customer } from '../types/customers'
import { Textarea } from '@/components/textarea'

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  })
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useState<CustomerSearchParams>({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitLoading, setSubmitLoading] = useState(false)

  // Fetch customers on mount and when search params change
  useEffect(() => {
    fetchCustomers()
  }, [searchParams])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await getCustomers(searchParams)
      setCustomers(response.data)
      setPagination({
        page: parseInt(response.pagination.page),
        limit: parseInt(response.pagination.limit),
        totalPages: response.pagination.totalPages,
        total: response.total,
      })
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const handleSearch = () => {
    setSearchParams({
      ...searchParams,
      search,
      page: 1, // Reset to first page when searching
    })
  }

  const handleSortChange = (column: string) => {
    const newSortOrder =
      searchParams.sortBy === column && searchParams.sortOrder === 'asc' ? 'desc' : 'asc'
    setSearchParams({
      ...searchParams,
      sortBy: column,
      sortOrder: newSortOrder,
    })
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return
    setSearchParams((prevParams) => ({
      ...prevParams,
      page: newPage,
    }))
  }

  const openCreateModal = () => {
    setCurrentCustomer(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (customer: Customer) => {
    setCurrentCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openDeleteModal = (customer: Customer) => {
    setCurrentCustomer(customer)
    setIsDeleteModalOpen(true)
  }

  const viewCustomerDetails = (customerId: string) => {
    // Navigate to customer details page
    // This would be implemented if you add a customer details page
    alert(`View customer details for ID: ${customerId}`)
    // navigate(`/customers/${customerId}`);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const { translate } = useLanguage()

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = translate.customers('nameRequired')
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = translate.common('error')
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setSubmitLoading(true)

      // Remove empty strings to save as null
      const customerData = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
      }

      if (currentCustomer) {
        // Update customer
        await updateCustomer(currentCustomer.id, customerData)
      } else {
        // Create customer
        await createCustomer(customerData)
      }

      setIsModalOpen(false)
      fetchCustomers()
    } catch (error: any) {
      console.error('Error saving customer:', error)
      // Handle API error response
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('email already exists')) {
          setFormErrors({
            email: translate.users('emailExists'),
          })
        } else {
          setFormErrors({
            form: error.response.data.message,
          })
        }
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentCustomer) return

    try {
      setSubmitLoading(true)
      await deleteCustomer(currentCustomer.id)
      setIsDeleteModalOpen(false)
      fetchCustomers()
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      // Handle the case where customer has associated orders
      if (
        error.response?.data?.message &&
        error.response.data.message.includes('Cannot delete customer with associated orders')
      ) {
        alert(
          'Cannot delete this customer because they have placed orders. Consider marking them as inactive instead.'
        )
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString()
  }

  const getSortIcon = (column: string) => {
    if (searchParams.sortBy !== column) return null

    return searchParams.sortOrder === 'asc' ? (
      <span className="ml-1">↑</span>
    ) : (
      <span className="ml-1">↓</span>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Heading level={1}>{translate.customers('title')}</Heading>
        <Button onClick={openCreateModal}>
          <PlusIcon className="h-5 w-5 mr-1" />
          {translate.customers('addCustomer')}
        </Button>
      </div>

      {/* Search */}
      <Input
        type="text"
        placeholder={translate.customers('searchCustomers')}
        value={search}
        onChange={handleSearchChange}
        className="mb-4"
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />

      {/* Customers Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">{translate.common('loading')}</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg shadow overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>
                    <div
                      className="cursor-pointer flex items-center"
                      onClick={() => handleSortChange('name')}
                    >
                      {translate.customers('customerName')} {getSortIcon('name')}
                    </div>
                  </TableHeader>
                  <TableHeader>{translate.customers('customerDetails')}</TableHeader>
                  <TableHeader>
                    <div
                      className="cursor-pointer flex items-center"
                      onClick={() => handleSortChange('createdAt')}
                    >
                      {translate.customers('lastOrder')} {getSortIcon('createdAt')}
                    </div>
                  </TableHeader>
                  <TableHeader>{translate.common('actions')}</TableHeader>
                </TableRow>
              </TableHead>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    {translate.common('noResults')}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Text
                        className="font-medium text-blue-600 hover:text-blue-900 cursor-pointer"
                        onClick={() => viewCustomerDetails(customer.id)}
                      >
                        {customer.name}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <EnvelopeIcon className="h-4 w-4 mr-1" />
                            <Text>{customer.email}</Text>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            <Text>{customer.phone}</Text>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            <Text className="truncate max-w-xs">{customer.address}</Text>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Text>{formatDate(customer.createdAt)}</Text>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2 justify-end">
                        <Button onClick={() => openEditModal(customer)}>
                          <PencilIcon className="h-5 w-5" />
                        </Button>
                        <Button color="red" onClick={() => openDeleteModal(customer)}>
                          <TrashIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                {pagination.total > 0
                  ? `${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} / ${pagination.total}`
                  : '0'}{' '}
                {translate.customers('title').toLowerCase()}
              </div>
              <div className="flex space-x-2">
                <Button
                  outline
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  {translate.common('previous')}
                </Button>
                <div className="mx-2 flex items-center">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                </div>
                <Button
                  outline
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  {translate.common('next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Customer Form Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogTitle>
          {currentCustomer
            ? translate.customers('editCustomer')
            : translate.customers('addCustomer')}
        </DialogTitle>
        <DialogBody>
          <form onSubmit={handleSubmit}>
            {formErrors.form && (
              <Text className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {formErrors.form}
              </Text>
            )}
            <Fieldset className="space-y-4">
              {/* Name */}
              <Field>
                <Label>{translate.customers('customerName')} *</Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={translate.customers('customerName')}
                />
                {formErrors.name && (
                  <Text className="mt-1 text-sm text-red-600">{formErrors.name}</Text>
                )}
              </Field>

              {/* Email */}
              <Field>
                <Label>{translate.customers('customerEmail')}</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={translate.customers('customerEmail')}
                />
                {formErrors.email && (
                  <Text className="mt-1 text-sm text-red-600">{formErrors.email}</Text>
                )}
              </Field>

              {/* Phone */}
              <Field>
                <Label>{translate.customers('customerPhone')}</Label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder={translate.customers('customerPhone')}
                />
              </Field>

              {/* Address */}
              <Field>
                <Label>{translate.customers('customerAddress')}</Label>
                <Textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder={translate.customers('customerAddress')}
                />
              </Field>
            </Fieldset>
          </form>
        </DialogBody>
        <DialogActions>
          <Button onClick={handleSubmit} disabled={submitLoading} className="ml-3">
            {currentCustomer ? translate.common('save') : translate.common('add')}
          </Button>
          <Button outline onClick={() => setIsModalOpen(false)} disabled={submitLoading}>
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <DialogTitle>{translate.common('delete')}</DialogTitle>
        <DialogBody>
          <Text>
            {translate.users('deleteConfirmation')}
            <Divider />
            <Text>{currentCustomer?.name}</Text>
          </Text>
        </DialogBody>
        <DialogActions>
          <Button color="red" onClick={handleDelete} disabled={submitLoading} className="ml-3">
            {translate.common('delete')}
          </Button>
          <Button outline onClick={() => setIsDeleteModalOpen(false)} disabled={submitLoading}>
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default Customers
