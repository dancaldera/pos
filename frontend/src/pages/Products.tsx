import React, { useState, useEffect } from 'react';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../api/products';
import { Product, ProductFormData } from '../types/products';
import { getCategories } from '../api/categories';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { PencilIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    sku: '',
    barcode: '',
    categoryId: '',
    stock: 0,
    lowStockAlert: 0,
    active: true,
    image: null,
    removeImage: false
  });
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    categoryId: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch products on mount and when search params change
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts(searchParams);
      setProducts(response.data);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        totalPages: response.pagination.totalPages,
        total: response.total
      });
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getCategories({ limit: 100 });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
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

  const handleCategoryFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({
      ...searchParams,
      categoryId: e.target.value,
      page: 1 // Reset to first page when filtering
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
    setCurrentProduct(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      cost: 0,
      sku: '',
      barcode: '',
      categoryId: '',
      stock: 0,
      lowStockAlert: 0,
      active: true,
      image: null,
      removeImage: false
    });
    setImagePreview(null);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      cost: product.cost || 0,
      sku: product.sku || '',
      barcode: product.barcode || '',
      categoryId: product.categoryId || '',
      stock: product.stock,
      lowStockAlert: product.lowStockAlert || 0,
      active: product.active,
      image: null,
      removeImage: false
    });
    setImagePreview(product.imageUrl);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (product: Product) => {
    setCurrentProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: target.checked
      });
    } else if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : parseFloat(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({
      ...formData,
      image: file,
      removeImage: false
    });

    // Create preview URL
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      image: null,
      removeImage: true
    });
    setImagePreview(null);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (formData.price <= 0) {
      errors.price = 'Price must be greater than 0';
    }
    
    if (formData.stock < 0) {
      errors.stock = 'Stock cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSubmitLoading(true);
      
      // Create FormData object for file upload
      const productFormData = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'image' && value) {
          productFormData.append('image', value);
        } else if (key !== 'image' && value !== null && value !== undefined) {
          productFormData.append(key, String(value));
        }
      });
      
      if (currentProduct) {
        // Update product
        await updateProduct(currentProduct.id, productFormData);
      } else {
        // Create product
        await createProduct(productFormData);
      }
      
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProduct) return;
    
    try {
      setSubmitLoading(true);
      await deleteProduct(currentProduct.id);
      setIsDeleteModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <Button 
          variant="primary" 
          onClick={openCreateModal}
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Add Product
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
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
          <div className="w-full md:w-64">
            <select
              className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={searchParams.categoryId}
              onChange={handleCategoryFilter}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">Loading products...</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table headers={['Image', 'Name', 'Category', 'Price', 'Stock', 'Status', 'Actions']}>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No products found. Create a new product to get started.
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="h-12 w-12 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                          <PhotoIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {product.sku && (
                        <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(product.price)}</div>
                      {product.cost && (
                        <div className="text-xs text-gray-500">
                          Cost: {formatCurrency(product.cost)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${product.lowStockAlert && product.stock <= product.lowStockAlert ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {product.stock} in stock
                      </div>
                      {product.lowStockAlert && (
                        <div className="text-xs text-gray-500">
                          Alert: {product.lowStockAlert}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {product.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => openEditModal(product)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(product)}
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
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
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

      {/* Product Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentProduct ? 'Edit Product' : 'Add New Product'}
        size="lg"
        footer={
          <>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={submitLoading}
              className="ml-3"
            >
              {currentProduct ? 'Update Product' : 'Create Product'}
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter product name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter product description"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price and Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  {formErrors.price && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.price}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost
                  </label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Image
                </label>
                <div className="mt-1 flex items-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 w-32 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 w-32 border-2 border-dashed border-gray-300 rounded-md">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="space-y-1 text-center">
                          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="text-xs text-gray-600">Upload image</div>
                        </div>
                        <input
                          id="file-upload"
                          name="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* SKU and Barcode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="SKU code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Barcode"
                  />
                </div>
              </div>

              {/* Stock and Low Stock Alert */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.stock ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                    min="0"
                  />
                  {formErrors.stock && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.stock}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    name="lowStockAlert"
                    value={formData.lowStockAlert || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={(e) => 
                    setFormData({
                      ...formData,
                      active: e.target.checked
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                  Active (available for sale)
                </label>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Product"
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
            Are you sure you want to delete{' '}
            <span className="font-medium text-gray-900">{currentProduct?.name}</span>?
            This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Products;

// Missing XIcon component
const XIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);