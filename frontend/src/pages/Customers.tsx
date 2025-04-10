import React, { useState, useEffect } from 'react';
import { 
  getCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer 
} from '../api/customers';
import { Customer } from '../types/customers';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch customers on mount and when search params change
  useEffect(() => {
    fetchCustomers();
  }, [searchParams]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await getCustomers(searchParams);
      setCustomers(response.data);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        totalPages: response.pagination.totalPages,
        total: response.total
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSearch = () => {
    setSearchParams({
      ...searchParams,
      search,
      page: 1 // Reset to first page when searching
    });
  };

  const handleSortChange = (column: string) => {
    const newSortOrder = searchParams.sortBy === column && searchParams.sortOrder === 'asc' ? 'desc' : 'asc';
    setSearchParams({
      ...searchParams,
      sortBy: column,
      sortOrder: newSortOrder
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setSearchParams({
      ...searchParams,
      page: newPage
    });
  };

  const openCreateModal = () => {
    setCurrentCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setCurrentCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (customer: Customer) => {
    setCurrentCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const viewCustomerDetails = (customerId: string) => {
    // Navigate to customer details page
    // This would be implemented if you add a customer details page
    alert(`View customer details for ID: ${customerId}`);
    // navigate(`/customers/${customerId}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSubmitLoading(true);
      
      // Remove empty strings to save as null
      const customerData = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
      };
      
      if (currentCustomer) {
        // Update customer
        await updateCustomer(currentCustomer.id, customerData);
      } else {
        // Create customer
        await createCustomer(customerData);
      }
      
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      // Handle API error response
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('email already exists')) {
          setFormErrors({
            email: 'Email already registered to another customer'
          });
        } else {
          setFormErrors({
            form: error.response.data.message
          });
        }
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentCustomer) return;
    
    try {
      setSubmitLoading(true);
      await deleteCustomer(currentCustomer.id);
      setIsDeleteModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      // Handle the case where customer has associated orders
      if (error.response?.data?.message && error.response.data.message.includes('Cannot delete customer with associated orders')) {
        alert('Cannot delete this customer because they have placed orders. Consider marking them as inactive instead.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getSortIcon = (column: string) => {
    if (searchParams.sortBy !== column) return null;
    
    return searchParams.sortOrder === 'asc' 
      ? <span className="ml-1">↑</span> 
      : <span className="ml-1">↓</span>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        <Button 
          variant="primary" 
          onClick={openCreateModal}
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search customers by name, email, or phone..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={search}
                onChange={handleSearchChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                onClick={handleSearch}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">Loading customers...</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table 
              headers={[
                <div key="name" className="cursor-pointer flex items-center" onClick={() => handleSortChange('name')}>
                  Name {getSortIcon('name')}
                </div>,
                'Contact Info',
                <div key="createdAt" className="cursor-pointer flex items-center" onClick={() => handleSortChange('createdAt')}>
                  Customer Since {getSortIcon('createdAt')}
                </div>,
                'Actions'
              ]}
            >
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No customers found. Create a new customer to get started.
                  </td>
                </tr>
              ) : (
                customers.map(customer => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="font-medium text-blue-600 hover:text-blue-900 cursor-pointer"
                        onClick={() => viewCustomerDetails(customer.id)}
                      >
                        {customer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <EnvelopeIcon className="h-4 w-4 mr-1" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            <span className="truncate max-w-xs">{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(customer.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => openEditModal(customer)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(customer)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} customers
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Customer Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentCustomer ? 'Edit Customer' : 'Add New Customer'}
        footer={
          <>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={submitLoading}
              className="ml-3"
            >
              {currentCustomer ? 'Update Customer' : 'Create Customer'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitLoading}
            >
              Cancel
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {formErrors.form}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter customer name"
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter email address"
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter phone number"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter customer address"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Customer"
        footer={
          <>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={submitLoading}
              className="ml-3"
            >
              Delete
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={submitLoading}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="py-4">
          <p className="text-gray-600">
            Are you sure you want to delete the customer{' '}
            <span className="font-medium text-gray-900">{currentCustomer?.name}</span>?
            <br />
            <br />
            Note: You cannot delete a customer who has placed orders.
            This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;