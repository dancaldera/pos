import React, { useState, useEffect } from 'react';
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../api/categories';
import { Category } from '../types/products';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { PencilIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../context/LanguageContext';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Pick<Category, 'name' | 'description'>>({
    name: '',
    description: '',
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

  // Fetch categories on mount and when search params change
  useEffect(() => {
    fetchCategories();
  }, [searchParams]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await getCategories(searchParams);
      setCategories(response.data);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        totalPages: response.pagination.totalPages,
        total: response.total
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
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
    setCurrentCategory(null);
    setFormData({
      name: '',
      description: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (category: Category) => {
    setCurrentCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const { translate } = useLanguage();

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = translate.categories('nameRequired');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSubmitLoading(true);
      
      if (currentCategory) {
        // Update category
        await updateCategory(currentCategory.id, formData);
      } else {
        // Create category
        await createCategory(formData);
      }
      
      setIsModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      // Handle API error response
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('already exists')) {
          setFormErrors({
            name: translate.categories('nameExists')
          });
        }
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentCategory) return;
    
    try {
      setSubmitLoading(true);
      await deleteCategory(currentCategory.id);
      setIsDeleteModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      // Handle the case where category has associated products
      if (error.response?.data?.message && error.response.data.message.includes('Cannot delete category with associated products')) {
        alert('Cannot delete this category because it has associated products. Please remove or reassign all products first.');
      }
    } finally {
      setSubmitLoading(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-800">{translate.categories('title')}</h1>
        <Button 
          variant="primary" 
          onClick={openCreateModal}
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          {translate.categories('addCategory')}
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder={translate.categories('searchCategories')}
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

      {/* Categories Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">{translate.common('loading')}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table 
              headers={[
                <div key="name" className="cursor-pointer flex items-center" onClick={() => handleSortChange('name')}>
                  {translate.common('name')} {getSortIcon('name')}
                </div>,
                translate.common('description'),
                <div key="productCount" className="cursor-pointer flex items-center" onClick={() => handleSortChange('productCount')}>
                  {translate.categories('productsInCategory')} {getSortIcon('productCount')}
                </div>,
                <div key="createdAt" className="cursor-pointer flex items-center" onClick={() => handleSortChange('createdAt')}>
                  {translate.common('created')} {getSortIcon('createdAt')}
                </div>,
                translate.common('actions')
              ]}
            >
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {translate.common('noResults')}
                  </td>
                </tr>
              ) : (
                categories.map(category => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{category.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 line-clamp-2">
                        {category.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{category.productCount || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(category.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => openEditModal(category)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(category)}
                          className="text-red-600 hover:text-red-900"
                          disabled={category.productCount ? category.productCount > 0 : false}
                          title={category.productCount && category.productCount > 0 ? "Categories with products cannot be deleted" : ""}
                        >
                          <TrashIcon className={`h-5 w-5 ${category.productCount && category.productCount > 0 ? 'opacity-40 cursor-not-allowed' : ''}`} />
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
                {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} {translate.categories('title').toLowerCase()}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  {translate.common('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  {translate.common('next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Category Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentCategory ? translate.categories('editCategory') : translate.categories('addCategory')}
        footer={
          <>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={submitLoading}
              className="ml-3"
            >
              {currentCategory ? translate.common('save') : translate.common('add')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitLoading}
            >
              {translate.common('cancel')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translate.categories('categoryName')} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={translate.categories('categoryName')}
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translate.categories('categoryDescription')}
            </label>
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={translate.categories('categoryDescription')}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={translate.common('delete')}
        footer={
          <>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={submitLoading}
              className="ml-3"
            >
              {translate.common('delete')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={submitLoading}
            >
              {translate.common('cancel')}
            </Button>
          </>
        }
      >
        <div className="py-4">
          <p className="text-gray-600">
            {translate.categories('deleteConfirmation')}
            <br />
            <span className="font-medium text-gray-900">{currentCategory?.name}</span>
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Categories;